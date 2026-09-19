import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar, PROFILES, WaveformBars } from '../components/InterviewerAvatar';
import { MouthOverlay, MOUTH_POSITIONS, MOUTH_OVERLAY_ENABLED } from '../components/MouthOverlay';
import { YouCamera } from '../components/YouCamera';
import { VoiceInput, type TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion } from '../api/explainApi';
import { speak, elevenLabsConfigured, getStoredInterviewerVolume, setInterviewerVolume } from '../api/ttsApi';
import { type CVContext, type JobSpecContext } from '../utils/contextBuilder';
import { CoachingOverlay } from '../components/CoachingOverlay';
import { sessionPrepareClient, generateMikeScriptOnly, generateModelAnswer, generateCandidateQuestion } from '../api/aiScoring';
import type { CompanyContext } from '../api/companiesApi';
import { saveQuestionBankEntry } from '../api/questionBankApi';
import { ChairSpinner } from '../components/ChairSpinner';
import CinematicMCQ from '../components/CinematicMCQ';
import AnswerRevealOverlay from '../components/AnswerRevealOverlay';
import AskInterviewerOverlay from '../components/AskInterviewerOverlay';
import { logFlowEvent } from '../api/flowLogger';
import { useAuthStore } from '../auth/authStore';
import { FILTER_CSS, FILTER_LABELS, FILTER_PRESETS, type FilterPreset } from '../hooks/useVideoFilter';
import { buildDemoQuestions } from './interview-room/demoQuestions';
import type { RoomPhase, SessionAnswer } from './interview-room/types';
import { useInterviewRecording } from '../hooks/useInterviewRecording';
import { useAnswerScoring } from '../hooks/useAnswerScoring';
import { useInterviewerAudio, MIKE_VIDEO_ENABLED } from '../hooks/useInterviewerAudio';
import { useMcqBonusRound, type McqGenParams } from '../hooks/useMcqBonusRound';
import { useGoDeeperFollowUps, GO_DEEPER_LIMITS } from '../hooks/useGoDeeperFollowUps';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { fetchAvatarConfig } from '../api/liveAvatarApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoomState {
  cvCtx?: CVContext;
  jobCtx?: JobSpecContext;
  questions?: InterviewQuestion[];
  sarahIntro?: string;
  jamesIntro?: string;
  specialistTitle?: string;
  mikeScript?: string | null;
  companyFacts?: string[];
  jobSpecText?: string;
  cvText?: string;
  jobTitle?: string;
  autoStart?: boolean;
  selectedLanguage?: string;
  selectedDifficulty?: string;
  interviewRound?: string;
  // See SALARY_BANDS in InterviewPackStart.tsx — optional, blends into sessionPrepareClient's
  // difficulty prompt, never overrides the literal Beginner/Standard/Pro/Expert selection above.
  salaryExpectation?: string;
  questionCount?: number;
  preferredName?: string;
  company?: string;
  // Company Specific interview (2026-09-19) — see api/companiesApi.ts. Present only when the candidate chose a company.
  companyContext?: CompanyContext;
  consentToRecord?: boolean;
  goDeeperEnabled?: boolean;
  specialFocus?: string[];
}

// Same 32 languages InterviewPackStart.tsx's intake dropdown offers (LANGUAGES there — see its
// own comment on why exactly these 32 and not more) — single source for the room's own
// read-only language badge, which used to duplicate a smaller, out-of-sync list as <option>
// entries on what was (until 2026-09-18) a live, but non-functional, in-room switcher.
const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 English (EN)', ar: '🇸🇦 Arabic (AR)', bg: '🇧🇬 Bulgarian (BG)', hr: '🇭🇷 Croatian (HR)',
  cs: '🇨🇿 Czech (CS)', da: '🇩🇰 Danish (DA)', nl: '🇳🇱 Dutch (NL)', fil: '🇵🇭 Filipino (FIL)',
  fi: '🇫🇮 Finnish (FI)', fr: '🇫🇷 French (FR)', de: '🇩🇪 German (DE)', el: '🇬🇷 Greek (EL)',
  hi: '🇮🇳 Hindi (HI)', hu: '🇭🇺 Hungarian (HU)', id: '🇮🇩 Indonesian (ID)', it: '🇮🇹 Italian (IT)',
  ja: '🇯🇵 Japanese (JA)', ko: '🇰🇷 Korean (KO)', ms: '🇲🇾 Malay (MS)', no: '🇳🇴 Norwegian (NO)',
  pl: '🇵🇱 Polish (PL)', pt: '🇵🇹 Portuguese (PT)', ro: '🇷🇴 Romanian (RO)', ru: '🇷🇺 Russian (RU)',
  sk: '🇸🇰 Slovak (SK)', es: '🇪🇸 Spanish (ES)', sv: '🇸🇪 Swedish (SV)', ta: '🇮🇳 Tamil (TA)',
  tr: '🇹🇷 Turkish (TR)', uk: '🇺🇦 Ukrainian (UK)', vi: '🇻🇳 Vietnamese (VI)', zh: '🇨🇳 Chinese (ZH)',
};

// Wayne's brief closing sign-off, spoken alongside Amina's own goodbye — see closeInterview's
// own comment for why. `name` already carries its own leading ", " (matches closeInterview's
// existing `name` construction), so each entry reads naturally as e.g. "Bye, Francis!".
const WAYNE_GOODBYES: Array<(name: string) => string> = [
  name => `Bye${name}!`,
  name => `Good luck${name}.`,
  name => `Take care${name}.`,
  name => `All the best${name}.`,
  name => `Thanks for your time${name}.`,
];

// ── Coaching cues — rotate during answering phase ────────────────────────────

const COACHING_CUES = [
  "Stay calm — you've got this 💪",
  "Take a breath before you start",
  "Use a real example from your past",
  "STAR: Situation, Task, Action, Result",
  "Don't worry about being perfect",
  "Speak slowly and clearly",
  "It's okay to pause and think",
  "Be specific — avoid vague answers",
  "Show your thinking, not just the outcome",
  "Confidence is half the answer 😊",
  "One clear example beats three weak ones",
  "They want you to succeed — back yourself",
];

function useCoachingCue(active: boolean) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * COACHING_CUES.length));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex(i => (i + 1) % COACHING_CUES.length), 5000);
    return () => clearInterval(id);
  }, [active]);
  return COACHING_CUES[index];
}

// ── Typewriter hook — reveals words at TTS speaking pace ─────────────────────

function useTypewriter(text: string, active: boolean, wordsPerMin = 215) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed('');
    const words = text.split(' ');
    const intervalMs = 60000 / wordsPerMin;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(words.slice(0, i).join(' '));
      if (i >= words.length) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [text, active, wordsPerMin]);

  return displayed;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  useParams<{ packId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = (location.state ?? {}) as RoomState;
  const cvCtx = ctx.cvCtx;
  const rawJobCtx = ctx.jobCtx;

  // The tab title otherwise stays the generic app name for the whole session — no way to
  // tell at a glance (browser tab, screen-share thumbnail, demo recording) which interview
  // is actually running. Restores whatever was there before on unmount/navigate-away.
  useEffect(() => {
    const previousTitle = document.title;
    const jobTitle = ctx.jobTitle?.trim();
    if (jobTitle) document.title = `${jobTitle} — Interview | TheInterviewChair.com`;
    return () => { document.title = previousTitle; };
  }, [ctx.jobTitle]);
  const authUser = useAuthStore(s => s.user);
  // Resolve candidate name: explicit "Known As" override wins, then the logged-in
  // account's own name, then undefined. Was CV-extracted firstName as the fallback
  // instead of the account name — but a CV can belong to anyone (a candidate testing
  // with someone else's CV, a recruiter previewing a role), while the account name is
  // always genuinely who's sitting in the interview. Found live: logging in as one
  // account but uploading a different person's CV made Sarah/James/Mike address the
  // CV's name, not the actual candidate's.
  const resolvedPreferredName = ctx.preferredName?.trim() || authUser?.firstName?.trim() || undefined;

  // Background AI session prep results
  const [bgQuestions, setBgQuestions] = useState<InterviewQuestion[] | null>(null);
  const bgMikeScriptRef = useRef<string | null>(null); // sync ref — always current when startMike fires
  // Same sync-ref treatment as bgMikeScriptRef, added 2026-09-18 — beginInterviewIntro previously
  // read effectiveSarahIntro/effectiveJamesIntro, derived from their own bgSarahIntro/bgJamesIntro
  // state, through an extra layer of indirection: beginInterviewIntroRef, kept current by its own
  // useEffect that only
  // runs after a render commits. Skipping Michelle's intro early made handleMikeIntroDone's own
  // "is Phase 2 ready" check race that effect — phase2ReadyRef could already read true (it's set
  // synchronously) before React had actually re-rendered with the new intro text AND run the
  // ref-sync effect, so beginInterviewIntroRef.current still pointed at the closure from before
  // Phase 2 landed, falling back to generic/fallback intros despite the real data already being
  // in state (Francis, 2026-09-18: "skip during Michelle's intro" reliably reproduced this).
  // Reading these refs directly inside beginInterviewIntro removes that race the same way
  // bgMikeScriptRef already does for Michelle's own script.
  const bgSarahIntroRef = useRef<string | null>(null);
  const bgJamesIntroRef = useRef<string | null>(null);
  const [bgCompanyFacts, setBgCompanyFacts] = useState<string[]>([]);
  const [bgSpecialistTitle, setBgSpecialistTitle] = useState<string | null>(null);
  // The company Sarah/James/the questions actually named this session — echoes ctx.company
  // when one was confirmed, otherwise the model's own invented one. This is what gets saved,
  // since ctx.company alone is often unset (a bare job title, no full job spec).
  const [bgResolvedCompany, setBgResolvedCompany] = useState<string | null>(null);
  const bgLoadRef = useRef(false);
  const bgLoadedRef = useRef(false); // true once AI results arrive

  // rawJobCtx (the full parsed JobSpecContext) is only ever populated by the full intake
  // flow — sessions started via the quicker path (just a job title, no CV/job-spec upload,
  // which is the common case) never build one. This single fallback is the ONLY place that
  // gap gets filled — every consumer (scoring, Tell Me The Answer, both uploadRecording call
  // sites, and the summary page navigate) reads this, not rawJobCtx directly, specifically so
  // they can't drift out of sync again: this exact bug previously existed because the
  // summary-page navigate had its own local fallback that the upload calls never saw, so a
  // freshly-finished interview looked fine (from route state) but the SAVED copy — what you
  // get back later from the list — was missing title/company. Found live 2026-09-09.
  const jobCtx = rawJobCtx ?? {
    rawText: '', title: ctx.jobTitle ?? '', company: bgResolvedCompany ?? ctx.company,
    requiredSkills: [], techStack: [], responsibilities: [], behaviouralThemes: [],
    leadershipExpectations: [], seniority: '',
  };

  // MCQ bonus round generation params — set once Phase 2 hands back a real job spec; see
  // useMcqBonusRound's own doc comment for why this is the "session prep succeeded" signal.
  const [mcqGenParams, setMcqGenParams] = useState<McqGenParams | null>(null);

  const passInProgressRef = useRef(false); // prevents double-firing Pass button

  // Session-prep readiness — Mike waits for AI to return (max 8 s) before speaking
  const sessionReadyRef = useRef(false);
  const sessionWaitersRef = useRef<Array<() => void>>([]);

  // Phase-2 readiness — Sarah/James wait for their real AI intros the same way Mike waits
  // for his above. Without this, Phase 2 (now up to 3 sequential calls plus a top-up, see
  // sessionPrepareClient's question-count retry loop) can still be in flight when Mike
  // finishes speaking, and Sarah/James silently fall back to the static, name-less lines
  // below instead of the real AI-generated ones with the candidate's name. The cap has to
  // be generous — Mike's own script typically takes 45-60s to speak, and Phase 2's retry
  // chain can legitimately take 20-30s+ — a short cap (10s tried first) just resolves the
  // wait early and reproduces the exact bug it was meant to fix.
  const phase2ReadyRef = useRef(false);
  const phase2WaitersRef = useRef<Array<() => void>>([]);

  // Derived values — fresh AI results ALWAYS win over anything pre-passed via route state
  const questions = bgQuestions ?? buildDemoQuestions(ctx.questionCount);
  // Empty until the real AI companyFacts land — these placeholder questions never name a
  // specific employer (see buildDemoQuestions), so there's nothing sensible to score against yet.
  const companyKeywords = bgCompanyFacts;
  const specialistTitle = bgSpecialistTitle ?? 'Hiring Manager';

  const authToken = useAuthStore(s => s.token);

  const getCandidateId = () => {
    if (authUser?.id) return authUser.id;
    // Not logged in (shouldn't happen — this route requires CAN_START_INTERVIEW) — fall
    // back to a per-browser anonymous id so recording upload doesn't hard-fail.
    const key = 'explain_candidate_id';
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  };

  const consentToRecord = ctx.consentToRecord !== false;
  const [cameraOn, setCameraOn] = useState(true);
  // Master volume for Sarah/James/Mike's voices — a real on-screen control instead of the
  // candidate having to hunt for OS/browser volume mid-interview. Persisted in localStorage
  // (see ttsApi.ts) so it carries across sessions; takes effect immediately even mid-sentence.
  const [interviewerVolume, setInterviewerVolumeUI] = useState(() => getStoredInterviewerVolume());
  const [volumeMenuOpen, setVolumeMenuOpen] = useState(false);
  function handleVolumeChange(v: number) {
    setInterviewerVolumeUI(v);
    setInterviewerVolume(v);
  }
  // Appearance filter — same presets as the Profile Video recorder (useVideoFilter.ts),
  // applied here as a plain CSS filter on the self-view rather than that hook's own
  // independent getUserMedia+canvas pipeline, since YouCamera already owns the camera
  // stream here. Desktop recording is a tab-capture (getDisplayMedia), so this filter is
  // automatically included in the saved video for free; the mobile recording path draws
  // its own canvas frame-by-frame (see startRecording below) and needs it applied there too.
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('beauty');

  const [phase, setPhase] = useState<RoomPhase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [useVoice, setUseVoice] = useState(true);
  const [goDeeperEnabled, setGoDeeperEnabled] = useState(ctx.goDeeperEnabled ?? false);
  const [highlightRecord, setHighlightRecord] = useState(false);
  // True only while the mic is actually capturing a voice answer — gates Repeat/Pause/Pass
  // below so a mistimed click can't land while an answer recording is live (that's how a
  // repeated question ended up baked into a candidate's own answer clip).
  const [isCapturingAnswer, setIsCapturingAnswer] = useState(false);
  // Fixed at intake, same read-only-after-the-fact treatment as Difficulty/Round below — the
  // in-room switcher used to let candidates change this live, but the interview's questions are
  // all generated once, right after Michelle's briefing, in whatever language was selected on
  // the intake screen; switching later couldn't retroactively translate already-generated
  // question text, so the control looked live but silently did nothing (Francis, 2026-09-18).
  const [sessionLanguage] = useState(ctx.selectedLanguage ?? 'en');
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  // Fixed at intake — no setter. Questions/scoring/Go Deeper limits are all built around
  // whatever difficulty was chosen before the room ever loaded; there's no legitimate way to
  // change it mid-session, so nothing in this file should be able to either.
  const [selectedDifficulty] = useState<string>(ctx.selectedDifficulty ?? 'Standard');
  const [selectedInterviewRound] = useState<string>(ctx.interviewRound ?? 'First Round Interview');
  const [audioCheckState, setAudioCheckState] = useState<'idle' | 'playing' | 'done'>('idle');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedPhaseRef = useRef<RoomPhase>('answering');
  // Mike's English pre-rendered video has no other stop mechanism — unlike Sarah/James's
  // clips, it isn't routed through InterviewerAvatar's videoUrl prop, so Skip Intro needs a
  // direct ref to actually pause it rather than just changing state around it.
  const mikeVideoRef = useRef<HTMLVideoElement>(null);

  const q = questions[qIndex];
  const isHrQuestion = q?.source === 'HR';

  const {
    isRecording, recordingFailed, uploadStatus,
    startRecording, uploadRecording, buildPlaybackUrl,
    chapterMarkersRef, interviewIdRef, recordingStartTimeRef,
    videoElRef: recordVideoElRef, canvasElRef: recordCanvasElRef,
  } = useInterviewRecording({
    phase,
    filterPreset,
    questionText: q?.questionText,
    candidateId: getCandidateId(),
    authToken,
    jobTitle: ctx.jobTitle,
    company: bgResolvedCompany ?? ctx.company,
    companyMock: Boolean(ctx.companyContext),
    selectedDifficulty: ctx.selectedDifficulty,
    hasCv: Boolean(ctx.cvText?.trim()),
    candidateName: authUser?.name,
  });

  const {
    currentScore, sessionAnswers, runningScores, coachingMessage,
    submitAnswer: scoreAnswer, recordPassedAnswer, recordRevealedAnswer, resetForNextQuestion,
  } = useAnswerScoring({ cvCtx, jobCtx, companyKeywords, sessionLanguage, selectedDifficulty });

  // LiveAvatar kill switch — read once per room mount, before either seat attempts to connect.
  // Defaults true (fail open) until the fetch resolves, and stays true if the fetch itself
  // fails — an admin's explicit "off" is a real Cosmos doc, not something a network hiccup
  // should be able to fake. See PlatformSettings' liveAvatar setting for the actual toggle.
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  useEffect(() => { fetchAvatarConfig().then(cfg => setAvatarEnabled(cfg.enabled)); }, []);

  // LiveAvatar — real-time video avatars, one concurrent session per seat (Amina on hr, Wayne
  // on technical; see useInterviewerAudio's liveAvatarSpeak/liveAvatarSpeakTechnical param
  // docs). Each connects lazily, on first use, rather than on room mount: HeyGen's sandbox
  // sessions cap at ~1 minute, and the Mike + intro sequence ahead of the first real question
  // can easily take longer than that on its own — connecting early would burn the session
  // before either avatar ever speaks.
  // Dedicated analyser state for the live-video overlay's own WaveformBars — kept separate
  // from hrAnalyser/techAnalyser (owned by useInterviewerAudio, fed only by the pre-rendered-
  // video/plain-TTS paths) rather than threading it through that hook, since useInterviewerAudio
  // is constructed AFTER these two hooks (it needs liveAvatarSpeakHr/Technical as params), so
  // its own analyser setters don't exist yet at this point in the component.
  const [liveHrAnalyser, setLiveHrAnalyser] = useState<AnalyserNode | null>(null);
  const [liveTechAnalyser, setLiveTechAnalyser] = useState<AnalyserNode | null>(null);
  const [liveMichelleAnalyser, setLiveMichelleAnalyser] = useState<AnalyserNode | null>(null);
  const liveAvatarHr = useLiveAvatarSession('hr', setLiveHrAnalyser);
  const liveAvatarTechnical = useLiveAvatarSession('technical', setLiveTechAnalyser);
  // Michelle (2026-09-17, replacing the old static-photo "Mike") — a real HeyGen LiveAvatar
  // seat exactly like Amina/Wayne, connected only for the pre-interview briefing and
  // disconnected the moment it's over (see handleMikeIntroDone below), not a third seat that
  // runs the whole interview.
  const liveAvatarMichelle = useLiveAvatarSession('michelle', setLiveMichelleAnalyser);

  const liveAvatarSpeakHr = useCallback((text: string, onEnd: () => void, onAnalyser?: (a: AnalyserNode | null) => void) => {
    let cancelled = false;
    let fallbackCancel: (() => void) | null = null;
    // Set the instant AVATAR_SPEAK_STARTED fires (see useLiveAvatarSession.ts's speak() — HeyGen's
    // own confirmation the avatar has genuinely begun talking). Distinguishes the catch block's
    // two real failure shapes, which need OPPOSITE handling: (a) speak() rejected before ever
    // starting (dead air — TTS fallback is correct, see comment below) vs (b) speak() rejected
    // only via its own safety TIMEOUT after speech had already started (the documented HeyGen
    // AVATAR_SPEAK_ENDED-never-fires gap — the avatar already spoke the full text out loud, it
    // just never confirmed finishing). Falling back to TTS in case (b) re-speaks the exact same
    // line a second time — Wayne's audible "said his intro twice" (Francis, 2026-09-18) was
    // exactly this: his real timeout is proportional to word count, so a normal-length intro's
    // natural speaking duration routinely runs right up against it.
    let speechStarted = false;
    (async () => {
      try {
        if (liveAvatarHr.status !== 'connected') await liveAvatarHr.connect();
        // LiveAvatar has no Web Audio analyser to hand back (the video's lip-sync isn't driven
        // through the Web Audio graph the plain-TTS path uses) — this reuses the same callback
        // slot purely as a "speech has genuinely started" timing signal, called with null.
        await liveAvatarHr.speak(text, 'hr', () => { speechStarted = true; onAnalyser?.(null); });
        if (!cancelled) onEnd();
      } catch (err) {
        if (speechStarted) {
          // Case (b) above — treat the timeout as a natural completion, not a failure. Same
          // "the safety timeout firing is expected, not a new bug" reasoning already established
          // for this HeyGen gap elsewhere in the room.
          console.warn('[InterviewRoom] LiveAvatar (hr) speak timed out after already starting — treating as complete, not re-speaking:', err);
          if (!cancelled) onEnd();
          return;
        }
        // A failed connect/speak used to just call onEnd() here — the candidate got silence
        // with no indication anything went wrong (this is exactly what happened live when
        // Amina's avatar_id turned out not to be sandbox-eligible: her connect() rejected
        // instantly, onEnd() fired instantly, and the whole intro sequence appeared to
        // "skip" straight to the first question with no audio at all). Falling back to plain
        // TTS here means a genuine avatar failure degrades to "she just talks, no video"
        // instead of dead air.
        console.error('[InterviewRoom] LiveAvatar (hr) speak failed, falling back to TTS:', err);
        if (!cancelled) fallbackCancel = speak(text, 'hr', onEnd, onAnalyser);
      }
    })();
    return () => { cancelled = true; fallbackCancel?.(); liveAvatarHr.interrupt(); };
  }, [liveAvatarHr]);

  const liveAvatarSpeakTechnical = useCallback((text: string, onEnd: () => void, onAnalyser?: (a: AnalyserNode | null) => void) => {
    let cancelled = false;
    let fallbackCancel: (() => void) | null = null;
    // See liveAvatarSpeakHr's own comment for the full reasoning on speechStarted.
    let speechStarted = false;
    (async () => {
      try {
        if (liveAvatarTechnical.status !== 'connected') await liveAvatarTechnical.connect();
        await liveAvatarTechnical.speak(text, 'technical', () => { speechStarted = true; onAnalyser?.(null); });
        if (!cancelled) onEnd();
      } catch (err) {
        if (speechStarted) {
          console.warn('[InterviewRoom] LiveAvatar (technical) speak timed out after already starting — treating as complete, not re-speaking:', err);
          if (!cancelled) onEnd();
          return;
        }
        console.error('[InterviewRoom] LiveAvatar (technical) speak failed, falling back to TTS:', err);
        if (!cancelled) fallbackCancel = speak(text, 'technical', onEnd, onAnalyser);
      }
    })();
    return () => { cancelled = true; fallbackCancel?.(); liveAvatarTechnical.interrupt(); };
  }, [liveAvatarTechnical]);

  const liveAvatarSpeakMichelle = useCallback((text: string, onEnd: () => void, onAnalyser?: (a: AnalyserNode | null) => void) => {
    let cancelled = false;
    let fallbackCancel: (() => void) | null = null;
    // See liveAvatarSpeakHr's own comment for the full reasoning on speechStarted.
    let speechStarted = false;
    (async () => {
      try {
        if (liveAvatarMichelle.status !== 'connected') await liveAvatarMichelle.connect();
        await liveAvatarMichelle.speak(text, 'michelle', () => { speechStarted = true; onAnalyser?.(null); });
        if (!cancelled) onEnd();
      } catch (err) {
        if (speechStarted) {
          console.warn('[InterviewRoom] LiveAvatar (michelle) speak timed out after already starting — treating as complete, not re-speaking:', err);
          if (!cancelled) onEnd();
          return;
        }
        console.error('[InterviewRoom] LiveAvatar (michelle) speak failed, falling back to TTS:', err);
        if (!cancelled) fallbackCancel = speak(text, 'michelle', onEnd, onAnalyser);
      }
    })();
    return () => { cancelled = true; fallbackCancel?.(); liveAvatarMichelle.interrupt(); };
  }, [liveAvatarMichelle]);

  // Cost control (Francis, 2026-09-11): HeyGen bills LiveAvatar per minute of a CONNECTED
  // session, not per minute of actual talking — before this, both avatars connected once for
  // the intro and then simply stayed connected, billed, and idle-blinking for the candidate's
  // entire thinking/answering time on every question (often the longest part of the interview
  // by far). Disconnecting here and reconnecting when the candidate submits is the fix, at a
  // real cost: it means a fresh WebRTC handshake before every single question instead of once
  // per interview, which is exactly the code path behind the still-open HeyGen first-utterance
  // lip-sync ticket — if that glitch starts showing up on questions beyond the first, THIS is
  // the first place to suspect and revert (see project-liveavatar-lipsync-investigation memory).
  // Reconnecting both seats on 'scoring' rather than just whichever one asks the next question
  // is deliberate: with handoffs (either interviewer can interject after either's question) and
  // mixed HR/technical question ordering, knowing which single seat will actually be needed next
  // isn't reliably knowable here — the brief double-connect during this warm-up window is a few
  // seconds, not the multi-minute idle window this whole change exists to eliminate.
  //
  // Interaction with real listening-pose calls (2026-09-16): askQuestion's onDone (in
  // useInterviewerAudio.ts) calls liveAvatarHr/Technical.startListening() synchronously, in the
  // same callback that also calls setPhase('answering') — that WS frame reliably reaches a still-
  // connected session, strictly before this effect's own disconnect runs on the next render, but
  // the resulting "Listening" pose is only visible for that brief window, not the candidate's
  // whole answer, since this effect tears the session down moments later. This is expected, not
  // a bug — do not "fix" it by keeping sessions connected through answering; that reintroduces
  // the exact idle-billing cost this effect exists to eliminate.
  useEffect(() => {
    if (!avatarEnabled) return;
    if (phase === 'answering') {
      if (liveAvatarHr.status === 'connected') void liveAvatarHr.disconnect();
      if (liveAvatarTechnical.status === 'connected') void liveAvatarTechnical.disconnect();
    } else if (phase === 'scoring') {
      void liveAvatarHr.connect();
      void liveAvatarTechnical.connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect/disconnect/status change
    // identity on every render (useLiveAvatarSession isn't memoised for that); depending only on
    // the two real triggers keeps this from firing on every unrelated re-render.
  }, [phase, avatarEnabled]);

  const {
    hrState, techState, hrAnalyser, techAnalyser, speechStarted,
    awaitingHandoff,
    handleSarahVideoAnalyser, handleJamesVideoAnalyser,
    stopAllInterviewerAudio,
    askQuestion, repeatQuestion, testAudio, startMike, handleMikeIntroDone,
    askFollowUpWithHandoff,
    cancelSpeakRef, thinkStartRef, onDoneRef,
    setHrState, setTechState,
  } = useInterviewerAudio({
    questions, qIndex, setPhase, sessionLanguage,
    bgSarahIntroRef, bgJamesIntroRef, bgMikeScriptRef, specialistTitle,
    resolvedPreferredName, jobTitle: ctx.jobTitle, specialFocus: ctx.specialFocus,
    aiQuestionsLoaded: bgLoadedRef.current,
    chapterMarkersRef, recordingStartTimeRef,
    phase2ReadyRef, phase2WaitersRef,
    jobSpecText: ctx.jobSpecText, cvText: ctx.cvText, ctxSelectedLanguage: ctx.selectedLanguage,
    setHighlightRecord, setAudioCheckState,
    liveAvatarSpeak: liveAvatarSpeakHr, liveAvatarActive: avatarEnabled,
    liveAvatarSpeakTechnical, liveAvatarActiveTechnical: avatarEnabled,
    liveAvatarConnect: liveAvatarHr.connect, liveAvatarConnectTechnical: liveAvatarTechnical.connect,
    liveAvatarSpeakMichelle, liveAvatarActiveMichelle: avatarEnabled,
    liveAvatarConnectMichelle: liveAvatarMichelle.connect, liveAvatarDisconnectMichelle: liveAvatarMichelle.disconnect,
    // Activates real HeyGen-confirmed listening pose during the candidate's answer window
    // (2026-09-16) — previously never called here at all (only the Talk Room called these).
    // NOTE: InterviewRoomPage's own cost-control effect below disconnects both avatar sessions
    // the instant phase becomes 'answering', so this pose is only visible for a brief window
    // right after a question ends, not the candidate's whole answer — see that effect's comment.
    liveAvatarStartListening: liveAvatarHr.startListening, liveAvatarStopListening: liveAvatarHr.stopListening,
    liveAvatarStartListeningTechnical: liveAvatarTechnical.startListening, liveAvatarStopListeningTechnical: liveAvatarTechnical.stopListening,
  });

  const {
    mcqQuestions, mcqActive, mcqBonusPoints, mcqResults,
    activeMcqQuestion, activeMcqOrdinal,
    maybeFireMcq, recordMcqResult,
  } = useMcqBonusRound({ cancelSpeakRef, chapterMarkersRef, recordingStartTimeRef, mcqGenParams });

  const { goDeeperFiredRef, evaluateGoDeeper } = useGoDeeperFollowUps({ goDeeperEnabled, selectedDifficulty });

  const avgScore = runningScores.length > 0
    ? Math.round(runningScores.reduce((s, v) => s + v, 0) / runningScores.length * 100)
    : null;

  // Timer
  useEffect(() => {
    if (phase === 'answering' && !paused) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, paused]);

  const startInterview = useCallback(async () => {
    // Fire both avatars' connect() as early as humanly possible — the whole recording-consent
    // dialog plus Mike's entire spoken intro become free warm-up time before either avatar ever
    // has to speak. Found live 2026-09-13: the intro's own speak() call was the FIRST thing that
    // ever triggered connect() for either seat (liveAvatarSpeakHr/Technical connect lazily, on
    // first use) — meaning it fired with zero head start, unlike every question from Q2 onward,
    // which already gets pre-connected during the previous question's 'scoring' phase (see that
    // effect's own comment a few lines up — it explicitly anticipated this exact investigation).
    // That gap, not anything about the intro's content, is the leading suspect for why only ever
    // the first utterance of a session has glitched. Fire-and-forget, same pattern as the
    // Q2+ reconnect — liveAvatarHr/Technical.connect() are themselves idempotent no-ops if
    // already connected or connecting.
    if (avatarEnabled) {
      void liveAvatarHr.connect();
      void liveAvatarTechnical.connect();
      // Michelle (2026-09-17) is a live avatar seat too now, but startMike() only ever
      // triggered her connect() lazily on first speak — the exact zero-head-start gap the
      // comment above already diagnosed for Amina/Wayne, just never carried over to her when
      // she replaced the old static-photo Mike. Live-reported same day: she sat staring
      // silently for a few seconds before her briefing started. Same fix — fire her connect()
      // here too, so the recording-consent dialog becomes free warm-up time for her as well.
      void liveAvatarMichelle.connect();
    }
    if (consentToRecord) {
      await startRecording(); // wait for browser share dialog before Mike speaks
    }
    startMike();
  }, [startMike, startRecording, consentToRecord, avatarEnabled, liveAvatarHr, liveAvatarTechnical, liveAvatarMichelle]);

  // ── Two-phase AI loading ──────────────────────────────────────────────────────
  // Phase 1 (fast ~2s): Mike's script only — unblocks Mike immediately
  // Phase 2 (while Mike speaks ~8s): full interview — questions, intros, facts
  useEffect(() => {
    if (bgLoadRef.current) return;
    bgLoadRef.current = true;

    const resolvedJobTitle = ctx.jobTitle || 'Senior Professional';
    // No Company/Industry line here on purpose — this used to hardcode a random real company
    // (see companyBank.ts's pickRandomCompany) picked with zero regard for the job title,
    // which is how a Shop Sales Assistant ended up interviewing "at Barclays". Leaving the
    // employer unstated lets sessionPrepareClient's own COMPANY NAMING rule pick a genuinely
    // fitting one (a real one via ctx.company below, or its own invented one) in the same
    // call as the questions, instead of this file guessing first and boxing the AI in.
    const jobSpec = ctx.jobSpecText || `Job Title: ${resolvedJobTitle}
Location: United Kingdom

We are looking for an experienced ${resolvedJobTitle} to join our team. The successful candidate will bring strong problem-solving ability, excellent communication skills, and a track record of delivering results under pressure. This role requires collaboration across teams, sound judgement, adaptability to change, and the ability to manage competing priorities effectively. The candidate should demonstrate initiative, professional integrity, and a commitment to continuous improvement.`;

    // 5s fallback — Mike never waits longer than this even if Phase 1 is slow
    const mikeTimeout = setTimeout(() => {
      if (!sessionReadyRef.current) {
        sessionReadyRef.current = true;
        sessionWaitersRef.current.forEach(cb => cb());
        sessionWaitersRef.current = [];
      }
    }, 5000);

    // 35s fallback for Phase 2 (Sarah/James) — started once Phase 2 actually begins, below.
    // Generous on purpose: see the phase2ReadyRef comment for why a short cap defeats itself.
    let phase2Timeout: ReturnType<typeof setTimeout> | undefined;
    const resolvePhase2 = (via: 'real-data' | '90s-timeout-fallback' = 'real-data') => {
      if (phase2Timeout) clearTimeout(phase2Timeout);
      if (phase2ReadyRef.current) return;
      phase2ReadyRef.current = true;
      // Temporary diagnostic (Francis, 2026-09-10) — see handleMikeIntroDone's matching
      // [Phase2 TIMING] log. "90s-timeout-fallback" here means the real AI data never arrived
      // in time and Sarah/James fell back to generic, name-less lines.
      console.log(`[Phase2 TIMING] Phase 2 resolved (${via}) @ ${Math.round(performance.now())}ms`);
      // setTimeout(0) gives React one tick to flush the setBgSarahIntro/setBgJamesIntro
      // calls that precede this so beginInterviewIntroRef.current (only updated by its own
      // effect after a render commits) has already picked up the fresh text — same pattern,
      // same reason, as Mike's own sessionReadyRef resolution above. Without this, a waiter
      // queued because Mike finished speaking before Phase 2 resolved fires synchronously in
      // the same tick as the state update, reading the closure from BEFORE it — so the wait
      // itself worked, but the content it unblocked was still last render's stale, name-less
      // one, reproducing the exact bug this whole gate exists to prevent.
      setTimeout(() => {
        phase2WaitersRef.current.forEach(cb => cb());
        phase2WaitersRef.current = [];
      }, 0);
    };

    // Phase 1: Mike's script only — fast
    generateMikeScriptOnly({
      jobTitle: ctx.jobTitle,
      companyName: ctx.company || undefined,
      jobSpecText: ctx.jobSpecText,
      cvText: ctx.cvText,
      selectedDifficulty: ctx.selectedDifficulty,
      selectedLanguage: ctx.selectedLanguage,
      preferredName: resolvedPreferredName,
      interviewRound: ctx.interviewRound,
      companyMock: Boolean(ctx.companyContext),
    }).then(script => {
      clearTimeout(mikeTimeout);
      if (script) bgMikeScriptRef.current = script;
      logFlowEvent('MIKE_SCRIPT_READY', { chars: script?.length ?? 0 });

      // setTimeout(0) gives React one tick to flush setBgMikeScript so that
      // startMikeRef.current captures the updated script before Mike speaks
      setTimeout(() => {
        if (!sessionReadyRef.current) {
          sessionReadyRef.current = true;
          sessionWaitersRef.current.forEach(cb => cb());
          sessionWaitersRef.current = [];
        }
      }, 0);

      // Phase 2: fires in parallel — doesn't wait for the setTimeout above. Widened 35s -> 55s
      // -> 90s (2026-09-08) — chatJSON's own retry loop (aiScoring.ts) can burn up to ~90s
      // worst-case on its own (three 429 retries at up to 30s each), before sessionPrepareClient's
      // question-count top-up logic even runs, and this recurred live the same day two
      // concurrent LiveAvatar sessions started sharing the same backend, making that worst
      // case more likely to actually happen, not just theoretical. When this fallback fires
      // before the real data arrives, Amina/Wayne silently fall back to their generic,
      // name-less lines — that's what "James stopped saying my name" was, and what "Amina
      // didn't say my name" was too.
      phase2Timeout = setTimeout(() => resolvePhase2('90s-timeout-fallback'), 90000);
      console.log(`[Phase2 TIMING] sessionPrepareClient() call starting @ ${Math.round(performance.now())}ms`);
      return sessionPrepareClient(jobSpec, ctx.cvText, ctx.selectedLanguage, ctx.jobTitle, ctx.selectedDifficulty, resolvedPreferredName, ctx.questionCount, ctx.company || undefined, ctx.specialFocus, ctx.interviewRound, ctx.salaryExpectation, ctx.companyContext);

    }).then(result => {
      bgLoadedRef.current = true;
      if (!result) { resolvePhase2(); return; }
      setBgQuestions(result.questions);
      if (result.sarahIntro) bgSarahIntroRef.current = result.sarahIntro;
      if (result.jamesIntro) bgJamesIntroRef.current = result.jamesIntro;
      if (result.companyFacts?.length) setBgCompanyFacts(result.companyFacts);
      if (result.specialistTitle) setBgSpecialistTitle(result.specialistTitle);
      if (result.resolvedCompany) setBgResolvedCompany(result.resolvedCompany);
      resolvePhase2();
      setMcqGenParams({ jobSpec, jobTitle: ctx.jobTitle, cvText: ctx.cvText, fallback: result.mcqQuestions ?? [] });
      logFlowEvent('QUESTION_GENERATED', { count: result.questions.length, specialistTitle: result.specialistTitle });

    }).catch(err => {
      clearTimeout(mikeTimeout);
      bgLoadedRef.current = true;
      console.error('[InterviewRoom] AI prep failed — using demo fallback:', err);
      if (!sessionReadyRef.current) {
        sessionReadyRef.current = true;
        sessionWaitersRef.current.forEach(cb => cb());
        sessionWaitersRef.current = [];
      }
      resolvePhase2();
    });

    return () => { clearTimeout(mikeTimeout); if (phase2Timeout) clearTimeout(phase2Timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start — wait for AI session prep (max 8 s via prepTimeout), then start Mike
  // This ensures Mike always uses AI-generated script when the key is valid
  // autoStart only means the setup page was skipped — the chair screen
  // always waits for the user to click "Begin Interview →"

  const handlePause = useCallback(() => {
    pausedPhaseRef.current = phase;
    cancelSpeakRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);
    setPaused(true);
  }, [phase]);

  const handleResume = useCallback(() => {
    setPaused(false);
    if (pausedPhaseRef.current === 'asking' || pausedPhaseRef.current === 'interviewer-intro') {
      setTimeout(() => askQuestion(qIndex), 200);
    }
  }, [askQuestion, qIndex]);

  // Decides (via useGoDeeperFollowUps) whether to fire a Go Deeper probing follow-up after the
  // answer that was just scored/coached, then — if it fires — splices the synthetic question
  // into bgQuestions right after the current index so the entire existing ask/answer/score/coach
  // pipeline handles it for free, and calls into interviewer-audio to actually ask it. Both the
  // splice and the interviewer-audio call stay here rather than in the hook, since this is the
  // one place that already owns bgQuestions and askQuestion/askFollowUpWithHandoff. Returns true
  // if fired (caller should skip its normal advance-to-next-question logic).
  const maybeGoDeeper = useCallback((lastAnswer: SessionAnswer): boolean => {
    const decision = evaluateGoDeeper(lastAnswer);
    if (!decision) return false;

    const insertIndex = qIndex + 1;
    setBgQuestions(prev => {
      const arr = [...(prev ?? questions)];
      arr.splice(insertIndex, 0, decision.followUpQuestion);
      return arr;
    });
    setQIndex(insertIndex);

    if (decision.doHandoff) {
      askFollowUpWithHandoff(insertIndex, decision.followUpQuestion, decision.followUpText, decision.originalInterviewer);
    } else {
      askQuestion(insertIndex, `${decision.transition} ${decision.followUpText}`, decision.originalInterviewer, decision.followUpQuestion);
    }
    return true;
  }, [evaluateGoDeeper, qIndex, questions, askQuestion, askFollowUpWithHandoff]);

  const closeInterview = useCallback((answers: SessionAnswer[], mcqRes: typeof mcqResults, bonusPts: number, askInterviewerBonusPts = 0) => {
    const name = resolvedPreferredName ? `, ${resolvedPreferredName}` : '';
    const closingLine = `Well${name}, that brings us to the end of your interview — thank you so much for your time today. I'm going to have a quick word with Wayne, and then your agent Michelle will be in touch shortly with some feedback. In the meantime, you can watch your full interview replay on the next screen, and retake it anytime you like. Best of luck!`;
    cancelSpeakRef.current?.();
    // Whichever path got us here (normal coaching flow, Pass, or an MCQ finish),
    // leave 'done' so the answer/coaching panels can't stay mounted and clickable
    // underneath Sarah's goodbye speech.
    setPhase('done');
    resetForNextQuestion();
    setHrState('speaking');
    const goToSummary = () => {
      navigate(`/interview-summary/${interviewIdRef.current}`, {
        state: {
          answers, cvCtx, jobCtx, mcqResults: mcqRes, mcqQuestions, mcqBonusPoints: bonusPts,
          askInterviewerBonusPoints: askInterviewerBonusPts,
          playbackUrl: buildPlaybackUrl(), chapters: chapterMarkersRef.current,
          interviewId: interviewIdRef.current, candidateId: getCandidateId(),
          companyMock: Boolean(ctx.companyContext),
          selectedDifficulty: ctx.selectedDifficulty,
          hasCv: Boolean(ctx.cvText?.trim()),
        },
      });
    };
    const onClosingDone = () => {
      setHrState('idle');
      // Wayne's own brief sign-off — fires here, AFTER Amina finishes, not alongside her (Francis,
      // 2026-09-18, after live-testing both: "he's supposed to say it on her very last utterance...
      // might be better for him to just say it right at the end, so he's the last voice you hear").
      // Genuinely sequential: navigation waits for his own onEnd, not a guessed delay — his speak()
      // call already has the same safety-timeout fallback every other avatar line does, so this
      // can't hang the interview even if his own AVATAR_SPEAK_ENDED never arrives.
      if (name) {
        const wayneGoodbye = WAYNE_GOODBYES[Math.floor(Math.random() * WAYNE_GOODBYES.length)](name);
        setTechState('speaking');
        const onWayneGoodbyeDone = () => { setTechState('idle'); goToSummary(); };
        if (avatarEnabled) liveAvatarSpeakTechnical(wayneGoodbye, onWayneGoodbyeDone);
        else speak(wayneGoodbye, 'technical', onWayneGoodbyeDone);
      } else {
        goToSummary();
      }
    };
    // Same live-avatar-first pattern as askQuestion/beginInterviewIntro — this was the one
    // spoken line left on the plain TTS path (deliberately deferred scope), which is why
    // Amina's lips didn't move on the goodbye line even though everything else was live.
    cancelSpeakRef.current = avatarEnabled
      ? liveAvatarSpeakHr(closingLine, onClosingDone)
      : speak(closingLine, 'hr', onClosingDone, handleSarahVideoAnalyser);
  }, [resolvedPreferredName, navigate, cvCtx, jobCtx, mcqQuestions, buildPlaybackUrl, resetForNextQuestion, handleSarahVideoAnalyser, setHrState, setTechState, avatarEnabled, liveAvatarSpeakHr, liveAvatarSpeakTechnical]);

  // ── "Ask The Interviewer" — end-of-interview candidate-questions moment (Francis, 2026-09-17) ──
  // Fires on ~half of sessions (decided once here, never re-rolled mid-session), right after the
  // last question's coaching closes and before the goodbye line. Amina asks if the candidate has
  // any questions, then offers — same "Tell Me The Answer" shape — to suggest a genuinely good one
  // to ask, with the same Save mechanism as the Question Bank. A plain "Continue" always exists so
  // a candidate who already knows what to ask isn't forced through it.
  const ASK_INTERVIEWER_BONUS_POINTS = 5;
  const askInterviewerRollRef = useRef(Math.random() < 0.5);
  const askInterviewerFiredRef = useRef(false);
  const askInterviewerCloseArgsRef = useRef<{ answers: SessionAnswer[]; results: typeof mcqResults; bonusPoints: number } | null>(null);
  const [askInterviewerReady, setAskInterviewerReady] = useState(false);
  const [askInterviewerReveal, setAskInterviewerReveal] = useState<{ loading: boolean; question: string | null; rationale: string | null } | null>(null);

  // Uploads the recording and closes — deliberately deferred until any "Ask The Interviewer"
  // moment has fully resolved (Continue or Save & Continue), so the earned bonus (if any) can be
  // baked into the persisted overallScore in the SAME upload, not a separate patch afterward.
  // This also means the recording keeps rolling through the whole candidate-questions moment,
  // which is exactly right — it's part of the interview, not a post-interview screen.
  const finishInterview = useCallback((answers: SessionAnswer[], results: typeof mcqResults, bonusPoints: number, askBonus: number) => {
    uploadRecording(answers, { mcqQuestions, mcqResults: results, mcqBonusPoints: bonusPoints, askInterviewerBonusPoints: askBonus, cvCtx, jobCtx });
    closeInterview(answers, results, bonusPoints, askBonus);
  }, [mcqQuestions, cvCtx, jobCtx, uploadRecording, closeInterview]);

  const beginAskInterviewer = useCallback(() => {
    const name = resolvedPreferredName ? `, ${resolvedPreferredName}` : '';
    const askLine = `So${name}, is there anything you'd like to ask us before we wrap up?`;
    cancelSpeakRef.current?.();
    setPhase('candidate-questions');
    setAskInterviewerReady(false);
    setHrState('speaking');
    const onAskDone = () => {
      setHrState('idle');
      setAskInterviewerReady(true);
    };
    cancelSpeakRef.current = avatarEnabled
      ? liveAvatarSpeakHr(askLine, onAskDone)
      : speak(askLine, 'hr', onAskDone, handleSarahVideoAnalyser);
  }, [resolvedPreferredName, avatarEnabled, liveAvatarSpeakHr, handleSarahVideoAnalyser, setHrState]);

  const handleAskInterviewerSuggest = useCallback(() => {
    setAskInterviewerReveal({ loading: true, question: null, rationale: null });
    generateCandidateQuestion(cvCtx, jobCtx, sessionLanguage).then(({ question, rationale }) => {
      setAskInterviewerReveal({ loading: false, question, rationale });
      cancelSpeakRef.current = speak(rationale, 'hr', () => {});
    });
  }, [cvCtx, jobCtx, sessionLanguage]);

  const handleAskInterviewerSaveContinue = useCallback(() => {
    if (!askInterviewerReveal || askInterviewerReveal.loading || !askInterviewerReveal.question) return;
    cancelSpeakRef.current?.();
    if (authToken) {
      void saveQuestionBankEntry(authToken, {
        questionText: askInterviewerReveal.question,
        answerText: askInterviewerReveal.rationale ?? '',
        questionType: 'Ask The Interviewer',
        difficulty: null,
        competencyTags: null,
        jobTitle: ctx.jobTitle ?? null,
        company: bgResolvedCompany ?? ctx.company ?? null,
      });
    }
    setAskInterviewerReveal(null);
    const args = askInterviewerCloseArgsRef.current;
    askInterviewerCloseArgsRef.current = null;
    if (args) finishInterview(args.answers, args.results, args.bonusPoints, ASK_INTERVIEWER_BONUS_POINTS);
  }, [askInterviewerReveal, authToken, ctx.jobTitle, ctx.company, bgResolvedCompany, finishInterview]);

  const handleAskInterviewerContinue = useCallback(() => {
    cancelSpeakRef.current?.();
    setAskInterviewerReveal(null);
    const args = askInterviewerCloseArgsRef.current;
    askInterviewerCloseArgsRef.current = null;
    if (args) finishInterview(args.answers, args.results, args.bonusPoints, 0);
  }, [finishInterview]);

  // Candidate-inactivity watchdog (Francis, 2026-09-17 — an interview got left open ~45
  // minutes mid-answer, forgotten mid-school-run, which is exactly the open-ended cost/
  // dangling-session risk this guards against). Two tiers, both measured from the candidate's
  // own last real interaction (typing, clicking, touching), not from anything the system itself
  // does:
  //   30s  — belt-and-braces re-assertion that both avatars are disconnected. The cost-control
  //          effect above already disconnects the instant phase becomes 'answering' (0s delay,
  //          faster than this), so this tier is normally a no-op — it exists as a second,
  //          phase-independent guarantee rather than trusting that effect alone.
  //   5min — treats the interview as abandoned: ends it exactly like running out of questions
  //          would (upload whatever was captured, play the same closing line, navigate to the
  //          summary), same tail as the manual "End Session" button, so a forgotten tab can't
  //          sit open (and reconnect-capable) indefinitely.
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityClosedRef = useRef(false);

  useEffect(() => {
    if (phase === 'answering') lastActivityRef.current = Date.now();
  }, [phase]);

  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('keydown', bump);
    window.addEventListener('mousedown', bump);
    window.addEventListener('touchstart', bump);
    return () => {
      window.removeEventListener('keydown', bump);
      window.removeEventListener('mousedown', bump);
      window.removeEventListener('touchstart', bump);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'answering') return;
    const id = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= 30_000) {
        if (liveAvatarHr.status === 'connected') void liveAvatarHr.disconnect();
        if (liveAvatarTechnical.status === 'connected') void liveAvatarTechnical.disconnect();
      }
      if (idleMs >= 5 * 60_000 && !inactivityClosedRef.current) {
        inactivityClosedRef.current = true;
        uploadRecording(sessionAnswers, { mcqQuestions, mcqResults, mcqBonusPoints, cvCtx, jobCtx });
        closeInterview(sessionAnswers, mcqResults, mcqBonusPoints);
      }
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveAvatarHr/liveAvatarTechnical
    // change identity every render (not memoised); the interval reads current state via the
    // closure it's recreated with each time this effect re-runs, so that's fine — only phase
    // actually needs to gate whether the watchdog runs at all.
  }, [phase, sessionAnswers, mcqResults, mcqBonusPoints, mcqQuestions, cvCtx, jobCtx, uploadRecording, closeInterview]);

  // Shared tail for every "this question is over, move on" path (a normal next-question click,
  // resuming after an MCQ bonus round, or a Pass) — previously reimplemented three times with
  // only the answers/mcq-results/bonus-points arguments actually differing between them.
  const advanceOrClose = useCallback((answers: SessionAnswer[], results: typeof mcqResults, bonusPoints: number) => {
    const next = qIndex + 1;
    if (next >= questions.length) {
      if (askInterviewerRollRef.current && !askInterviewerFiredRef.current) {
        askInterviewerFiredRef.current = true;
        askInterviewerCloseArgsRef.current = { answers, results, bonusPoints };
        beginAskInterviewer();
      } else {
        finishInterview(answers, results, bonusPoints, 0);
      }
    } else {
      setQIndex(next);
      askQuestion(next);
    }
  }, [qIndex, questions.length, finishInterview, beginAskInterviewer, askQuestion]);

  const nextQuestion = useCallback(() => {
    resetForNextQuestion();
    setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex });

    if (maybeFireMcq(qIndex)) return;

    const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
    if (lastAnswer && maybeGoDeeper(lastAnswer)) return;
    advanceOrClose(sessionAnswers, mcqResults, mcqBonusPoints);
  }, [qIndex, sessionAnswers, q, mcqResults, mcqBonusPoints, maybeFireMcq, maybeGoDeeper, resetForNextQuestion, advanceOrClose]);

  const resumeAfterMCQ = useCallback((bonusEarned: boolean, selectedIndex: number) => {
    const { newResults, newBonusPoints } = recordMcqResult(qIndex, bonusEarned, selectedIndex);

    const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
    if (lastAnswer && maybeGoDeeper(lastAnswer)) return;
    advanceOrClose(sessionAnswers, newResults, newBonusPoints);
  }, [qIndex, sessionAnswers, recordMcqResult, maybeGoDeeper, advanceOrClose]);

  const handlePass = useCallback(() => {
    if (passInProgressRef.current) return;
    passInProgressRef.current = true;
    setTimeout(() => { passInProgressRef.current = false; }, 800);
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    const passedEntry = recordPassedAnswer(q, thinkTimeMs);
    resetForNextQuestion();
    setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex, passed: true });

    if (maybeFireMcq(qIndex)) return;

    // Passing never triggers a Go Deeper follow-up — there's no answer to probe.
    advanceOrClose([...sessionAnswers, passedEntry], mcqResults, mcqBonusPoints);
  }, [q, qIndex, sessionAnswers, mcqResults, mcqBonusPoints, maybeFireMcq, recordPassedAnswer, resetForNextQuestion, advanceOrClose]);

  // "Tell Me The Answer" — shown instead of guessing/passing blind, so a candidate who genuinely
  // doesn't know leaves with something instead of nothing. Two-phase overlay: opens immediately
  // in a loading state (the AI call takes a couple of seconds), then shows the generated answer;
  // "Continue" is what actually records the reveal and advances, same tail as Pass, so closing
  // the overlay before the answer loads can't record a reveal with no answer text attached.
  const [revealState, setRevealState] = useState<{ loading: boolean; answerText: string | null } | null>(null);

  const handleTellMeTheAnswer = useCallback(() => {
    if (!q) return;
    setRevealState({ loading: true, answerText: null });
    generateModelAnswer(q, cvCtx, jobCtx, sessionLanguage)
      .then(answer => {
        setRevealState({ loading: false, answerText: answer });
        // Same narrator voice as the MCQ Bonus Round's own explanation panel ("Guardian
        // Angel" — always plain 'hr' TTS, not the live avatar, regardless of which
        // interviewer actually asked the question) — Francis's own steer: same function.
        cancelSpeakRef.current = speak(answer, 'hr', () => {});
      })
      .catch(() => {
        setRevealState({ loading: false, answerText: q.modelAnswer });
        cancelSpeakRef.current = speak(q.modelAnswer, 'hr', () => {});
      });
  }, [q, cvCtx, jobCtx, sessionLanguage, cancelSpeakRef]);

  const handleRevealContinue = useCallback(() => {
    if (!q || !revealState || revealState.loading || revealState.answerText === null) return;
    cancelSpeakRef.current?.(); // stop the model-answer narration if it's still playing
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    const revealedEntry = recordRevealedAnswer(q, revealState.answerText, thinkTimeMs);
    // "Save & Continue" (Francis, 2026-09-17) — every revealed answer a candidate clicks
    // through gets kept in their personal Question Bank, not just recorded for this session's
    // own scoring. Fire-and-forget: a failed save must never interrupt the live interview.
    if (authToken) {
      void saveQuestionBankEntry(authToken, {
        questionText: q.questionText,
        answerText: revealState.answerText,
        questionType: q.questionType,
        difficulty: ctx.selectedDifficulty ?? null,
        competencyTags: q.competencyTags,
        jobTitle: ctx.jobTitle ?? null,
        company: bgResolvedCompany ?? ctx.company ?? null,
      });
    }
    setRevealState(null);
    resetForNextQuestion();
    setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q.questionId, index: qIndex, revealed: true });

    if (maybeFireMcq(qIndex)) return;
    // Same reasoning as Pass — no attempted answer, nothing for Go Deeper to probe.
    advanceOrClose([...sessionAnswers, revealedEntry], mcqResults, mcqBonusPoints);
  }, [q, qIndex, revealState, sessionAnswers, mcqResults, mcqBonusPoints, maybeFireMcq, recordRevealedAnswer, resetForNextQuestion, advanceOrClose, authToken, bgResolvedCompany]);

  // Thin wrapper: phase/avatar-state transitions stay here (orchestrator territory, same as
  // askQuestion/beginInterviewIntro's setPhase calls), scoring itself is useAnswerScoring's job.
  const submitAnswer = useCallback(async (text: string, meta?: TranscriptMeta, byVoice = false) => {
    if (!text.trim()) return;
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    setPhase('scoring');
    setHrState('thinking'); setTechState('thinking');
    logFlowEvent('ANSWER_RECEIVED', { questionId: q?.questionId, wordCount: text.trim().split(/\s+/).length, byVoice });

    const goDeeperLimits = GO_DEEPER_LIMITS[selectedDifficulty] ?? GO_DEEPER_LIMITS.Standard;
    const goDeeperEligible = goDeeperEnabled && q?.questionType !== 'Follow-up' && goDeeperFiredRef.current < goDeeperLimits.max;

    await scoreAnswer(q, text, { meta, byVoice, thinkTimeMs, goDeeperEligible });

    setHrState('idle'); setTechState('idle');
    setPhase('coaching');
  }, [q, scoreAnswer, goDeeperEnabled, selectedDifficulty]);

  // Withholding the text itself (not just toggling `active`) until speechStarted is
  // deliberate — useTypewriter's `!active` branch shows the FULL text instantly, so gating on
  // `active` alone would dump the whole question on screen the moment phase flips to 'asking',
  // the exact "text prints before the speaker" bug this fixes (Francis, live testing
  // 2026-09-11). Once speechStarted flips true, `text` changes from '' to the real question,
  // and the effect below picks that up as a genuinely new value and starts typing it out.
  const displayedQuestion = useTypewriter(speechStarted ? (q?.questionText ?? '') : '', phase === 'asking');
  const coachingCue = useCoachingCue(phase === 'answering');

  // Real HeyGen-confirmed listening pose (2026-09-16), falling back to the local hrState/
  // techState guess while avatarPoseState is still null (e.g. right after a fresh reconnect,
  // before the first real agent.state_updated frame has arrived) — avoids a flash of "Ready"
  // in that window. avatarPoseState only distinguishes idle/listening; 'thinking' has no HeyGen
  // equivalent and always wins locally regardless of what the server reports.
  const hrShowListening = hrState !== 'thinking'
    && (liveAvatarHr.avatarPoseState != null ? liveAvatarHr.avatarPoseState === 'listening' : hrState === 'listening');
  const techShowListening = techState !== 'thinking'
    && (liveAvatarTechnical.avatarPoseState != null ? liveAvatarTechnical.avatarPoseState === 'listening' : techState === 'listening');

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = (qIndex + (phase === 'scoring' ? 1 : 0)) / questions.length;

  const scoreColor = avgScore === null ? 'var(--text-3)'
    : avgScore >= 70 ? '#34D399'
    : avgScore >= 50 ? '#F59E0B'
    : '#EF4444';

  // Show Sarah + James only after Mike has finished
  const showInterviewers = phase !== 'intro' && phase !== 'mike';

  const roomRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) roomRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div ref={roomRef} style={{
      minHeight: '100vh', background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none',
    }}>
      {/* Hidden elements for the mobile-path recording (canvas-composited webcam + caption) —
          never visible, but must be real DOM elements for captureStream() to work reliably */}
      <video ref={recordVideoElRef} playsInline muted style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />
      <canvas ref={recordCanvasElRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

      {/* Cinematic MCQ overlay */}
      {mcqActive && activeMcqQuestion && (
        <CinematicMCQ
          mcq={activeMcqQuestion}
          candidateName={resolvedPreferredName}
          questionOrdinal={activeMcqOrdinal}
          onComplete={resumeAfterMCQ}
        />
      )}
      {revealState && q && (
        <AnswerRevealOverlay
          questionText={q.questionText}
          loading={revealState.loading}
          answerText={revealState.answerText}
          onContinue={handleRevealContinue}
          onRepeat={revealState.answerText ? () => {
            cancelSpeakRef.current?.();
            cancelSpeakRef.current = speak(revealState.answerText!, 'hr', () => {});
          } : undefined}
        />
      )}
      {askInterviewerReveal && (
        <AskInterviewerOverlay
          loading={askInterviewerReveal.loading}
          question={askInterviewerReveal.question}
          rationale={askInterviewerReveal.rationale}
          onSaveAndContinue={handleAskInterviewerSaveContinue}
          onRepeat={askInterviewerReveal.rationale ? () => {
            cancelSpeakRef.current?.();
            cancelSpeakRef.current = speak(askInterviewerReveal.rationale!, 'hr', () => {});
          } : undefined}
        />
      )}
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)' }}>
            TheInterviewChair.com · Interview Room
          </div>
          {phase !== 'intro' && phase !== 'mike' && (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'var(--bg3)', borderRadius: '6px', padding: '3px 10px' }}>
                Q{Math.min(qIndex + 1, questions.length)} of {questions.length}
              </div>
              {avgScore !== null && (
                <div style={{
                  fontSize: '12px', fontWeight: 800, color: scoreColor,
                  background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`,
                  borderRadius: '6px', padding: '3px 10px',
                }}>
                  {avgScore}%
                </div>
              )}
              {mcqBonusPoints > 0 && (
                <div style={{
                  fontSize: '12px', fontWeight: 800, color: '#34D399',
                  background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)',
                  borderRadius: '6px', padding: '3px 10px',
                }}>
                  +{mcqBonusPoints} bonus
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language — read-only here, fixed at intake (see sessionLanguage's own comment for
              why: the interview's questions are all generated once, in whatever language was
              selected before the session started, so a live in-room switcher couldn't actually
              translate anything already generated). Same read-only-badge treatment as
              Difficulty/Round further down this sidebar. */}
          <div
            title="Set on the intake screen"
            style={{
              fontSize: '11px', fontWeight: 600, padding: '5px 8px', borderRadius: '7px',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'default', userSelect: 'none',
            }}
          >
            {LANGUAGE_LABELS[sessionLanguage] ?? LANGUAGE_LABELS.en}
          </div>

          {/* Interviewer volume — always visible, independent of OS/browser volume */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setVolumeMenuOpen(v => !v)}
              title="Interviewer volume"
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '7px 10px', color: 'var(--text-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', transition: 'all 0.2s',
              }}
            >
              {interviewerVolume === 0 ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 010 7.07" opacity={interviewerVolume > 0.4 ? 1 : 0.25}/>
                  <path d="M19.07 4.93a10 10 0 010 14.14" opacity={interviewerVolume > 0.75 ? 1 : 0.25}/>
                </svg>
              )}
            </button>
            {volumeMenuOpen && (
              <>
                <div onClick={() => setVolumeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, width: 180,
                  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)', padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Voice Volume</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(interviewerVolume * 100)}%</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05} value={interviewerVolume}
                    onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.4 }}>
                    Controls Amina, Wayne &amp; Michelle only — not your recording.
                  </div>
                </div>
              </>
            )}
          </div>

          {phase === 'answering' && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: elapsed > 120 ? 'var(--amber)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</div>
          )}
          {/* Camera toggle */}
          {phase !== 'intro' && (
            <button
              onClick={() => setCameraOn(v => !v)}
              title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
              style={{
                background: cameraOn ? 'none' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${cameraOn ? 'var(--border)' : 'rgba(239,68,68,0.5)'}`,
                borderRadius: '8px', padding: '7px 10px',
                color: cameraOn ? 'var(--text-3)' : '#EF4444',
                fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              {cameraOn ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
                  <line x1="3" y1="3" x2="21" y2="21"/>
                </svg>
              )}
              {cameraOn ? 'Camera' : 'Cam Off'}
            </button>
          )}

          {/* Recording status indicator */}
          {phase !== 'intro' && phase !== 'mike' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'default', userSelect: 'none' }}>
              {uploadStatus === 'uploading' ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} /><span style={{ userSelect: 'none' }}>Saving…</span></>
              ) : uploadStatus === 'done' ? (
                <><span style={{ color: '#34D399', userSelect: 'none' }}>✓</span><span style={{ color: '#34D399', userSelect: 'none' }}>Saved</span></>
              ) : uploadStatus === 'error' ? (
                <><span style={{ userSelect: 'none' }}>⚠</span><span style={{ userSelect: 'none' }}>Save failed</span></>
              ) : isRecording ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} /><span style={{ userSelect: 'none' }}>Recording</span></>
              ) : recordingFailed ? (
                <><span style={{ userSelect: 'none' }}>⚠</span><span style={{ userSelect: 'none' }}>No video — camera/mic denied</span></>
              ) : (
                <><span style={{ color: 'var(--text-3)', userSelect: 'none' }}>⏺</span><span style={{ color: 'var(--text-3)', userSelect: 'none' }}>Standby</span></>
              )}
            </div>
          )}

          {phase !== 'intro' && phase !== 'done' && (
            <button
              onClick={handlePause}
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '7px 12px', color: '#34D399', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              ⏸ Pause
            </button>
          )}
          {/* Fullscreen toggle */}
          <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Go fullscreen'}
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(124,58,237,0.14))', border: '1px solid rgba(167,139,250,0.45)', borderRadius: '8px', padding: '7px 14px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s', letterSpacing: '0.01em' }}>
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
              </svg>
            )}
            {isFullscreen ? 'Exit Full' : 'Full Screen'}
          </button>
          <button onClick={() => {
            uploadRecording(sessionAnswers, { mcqQuestions, mcqResults, mcqBonusPoints, cvCtx, jobCtx });
            closeInterview(sessionAnswers, mcqResults, mcqBonusPoints);
          }}
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '7px 14px', color: '#34D399', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            End Session
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--bg3)' }}>
        <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5 }}
          style={{ height: '100%', background: 'var(--blue)' }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 24px 32px', gap: '20px' }}>

        {/* Amina + Wayne — 2026-09-14: this block (and, critically, the two <video> elements
            inside it) is now PERMANENTLY mounted rather than gated by showInterviewers. Root
            cause of the lips-before-sound glitch: any gap between connect()/SESSION_STREAM_READY
            and session.attach() lets the WebRTC audio receiver's jitter buffer build a backlog
            nothing is draining, since attach() is what starts real playback now that audio has
            no separate tap (see useLiveAvatarSession.ts). attach() used to fire late because this
            whole block — and the <video> tags with it — didn't exist in the DOM until
            showInterviewers flipped true (well after connect() had already resolved during
            Mike's intro). Fixed by never unmounting this block again: showInterviewers now
            controls only an opacity/position reveal of the SAME never-recreated elements, so
            attach() fires once, the instant each session's stream is ready, with zero gap —
            confirmed against a harness reproduction that failed 100% of the time with the old
            gated-mount shape and passed 100% of the time with this one. Deliberately NOT the
            2026-09-10 hidden-video-elements attempt (reverted after a 45-60s appear-delay
            regression) — that used two separate elements needing a second attach() call; this is
            one element, attached once, never swapped. */}
        <motion.div
          key="interviewers"
          animate={{ opacity: showInterviewers ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          style={showInterviewers
            ? { display: 'flex', gap: '16px' }
            : { display: 'flex', gap: '16px', position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}
        >
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <InterviewerAvatar
                  role="hr" state={hrState} active={hrState === 'speaking'} analyserNode={hrAnalyser}
                  videoUrl={null}
                  onVideoEnded={() => onDoneRef.current?.()}
                  onVideoAnalyser={handleSarahVideoAnalyser}
                />
                {/* LiveAvatar overlay — real-time video, takes over Amina's slot the moment her
                    session's stream is ready (attach() fires as soon as SESSION_STREAM_READY
                    does, independent of visual reveal — see the block comment above). The
                    element renders no visible pixels until then, so the static photo above
                    shows through undisturbed in the meantime. */}
                <video
                  ref={liveAvatarHr.setVideoEl}
                  autoPlay
                  playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                />
                {/* Same name/title/waveform overlay InterviewerAvatar renders for itself —
                    needed here too since this <video> sits on top of (and hides) that
                    component's own copy of it. */}
                {liveAvatarHr.status === 'connected' && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', userSelect: 'none', pointerEvents: 'none' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{PROFILES.hr.name}</div>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{PROFILES.hr.title}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        {hrState === 'speaking' ? (
                          <WaveformBars active color={PROFILES.hr.barColor} analyserNode={liveHrAnalyser} />
                        ) : (
                          <div style={{ fontSize: '10px', fontWeight: 600, color: hrShowListening ? '#4F8EF7' : 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                            {hrState === 'thinking' ? 'Thinking…' : hrShowListening ? 'Listening' : 'Ready'}
                          </div>
                        )}
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: hrState === 'speaking' ? '#34D399' : hrShowListening ? '#4F8EF7' : 'rgba(255,255,255,0.25)',
                          border: '2px solid rgba(0,0,0,0.5)',
                          boxShadow: hrState === 'speaking' ? `0 0 6px ${PROFILES.hr.ring}` : 'none',
                          transition: 'background 0.3s',
                        }} />
                      </div>
                    </div>
                )}
              </div>
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <InterviewerAvatar
                  role="technical" state={techState} active={techState === 'speaking'} specialistTitle={specialistTitle} analyserNode={techAnalyser}
                  videoUrl={null}
                  onVideoEnded={() => onDoneRef.current?.()}
                  onVideoAnalyser={handleJamesVideoAnalyser}
                />
                {/* LiveAvatar overlay — Wayne's slot, same treatment as Amina's above. */}
                <video
                  ref={liveAvatarTechnical.setVideoEl}
                  autoPlay
                  playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                />
                {/* Same name/title/waveform overlay InterviewerAvatar renders for itself —
                    needed here too since this <video> sits on top of (and hides) that
                    component's own copy of it. */}
                {liveAvatarTechnical.status === 'connected' && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', userSelect: 'none', pointerEvents: 'none' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{PROFILES.technical.name}</div>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{specialistTitle ?? PROFILES.technical.title}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        {techState === 'speaking' ? (
                          <WaveformBars active color={PROFILES.technical.barColor} analyserNode={liveTechAnalyser} />
                        ) : (
                          <div style={{ fontSize: '10px', fontWeight: 600, color: techShowListening ? '#4F8EF7' : 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                            {techState === 'thinking' ? 'Thinking…' : techShowListening ? 'Listening' : 'Ready'}
                          </div>
                        )}
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: techState === 'speaking' ? '#34D399' : techShowListening ? '#4F8EF7' : 'rgba(255,255,255,0.25)',
                          border: '2px solid rgba(0,0,0,0.5)',
                          boxShadow: techState === 'speaking' ? `0 0 6px ${PROFILES.technical.ring}` : 'none',
                          transition: 'background 0.3s',
                        }} />
                      </div>
                    </div>
                )}
              </div>
              {showInterviewers && <YouCamera cameraOn={cameraOn} speaking={phase === 'answering'} onToggle={() => setCameraOn(v => !v)} />}
        </motion.div>

        <AnimatePresence mode="sync">

          {/* ── INTRO — only shown when NOT autoStart ─────────────────────── */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.8 }}
              style={{ borderRadius: '20px', overflow: 'hidden', minHeight: '480px', display: 'flex', flexWrap: 'wrap', background: 'var(--bg2)', border: '1px solid var(--border)' }}>

              {/* Chair — image lives in its own column now, not behind the text */}
              <div style={{ position: 'relative', flex: '1 1 320px', minHeight: '320px', overflow: 'hidden', background: '#000' }}>
                <motion.img
                  src="/images/mastermind-chair.png"
                  alt=""
                  initial={{ scale: 1.08, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 3.5, ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                />
                {/* Light edge gradient only, purely decorative — the panel side no longer
                    needs to fight the photo for text legibility */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.25) 100%)' }} />
              </div>

              {/* Content — solid panel, left-aligned, no longer competing with the photo */}
              <div style={{ flex: '1 1 340px', padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '20px' }}>
                {/* Eyebrow */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
                  style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--purple, #a78bfa)' }}>
                  Your interview awaits
                </motion.div>

                {/* Headline */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}
                  style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', textAlign: 'left', lineHeight: 1.3, letterSpacing: '-0.01em', userSelect: 'none' }}>
                  The seat is yours.<br />
                  <span style={{ color: '#a78bfa', userSelect: 'none' }}>Make every answer count.</span>
                </motion.div>

                {/* Session summary — one "Label: Value" row per line rather than a scatter of
                    pill badges + a separate radio row, so it reads like a settings summary
                    someone can scan top-to-bottom before committing to Begin Interview. */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }}
                  style={{ width: '100%', maxWidth: '420px', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg3)' }}>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', userSelect: 'none' }}>Questions</span>
                    <span style={{ fontSize: '13px', color: 'var(--text)', userSelect: 'none' }}>{questions.length} · Amina &amp; Wayne</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', userSelect: 'none' }}>Voice</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: elevenLabsConfigured ? '#34D399' : 'var(--amber)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: elevenLabsConfigured ? '#34D399' : 'var(--amber)', userSelect: 'none' }}>
                        {elevenLabsConfigured ? 'Neural voices ready' : 'Browser voices'}
                      </span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', userSelect: 'none' }}>Answer mode</span>
                    <span style={{ display: 'flex', gap: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: useVoice ? 600 : 400, color: useVoice ? '#a78bfa' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="radio" checked={useVoice} onChange={() => setUseVoice(true)} style={{ accentColor: '#a78bfa' }} />
                        Speak
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: !useVoice ? 600 : 400, color: !useVoice ? '#a78bfa' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="radio" checked={!useVoice} onChange={() => setUseVoice(false)} style={{ accentColor: '#a78bfa' }} />
                        Type
                      </label>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 16px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', userSelect: 'none' }}>Audio check</span>
                    <button onClick={testAudio} disabled={audioCheckState === 'playing'}
                      style={{ background: 'transparent', border: `1px solid ${audioCheckState === 'done' ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: '8px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: audioCheckState === 'playing' ? 'default' : 'pointer', color: audioCheckState === 'done' ? '#34D399' : 'var(--text-2)' }}>
                      {audioCheckState === 'done' ? '✓ Audio OK' : audioCheckState === 'playing' ? 'Playing…' : '🔊 Test audio'}
                    </button>
                  </div>
                </motion.div>

                {/* Go Deeper toggle */}
                <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: 0.5 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', maxWidth: '380px', textAlign: 'left', cursor: 'pointer', background: goDeeperEnabled ? 'rgba(167,139,250,0.08)' : 'var(--bg3)', border: `1px solid ${goDeeperEnabled ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', userSelect: 'none' }}>
                  <input type="checkbox" checked={goDeeperEnabled} onChange={(e) => setGoDeeperEnabled(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#a78bfa' }} />
                  <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--text-2)', userSelect: 'none' }}>
                    <strong style={{ color: 'var(--text)' }}>🔍 Go Deeper</strong> — occasional real follow-up questions that test genuine depth of experience{selectedDifficulty === 'Expert' ? ' (recommended for Expert)' : ''}.
                  </span>
                </motion.label>

                {/* CTA */}
                <motion.button onClick={startInterview}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3, duration: 0.5 }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '13px', padding: '15px 48px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em', boxShadow: '0 0 40px rgba(167,139,250,0.35)' }}>
                  Begin Interview →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── MIKE PHASE — ONLY Mike, nothing else ──────────────────────── */}
          {phase === 'mike' && (
            <motion.div key="mike" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', width: '100%', maxWidth: '960px', margin: '0 auto' }}>

              {/* Mike on the left, appearance controls on the right — side by side rather
                  than stacked, so checking how you'll look doesn't push everything else down.
                  Mike's own frame is sized close to Sarah/James's card (448×300-ish) rather
                  than the old small 180×180 circle — he was visually much smaller than them,
                  and a circular crop would badly clip the 16:9 avatar video replacing his
                  static photo. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center', alignItems: 'flex-start', marginBottom: '28px' }}>

                <div style={{ flex: '2 1 380px', maxWidth: '460px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '20px' }}>
                    Your Recruitment Consultant
                  </div>
                  {/* Michelle's photo/pre-rendered fallback sits underneath — the live HeyGen
                      avatar overlay below takes over the instant her session's stream is ready,
                      same "static frame shows through until attach() fires" pattern as Amina/
                      Wayne's own tiles further down this page. */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', margin: '0 auto 20px', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
                    {sessionLanguage === 'en' && MIKE_VIDEO_ENABLED ? (
                      <video
                        ref={mikeVideoRef}
                        src="/images/mike-intro-v1.mp4"
                        autoPlay playsInline
                        onEnded={handleMikeIntroDone}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                      />
                    ) : (
                      <>
                        <img src="/images/michelle-static-avatar.png" alt="Michelle" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                        {/* Amplitude-driven mouth movement — only relevant on the non-English
                            live-TTS path; MOUTH_OVERLAY_ENABLED is currently false anyway
                            (see project-mouth-movement-avatars memory). */}
                        {MOUTH_OVERLAY_ENABLED && <MouthOverlay analyserNode={techAnalyser} active={phase === 'mike'} {...MOUTH_POSITIONS.mike} />}
                      </>
                    )}
                    {/* LiveAvatar overlay — Michelle's real-time video, same treatment as Amina/
                        Wayne's tiles: renders no visible pixels until attach() fires, so the
                        static photo above shows through undisturbed until then. */}
                    <video
                      ref={liveAvatarMichelle.setVideoEl}
                      autoPlay
                      playsInline
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Pulse ring while speaking */}
                    <motion.div
                      animate={{ scale: [1, 1.03, 1], opacity: [0.6, 0.15, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{ position: 'absolute', inset: -8, borderRadius: '20px', border: '2px solid var(--blue)', pointerEvents: 'none' }}
                    />
                    {/* Mike's clip has nothing of its own to show once he's finished and we're
                        still waiting on Sarah/James — without this the frame just freezes on
                        its last frame (mouth mid-word), which reads as broken rather than
                        "loading". This scrim makes the wait visibly intentional. */}
                    <AnimatePresence>
                      {awaitingHandoff && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,20,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(79,142,247,0.25)', borderTopColor: 'var(--blue)' }}
                          />
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Bringing in Amina &amp; Wayne…</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Michelle</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recruitment Consultant</div>
                  {/* Speaking indicator — a real waveform driven by her live avatar's audio once
                      connected (same as Amina/Wayne's own tiles), falling back to a generic
                      pulsing dot before her session's stream is ready or if she degrades to
                      plain TTS. */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'default', userSelect: 'none' }}>
                    {liveAvatarMichelle.status === 'connected' && liveMichelleAnalyser ? (
                      <WaveformBars active color="#34D399" analyserNode={liveMichelleAnalyser} />
                    ) : (
                      <>
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                          style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-3)', userSelect: 'none' }}>Speaking…</span>
                      </>
                    )}
                  </div>
                </div>

                {/* While Mike briefs you — the natural moment to check how you'll look before
                    Sarah and James actually appear. Same filter presets as the Profile Video
                    recorder; picking one here carries through to the interview itself. */}
                <div style={{ flex: '1 1 200px', maxWidth: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingLeft: '32px', borderLeft: '1px solid var(--border)' }}>
                  <YouCamera cameraOn={cameraOn} onToggle={() => setCameraOn(v => !v)} videoFilterCss={FILTER_CSS[filterPreset]} width={180} height={180} />
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>How you'll look</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {FILTER_PRESETS.map(preset => {
                        const active = filterPreset === preset;
                        return (
                          <button key={preset} onClick={() => setFilterPreset(preset)} title={FILTER_LABELS[preset].desc}
                            style={{
                              flex: 1, padding: '8px 4px', borderRadius: '10px',
                              background: active ? 'rgba(52,211,153,0.12)' : 'var(--bg3)',
                              border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                              color: active ? '#34D399' : 'var(--text-3)',
                              fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                              transition: 'all 0.15s ease',
                            }}>
                            <span style={{ fontSize: '15px' }}>{FILTER_LABELS[preset].icon}</span>
                            <span>{FILTER_LABELS[preset].label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  // Same path as Mike finishing naturally (handleMikeIntroDone) — stops
                  // whichever audio source is actually active (live TTS via
                  // stopAllInterviewerAudio, or the English video directly, since that one
                  // isn't routed through InterviewerAvatar and has no other stop mechanism),
                  // then reuses the exact same awaitingHandoff scrim + phase2-ready-or-wait
                  // gate Mike's own completion uses — one source of truth for "is Sarah/James's
                  // content ready yet", instead of this button polling a second, different flag.
                  stopAllInterviewerAudio();
                  mikeVideoRef.current?.pause();
                  handleMikeIntroDone();
                }}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '10px 28px',
                  color: 'var(--text-2)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,142,247,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                Skip Intro →
              </button>
            </motion.div>
          )}

          {/* ── INTERVIEWER INTRO ─────────────────────────────────────────── */}
          {phase === 'interviewer-intro' && (
            <motion.div key="int-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Your interviewers are introducing themselves…</div>
                  </div>
                  <button
                    onClick={() => { stopAllInterviewerAudio(); setHrState('idle'); setTechState('idle'); askQuestion(0); }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px', flexShrink: 0 }}
                  >
                    Skip Intro →
                  </button>
                </div>
                {/* Animated bullet points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { icon: '🎙️', text: 'When a question appears, click Record to start your answer' },
                    { icon: '⏹️', text: 'Click Stop when you\'ve finished speaking' },
                    { icon: '↩️', text: 'Use Repeat if you\'d like to hear the question again' },
                    { icon: '⏸️', text: 'Hit Pause anytime you need a moment to collect your thoughts' },
                    { icon: '✨', text: 'Speak naturally — take your time and don\'t worry about being perfect' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.55, duration: 0.45, ease: 'easeOut' }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.45 }}>{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ASKING / ANSWERING / SCORING ─────────────────────────────── */}
          {(phase === 'asking' || phase === 'answering' || phase === 'scoring') && q && (
            <div>

              {/* Question card — animates per question, independent of answer panel */}
              <AnimatePresence mode="sync">
                <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    {phase === 'asking' && (
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ width: '7px', height: '7px', borderRadius: '50%', background: isHrQuestion ? '#a78bfa' : 'var(--blue)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '10px', fontWeight: 700, color: isHrQuestion ? '#a78bfa' : 'var(--blue)', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '3px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {isHrQuestion ? 'Amina · HR' : `Wayne · ${specialistTitle}`}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '3px 8px' }}>{selectedDifficulty}</span>
                    {/* Gauntlet question (Salary Expectation £500k+ only — see sessionPrepareClient's
                        own comment) — visually flagged so the candidate consciously recognises
                        "this is the big one" the moment it appears, the psychological beat the
                        whole feature is built around. Asked in its normal turn, no timing change. */}
                    {q?.questionType === 'Gauntlet' && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '4px', padding: '3px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        ⚔️ Gauntlet Question
                      </span>
                    )}
                    {phase === 'answering' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        {/* Disabled while actually recording a voice answer — a mistimed click used
                            to re-trigger the question audio (Repeat) or bail out (Pause/Pass) mid-
                            capture, which meant the repeated question itself got baked into the
                            candidate's own answer clip. */}
                        <button onClick={repeatQuestion} disabled={isCapturingAnswer} title={isCapturingAnswer ? "Stop recording first" : undefined} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: 'var(--blue)', cursor: isCapturingAnswer ? 'not-allowed' : 'pointer', opacity: isCapturingAnswer ? 0.4 : 1 }}>
                          ↩ Repeat
                        </button>
                        <button onClick={handlePause} disabled={isCapturingAnswer} title={isCapturingAnswer ? "Stop recording first" : undefined} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#34D399', cursor: isCapturingAnswer ? 'not-allowed' : 'pointer', opacity: isCapturingAnswer ? 0.4 : 1 }}>
                          ⏸ Pause
                        </button>
                        <button onClick={handleTellMeTheAnswer} disabled={isCapturingAnswer} title={isCapturingAnswer ? "Stop recording first" : "See a model answer instead of guessing"} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#34D399', cursor: isCapturingAnswer ? 'not-allowed' : 'pointer', opacity: isCapturingAnswer ? 0.4 : 1 }}>
                          💡 Tell Me The Answer
                        </button>
                        <button onClick={handlePass} disabled={isCapturingAnswer} title={isCapturingAnswer ? "Stop recording first" : undefined} style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#EF4444', cursor: isCapturingAnswer ? 'not-allowed' : 'pointer', opacity: isCapturingAnswer ? 0.4 : 1 }}>
                          Pass →
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55, minHeight: '28px' }}>
                    {displayedQuestion}
                    {phase === 'asking' && displayedQuestion.length < (q.questionText?.length ?? 0) && (
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ marginLeft: '2px', color: isHrQuestion ? '#a78bfa' : 'var(--blue)' }}>▌</motion.span>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Answer area — always mounted, never animates between questions */}
              {(phase === 'asking' || phase === 'answering') && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>

                  {/* Left — answer input (3/4) */}
                  <div style={{ flex: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {useVoice && (
                      <VoiceInput
                        onTranscript={(text, meta) => submitAnswer(text, meta, true)}
                        onInterimTranscript={() => {}}
                        highlightRecord={highlightRecord}
                        disabled={phase !== 'answering'}
                        onListeningChange={setIsCapturingAnswer}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      {useVoice && <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Or type your answer</div>}
                      <textarea
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        placeholder="Type your answer here…"
                        rows={3}
                        style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.65, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                    {typedAnswer.trim() && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => submitAnswer(typedAnswer, undefined, false)}
                          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                          Submit Answer
                        </button>
                      </div>
                    )}

                    {/* Previous answers log */}
                    {sessionAnswers.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Previous Answers</div>
                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0, paddingRight: '2px' }}>
                          {sessionAnswers.map((sa, i) => {
                            const pct = Math.round(sa.score.overallScore * 100);
                            const scoreColor = pct >= 70 ? '#34D399' : pct >= 50 ? '#F59E0B' : '#EF4444';
                            const passed = sa.answerText === '';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', flexShrink: 0 }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: passed ? 'var(--text-3)' : scoreColor, minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>
                                  {passed ? '—' : <>{pct}<span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-3)' }}>%</span></>}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.5, flex: 1 }}>
                                  {sa.question.questionText}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right — session stats (1/4) */}
                  <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Progress */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Progress</div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                        {questions.map((_, i) => (
                          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < qIndex ? 'var(--blue)' : i === qIndex ? 'rgba(79,142,247,0.4)' : 'var(--bg3)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Q{qIndex + 1} of {questions.length}</div>
                    </div>

                    {/* Timer */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Time on answer</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: elapsed > 120 ? 'var(--amber)' : 'var(--text)' }}>{fmt(elapsed)}</div>
                    </div>

                    {/* Running score */}
                    {avgScore !== null && (
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Avg score</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: scoreColor }}>{avgScore}%</div>
                      </div>
                    )}

                    {/* Coaching cue */}
                    <motion.div
                      key={coachingCue}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Coach</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'rgba(167,139,250,0.9)', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '8px', padding: '8px 10px' }}>
                        {coachingCue}
                      </div>
                    </motion.div>

                    {/* Percentile benchmark card */}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(79,142,247,0.10) 0%, rgba(167,139,250,0.08) 100%)',
                        border: '1px solid rgba(79,142,247,0.22)',
                        borderRadius: '10px',
                        padding: '10px 11px',
                      }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(79,142,247,0.7)', marginBottom: '5px' }}>Benchmark</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>
                        Top 5% of candidates scored <span style={{ color: '#34D399' }}>8/10</span> for this role
                      </div>
                      <div style={{ marginTop: '7px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '5%' }}
                          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                          style={{ height: '100%', background: 'linear-gradient(90deg, var(--blue), #a78bfa)', borderRadius: '2px' }}
                        />
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '4px' }}>You are in the top 5th percentile</div>
                    </motion.div>

                    {/* Difficulty — fixed at intake, before questions were even generated for it;
                        read-only here, not a live control. Editing it mid-session used to be
                        possible via this same spot but did nothing except desync the displayed
                        label from the difficulty the questions/scoring were actually built for. */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Difficulty</div>
                      <div
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          fontSize: '11px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px',
                          background: selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.12)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.12)' : 'rgba(52,211,153,0.1)',
                          color: selectedDifficulty === 'Expert' ? '#EF4444' : selectedDifficulty === 'Pro' ? '#F59E0B' : '#34D399',
                          border: `1px solid ${selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.3)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.3)' : 'rgba(52,211,153,0.25)'}`,
                        }}
                      >
                        {selectedDifficulty}
                      </div>
                    </div>

                    {/* Round — same read-only-at-intake treatment as Difficulty above; also
                        fixed at intake since it's baked into Mike's/Amina's/Wayne's already-
                        generated spoken intros, not something that could change mid-session. */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Round</div>
                      <div
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          fontSize: '11px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px',
                          background: 'rgba(79,142,247,0.1)', color: 'var(--blue)',
                          border: '1px solid rgba(79,142,247,0.25)',
                        }}
                      >
                        {selectedInterviewRound}
                      </div>
                    </div>

                    {/* Pause */}
                    <div style={{ marginTop: 'auto' }}>
                      <button onClick={handlePause} style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                        borderRadius: '9px', padding: '8px 0', fontSize: '11px', fontWeight: 700,
                        color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
                        Pause
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── ASK THE INTERVIEWER ───────────────────────────────────────── */}
          {phase === 'candidate-questions' && (
            <motion.div key="ask-interviewer" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: askInterviewerReady ? '20px' : 0 }}>
                  {!askInterviewerReady && (
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                  )}
                  <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>
                    {askInterviewerReady ? 'Amina asked if you have any questions for the interviewers.' : 'Amina is asking…'}
                  </div>
                </div>
                {askInterviewerReady && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleAskInterviewerSuggest} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, color: '#34D399', cursor: 'pointer' }}>
                      💡 Suggest a good question to ask
                    </button>
                    <button onClick={handleAskInterviewerContinue} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-3)', cursor: 'pointer' }}>
                      Continue →
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scoring overlay — fixed/centered like the coaching dialog below, not inline in the
          scroll flow. It used to render halfway down the page's normal content column, which
          meant it was invisible without scrolling — same "you can't tell what's happening"
          problem the coaching dialog already solves by taking over the whole viewport. */}
      <AnimatePresence>
        {phase === 'scoring' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: '100%', maxWidth: '420px',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '8px 28px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
            >
              <ChairSpinner label="Analysing your answer…" size={100} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coaching overlay */}
      {phase === 'coaching' && coachingMessage && (
        <CoachingOverlay key={qIndex} message={coachingMessage} score={currentScore} onDone={nextQuestion} />
      )}

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 36px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏸</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>Interview paused</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '28px' }}>
                Take a moment. When you resume, the current question will replay so you can hear it again.
              </div>
              <button onClick={handleResume}
                style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '11px', padding: '13px 36px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                ▶ Resume Interview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
