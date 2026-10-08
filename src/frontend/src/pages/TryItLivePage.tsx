import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { useSpatiusAvatarSession } from '../hooks/useSpatiusAvatarSession';
import { setSeatInterviewers } from '../lib/seatInterviewers';
import { speak as speakTts, unlockTTSAudio, setTTSLanguage } from '../api/ttsApi';
import { setInterviewTicket } from '../api/entitlementsApi';
import { VoiceInput } from '../components/VoiceInput';
import { startTryOut, scoreTryOut, coachTryOut, modelAnswerTryOut, questionsSeen, rememberQuestionsSeen, emailTryOutScore, getVisitorCountry, type TryOutStart, type TryOutFeedback, type TryOutResult } from '../api/tryOutApi';
import { LANGUAGES, LANGUAGE_CHOICES, DIFFICULTIES, DEFAULT_LANGUAGE_VALUE, findLanguageChoice } from '../data/interviewOptions';
import { logEvent } from '../api/flowLogger';

// "Try it live" (Francis, 2026-09-21) — the public, no-account taste of the product for visitors from the marketing site and LinkedIn:
// name a job role, a live avatar asks three questions, answer by voice or text, and after each answer the Guardian Angel coach (the same
// plain narrator voice the full interview uses — not the avatar) gives brief coaching in its own coloured card, then the interviewer carries
// on by themselves. Finally an instant scored card and an invitation to register. Everything costly is capped server-side (see Features/TryOut);
// when the live-avatar allowance for the day is used up, or the avatar can't connect, the same flow runs voice-only.

const GREEN = '#34D399';
const AMBER = '#FBBF24';
const RED = '#F87171';
const ROLE_CHIPS = ['Product Manager', 'Software Engineer', 'Nurse', 'Marketing Manager', 'Data Analyst', 'Teacher', 'Accountant', 'Project Manager'];
const REGISTER_URL = 'https://login.theinterviewchair.com/register';
// What the sign-up page is told about this visitor (Francis, 2026-10-03: save them a step). Sent in the URL's #fragment, which is never sent to any server or
// written to any log — the sign-up page reads it, fills the form, and passes the role on so the full interview's setup opens with it already typed in.
function registerUrl(role: string, firstName: string): string {
  const p = new URLSearchParams({ from: 'try' });
  if (role.trim()) p.set('role', role.trim().slice(0, 90));
  if (firstName.trim()) p.set('name', firstName.trim().slice(0, 40));
  return `${REGISTER_URL}#${p.toString()}`;
}
const SHARE_URL = 'https://candidate.theinterviewchair.com/try?ref=share';
const DIMENSIONS: { key: keyof TryOutFeedback['dimensions']; label: string }[] = [
  { key: 'clarity', label: 'Clarity' }, { key: 'relevance', label: 'Relevance' }, { key: 'accuracy', label: 'Accuracy' },
  { key: 'depth', label: 'Depth' }, { key: 'confidence', label: 'Confidence' },
];

// Red below 3, amber below 7, green from 7 (scores are 0–10; the overall score is 0–100, so it is scaled).
const scoreColour = (score: number, outOf = 10) => { const s = outOf === 100 ? score / 10 : score; return s < 3 ? RED : s < 7 ? AMBER : GREEN; };
const coachTone = (score: number) => score >= 7 ? { emoji: '⭐', label: 'Great answer', accent: GREEN } : score >= 3 ? { emoji: '💡', label: "Good — here's how to level up", accent: AMBER } : { emoji: '🎯', label: "Let's strengthen this", accent: RED };

// Full-screen popup the Guardian Angel coach speaks through after each answer — mirrors the full interview's CoachingOverlow visual
// language (avatar disc, tone colour, glow) but is self-contained since the try-it-live coaching payload is just {text, score}, not the
// full interview's multi-line CoachingMessage. It renders for as long as phase === 'coaching' and unmounts itself the instant the parent
// moves phase on (Francis, 2026-09-22: this IS the "click end -> Angel responds -> auto-continues" flow, no manual dismiss).
function TryCoachPopup({ coaching }: { coaching: { text: string; score: number } | null }) {
  const tone = coaching ? coachTone(coaching.score) : { emoji: '👼', label: 'Reading your answer…', accent: GREEN };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{'@keyframes tryPopupBg{from{opacity:0}to{opacity:1}}@keyframes tryPopupCard{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes tryPopupPulse{0%,100%{box-shadow:0 0 0 8px var(--tp-glow)}50%{box-shadow:0 0 0 3px var(--tp-glow)}}'}</style>
      <div style={{ position: 'absolute', inset: 0, animation: 'tryPopupBg 0.3s ease' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg2, #0f1829)', border: `1px solid ${tone.accent}55`, borderRadius: 22, padding: '32px 28px', boxShadow: `0 0 70px ${tone.accent}22, 0 24px 60px rgba(0,0,0,0.5)`, textAlign: 'center', animation: 'tryPopupCard 0.4s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
          background: `linear-gradient(135deg,${tone.accent}44,${tone.accent}22)`, border: `2px solid ${tone.accent}77`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          ['--tp-glow' as string]: `${tone.accent}33`, animation: coaching ? 'none' : 'tryPopupPulse 1.6s ease-in-out infinite',
        }}>{tone.emoji}</div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: tone.accent, marginBottom: 14 }}>Your Guardian Angel coach · {tone.label}</div>
        <div style={{ fontSize: 16.5, lineHeight: 1.6 }}>{coaching?.text ?? 'One moment…'}</div>
      </div>
    </div>
  );
}

type Phase = 'topic' | 'starting' | 'asking' | 'answering' | 'coaching' | 'scoring' | 'results' | 'blocked';

// Never let an avatar connection hold the visitor hostage: a connection that neither succeeds nor fails (seen on iPhones, 2026-09-29 — a
// visitor sat on "taking their seat" for over four minutes) is treated as failed after a limit, and the page moves on to the next option.
const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms))]);
const SPATIUS_CONNECT_LIMIT_MS = 15000;
// Said before the first question in an English demo (other languages get the server's translation, in TryOutStart.privacy).
const PRIVACY_LINE_EN = "Quick note before we start: your practice interview is private. It is never shown to recruiters or employers, and only you can choose to share your results.";
const HEYGEN_CONNECT_LIMIT_MS = 25000;
// Spatius framing (Francis, 2026-09-30). The box the avatar is drawn into is the FULL stage width — narrowing it just cropped his shoulders with hard
// vertical edges. Zoom and position come from the SDK's own avatarTransform instead (scale 1 = default; smaller = further back). Defaults are set below once
// tuned by eye on /dev/spatius-test; while tuning, ?scale=0.75&ay=-0.2 (and ax) on the demo URL overrides them for that visit.
const SPATIUS_STAGE_WIDTH_PCT = 100;
// Tuned by eye on /dev/spatius-test in a 16:9 box (the same shape as this stage) — Francis, 2026-09-30. Per interviewer, because each avatar's portrait is framed differently.
const SPATIUS_DEFAULT_TRANSFORMS: Record<'hr' | 'technical', { x: number; y: number; scale: number }> = {
  hr: { x: 0.01, y: -0.1, scale: 1.32 },
  technical: { x: 0.02, y: -0.26, scale: 1.13 }, // sat back about 22% (Francis, 2026-10-07: a little too close to the camera)
};
function spatiusTransformFromUrl(interviewer: 'hr' | 'technical'): { x: number; y: number; scale: number } | undefined {
  const SPATIUS_DEFAULT_TRANSFORM = SPATIUS_DEFAULT_TRANSFORMS[interviewer];
  try {
    const q = new URLSearchParams(window.location.search);
    const scale = parseFloat(q.get('scale') ?? '');
    if (!Number.isFinite(scale) || scale < 0.2 || scale > 3) return SPATIUS_DEFAULT_TRANSFORM;
    const n = (k: string) => { const v = parseFloat(q.get(k) ?? ''); return Number.isFinite(v) ? Math.max(-2, Math.min(2, v)) : 0; };
    return { x: n('ax'), y: n('ay'), scale };
  } catch { return SPATIUS_DEFAULT_TRANSFORM; }
}

// The interviewer a visitor picked on the homepage arrives as ?interviewer=<id> (2026-10-07); the server checks it is a real, visible HR or technical interviewer and
// otherwise uses Wayne, so a hand-edited value is harmless.
function wantedInterviewerFromUrl(): string | undefined {
  try { const v = new URLSearchParams(window.location.search).get('interviewer') ?? ''; return /^[a-z0-9][a-z0-9-]{1,31}$/.test(v) ? v : undefined; } catch { return undefined; }
}
// Amina's and Wayne's faces were tuned by hand for this page; anyone else is framed automatically by the avatar session.
const isOriginalInterviewer = (id: string | undefined) => !id || id === 'amina' || id === 'wayne' || id === 'haruto';

// What the marketing homepage passes in the URL (?topic=&name=&lang=&level=&go=1; English regions arrive as lang=en&country=GB/US…). Read in ONE place so the first render and the auto-start
// agree exactly. Every value is checked against its list here, so a hand-edited link can't put junk in the form (the server validates again).
function detectMobile(): boolean {
  try {
    const touchOnly = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    return touchOnly || uaMobile;
  } catch { return false; }
}
interface UrlPrefill { topic: string; name: string; languageValue: string; difficulty: string; go: boolean; hasLanguage: boolean }
function urlPrefill(): UrlPrefill {
  try {
    const q = new URLSearchParams(window.location.search);
    const level = DIFFICULTIES.find(d => d.value.toLowerCase() === (q.get('level') ?? '').toLowerCase())?.value;
    return {
      topic: (q.get('topic') ?? '').slice(0, 90),
      name: (q.get('name') ?? '').replace(/[^\p{L}\p{M}' .-]/gu, '').slice(0, 40),
      languageValue: findLanguageChoice(q.get('lang'), q.get('country')).value,   // accepts lang=en-US, or lang=en&country=US, or a plain code
      difficulty: level ?? DEFAULT_DIFFICULTY,
      go: q.get('go') === '1',
      hasLanguage: q.has('lang'),
    };
  } catch { return { topic: '', name: '', languageValue: DEFAULT_LANGUAGE_VALUE, difficulty: DEFAULT_DIFFICULTY, go: false, hasLanguage: false }; }
}
// Straight into the interview room from the homepage (Francis, 2026-09-30): only when both values are present, and never on phones (they need their own
// tap before the interviewer's sound can play). When true the page's FIRST render is already the "Preparing your interview" screen — no form flash.
function wantsAutoStart(): boolean {
  const u = urlPrefill();
  return u.go && !detectMobile() && u.topic.trim().length >= 2 && !!u.name.trim();
}

// The demo's default level: Pro — the same default as the full interview intake (Francis, 2026-09-30).
const DEFAULT_DIFFICULTY = 'Pro';

// How many questions the quick (?quick=1) demo asks, and how to say a count in words — all the on-screen and spoken wording is derived from the
// real number, so changing QUICK_QUESTION_COUNT can never leave a stale "one question" or "three questions" behind.
const QUICK_QUESTION_COUNT = 2;
const countWord = (n: number): string => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : String(n));

export default function TryItLivePage() {
  const [phase, setPhase] = useState<Phase>(() => (wantsAutoStart() ? 'starting' : 'topic'));
  // The marketing site's hero passes ?topic= so the visitor's role is already filled in.
  const [topic, setTopic] = useState(() => urlPrefill().topic);
  // The marketing site's hero also passes ?name= (it asks for the first name there), so both fields arrive filled in.
  const [name, setName] = useState(() => urlPrefill().name);
  // Interview language (English comes as regional versions: UK, US …) and question difficulty (2026-09-30). When nothing was chosen in the link, an American
  // visitor is offered English (US) and everyone else English (UK) — looked up once, and never overriding a choice they have already made.
  const [languageValue, setLanguageValue] = useState(() => urlPrefill().languageValue);
  const [difficulty, setDifficulty] = useState(() => urlPrefill().difficulty);
  const languageTouchedRef = useRef(false);
  const languageChoice = findLanguageChoice(languageValue);
  const language = languageChoice.code;            // "en", "fr" … → voice, prompts, transcription
  const country = languageChoice.country ?? '';     // English regions only → wording/local context, and which English the browser listens for
  useEffect(() => {
    if (urlPrefill().hasLanguage || wantsAutoStart()) return;
    let cancelled = false;
    void getVisitorCountry().then(code => { if (!cancelled && code === 'US' && !languageTouchedRef.current) setLanguageValue('en-US'); });
    return () => { cancelled = true; };
  }, []);
  // Tell the voice service (neural voice, avatar audio) the interview language for the length of the visit, so it never guesses it from the text.
  useEffect(() => { setTTSLanguage(language); return () => setTTSLanguage('en'); }, [language]);
  const [start, setStart] = useState<TryOutStart | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  // Mirrors `draft` for the voice-answer path below — submit() needs the just-transcribed text
  // synchronously, and reading `draft` itself there would be stale (setDraft hasn't committed yet
  // in the same tick the transcript arrives).
  const draftRef = useRef('');
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [skipped, setSkipped] = useState(0);
  // "Show me the answer" (Francis, 2026-10-03): the model answer for the question on screen. The question then counts as zero, exactly like a skip.
  const [revealed, setRevealed] = useState<{ loading: boolean; text: string | null; failed?: string } | null>(null);
  const [revealedText, setRevealedText] = useState<Record<number, string>>({});
  // The same four controls as the full interview (Repeat / Pause / Tell Me The Answer / Pass) — Francis, 2026-10-03.
  const [paused, setPaused] = useState(false);
  const [capturing, setCapturing] = useState(false);   // the mic is recording an answer right now — the four buttons wait, like in the full interview
  const [skippedIdx, setSkippedIdx] = useState<number[]>([]);   // which questions (0-based) were skipped, so the score sheet can list them
  const [coaching, setCoaching] = useState<{ text: string; score: number } | null>(null);
  const [skipTransition, setSkipTransition] = useState(false);
  const [feedback, setFeedback] = useState<TryOutFeedback | null>(null);
  const [message, setMessage] = useState('');
  // Why the flow is showing the 'blocked' card — drives both the headline and which button we offer (Francis, 2026-09-22:
  // skipping every question isn't an error, so it needs its own honest headline, not "Something went wrong").
  const [blockReason, setBlockReason] = useState<'capped' | 'noAnswers' | 'error'>('error');
  // The "quick taste" (Francis, 2026-09-30): ?quick=1 runs QUICK_QUESTION_COUNT questions instead of three — for LinkedIn visitors who are only curious
  // about the founder and won't give a few minutes to an unknown product. Same flow, same score screen, just shorter. (Started as one question; Francis
  // found one answer — with the greeting — too thin, so it is two.)
  const [quick] = useState(() => { try { return new URLSearchParams(window.location.search).get('quick') === '1'; } catch { return false; } });
  const [useAvatar, setUseAvatar] = useState(false);
  const [avatarState, setAvatarState] = useState<'off' | 'connecting' | 'live'>('off');
  const [shareOpen, setShareOpen] = useState(false);
  // "Email me my score" box on the score screen — for visitors who aren't ready to make an account yet.
  // "Getting ready" overlay (Francis, 2026-09-30): between the interviewer appearing and their first word there are a few seconds of a still frame, which
  // looked like a freeze. Show a spinner + message until they actually start speaking (or a hard 7s cap, so it can never get stuck).
  const [firstSpeechStarted, setFirstSpeechStarted] = useState(false);
  const [scoreEmail, setScoreEmail] = useState('');
  const [tipsOptIn, setTipsOptIn] = useState(false);
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailError, setEmailError] = useState('');
  async function sendScoreEmail() {
    if (!feedback || !start || emailState === 'sending') return;
    setEmailError(''); setEmailState('sending');
    const dims = Object.entries(feedback.dimensions).sort((a, b) => b[1] - a[1]);
    const r = await emailTryOutScore({ email: scoreEmail.trim(), name, subject: start.subject, score: feedback.overall, strongest: dims[0]?.[0] ?? null, weakest: dims[dims.length - 1]?.[0] ?? null, tipsOptIn });
    if (r.ok) { setEmailState('sent'); logEvent('try_email_score', { metadata: { tipsOptIn, score: feedback.overall, mobile: isMobile } }); }
    else { setEmailState('idle'); setEmailError(r.message); }
  }
  const [copied, setCopied] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const busyRef = useRef(false);

  // Which service is drawing THIS visitor's avatar (decided by the server from the admin "Avatar provider" setting; see begin()). A ref
  // mirrors the state so speakLine (a memoised callback) always sees the current value.
  const [provider, setProvider] = useState<'heygen' | 'spatius'>('heygen');
  const providerRef = useRef<'heygen' | 'spatius'>('heygen');
  const spatiusStageRef = useRef<HTMLDivElement>(null);
  const spatius = useSpatiusAvatarSession(spatiusStageRef);
  const hr = useLiveAvatarSession('hr');
  const technical = useLiveAvatarSession('technical');
  const avatar = start?.interviewer === 'technical' ? technical : hr;
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  // Phone/tablet detection. Phones were BLOCKED from 2026-09-22 (the live-avatar flow got stuck after question one with no
  // sound); from 2026-09-26 they are allowed, voice-only, with the phone's sound unlocked at the tap (see begin()). What follows is
  // still how a phone is recognised — it now decides voice-only, not a wall. Original note on the test itself: `(pointer: coarse)` ALONE false-positives on any touchscreen Windows laptop (Surface, most 2-in-1s) — Chrome reports
  // coarse if ANY connected pointer is coarse, even with a mouse/trackpad also attached, which incorrectly gated real desktop
  // visitors off the live demo (found 2026-09-23, right as this page went public — a false gate here is worse than no gate at all).
  // Requiring `(hover: none)` too correctly excludes those: a touchscreen laptop still reports hover:hover because of its
  // mouse/trackpad, while an actual phone/tablet has no hover-capable input at all. The UA regex is a backstop for older browsers
  // without matchMedia. Computed once — a device doesn't change mid-visit.
  const [isMobile] = useState(detectMobile);

  // Wi-Fi vs mobile data (Francis, 2026-09-27: live video "worked very, very well" on Wi-Fi, same as desktop — the earlier phone
  // problems were the browser blocking sound and a weak SIGNAL, not phones as such). The Network Information API only exists on
  // Chrome/Android; Safari/iOS has never implemented it, so this can positively detect "wifi" or "cellular" there, but on iPhone it
  // can only ever report 'unknown' — never guess in that case, ask the visitor instead (the toggle below).
  type ConnectionHint = 'wifi' | 'cellular' | 'unknown';
  const [connectionHint] = useState<ConnectionHint>(() => {
    try {
      const conn = (navigator as unknown as { connection?: { type?: string; effectiveType?: string } }).connection;
      if (conn?.type === 'wifi' || conn?.type === 'ethernet') return 'wifi';
      if (conn?.type === 'cellular') return 'cellular';
      return 'unknown';
    } catch { return 'unknown'; }
  });
  // Whether THIS visitor gets the live-video interviewer instead of voice + photo. Ticked BY DEFAULT (Francis, 2026-09-29: "people don't
  // read these things properly and most people have Wi-Fi") — the only exception is a phone that positively reports mobile data (Android
  // Chrome can), where a weak signal is a real risk. iPhones can't report it, so they get the tick and can untick it. ?avatar=1 forces it on.
  const [wantsMobileVideo, setWantsMobileVideo] = useState(() => connectionHint !== 'cellular');
  useEffect(() => {
    if (isMobile && new URLSearchParams(window.location.search).get('avatar') === '1') setWantsMobileVideo(true);
  }, [isMobile]);

  // Where do visitors fall out of the demo? (Francis, 2026-09-26: lots of visits, no sign-ups — he wants the funnel in the admin
  // Activity Log.) The marketing site logs the click that sends people here; these events log what happens once they arrive.
  // try_mobile_visit = someone opened this page on a phone/tablet (phones are now allowed — voice-only, see begin()); the
  // later steps carry mobile:true so the funnel can show how phones get on compared with computers.
  useEffect(() => { if (isMobile) logEvent('try_mobile_visit', { metadata: { w: window.innerWidth } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'starting') logEvent('try_started', { metadata: { topic: topic.trim().slice(0, 60), mobile: isMobile, quick, language, difficulty, country: country || null } });
    else if (phase === 'asking' && index === 0) logEvent('try_first_question', { metadata: { avatar: useAvatar, provider: useAvatar ? providerRef.current : 'none', mobile: isMobile } });
    else if (phase === 'results') logEvent('try_completed', { metadata: { score: feedback?.overall ?? null, mobile: isMobile } });
    else if (phase === 'blocked') logEvent('try_blocked', { metadata: { reason: blockReason, mobile: isMobile } });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-question drop-off (Francis, 2026-09-29): the funnel showed 7 started, 7 heard Q1, only 2 finished, and 0 blocked — so
  // people were leaving silently mid-demo with nothing logged between Q1 and the score. try_answering = the question has been
  // read out and it's the visitor's turn; try_answer_submitted = they answered or skipped; try_left = they closed/navigated
  // away while still mid-demo (carries the phase + question number, i.e. exactly where they gave up).
  const getReadyActive = phase === 'asking' && index === 0 && !firstSpeechStarted;
  useEffect(() => {
    if (!getReadyActive) return;
    const cap = window.setTimeout(() => setFirstSpeechStarted(true), 7000);
    return () => window.clearTimeout(cap);
  }, [getReadyActive]);
  // Reads the avatars' reported state (plain values, not refs); the linter can't tell that from the hooks' return objects, which also carry ref callbacks.
  /* eslint-disable react-hooks/refs */
  const anyAvatarSpeaking = spatius.speaking || hr.avatarPoseState === 'speaking' || technical.avatarPoseState === 'speaking';
  /* eslint-enable react-hooks/refs */
  useEffect(() => {
    if (getReadyActive && anyAvatarSpeaking) setFirstSpeechStarted(true);
  }, [getReadyActive, anyAvatarSpeaking]);
  const enteredAtRef = useRef(0);
  useEffect(() => { enteredAtRef.current = Date.now(); }, []);
  const midDemoRef = useRef({ phase, index });
  useEffect(() => { midDemoRef.current = { phase, index }; }, [phase, index]);
  useEffect(() => {
    if (phase === 'answering') logEvent('try_answering', { metadata: { q: index + 1, mobile: isMobile } });
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onLeave = () => {
      const { phase: p, index: i } = midDemoRef.current;
      if (p === 'topic' || p === 'results' || p === 'blocked') return;
      logEvent('try_left', { metadata: { phase: p, q: i + 1, mobile: isMobile, secondsOnPage: Math.round((Date.now() - enteredAtRef.current) / 1000) } });
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cost guard (2026-09-29): the demo keeps the avatar connected while the visitor thinks, and a forgotten open tab would bill until the browser
  // closed it (up to 60 min on the Spatius plan). If nobody has answered within 2.5 minutes, drop the avatar and carry on voice-and-photo.
  // The next question just falls back to plain voice (speakLine already handles a disconnected avatar).
  useEffect(() => {
    if (phase !== 'answering' || !useAvatar) return;
    const t = setTimeout(() => {
      void spatius.disconnect(true); void hr.disconnect(); void technical.disconnect();
      setUseAvatar(false); setAvatarState('off');
      logEvent('try_avatar_idle_disconnect', { metadata: { provider: providerRef.current, q: index + 1, mobile: isMobile } });
    }, 150_000);
    return () => clearTimeout(t);
  }, [phase, index, useAvatar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Never leave a billable avatar connection or a voice running when the page is left.
  useEffect(() => () => { cancelSpeechRef.current?.(); void hr.disconnect(); void technical.disconnect(); void spatius.disconnect(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Preparing your interview…" can genuinely take a while (some topics route to a slower model) — a plain static line looked stuck
  // (Francis, 2026-09-22). The progress bar below is always animated; this just adds an honest reassurance line once it's taken a
  // little longer than the common case, so it reads as "still working" rather than "broken".
  useEffect(() => {
    if (phase !== 'starting') { setSlowHint(false); return; }
    const t = setTimeout(() => setSlowHint(true), 9000);
    return () => clearTimeout(t);
  }, [phase]);

  // The interviewer speaking: the live avatar when connected, otherwise their plain voice.
  // A hard ceiling on every spoken line: if a phone (or a bad connection) never lets the audio start or finish, the interview still
  // moves on — the question is on screen, so nothing is lost. Without this, a silent line left the page waiting forever.
  const withCeiling = (p: Promise<void>, text: string) =>
    Promise.race([p, new Promise<void>(resolve => setTimeout(resolve, 8000 + text.split(/\s+/).length * 550))]);

  const speakLine = useCallback(async (text: string, s: TryOutStart, viaAvatar: boolean) => {
    const seat = s.interviewer === 'technical' ? technical : hr;
    if (viaAvatar) {
      // HeyGen tells us the moment its avatar really starts talking (AVATAR_SPEAK_STARTED) — that ends the "getting ready" overlay, like Spatius's own
      // speaking state does. Waiting for HeyGen's separate pose-state update instead left the spinner up well after Wayne had started talking (Francis, 2026-09-30).
      try { await withCeiling(providerRef.current === 'spatius' ? spatius.speak(text, s.interviewer) : seat.speak(text, s.interviewer, () => setFirstSpeechStarted(true)), text); return; }
      catch { setUseAvatar(false); setAvatarState('off'); /* fall through to the voice-only path */ }
    }
    // Voice-only path: same idea — the overlay ends when the voice really starts playing, not on a guess.
    await withCeiling(new Promise<void>(resolve => { cancelSpeechRef.current = speakTts(text, s.interviewer, resolve, undefined, () => setFirstSpeechStarted(true)); }), text);
  }, [hr, technical, spatius]);

  // The Guardian Angel coach: always the plain narrator voice ('hr'), never the avatar — same as the full interview.
  const speakAsCoach = useCallback((text: string) => withCeiling(new Promise<void>(resolve => { cancelSpeechRef.current = speakTts(text, 'hr', resolve); }), text), []);

  const ask = useCallback(async (i: number, s: TryOutStart, viaAvatar: boolean) => {
    setPhase('asking'); setDraft(''); setCoaching(null);
    const q = s.questions[i];
    const hello = firstName ? `Hi ${firstName}, I'm ${s.interviewerName}.` : `Hi, I'm ${s.interviewerName}.`;
    // The first question also tells them exactly what to do — the most common confusion in early tests was not knowing how to answer or move on.
    // In another language the greeting comes from the server (written in that language, with {name}/{interviewer} placeholders) so the whole spoken
    // line is in one language; it is only used if the placeholders fill in cleanly, otherwise the English greeting stands.
    const localIntro = s.intro ? s.intro.replace('{name}', firstName).replace('{interviewer}', s.interviewerName) : null;
    const opening = localIntro && !/[{}]/.test(localIntro) ? localIntro : `${hello} Let's start your ${s.subject} interview.`;
    // Privacy reassurance before the first question (Francis, 2026-10-07: "a chance to gain confidence in the users"). Two short sentences, so the first question still
    // arrives quickly. English uses the page's own line; another language uses the server's translation of it, and if that is missing, says nothing rather than
    // switching language.
    const privacy = s.intro || s.privacy ? (s.privacy ?? '') : PRIVACY_LINE_EN;
    const line = i === 0
      // Kept short on purpose (2026-09-29): visitors arriving from a LinkedIn profile give it ~10 seconds, and five of five who got the
      // live avatar heard question one and then left. The how-to-answer instructions now live on screen in the "Your turn" panel instead
      // of being read aloud.
      // A clear line between the introduction and the interview itself (Francis, 2026-10-07). English uses the page's own wording; another language uses the server's
      // translation, and says nothing rather than switching language if that is missing.
      ? `${opening} ${privacy} ${s.intro ? (s.transitions?.first ?? '') : 'So, your first question is:'} ${q}`.replace(/\s+/g, ' ')
      : q;
    await speakLine(line, s, viaAvatar);
    setPhase('answering');
  }, [speakLine, firstName]);

  async function begin() {
    const subject = topic.trim();
    if (subject.length < 2 || !name.trim()) return;
    unlockTTSAudio(); // must be first — see its own note: phones only allow sound that starts inside the tap
    setPhase('starting'); setMessage('');
    const r = await startTryOut(subject, { language, difficulty, country }, questionsSeen(subject), wantedInterviewerFromUrl());
    if (!r.ok) { setMessage(r.message); setBlockReason(r.capped ? 'capped' : 'error'); setPhase('blocked'); return; }
    // The chosen interviewer's own voice and pace follow from the seat store (every voice request reads it); no choice clears it back to the defaults.
    const ci = r.data.chosenInterviewer;
    setSeatInterviewers(ci ? { [ci.role]: { id: ci.id, name: ci.displayName, description: ci.description, traits: ci.traits } } : {});
    rememberQuestionsSeen(subject, r.data.questions);
    const s = quick ? { ...r.data, questions: r.data.questions.slice(0, QUICK_QUESTION_COUNT) } : r.data;
    setFirstSpeechStarted(false);
    setStart(s); setIndex(0); setAnswers([]); setSkipped(0); setSkippedIdx([]); setRevealed(null); setRevealedText({}); setPaused(false); setFeedback(null); setShareOpen(false);
    // Must begin from this click so the browser lets audio play. Connecting can fail or be slow — the interview goes ahead either way.
    let live = false;
    let connectMs = 0;
    // Phones default to VOICE only + the interviewer's photo (2026-09-26): the streamed avatar needs a strong steady connection and its
    // own fresh tap to start sound. Confirmed 2026-09-27: on Wi-Fi the live video is just as good as desktop — so Wi-Fi (detected, or the
    // visitor's own opt-in via the toggle below) gets the real thing; everyone else gets the reliable, free voice-only path.
    const useMobileVideo = isMobile && wantsMobileVideo;
    if (useMobileVideo) {
      // iOS only allows a <video> to play sound later if it was first "blessed" inside a real tap — this is that tap, before the
      // stream itself even exists yet (it arrives seconds later, once WebRTC connects).
      document.querySelectorAll('video').forEach(v => { try { v.srcObject = new MediaStream(); v.muted = false; void v.play().catch(() => { /* not allowed yet — fine */ }); } catch { /* ignore */ } });
    }
    if (s.avatarAvailable && (!isMobile || useMobileVideo)) {
      setInterviewTicket(s.ticket);
      setAvatarState('connecting');
      const connectStarted = performance.now();
      providerRef.current = 'heygen'; setProvider('heygen');
      // Spatius first when the server chose it for this visitor. If it can't start (token refused, browser can't render, limit hit) and the
      // admin has fallback on, quietly carry on with HeyGen — the visitor never sees an error. Logged so the Activity Log shows how often.
      // iPhones/iPads (every iOS browser is WebKit) only start a page's sound inside a tap, and Spatius's sound system starts after network waits, so
      // it never gets going there (seen live 2026-09-29: "audio start timed out" every time). Skip straight to HeyGen rather than make the visitor
      // wait for the timeout. Android and desktop are unaffected. A future "tap to meet your interviewer" step could bring iOS onto Spatius.
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (s.avatarProvider === 'spatius' && isIos) logEvent('try_avatar_skipped', { metadata: { provider: 'spatius', reason: 'ios sound rules', mobile: isMobile } });
      if (s.avatarProvider === 'spatius' && s.spatiusAvatarId && s.ticket && !isIos) {
        logEvent('try_avatar_connecting', { metadata: { provider: 'spatius', mobile: isMobile } });
        try {
          await withTimeout(isOriginalInterviewer(s.chosenInterviewer?.id)
            ? spatius.connect(s.spatiusAvatarId, s.ticket, spatiusTransformFromUrl(s.interviewer === 'technical' ? 'technical' : 'hr'))
            : (async () => {
                // The avatar view takes its size from the stage at the moment it connects and keeps it, and straight after "Start" the stage is still settling into its 16:9 shape
                // (seen 2026-10-07: Malcolm connected while it was 718x600, so he came out low and cropped). Wait, briefly, for the real shape.
                for (let i = 0; i < 40; i++) {
                  const el = spatiusStageRef.current;
                  if (el && el.clientWidth > 200 && Math.abs(el.clientHeight - el.clientWidth * 9 / 16) < 10) break;
                  await new Promise(r => setTimeout(r, 100));
                }
                await spatius.connect(s.spatiusAvatarId!, s.ticket!, undefined, undefined, 1);
              })(), SPATIUS_CONNECT_LIMIT_MS, 'spatius');
          live = true; providerRef.current = 'spatius'; setProvider('spatius'); setAvatarState('live');
          logEvent('try_avatar_connected', { metadata: { provider: 'spatius', ms: Math.round(performance.now() - connectStarted), mobile: isMobile } });
        } catch (e) {
          void spatius.disconnect(true); // also cancels a connect() still in flight, so it can't finish later as a ghost session
          logEvent('try_avatar_fallback', { metadata: { from: 'spatius', reason: String(e instanceof Error ? e.message : e).slice(0, 80), willFallBack: s.fallbackToHeygen !== false, mobile: isMobile } });
        }
      }
      if (!live && (s.avatarProvider !== 'spatius' || s.fallbackToHeygen !== false)) {
        const seat = s.interviewer === 'technical' ? technical : hr;
        const heygenStarted = performance.now();
        logEvent('try_avatar_connecting', { metadata: { provider: 'heygen', mobile: isMobile } });
        try {
          await withTimeout(seat.connect(), HEYGEN_CONNECT_LIMIT_MS, 'heygen');
          live = true; setAvatarState('live');
          logEvent('try_avatar_connected', { metadata: { provider: 'heygen', ms: Math.round(performance.now() - heygenStarted), mobile: isMobile } });
        } catch (e) {
          void seat.disconnect(); // stop a half-open (billed) session
          setAvatarState('off');
          logEvent('try_avatar_failed', { metadata: { provider: 'heygen', reason: String(e instanceof Error ? e.message : e).slice(0, 80), mobile: isMobile } });
        }
      } else if (!live) setAvatarState('off');
      connectMs = performance.now() - connectStarted;
    }
    setUseAvatar(live);
    setPhase('asking');
    // Let the video element mount and attach before the avatar's first words, or the opening of the greeting can be
    // lost/garbled (Francis, 2026-09-23: reported live before a client meeting, "jumbled" on the very first line,
    // fine after). A flat 600ms was the original guess — too fragile on a slow connection, where the WebRTC
    // handshake connect() just finished itself already ate several seconds and the stream is still catching up
    // right when speech starts. Scale the wait by how long connect() itself actually took, on the theory that a
    // slow handshake means a slow/jittery link that needs proportionally more settle time too, not a fixed guess
    // that's equally (in)sufficient regardless of the network it's running on. Floor matches the old constant;
    // capped so a very slow connect() doesn't make the greeting feel stalled.
    if (live) await new Promise(res => setTimeout(res, Math.min(Math.max(connectMs, 600), 2500)));
    void ask(0, s, live);
  }

  // Straight into the interview room from the marketing homepage (Francis, 2026-09-30): the hero form already collected the role and first name and
  // sends ?go=1 with them, so there is nothing left to fill in. Desktop only — phones need their own tap to let the interviewer's sound play — and
  // only when BOTH values are present, so a shared /try?topic= link still shows the form. Once per page load (the ref also covers React strict mode).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (wantsAutoStart()) void begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Answer (or skip) the current question: clicking Submit answer means "I'm done" — the Guardian Angel coach takes over straight
  // away in a full-screen popup (Francis, 2026-09-22: the old flow went quiet here, waiting on a "Next question" click, which felt
  // like it was stuck), speaks its reaction, then speaks the transition itself — never Wayne/Amina — and the popup closes into the
  // next question automatically. No second click, at any point.
  // Read the question out again (just the question — no greeting), then hand the turn back.
  async function repeatQuestion() {
    if (!start || busyRef.current || capturing) return;
    cancelSpeechRef.current?.();
    setPhase('asking');
    await speakLine(start.questions[index], start, useAvatar);
    setPhase('answering');
  }
  function pauseInterview() {
    if (capturing) return;
    cancelSpeechRef.current?.();
    setPaused(true);
    logEvent('try_paused', { metadata: { q: index + 1, mobile: isMobile } });
  }

  async function showAnswer() {
    if (!start || busyRef.current) return;
    unlockTTSAudio();   // inside the click: the model answer is fetched first and spoken seconds later, which a browser may no longer count as part of the tap
    cancelSpeechRef.current?.();
    logEvent('try_answer_revealed', { metadata: { q: index + 1, mobile: isMobile } });
    setRevealed({ loading: true, text: null });
    const r = await modelAnswerTryOut(start.subject, start.questions[index], language);
    if (!r.ok) { setRevealed({ loading: false, text: null, failed: r.message }); return; }
    setRevealed({ loading: false, text: r.data.answer });
    void speakAsCoach(r.data.answer);
  }
  function continueAfterReveal() {
    if (!revealed?.text) return;
    const text = revealed.text;
    setRevealedText(m => ({ ...m, [index]: text }));
    setRevealed(null);
    void submit(true);
  }

  async function submit(skip: boolean, overrideText?: string) {
    if (!start || busyRef.current) return;
    const text = skip ? '' : (overrideText ?? draft).trim();
    if (!skip && !text) return;
    busyRef.current = true;
    cancelSpeechRef.current?.();
    logEvent('try_answer_submitted', { metadata: { q: index + 1, skipped: skip, chars: text.length, mobile: isMobile } });

    const q = start.questions[index];
    const isLast = index + 1 >= start.questions.length;
    const nextAnswers = skip ? answers : [...answers, { question: q, answer: text }];
    if (skip) { setSkipped(n => n + 1); setSkippedIdx(a => [...a, index]); } else setAnswers(nextAnswers);
    setSkipTransition(skip);
    setPhase('coaching'); setCoaching(null);

    // On the last question, start scoring now so the result is ready by the time the closing words finish.
    let scoring: Promise<TryOutResult<TryOutFeedback>> | null = null;
    if (isLast && nextAnswers.length > 0) scoring = scoreTryOut(start.subject, nextAnswers, firstName, language, start.questions.length);

    if (!skip) {
      const c = await coachTryOut(start.subject, q, text, firstName, language);
      const coach = c.ok ? { text: c.data.coaching, score: c.data.score } : { text: 'Thank you — that gives us something to work with.', score: 5 };
      setCoaching(coach);
      await speakAsCoach(coach.text);
    }
    // The Guardian Angel carries the conversation forward, not the interviewer — Wayne/Amina stay silent until the next question.
    // In another language these lines come from the server, written in that language (start.transitions); English, or a line the server dropped, keeps the page's own wording.
    const tr = start.transitions;
    const transition = skip
      ? (isLast ? (tr?.finish ?? `No problem. That's ${start.questions.length === 1 ? 'your question' : `your ${countWord(start.questions.length)} questions`} — let me put your result together.`) : (tr?.skipped ?? "No problem — let's continue."))
      : (isLast ? (tr?.finish ?? `Thank you. That's ${start.questions.length === 1 ? 'your question' : `your ${countWord(start.questions.length)} questions`} — let me put your result together.`) : (tr?.next ?? "Let's continue."));
    await speakAsCoach(transition);

    if (!isLast) { setIndex(index + 1); busyRef.current = false; void ask(index + 1, start, useAvatar); return; }

    // Done: stop the (billed) avatar connection straight away.
    void avatar.disconnect(); void spatius.disconnect(true); setAvatarState('off');
    setPhase('scoring');
    if (!scoring) { setMessage("You didn't answer any of the questions, so there's nothing for us to score. Have another go whenever you're ready — even a short answer is enough."); setBlockReason('noAnswers'); setPhase('blocked'); busyRef.current = false; return; }
    const r = await scoring;
    busyRef.current = false;
    if (!r.ok) { setMessage(r.message); setBlockReason(r.capped ? 'capped' : 'error'); setPhase('blocked'); return; }
    setFeedback(r.data); setPhase('results');
  }

  function restart() {
    cancelSpeechRef.current?.(); busyRef.current = false;
    void hr.disconnect(); void technical.disconnect(); void spatius.disconnect(true);
    setStart(null); setAnswers([]); setSkipped(0); setSkippedIdx([]); setRevealed(null); setRevealedText({}); setPaused(false); setFeedback(null); setDraft(''); setCoaching(null); setSkipTransition(false); setIndex(0); setAvatarState('off'); setUseAvatar(false); setShareOpen(false); setEmailOpen(false); setEmailState('idle'); setFirstSpeechStarted(false); setPhase('topic');
  }

  // ── Sharing ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const shareText = feedback && start
    ? `I just did a live AI mini interview for ${start.subject} on TheInterviewChair.com and scored ${feedback.overall}/100. Try yours free:`
    : 'I just tried a live AI mini interview on TheInterviewChair.com — pick any job role and be interviewed in 3 minutes. Free:';
  async function share() {
    const data = { title: 'TheInterviewChair.com', text: shareText, url: SHARE_URL };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share(data); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    setShareOpen(o => !o);
  }
  async function copyShare() {
    try { await navigator.clipboard.writeText(`${shareText} ${SHARE_URL}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }
  const enc = encodeURIComponent;

  const card: React.CSSProperties = { background: 'var(--bg2, #0f1829)', border: '1px solid var(--border, rgba(255,255,255,0.1))', borderRadius: 18, padding: 22 };
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg3, #14213a)', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: 12, padding: '13px 14px', color: 'var(--text, #f1f5f9)', fontSize: 15, outline: 'none', fontFamily: 'inherit' };
  const primary: React.CSSProperties = { background: `linear-gradient(135deg,${GREEN},#047857)`, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 22px', fontSize: 15, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', textAlign: 'center' };
  const ghost: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: 'var(--text, #f1f5f9)', border: '1px solid var(--border, rgba(255,255,255,0.14))', borderRadius: 12, padding: '14px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', textAlign: 'center' };
  const selectStyle: React.CSSProperties = { ...inputStyle, padding: '12px 12px', fontSize: 14, cursor: 'pointer', colorScheme: 'dark' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3, #94a3b8)', marginBottom: 8 };

  return (
    <div style={{ minHeight: '100vh', width: '100%', boxSizing: 'border-box', overflowX: 'hidden', WebkitTextSizeAdjust: '100%', background: 'var(--bg, #070d1a)', color: 'var(--text, #f1f5f9)', fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif', padding: '20px 16px 60px' }}>
      {/* No maxWidth: 100vw here (2026-09-27 fix) — on iOS Safari, `vw` units can go stale across an
          orientation change (the classic "rotate to landscape and back, layout stays wrong" bug,
          Francis 2026-09-27), where `%` units do not, because they resolve against the actual
          layout viewport on every render instead of a cached viewport snapshot. width:100% +
          overflow-x:hidden already stop the sideways-overflow bug this was originally added for. */}
      {/* position: relative so the hidden avatar stage below is sized by THIS 720px column, not the whole window — the SDK sizes its picture to the stage at connect time, and a window-wide hidden stage made Wayne far too close on big screens (found 2026-09-30). */}
      <div style={{ position: 'relative', maxWidth: 720, width: '100%', minWidth: 0, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
          <a href="https://www.theinterviewchair.com" style={{ textDecoration: 'none', fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>
            <span style={{ color: GREEN }}>The</span>Interview<span style={{ color: GREEN }}>Chair</span><span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>.com</span>
          </a>
          <a href="https://www.theinterviewchair.com" style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)', textDecoration: 'none' }}>← Back to site</a>
        </div>

        {(<>

        {/* Interviewer video box — ALWAYS mounted from the very first non-mobile render, never
            gated by phase/useAvatar/start. Found 2026-09-24: this page previously only rendered
            <video ref={avatar.setVideoEl}> once useAvatar flipped true, which reintroduced the
            exact connect()-to-attach() jitter-buffer-backlog gap already root-caused and fixed on
            InterviewRoomPage.tsx/TalkRoomPage.tsx on 2026-09-14 (see
            project-liveavatar-lipsync-investigation memory) — that fix never made it to this
            page, built a week later. Both hr/technical <video> elements have STABLE refs (never
            swapped, never conditionally rendered) so attach() fires the instant each session's
            stream is ready, regardless of which phase the UI happens to be showing. Only one
            ever actually connects per trial (whichever start.interviewer picks); the other stays
            blank forever, harmless. Visibility toggles via opacity only, never mount/unmount. */}
        <div style={
          (phase === 'asking' || phase === 'answering' || phase === 'coaching' || phase === 'scoring')
            ? { position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#05080f', border: '1px solid var(--border, rgba(255,255,255,0.1))', aspectRatio: '16 / 9', marginBottom: 14 }
            : { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: '16 / 9', opacity: 0, pointerEvents: 'none', zIndex: -1 } // same 16:9 shape as when shown, so the avatar view is sized right when it connects
        }>
          <video ref={hr.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: useAvatar && provider === 'heygen' && avatar === hr ? 1 : 0 }} />
          <video ref={technical.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: useAvatar && provider === 'heygen' && avatar === technical ? 1 : 0 }} />
          {/* Spatius draws into this box (transparent canvas, so the soft backdrop shows through). Always mounted, like the videos above. */}
          <div style={{ position: 'absolute', inset: 0, opacity: useAvatar && provider === 'spatius' ? 1 : 0, background: 'radial-gradient(ellipse at 15% 25%, rgba(255,255,255,0.75) 0, transparent 38%), radial-gradient(ellipse at 85% 30%, rgba(255,255,255,0.45) 0, transparent 30%), linear-gradient(180deg, #dfe4ec 0%, #c3cad6 60%, #98a2b3 100%)' }}>
            {/* The avatar is drawn into a box shaped like the test page's (about 1.2 : 1) and centred in the wide 16:9 stage — in the full-width box he
                filled the whole frame, too close to the screen (Francis, 2026-09-29). The sides just show the soft backdrop. */}
            <div ref={spatiusStageRef} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(100 - SPATIUS_STAGE_WIDTH_PCT) / 2}%`, width: `${SPATIUS_STAGE_WIDTH_PCT}%` }} />
          </div>
          {!useAvatar && start && (
            <>
              {/* Voice-only interview (all phones, and desktop when no live avatar is available): the interviewer's photo, with a soft green
                  ring while they are speaking — so there is always a face, not a letter (Francis, 2026-09-26: "I can't see Wayne"). */}
              {/* The whole portrait, at its natural perspective (Francis, 2026-10-08: on a phone Haruto's head filled the frame): shown complete over a blurred copy of itself. */}
              <img aria-hidden="true" alt="" src={start.interviewerPortraitUrl && start.interviewerPortraitUrl.startsWith('/') ? `${(import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global'}${start.interviewerPortraitUrl}` : start.interviewerId ? `/images/interviewers/${start.interviewerId}.jpg` : start.interviewer === 'technical' ? '/images/wayne-static-photo.png' : '/images/amina-static-image-1.png'}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px)', transform: 'scale(1.15)', opacity: 0.55 }} />
              <img
                src={start.interviewerPortraitUrl && start.interviewerPortraitUrl.startsWith('/') ? `${(import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global'}${start.interviewerPortraitUrl}` : start.interviewerId ? `/images/interviewers/${start.interviewerId}.jpg` : start.interviewer === 'technical' ? '/images/wayne-static-photo.png' : '/images/amina-static-image-1.png'}
                onError={e => { const old = start.interviewer === 'technical' ? '/images/wayne-static-photo.png' : '/images/amina-static-image-1.png'; if (!e.currentTarget.src.endsWith(old)) e.currentTarget.src = old; }}
                alt={`${start.interviewerName}, your interviewer`}
                width={520} height={288}
                // Shown whole (contain) over the blurred copy above: a cropped fill cut off Malcolm's head on the timeout screen and made Haruto's head too big on a phone (Francis, 2026-10-08).
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center top' }}
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: 18, boxShadow: phase === 'asking' ? `inset 0 0 0 3px ${GREEN}88` : 'inset 0 0 0 0 transparent', transition: 'box-shadow 0.3s', pointerEvents: 'none' }} />
            </>
          )}
          {start && getReadyActive && (
            <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(5,8,15,0.55)', backdropFilter: 'blur(2px)' }}>
              <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
                <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
                <path d="M23 5 a18 18 0 0 1 18 18" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 23 23" to="360 23 23" dur="0.9s" repeatCount="indefinite" />
                </path>
              </svg>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>{start.interviewerName} is getting ready…</div>
            </div>
          )}
          {start && (
            <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
              {start.interviewerName} · Interviewer{phase === 'asking' ? (getReadyActive ? ' · getting ready…' : ' · speaking…') : ''}
            </div>
          )}
        </div>

        {phase === 'topic' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 20, padding: '5px 12px' }}>Free · no account · about {quick ? 'a minute' : '3 minutes'}</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7DB3FF', background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.32)', borderRadius: 20, padding: '5px 12px' }}>🌍 Interview in {LANGUAGES.length} languages</div>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,6vw,42px)', lineHeight: 1.1, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Try it live.<br /><span style={{ color: GREEN }}>Be interviewed for real.</span></h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', margin: '0 0 22px' }}>
              Tell us the job you're going for. {quick ? `A live AI interviewer asks you ${countWord(QUICK_QUESTION_COUNT)} questions — about a minute — and you get a scored result.` : 'A live AI interviewer asks you three questions, your Guardian Angel coach helps after each answer, and you get a scored result.'}
            </p>
            <div style={card}>
              <label style={labelStyle} htmlFor="tryRole">Which job role should we interview you on?</label>
              <input id="tryRole" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && void begin()} maxLength={90}
                placeholder="e.g. Product Manager or Software Engineer" style={inputStyle} autoFocus />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 18px' }}>
                {ROLE_CHIPS.map(x => (
                  <button key={x} onClick={() => setTopic(x)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border, rgba(255,255,255,0.12))', color: 'var(--text-2, #cbd5e1)', borderRadius: 20, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>{x}</button>
                ))}
              </div>
              <label style={labelStyle} htmlFor="tryName">What should we call you?</label>
              <input id="tryName" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && void begin()} maxLength={30}
                placeholder="e.g. Sam" style={{ ...inputStyle, marginBottom: 18 }} autoComplete="given-name" />
              {/* Interview language (32 languages; English as regional versions) and question difficulty — the same four levels as the full interview intake. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle} htmlFor="tryLanguage">Interview language</label>
                  <select id="tryLanguage" value={languageValue} onChange={e => { languageTouchedRef.current = true; setLanguageValue(e.target.value); }} style={selectStyle}>
                    {LANGUAGE_CHOICES.map(l => <option key={l.value} value={l.value}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="tryDifficulty">Question difficulty</label>
                  <select id="tryDifficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ ...selectStyle, color: (DIFFICULTIES.find(d => d.value === difficulty) ?? DIFFICULTIES[2]).color, fontWeight: 700 }}>
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value} style={{ color: d.color, background: '#0c1220' }}>{d.value}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', margin: '-8px 0 18px', lineHeight: 1.5 }}>
                {language === 'en' ? `Your interviewer speaks ${languageChoice.name}.` : `Your interviewer will speak, ask and respond in ${languageChoice.name}.`}{' '}
                {(DIFFICULTIES.find(d => d.value === difficulty) ?? DIFFICULTIES[2]).desc}
              </div>
              {isMobile && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: 12, padding: '12px 14px', marginBottom: 18, cursor: 'pointer' }}>
                  <input type="checkbox" checked={wantsMobileVideo} onChange={e => setWantsMobileVideo(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2, #cbd5e1)' }}>
                    {connectionHint === 'cellular'
                      ? <>Show the interviewer's <strong>live video</strong>, not just their photo. <span style={{ color: AMBER }}>You appear to be on mobile data — for the best experience, this works far better on Wi-Fi.</span></>
                      : connectionHint === 'wifi'
                      ? <>Show the interviewer's <strong>live video</strong> — you're on Wi-Fi, so this should work great.</>
                      : <>Show the interviewer's <strong>live video</strong>, not just their photo. Works best on <strong>Wi-Fi</strong> — if you're on mobile data and it's slow, untick this and you'll get their voice and photo instead.</>}
                  </span>
                </label>
              )}
              <button onClick={() => void begin()} disabled={topic.trim().length < 2 || !name.trim()} style={{ ...primary, width: '100%', opacity: (topic.trim().length < 2 || !name.trim()) ? 0.5 : 1 }}>Start my mini interview →</button>
              {/* Reassurance (Francis, 2026-10-04): what puts people off is being seen or embarrassed, not data. Every line here is literally true — a demo is
                  private to the visitor, has no camera, and is never shown to anyone. See privacy.html ("Try it live"). */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: 14, fontSize: 12.5, color: 'var(--text-2, #cbd5e1)' }}>
                <span>🔒 Private. Only you see your interview</span>
                <span>🎙️ Voice or typing. No camera</span>
                <span>🤝 Make your mistakes here, not in the real interview</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', marginTop: 8, textAlign: 'center' }}>Nothing is public or shown to recruiters. We don't keep your answers.</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => void share()} style={{ background: 'none', border: 'none', color: 'var(--text-3, #94a3b8)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>Know someone with an interview coming up? Share this</button>
              {shareOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`}>LinkedIn</a>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc(`${shareText} ${SHARE_URL}`)}`}>WhatsApp</a>
                  <button style={ghost} onClick={() => void copyShare()}>{copied ? 'Copied ✓' : 'Copy text + link'}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'starting' && (
          <div style={{ ...card, textAlign: 'center', padding: '28px 22px 36px' }}>
            {/* The iconic spotlight chair while the interview is set up (Francis, 2026-09-21), plus a moving progress bar and, if it's
                taking longer than the common case, a reassurance line — so it reads as working, not stuck (Francis, 2026-09-22). */}
            <style>{'@keyframes tryChairGlow{0%,100%{opacity:.82;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}@keyframes tryBarSlide{0%{left:-40%}100%{left:100%}}'}</style>
            <img
              src="/images/chair-spotlight.webp"
              alt="The interview chair, waiting in the spotlight"
              width={820}
              height={783}
              style={{ display: 'block', width: '100%', maxWidth: 300, height: 'auto', margin: '0 auto 18px', borderRadius: 16, animation: 'tryChairGlow 2.6s ease-in-out infinite' }}
            />
            <div style={{ fontSize: 17, fontWeight: 700 }}>Preparing your interview…</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-3, #94a3b8)', marginTop: 8 }}>{avatarState === 'connecting' ? 'Your interviewer is taking their seat' : (quick ? `Writing your ${countWord(QUICK_QUESTION_COUNT)} questions` : 'Writing three questions for your role')}</div>
            <div style={{ width: '100%', maxWidth: 220, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '16px auto 0', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', borderRadius: 99, background: `linear-gradient(90deg,${GREEN},#047857)`, animation: 'tryBarSlide 1.3s ease-in-out infinite' }} />
            </div>
            {slowHint && (
              <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', marginTop: 14 }}>Still working — some roles take a little longer to prepare. Thanks for hanging on.</div>
            )}
          </div>
        )}

        {(phase === 'asking' || phase === 'answering' || phase === 'coaching' || phase === 'scoring') && start && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10, gap: 4, columnGap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)', overflowWrap: 'anywhere', minWidth: 0, flex: '1 1 200px' }}>Interview for <strong style={{ color: 'var(--text, #f1f5f9)' }}>{start.subject}</strong>{start.unlimited && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, color: AMBER }}>· demo mode — no limits</span>}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, whiteSpace: 'nowrap' }}>Question {Math.min(index + 1, start.questions.length)} of {start.questions.length}</div>
            </div>
            {/* Video box now lives permanently mounted above, outside this phase gate — see its own comment. */}

            {(phase === 'asking' || phase === 'answering') && (
              <div style={{ ...card, marginTop: 14 }}>
                {phase === 'answering' && !revealed && !paused && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <button onClick={() => void repeatQuestion()} disabled={capturing} title={capturing ? 'Stop recording first' : 'Hear the question again'} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.35)', color: '#6b9bf7', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: capturing ? 'not-allowed' : 'pointer', opacity: capturing ? 0.4 : 1 }}>↩ Repeat</button>
                    <button onClick={pauseInterview} disabled={capturing} title={capturing ? 'Stop recording first' : undefined} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)', color: GREEN, borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: capturing ? 'not-allowed' : 'pointer', opacity: capturing ? 0.4 : 1 }}>⏸ Pause</button>
                    <button onClick={() => void showAnswer()} disabled={capturing} title={capturing ? 'Stop recording first' : 'See a model answer instead of guessing'} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.35)', color: GREEN, borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: capturing ? 'not-allowed' : 'pointer', opacity: capturing ? 0.4 : 1 }}>💡 Tell Me The Answer</button>
                    <button onClick={() => void submit(true)} disabled={capturing} title={capturing ? 'Stop recording first' : undefined} style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: '#EF4444', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: capturing ? 'not-allowed' : 'pointer', opacity: capturing ? 0.4 : 1 }}>Pass →</button>
                  </div>
                )}
                <div style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 700, marginBottom: 14 }}>{start.questions[index]}</div>
                {paused ? (
                  <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>⏸ Paused</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-3, #94a3b8)', marginBottom: 14 }}>Take your time. Nothing is running while you are paused.</div>
                    <button onClick={() => setPaused(false)} style={primary}>▶ Resume</button>
                  </div>
                ) : revealed ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, marginBottom: 8 }}>💡 Model answer</div>
                    {revealed.loading ? (
                      <div style={{ fontSize: 14, color: 'var(--text-3, #94a3b8)' }}>Writing a model answer…</div>
                    ) : revealed.failed ? (
                      <>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 12 }}>{revealed.failed}</div>
                        <button onClick={() => setRevealed(null)} style={ghost}>← Back to my answer</button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text, #f1f5f9)' }}>{revealed.text}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', marginTop: 12 }}>It is here to teach you, so this question counts as zero. Your other answers are scored as normal.</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 }}>
                          <button onClick={() => void speakAsCoach(revealed.text ?? '')} style={ghost}>🔊 Hear it again</button>
                          <button onClick={continueAfterReveal} style={primary}>{index + 1 < start.questions.length ? 'Continue →' : 'Finish & get my score →'}</button>
                        </div>
                      </>
                    )}
                  </>
                ) : phase === 'answering' ? (
                  <>
                    {/* "Your turn" (2026-09-29): the moment the question has been read out has to be unmistakable, and the easiest way to
                        answer (tap the mic and talk) comes first — typing is the fallback below it. */}
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, marginBottom: 6 }}>🎤 Your turn</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-2, #cbd5e1)', marginBottom: 12 }}>
                      Tap the <strong style={{ color: GREEN }}>green microphone</strong> and answer out loud — it sends by itself when you stop. No mic? Type below instead.
                    </div>
                    {/* The mic always gets its own full-width row — the same layout the full interview uses. Sharing a row with
                        the buttons let its waveform's width (and so the whole row) jump around as the card resized
                        (Francis, 2026-09-22). Auto-submits on transcript (Francis, 2026-09-24: "many times I've sat there
                        waiting... realise I'm supposed to click Submit Answer, which is different to our full interview
                        process") — matches InterviewRoomPage.tsx's VoiceInput, which calls submitAnswer() directly from
                        onTranscript rather than requiring a separate manual click. The typed-answer path below keeps its
                        own manual Submit button, same as the full interview does for typed answers. */}
                    <div style={{ marginTop: 12 }}>
                      <VoiceInput language={language} country={country || undefined} onListeningChange={setCapturing} onTranscript={text => {
                        const combined = (draftRef.current ? draftRef.current + ' ' : '') + text;
                        setDraft(combined);
                        void submit(false, combined);
                      }} />
                    </div>
                    <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="…or type your answer here" style={{ ...inputStyle, resize: 'vertical', marginTop: 12 }} />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 }}>
                        <button onClick={() => void submit(false)} disabled={!draft.trim()} style={{ ...primary, opacity: draft.trim() ? 1 : 0.5 }}>
                          {index + 1 < start.questions.length ? 'Submit answer →' : 'Finish & get my score →'}
                        </button>
                    </div>
                  </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)' }}>Listen to the question — then it's your turn…</div>}
              </div>
            )}

            {/* The moment they submit an answer, the Guardian Angel takes over in a full-screen popup — reacts, says "let's continue"
                itself, then closes straight into the next question with no click needed (Francis, 2026-09-22). */}
            {phase === 'coaching' && (
              skipTransition
                ? <div style={{ ...card, marginTop: 14, textAlign: 'center', fontSize: 13.5, color: 'var(--text-3, #94a3b8)' }}>👼 {start?.transitions?.skipped ?? "No problem — let's continue."}…</div>
                : <TryCoachPopup coaching={coaching} />
            )}
            {phase === 'scoring' && <div style={{ ...card, marginTop: 14, textAlign: 'center', fontWeight: 700 }}>Scoring your answers…</div>}
          </div>
        )}

        {phase === 'results' && feedback && start && (
          <div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN }}>{firstName ? `${firstName}, your result` : 'Your result'} · {start.subject}</div>
              <div style={{ margin: '14px auto 6px', position: 'relative', width: 132, height: 132 }}>
                <svg viewBox="0 0 120 120" width="132" height="132">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColour(feedback.overall, 100)} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(feedback.overall / 100) * 326.7} 326.7`} transform="rotate(-90 60 60)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900, color: scoreColour(feedback.overall, 100) }}>{feedback.overall}</div>
              </div>
              {feedback.headline && <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{feedback.headline}</div>}
              <div style={{ textAlign: 'left', marginTop: 20 }}>
                {DIMENSIONS.map(d => {
                  const v = feedback.dimensions[d.key]; const c = scoreColour(v);
                  return (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', fontSize: 13 }}>
                      <div style={{ width: 84, color: 'var(--text-2, #cbd5e1)' }}>{d.label}</div>
                      <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${v * 10}%`, height: '100%', background: c, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ width: 40, textAlign: 'right', fontWeight: 800, color: c }}>{v}/10</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14, fontSize: 11.5, color: 'var(--text-3, #94a3b8)' }}>
                <span><span style={{ color: RED }}>●</span> needs work (under 3)</span><span><span style={{ color: AMBER }}>●</span> getting there (3–6)</span><span><span style={{ color: GREEN }}>●</span> strong (7+)</span>
              </div>
              {/* Context for the number (Francis, 2026-09-30): a single short answer scores low on depth by nature, and a visitor could read that as
                  "the product says I'm bad". Say plainly what the score is, and what a low depth means. */}
              {start.questions.length < 3 && (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', textAlign: 'center', marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                  <strong style={{ color: GREEN }}>A quick read.</strong> This score comes from {start.questions.length === 1 ? 'a single answer' : `just ${countWord(start.questions.length)} answers`}. The full interview is 5–20 questions and scores the same five areas across many answers — a much fuller and fairer picture.
                </div>
              )}
              {feedback.dimensions.depth <= 2 && skipped === 0 && (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', textAlign: 'center', marginTop: 10 }}>
                  💡 <strong>Low depth usually means a short or general answer.</strong> Try adding a real example: what you did, how you did it, and the result.
                </div>
              )}
            </div>

            {/* A short sign-up card right under the score, where the visitor is looking. The full one stays at the bottom (its own tracking tag: where='score_top' vs 'score'). */}
            <div style={{ ...card, marginTop: 12, textAlign: 'center', border: '1px solid rgba(52,211,153,0.35)', background: 'linear-gradient(135deg,rgba(52,211,153,0.10),rgba(4,120,87,0.06))' }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Want the full interview{topic.trim() ? ` for ${topic.trim()}` : ''}?</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2, #cbd5e1)', marginBottom: 12 }}>5–20 questions with Amina and Wayne, and a full scored report. Your first one is free.</div>
              <a href={registerUrl(topic, name)} onClick={() => logEvent('try_register_click', { metadata: { where: 'score_top', score: feedback?.overall ?? null, mobile: isMobile } })} style={{ ...primary, display: 'block' }}>Start my free interview →</a>
              <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', marginTop: 8 }}>Free · no card needed · takes about a minute</div>
            </div>

            {/* "Email me this score" — straight under the score, where people are looking (Francis, 2026-09-30: the box was further down and got missed).
                A clear button first; the address field opens on click. Sends ONE email with their own score. The tips opt-in is separate and unticked. */}
            <div style={{ ...card, marginTop: 12, textAlign: 'center' }}>
              {emailState === 'sent' ? (
                <div style={{ fontWeight: 700, color: GREEN }}>✓ Sent — check your inbox (and junk folder) for your score.</div>
              ) : !emailOpen ? (
                <button onClick={() => { setEmailOpen(true); logEvent('try_email_open', { metadata: { mobile: isMobile } }); }} style={{ ...primary, width: '100%' }}>📧 Email me this score</button>
              ) : (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Where should we send it?</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', marginBottom: 10 }}>Your score and what to work on next — once. No account, no mailing list.</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input type="email" autoFocus value={scoreEmail} onChange={e => setScoreEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && void sendScoreEmail()}
                      placeholder="you@example.com" autoComplete="email" aria-label="Your email address" style={{ ...inputStyle, flex: '1 1 220px', margin: 0 }} />
                    <button onClick={() => void sendScoreEmail()} disabled={!scoreEmail.includes('@') || emailState === 'sending'} style={{ ...primary, opacity: !scoreEmail.includes('@') ? 0.5 : 1 }}>{emailState === 'sending' ? 'Sending…' : 'Send it'}</button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-3, #94a3b8)', marginTop: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={tipsOptIn} onChange={e => setTipsOptIn(e.target.checked)} /> Also send me occasional interview tips (optional)
                  </label>
                  {emailError && <div style={{ fontSize: 12.5, color: '#f87171', marginTop: 8 }}>{emailError}</div>}
                </div>
              )}
            </div>

            {(() => {
              // One card per question the visitor was asked, in order: answered ones carry their feedback, skipped ones are listed as Skipped (0).
              let k = -1;
              return start.questions.map((q, qi) => {
                if (skippedIdx.includes(qi)) {
                  return (
                    <div key={qi} style={{ ...card, marginTop: 12, opacity: 0.85 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3, #94a3b8)', marginBottom: 6 }}>QUESTION {qi + 1} · <span style={{ color: RED }}>{revealedText[qi] ? 'Answer revealed' : 'Skipped'} · 0/10</span></div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 6 }}>{q}</div>
                      {revealedText[qi] && <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 8 }}><strong style={{ color: GREEN }}>Model answer: </strong>{revealedText[qi]}</div>}
                      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-3, #94a3b8)' }}>{revealedText[qi] ? 'You asked to see the answer, so this one counts as zero.' : 'You skipped this one, so it counts as zero.'}</div>
                    </div>
                  );
                }
                k += 1;
                const a = answers[k];
                if (!a) return null;
                const sc = feedback.questions[k]?.score ?? 0;
                return (
                  <div key={qi} style={{ ...card, marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3, #94a3b8)', marginBottom: 6 }}>ANSWER {qi + 1} · <span style={{ color: scoreColour(sc) }}>{sc}/10</span></div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>{a.question}</div>
                    {feedback.questions[k]?.feedback && <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)' }}>{feedback.questions[k].feedback}</div>}
                    {feedback.questions[k]?.strongerAnswer && (
                      <details style={{ marginTop: 10 }}>
                        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: GREEN }}>What a stronger answer sounds like</summary>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginTop: 8 }}>{feedback.questions[k].strongerAnswer}</div>
                      </details>
                    )}
                  </div>
                );
              });
            })()}
            {skipped > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', textAlign: 'center', marginTop: 10 }}>You {Object.keys(revealedText).length > 0 ? 'skipped or looked at the answer for' : 'skipped'} {skipped} of {start.questions.length} question{start.questions.length === 1 ? '' : 's'}. Those count as zero, so your score is out of all {start.questions.length}.</div>}

            {feedback.nextStep && <div style={{ ...card, marginTop: 12, fontSize: 14.5, lineHeight: 1.6 }}><strong style={{ color: GREEN }}>Next step: </strong>{feedback.nextStep}</div>}

            <div style={{ ...card, marginTop: 14, textAlign: 'center', border: '1px solid rgba(52,211,153,0.35)', background: 'linear-gradient(135deg,rgba(52,211,153,0.10),rgba(4,120,87,0.06))' }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>That was {countWord(start.questions.length)} question{start.questions.length === 1 ? '' : 's'}. The full interview is 5–20 questions.</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 16 }}>
                Create a free account and your first full interview is on us — with both interviewers, your CV and target role, a full scored report, and a shareable profile recruiters can watch.
              </div>
              <a href={registerUrl(topic, name)} onClick={() => logEvent('try_register_click', { metadata: { where: 'score', score: feedback?.overall ?? null, mobile: isMobile } })} style={{ ...primary, display: 'block' }}>Start my free interview →</a>
              <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', marginTop: 10 }}>Free · no card needed · takes about a minute</div>
              <button onClick={restart} style={{ background: 'none', border: 'none', color: 'var(--text-3, #94a3b8)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginTop: 12 }}>Try a different role</button>
            </div>

            <div style={{ ...card, marginTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Proud of that? Show someone.</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-3, #94a3b8)', marginBottom: 14 }}>Share your result — and let a friend try it free.</div>
              <button onClick={() => void share()} style={primary}>Share my result</button>
              {shareOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 14 }}>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`}>LinkedIn</a>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc(`${shareText} ${SHARE_URL}`)}`}>WhatsApp</a>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(SHARE_URL)}`}>X</a>
                  <a style={ghost} href={`mailto:?subject=${enc('Try this AI mock interview')}&body=${enc(`${shareText}\n${SHARE_URL}`)}`}>Email</a>
                  <button style={ghost} onClick={() => void copyShare()}>{copied ? 'Copied ✓' : 'Copy text + link'}</button>
                </div>
              )}
            </div>

          </div>
        )}

        {phase === 'blocked' && (
          <div style={{ ...card, textAlign: 'center', padding: '36px 22px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
              {blockReason === 'capped' ? "That's the free tries for now" : blockReason === 'noAnswers' ? "You didn't answer any questions" : 'Something went wrong'}
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 20 }}>{message}</div>
            {blockReason === 'capped'
              ? <a href={registerUrl(topic, name)} onClick={() => logEvent('try_register_click', { metadata: { where: 'limit', mobile: isMobile } })} style={primary}>Create a free account →</a>
              : <button onClick={restart} style={primary}>Try again</button>}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
