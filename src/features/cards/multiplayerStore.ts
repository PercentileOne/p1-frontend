/* ══════════════════════════════════════════════════════════════
   MULTIPLAYER STORE — Phase 3
   Local simulation layer — no backend / websockets yet.
   All real-time bot AI runs in setInterval; phase transitions
   happen via simple state machines.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import type { CognitiveCardData, RoomMode, ConceptCountMode, DifficultyLevel } from "./types";
import { computeScore } from "./engine/scoring";

// ── Public types ──────────────────────────────────────────────────

export type RoomStatus = "idle" | "lobby" | "countdown" | "active" | "results";

export interface RoomParticipant {
  id:       string;
  name:     string;
  initials: string;
  accent:   string;
  isLocal:  boolean;
  isBot:    boolean;
  speed:    "fast" | "medium" | "slow";
  ready:    boolean;
}

export interface ParticipantResult {
  participantId: string;
  score:         number;    // final confirmed score
  currentScore:  number;    // live-updated during active phase
  conceptsHit:   string[];  // final
  revealedHits:  string[];  // live-revealed (bots build this over time)
  timeUsed:      number;
  done:          boolean;
}

export interface RoomSession {
  roomId:             string;
  code:               string;
  name:               string;
  mode:               RoomMode;
  hostId:             string;
  cardId:             string;
  maxPlayers:         number;
  isPublic:           boolean;
  groupId?:           string;
  // Host-set concept count (Document 4B §4)
  conceptCountMode?:  ConceptCountMode;
  groupConceptCount?: number;
  difficultyLevel?:   DifficultyLevel;
}

export interface CreateRoomOpts {
  name:               string;
  mode:               RoomMode;
  maxPlayers:         number;
  isPublic:           boolean;
  botCount?:          number;
  // Concept Count Mode — host sets for all participants
  conceptCountMode?:  ConceptCountMode;
  groupConceptCount?: number;
  difficultyLevel?:   DifficultyLevel;
  groupId?:           string;
}

export interface MPStore {
  status:         RoomStatus;
  session:        RoomSession | null;
  participants:   RoomParticipant[];
  results:        Record<string, ParticipantResult>;
  countdownValue: number;
  elapsedSeconds: number;
  localUserId:    string;
  // actions
  quickMatch:       () => void;
  createRoom:       (opts: CreateRoomOpts) => void;
  startCountdown:   () => void;
  submitLocalScore: (r: Pick<ParticipantResult, "conceptsHit" | "timeUsed" | "score">) => void;
  leaveRoom:        () => void;
}

// ── Bot personality data ──────────────────────────────────────────

const BOT_PROFILES: Omit<RoomParticipant, "ready">[] = [
  { id: "bot-1", name: "CodeBot Alpha",   initials: "CA", accent: "bg-emerald-500", isLocal: false, isBot: true, speed: "fast"   },
  { id: "bot-2", name: "TypeScript Dev",  initials: "TD", accent: "bg-sky-500",     isLocal: false, isBot: true, speed: "medium" },
  { id: "bot-3", name: "React Ninja",     initials: "RN", accent: "bg-amber-500",   isLocal: false, isBot: true, speed: "fast"   },
  { id: "bot-4", name: "Vite Runner",     initials: "VR", accent: "bg-violet-500",  isLocal: false, isBot: true, speed: "medium" },
  { id: "bot-5", name: "WebDev Pro",      initials: "WP", accent: "bg-rose-500",    isLocal: false, isBot: true, speed: "slow"   },
];

const LOCAL_PARTICIPANT: Omit<RoomParticipant, "ready"> = {
  id: "user-local", name: "You", initials: "ME",
  accent: "bg-indigo-500", isLocal: true, isBot: false, speed: "medium",
};

export const LOCAL_ID = "user-local";

// ── Bot timeline (when does each concept get "hit" during the race) ──

interface TimelineEvent {
  conceptId:        string;
  second:           number;
  cumulativeScore:  number; // precomputed score after this hit
}

function generateBotTimeline(
  bot:       RoomParticipant,
  card:      CognitiveCardData,
  timeLimit: number,
): TimelineEvent[] {
  const hitRatio       = { fast: 0.88, medium: 0.68, slow: 0.46 }[bot.speed];
  const completionFrac = { fast: 0.52, medium: 0.72, slow: 0.90 }[bot.speed];
  const maxT           = Math.floor(timeLimit * completionFrac);

  // Pick random subset of concepts to hit
  const shuffled = [...card.concepts].sort(() => Math.random() - 0.5);
  const toHit    = shuffled.filter((_, i) => (i + 1) / shuffled.length <= hitRatio);

  const events: TimelineEvent[] = [];
  const cumHits = new Set<string>();

  toHit.forEach((c, i) => {
    cumHits.add(c.id);
    const spread   = (Math.random() - 0.5) * 6;
    const second   = Math.max(2, Math.floor(4 + (maxT - 4) * ((i + 1) / toHit.length) + spread));
    const bd       = computeScore({
      concepts:       card.concepts,
      hitIds:         new Set(cumHits),
      misconceptions: [],
      timeLeft:       Math.max(0, timeLimit - second),
      totalTime:      timeLimit,
      cardDifficulty: card.difficulty,
      streak:         0,
    });
    events.push({ conceptId: c.id, second, cumulativeScore: bd.finalScore });
  });

  return events.sort((a, b) => a.second - b.second);
}

// ── Empty result factory ──────────────────────────────────────────

function emptyResult(participantId: string): ParticipantResult {
  return { participantId, score: 0, currentScore: 0, conceptsHit: [], revealedHits: [], timeUsed: 0, done: false };
}

// ── Hook ─────────────────────────────────────────────────────────

export function useMultiplayerStore(card: CognitiveCardData): MPStore {
  const timeLimit = card.testConfig.timeLimitSeconds;

  // ── Render state ────────────────────────────────────────────────
  const [status,         setStatus]         = useState<RoomStatus>("idle");
  const [session,        setSession]        = useState<RoomSession | null>(null);
  const [participants,   setParticipants]   = useState<RoomParticipant[]>([]);
  const [results,        setResults]        = useState<Record<string, ParticipantResult>>({});
  const [countdownValue, setCountdownValue] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Refs (interval-safe, no stale closures) ─────────────────────
  const statusRef       = useRef<RoomStatus>("idle");
  const resultsRef      = useRef<Record<string, ParticipantResult>>({});
  const participantsRef = useRef<RoomParticipant[]>([]);
  const cardRef         = useRef(card);
  const botTimelines    = useRef<Record<string, TimelineEvent[]>>({});
  const elapsedRef      = useRef(0);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { cardRef.current = card; });

  function clearTimers() {
    if (countdownRef.current)  { clearInterval(countdownRef.current);  countdownRef.current  = null; }
    if (roomTimerRef.current)  { clearInterval(roomTimerRef.current);  roomTimerRef.current  = null; }
  }

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  // ── Phase: active — starts room timer + bot AI ──────────────────

  function startActive() {
    const c = cardRef.current;

    // Generate bot plans
    const bots = participantsRef.current.filter(p => p.isBot);
    const timelines: Record<string, TimelineEvent[]> = {};
    bots.forEach(b => { timelines[b.id] = generateBotTimeline(b, c, timeLimit); });
    botTimelines.current = timelines;

    // Initialise results for all participants
    const initR: Record<string, ParticipantResult> = {};
    participantsRef.current.forEach(p => { initR[p.id] = emptyResult(p.id); });
    resultsRef.current = initR;
    elapsedRef.current = 0;

    setResults({ ...initR });
    setElapsedSeconds(0);
    setStatus("active");
    statusRef.current = "active";

    // ── Room tick ──────────────────────────────────────────────────
    roomTimerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const t = elapsedRef.current;
      setElapsedSeconds(t);

      let changed = false;
      const cur = { ...resultsRef.current };

      // Reveal bot concept hits due this second
      for (const [botId, tl] of Object.entries(botTimelines.current)) {
        const due = tl.filter(e => e.second === t);
        if (due.length === 0) continue;

        changed = true;
        const prev      = cur[botId] ?? emptyResult(botId);
        const newRevealed = [...prev.revealedHits, ...due.map(e => e.conceptId)];
        const lastScore   = due[due.length - 1].cumulativeScore;

        // Is this the bot's last planned concept?
        const allBotConceptIds = tl.map(e => e.conceptId);
        const allRevealed      = allBotConceptIds.every(id => newRevealed.includes(id));

        cur[botId] = {
          ...prev,
          revealedHits:  newRevealed,
          conceptsHit:   newRevealed,
          currentScore:  lastScore,
          done:          allRevealed,
          score:         allRevealed ? lastScore : prev.score,
          timeUsed:      allRevealed ? t : prev.timeUsed,
        };
      }

      if (changed) {
        resultsRef.current = cur;
        setResults({ ...cur });
      }

      // Time-up: force-finish all remaining participants
      if (t >= timeLimit) {
        clearInterval(roomTimerRef.current!);
        roomTimerRef.current = null;

        const final = { ...resultsRef.current };
        Object.values(final).forEach(r => {
          if (!r.done) {
            final[r.participantId] = { ...r, done: true, score: r.currentScore, timeUsed: t };
          }
        });
        resultsRef.current = final;
        setResults({ ...final });
        setStatus("results");
        statusRef.current = "results";
        return;
      }

      // All done early?
      if (Object.values(resultsRef.current).every(r => r.done)) {
        clearInterval(roomTimerRef.current!);
        roomTimerRef.current = null;
        setStatus("results");
        statusRef.current = "results";
      }
    }, 1000);
  }

  // ── Phase: countdown ───────────────────────────────────────────

  function execCountdown() {
    let val = 3;
    setCountdownValue(3);
    setStatus("countdown");
    statusRef.current = "countdown";

    countdownRef.current = setInterval(() => {
      val -= 1;
      setCountdownValue(val);
      if (val <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        startActive();
      }
    }, 1000);
  }

  // ── Shared room setup ─────────────────────────────────────────

  function setupRoom(opts: {
    name: string; mode: RoomMode; maxPlayers: number;
    isPublic: boolean; bots: RoomParticipant[];
  }) {
    clearTimers();
    const localP: RoomParticipant = { ...LOCAL_PARTICIPANT, ready: true };
    const allP   = [localP, ...opts.bots];

    participantsRef.current = allP;
    setParticipants(allP);

    const initR: Record<string, ParticipantResult> = {};
    allP.forEach(p => { initR[p.id] = emptyResult(p.id); });
    resultsRef.current = initR;
    setResults(initR);

    const sess: RoomSession = {
      roomId:             `room-${Math.random().toString(36).slice(2, 7)}`,
      code:               `P1-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      name:               opts.name,
      mode:               opts.mode,
      hostId:             LOCAL_ID,
      cardId:             cardRef.current.id,
      maxPlayers:         opts.maxPlayers,
      isPublic:           opts.isPublic,
      groupId:            opts.groupId,
      conceptCountMode:   opts.conceptCountMode,
      groupConceptCount:  opts.groupConceptCount,
      difficultyLevel:    opts.difficultyLevel,
    };
    setSession(sess);
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setCountdownValue(3);
    setStatus("lobby");
    statusRef.current = "lobby";
  }

  // ── Public actions ─────────────────────────────────────────────

  const quickMatch = useCallback(() => {
    const bots = BOT_PROFILES.slice(0, 3).map(b => ({ ...b, ready: true }));
    setupRoom({ name: "Quick Match", mode: "battle", maxPlayers: 4, isPublic: false, bots });
  }, []);

  const createRoom = useCallback((opts: CreateRoomOpts) => {
    const count = Math.min(opts.botCount ?? 2, BOT_PROFILES.length);
    const bots  = BOT_PROFILES.slice(0, count).map(b => ({ ...b, ready: true }));
    setupRoom({ ...opts, bots });
  }, []);

  const startCountdown = useCallback(() => {
    execCountdown();
  }, []);

  const submitLocalScore = useCallback((
    r: Pick<ParticipantResult, "conceptsHit" | "timeUsed" | "score">,
  ) => {
    const upd = { ...resultsRef.current };
    upd[LOCAL_ID] = {
      ...upd[LOCAL_ID],
      ...r,
      currentScore:  r.score,
      revealedHits:  r.conceptsHit,
      done:          true,
    };
    resultsRef.current = upd;
    setResults({ ...upd });

    // Transition to results if everyone is done
    if (Object.values(upd).every(p => p.done) && statusRef.current === "active") {
      clearTimers();
      setStatus("results");
      statusRef.current = "results";
    }
  }, []);

  const leaveRoom = useCallback(() => {
    clearTimers();
    setStatus("idle");
    statusRef.current = "idle";
    setSession(null);
    setParticipants([]);
    setResults({});
    setCountdownValue(3);
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    botTimelines.current = {};
    participantsRef.current = [];
    resultsRef.current = {};
  }, []);

  return {
    status, session, participants, results,
    countdownValue, elapsedSeconds, localUserId: LOCAL_ID,
    quickMatch, createRoom, startCountdown, submitLocalScore, leaveRoom,
  };
}
