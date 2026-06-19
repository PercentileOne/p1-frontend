/* ══════════════════════════════════════════════════════════════
   TEST STORE — Phase 2
   useTestStore(card) → TestSession
   All mutable values live in a single ref so interval callbacks
   never hit stale-closure bugs. useState is used only to trigger
   re-renders after a ref mutation.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import type { CognitiveCardData, InputMode, ScoreBreakdown, Concept } from "./types";
import { detectConceptsEnhanced } from "./engine/detection";
import { computeScore, timerPressureColor } from "./engine/scoring";

// ── Public interface ─────────────────────────────────────────────
export interface TestSession {
  card:              CognitiveCardData;
  activeConcepts:    Concept[];   // subset resolved by ConceptCountConfig
  totalConceptCount: number;      // all concepts on the card
  isRunning:         boolean;
  hasStarted:        boolean;
  timeRemaining:     number;
  elapsed:           number;
  conceptsHit:       Set<string>;
  partialHits:       Set<string>;
  misconceptions:    string[];
  inputMode:         InputMode;
  pressureColor:     string;
  liveScore:         number;
  breakdown:         ScoreBreakdown | null;
  deliveryScore:     number;
  transcript:        string;
  lastHitId:         string | null;
  // actions
  start:       () => void;
  submit:      () => ScoreBreakdown;
  reset:       () => void;
  changeMode:  (mode: InputMode) => void;
  processText: (text: string) => void;
}

// ── Mock transcript builder ──────────────────────────────────────
// Uses each concept's own keywords so the mock reliably hits them.
function buildMockLines(concepts: Concept[]): string[] {
  return concepts.map(c => {
    const [kw0 = "this concept", kw1 = kw0] = c.keywords;
    return `${kw0} is fundamental because it relates to ${kw1} at the core level`;
  });
}

// ── Hook ─────────────────────────────────────────────────────────
export function useTestStore(card: CognitiveCardData, activeConcepts?: Concept[]): TestSession {
  const total          = card.testConfig.timeLimitSeconds;
  const resolvedActive = activeConcepts ?? card.concepts;

  // Mutable ref — always current, safe to read inside intervals
  const s = useRef({
    hits:     new Set<string>(),
    partials: new Set<string>(),
    miscons:  [] as string[],
    time:     total,
    elapsed:  0,
    running:  false,
    started:  false,
    cardId:   card.id,
  });

  // Card ref — safe to read inside stale callbacks
  const cardRef           = useRef(card);
  const activeConceptsRef = useRef<Concept[]>(resolvedActive);
  useEffect(() => { cardRef.current = card; });
  useEffect(() => { activeConceptsRef.current = resolvedActive; });

  // ── Render state ────────────────────────────────────────────────
  const [isRunning,      setIsRunning]      = useState(false);
  const [hasStarted,     setHasStarted]     = useState(false);
  const [timeRemaining,  setTimeRemaining]  = useState(total);
  const [elapsed,        setElapsed]        = useState(0);
  const [conceptsHit,    setConceptsHit]    = useState<Set<string>>(new Set());
  const [partialHits,    setPartialHits]    = useState<Set<string>>(new Set());
  const [misconceptions, setMisconceptions] = useState<string[]>([]);
  const [inputMode,      setInputMode]      = useState<InputMode>("typing");
  const [pressureColor,  setPressureColor]  = useState("text-emerald-400");
  const [liveScore,      setLiveScore]      = useState(0);
  const [breakdown,      setBreakdown]      = useState<ScoreBreakdown | null>(null);
  const [deliveryScore,  setDeliveryScore]  = useState(0);
  const [transcript,     setTranscript]     = useState("");
  const [lastHitId,      setLastHitId]      = useState<string | null>(null);

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockIdx   = useRef(0);
  const mockLines = useRef(buildMockLines(resolvedActive));

  // ── Reset when card changes ────────────────────────────────────
  useEffect(() => {
    if (s.current.cardId !== card.id) {
      s.current.cardId = card.id;
      mockLines.current = buildMockLines(activeConceptsRef.current);
      execReset();
    }
  });

  // ── Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      s.current.elapsed += 1;
      s.current.time = Math.max(0, s.current.time - 1);

      const color = timerPressureColor(s.current.time, total);
      setTimeRemaining(s.current.time);
      setElapsed(s.current.elapsed);
      setPressureColor(color);

      if (s.current.time <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        s.current.running = false;
        setIsRunning(false);
        const bd = execComputeScore();
        setBreakdown(bd);
      }
    }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [isRunning, total]);

  // ── Mock voice / video drip (fires every 2.5 s per concept) ───
  useEffect(() => {
    if (!isRunning || inputMode === "typing") {
      if (mockRef.current) { clearInterval(mockRef.current); mockRef.current = null; }
      return;
    }
    mockIdx.current = 0;
    mockRef.current = setInterval(() => {
      const idx = mockIdx.current++;
      if (idx >= mockLines.current.length) {
        clearInterval(mockRef.current!); mockRef.current = null; return;
      }
      const line = mockLines.current[idx];
      setTranscript(prev => prev ? `${prev} · ${line}` : line);
      execDetect(line);
      if (inputMode === "video") {
        setDeliveryScore(prev => Math.min(100, prev + 3 + Math.floor(Math.random() * 5)));
      }
    }, 2500);
    return () => { if (mockRef.current) { clearInterval(mockRef.current); mockRef.current = null; } };
  }, [isRunning, inputMode]);

  // ── Live score update whenever hits change ─────────────────────
  useEffect(() => {
    if (s.current.hits.size === 0 && s.current.miscons.length === 0) return;
    const bd = execComputeScore();
    setLiveScore(bd.finalScore);
  }, [conceptsHit, misconceptions]);

  // ── Internal helpers (read from refs — safe in stale closures) ──

  function execComputeScore(): ScoreBreakdown {
    return computeScore({
      concepts:       activeConceptsRef.current,
      hitIds:         s.current.hits,
      misconceptions: s.current.miscons,
      timeLeft:       s.current.time,
      totalTime:      total,
      cardDifficulty: cardRef.current.difficulty,
      streak:         cardRef.current.mastery.streak,
    });
  }

  function execDetect(text: string) {
    const result = detectConceptsEnhanced(text, activeConceptsRef.current, s.current.hits);

    if (result.newHits.length > 0) {
      result.newHits.forEach(id => s.current.hits.add(id));
      setConceptsHit(new Set(s.current.hits));
      // Trigger tick animation on first new hit
      const first = result.newHits[0];
      setLastHitId(first);
      setTimeout(() => setLastHitId(null), 800);
    }
    if (result.partialHits.length > 0) {
      result.partialHits.forEach(id => s.current.partials.add(id));
      setPartialHits(new Set(s.current.partials));
    }
    if (result.misconceptions.length > 0) {
      const fresh = result.misconceptions.filter(m => !s.current.miscons.includes(m));
      if (fresh.length > 0) {
        s.current.miscons = [...s.current.miscons, ...fresh];
        setMisconceptions([...s.current.miscons]);
      }
    }
  }

  function execReset() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mockRef.current)  { clearInterval(mockRef.current);  mockRef.current  = null; }
    s.current = { ...s.current, hits: new Set(), partials: new Set(), miscons: [], time: total, elapsed: 0, running: false, started: false };
    mockIdx.current = 0;
    setIsRunning(false);
    setHasStarted(false);
    setTimeRemaining(total);
    setElapsed(0);
    setConceptsHit(new Set());
    setPartialHits(new Set());
    setMisconceptions([]);
    setPressureColor("text-emerald-400");
    setLiveScore(0);
    setBreakdown(null);
    setDeliveryScore(0);
    setTranscript("");
    setLastHitId(null);
    setInputMode("typing");
  }

  // ── Public actions ─────────────────────────────────────────────

  const start = useCallback(() => {
    execReset();
    // Let reset batch-commit before starting (React 18 auto-batches so this is safe)
    s.current.running = true;
    s.current.started = true;
    setIsRunning(true);
    setHasStarted(true);
  }, []); // refs only — safe with empty deps

  const submit = useCallback((): ScoreBreakdown => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mockRef.current)  { clearInterval(mockRef.current);  mockRef.current  = null; }
    s.current.running = false;
    setIsRunning(false);
    const bd = execComputeScore();
    setBreakdown(bd);
    return bd;
  }, []);

  const reset = useCallback(() => { execReset(); }, []);

  const changeMode = useCallback((mode: InputMode) => {
    if (mockRef.current) { clearInterval(mockRef.current); mockRef.current = null; }
    mockIdx.current = 0;
    setInputMode(mode);
    setTranscript("");
  }, []);

  const processText = useCallback((text: string) => {
    execDetect(text);
  }, []); // execDetect reads only refs — safe

  return {
    card, activeConcepts: resolvedActive, totalConceptCount: card.concepts.length,
    isRunning, hasStarted, timeRemaining, elapsed,
    conceptsHit, partialHits, misconceptions, inputMode,
    pressureColor, liveScore, breakdown, deliveryScore,
    transcript, lastHitId,
    start, submit, reset, changeMode, processText,
  };
}
