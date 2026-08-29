import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar, type AvatarState } from '../components/InterviewerAvatar';
import { MouthOverlay, MOUTH_POSITIONS, MOUTH_OVERLAY_ENABLED } from '../components/MouthOverlay';
import { YouCamera } from '../components/YouCamera';
import { VoiceInput, type TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import { speak, elevenLabsConfigured, getTTSAudioContext, setTTSRecordingDestination } from '../api/ttsApi';
import { type CVContext, type JobSpecContext } from '../utils/contextBuilder';
import { CoachingOverlay } from '../components/CoachingOverlay';
import { generateCoachingMessage, type CoachingMessage } from '../utils/coachingEngine';
import { scoreWithAI, coachWithAI, aiScoringConfigured, sessionPrepareClient, generateMikeScriptOnly, generateMCQs, type MCQQuestion } from '../api/aiScoring';
import { ChairSpinner } from '../components/ChairSpinner';
import CinematicMCQ from '../components/CinematicMCQ';
import { pickRandomCompany, type Company } from '../data/companyBank';
import { logFlowEvent } from '../api/flowLogger';
import { useAuthStore } from '../auth/authStore';
import { nameGreetingsApi } from '../api/nameGreetingsApi';
import { FILTER_CSS, FILTER_LABELS, FILTER_PRESETS, type FilterPreset } from '../hooks/useVideoFilter';

// ── Multilingual Sarah intro fallbacks ───────────────────────────────────────
const SARAH_INTROS: Record<string, string> = {
  en: "Hi — I'm Sarah, HR Director. Lovely to have you here. I'll be joined by James, who'll lead the role-specific questions. When each question appears, click the Record button to start your answer, and click Stop when you've finished. You can also use the Repeat button if you'd like to hear a question again, or Pause if you need a moment. Just speak naturally, take your time, and don't worry about being perfect. Ready when you are.",
  fr: "Bonjour — je suis Sarah, Directrice des Ressources Humaines. Ravi de vous accueillir. James me rejoindra pour les questions spécifiques au poste. Lorsqu'une question apparaît, cliquez sur Enregistrer pour commencer votre réponse, et sur Stop quand vous avez terminé. Vous pouvez aussi utiliser Répéter pour réécouter une question, ou Pause si vous avez besoin d'un moment. Parlez naturellement, prenez votre temps. Prêt quand vous l'êtes.",
  es: "Hola — soy Sarah, Directora de Recursos Humanos. Encantada de tenerte aquí. James se unirá para las preguntas específicas del puesto. Cuando aparezca cada pregunta, haz clic en Grabar para comenzar tu respuesta y en Detener cuando hayas terminado. También puedes usar Repetir para escuchar la pregunta de nuevo, o Pausar si necesitas un momento. Habla con naturalidad, tómate tu tiempo. Listo cuando quieras.",
  de: "Hallo — ich bin Sarah, HR-Direktorin. Schön, dass Sie hier sind. James wird sich für die rollenspezifischen Fragen zu mir gesellen. Wenn eine Frage erscheint, klicken Sie auf Aufnehmen, um Ihre Antwort zu beginnen, und auf Stopp, wenn Sie fertig sind. Sie können auch Wiederholen verwenden, um eine Frage nochmals zu hören, oder Pause, wenn Sie einen Moment brauchen. Sprechen Sie natürlich, lassen Sie sich Zeit.",
  pt: "Olá — sou Sarah, Directora de Recursos Humanos. Prazer em tê-lo aqui. James juntar-se-á a mim para as perguntas específicas da função. Quando cada pergunta aparecer, clique em Gravar para iniciar a sua resposta e em Parar quando terminar. Pode usar Repetir para ouvir novamente uma pergunta, ou Pausar se precisar de um momento. Fale naturalmente, leve o seu tempo.",
  pl: "Cześć — jestem Sarah, Dyrektor HR. Miło mieć cię tutaj. Dołączy do mnie James z pytaniami dotyczącymi stanowiska. Gdy pojawi się pytanie, kliknij Nagraj, aby rozpocząć odpowiedź, a Stop gdy skończysz. Możesz też użyć Powtórz, by ponownie usłyszeć pytanie, lub Pauza, jeśli potrzebujesz chwili. Mów naturalnie, nie spiesz się.",
  nl: "Hoi — ik ben Sarah, HR-directeur. Fijn dat je er bent. James sluit zich bij me aan voor de functiespecifieke vragen. Als er een vraag verschijnt, klik op Opnemen om te beginnen en op Stop als je klaar bent. Je kunt ook Herhalen gebruiken om een vraag opnieuw te horen, of Pauze als je even nodig hebt. Spreek gewoon, neem de tijd.",
  it: "Ciao — sono Sarah, Direttrice delle Risorse Umane. Piacere di averti qui. James si unirà a me per le domande specifiche al ruolo. Quando appare una domanda, clicca Registra per iniziare la risposta e Stop quando hai finito. Puoi usare Ripeti per riascoltare una domanda, o Pausa se hai bisogno di un momento. Parla naturalmente, prenditi il tempo che ti serve.",
  tr: "Merhaba — ben Sarah, İK Direktörü. Burada olmanıza sevindik. James, role özel sorular için bana katılacak. Her soru göründüğünde, cevabınıza başlamak için Kayıt düğmesine tıklayın ve bitirdiğinizde Durdur'a tıklayın. Bir soruyu tekrar duymak için Tekrar'ı, bir anlığına durmak için Duraklat'ı kullanabilirsiniz. Doğal konuşun, acele etmeyin.",
  ar: "مرحباً — أنا سارة، مديرة الموارد البشرية. يسعدنا وجودك معنا. سينضم إليّ جيمس للأسئلة المتعلقة بالوظيفة. عندما تظهر كل سؤال، انقر على زر التسجيل لبدء إجابتك، وانقر إيقاف عند الانتهاء. يمكنك أيضاً استخدام إعادة لسماع السؤال مرة أخرى، أو إيقاف مؤقت إذا احتجت لحظة. تحدث بشكل طبيعي وخذ وقتك.",
  zh: "您好 — 我是 Sarah，人力资源总监。很高兴您能来。James 将加入我进行岗位相关问题的提问。当每道题出现时，请点击录音按钮开始作答，完成后点击停止。如果您想重听题目，可以点击重复；需要暂停时，点击暂停即可。请自然地回答，慢慢来，不必紧张。",
  hi: "नमस्ते — मैं Sarah हूँ, HR Director। आपका यहाँ स्वागत है। James मेरे साथ भूमिका-विशिष्ट प्रश्नों के लिए जुड़ेंगे। जब प्रत्येक प्रश्न दिखे, तो Record बटन दबाएं और उत्तर देना शुरू करें, तथा समाप्त होने पर Stop दबाएं। Repeat बटन से प्रश्न फिर सुन सकते हैं, या Pause से थोड़ा रुक सकते हैं। स्वाभाविक रूप से बोलें, समय लें।",
};

// ── Demo fallback questions ───────────────────────────────────────────────────

function buildDemoQuestions(company: Company): InterviewQuestion[] {
  return [
    {
      questionId: 'q1',
      questionText: 'Walk me through the most complex challenge you have faced in this type of role. What did you do and what was the outcome?',
      modelAnswer: 'Cover: context, your specific actions, trade-offs made, and the measurable result.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['problem-solving'],
    },
    {
      questionId: 'q2',
      questionText: 'Tell me about a time you had to deliver under significant pressure. How did you manage it?',
      modelAnswer: 'Cover: the pressures involved, your approach, how you prioritised, and the outcome.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['delivery', 'resilience'],
    },
    {
      questionId: 'q3',
      questionText: 'Describe a situation where you had to work closely with a team to achieve something difficult. What role did you play?',
      modelAnswer: 'Cover: the team dynamic, your specific contribution, any conflict or challenge, and the result.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['teamwork', 'collaboration'],
    },
    {
      questionId: 'q4',
      questionText: 'Tell me about a time you disagreed with a decision made by your manager or leadership. How did you handle it?',
      modelAnswer: 'Cover: the nature of the disagreement, how you raised it professionally, whether you escalated or accepted the outcome, and what you learned.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['communication', 'professional judgement'],
    },
    {
      questionId: 'q5',
      questionText: 'Give me an example of when you had to adapt quickly to a significant change at work. What did you do?',
      modelAnswer: 'Cover: what changed, how you responded, what you prioritised, and how you helped others if relevant.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['adaptability', 'change management'],
    },
    {
      questionId: 'q6',
      questionText: 'Describe a time you identified a problem that others had missed. How did you spot it and what did you do?',
      modelAnswer: 'Cover: what the problem was, how you identified it, the action you took, and the impact of catching it early.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['initiative', 'analytical thinking'],
    },
    {
      questionId: 'q7',
      questionText: 'Tell me about a time you had to manage competing priorities with limited resources. How did you decide what to focus on?',
      modelAnswer: 'Cover: the competing demands, your prioritisation framework, trade-offs you made, and the outcome.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['prioritisation', 'decision-making'],
    },
    {
      questionId: 'q8',
      questionText: 'Describe an achievement you are genuinely proud of from your career so far. What made it significant?',
      modelAnswer: 'Cover: what you did, the scale or difficulty involved, your personal contribution, and why it matters to you.',
      questionType: 'Competency', difficulty: 'Easy', source: 'Role', competencyTags: ['achievement', 'motivation'],
    },
    {
      questionId: 'q9',
      questionText: 'Describe a time you delivered difficult feedback to someone. How did you approach it?',
      modelAnswer: 'Use STAR. Emphasise empathy, specificity, listening to the response, and the relationship outcome.',
      questionType: 'Behavioural', difficulty: 'Medium', source: 'HR', competencyTags: ['communication', 'stakeholder management'],
    },
    {
      questionId: 'q10',
      questionText: `What do you know about ${company.name} and why does this role specifically appeal to you?`,
      modelAnswer: `Show genuine research into ${company.name}. Connect their mission to your own motivations and experience.`,
      questionType: 'Behavioural', difficulty: 'Easy', source: 'HR', competencyTags: ['company knowledge', 'motivation'],
    },
  ];
}

// ── Local scoring fallback ────────────────────────────────────────────────────

function localScore(q: InterviewQuestion, answer: string, companyKeywords: string[] = []): ScoreResponse {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  const lower = answer.toLowerCase();
  const clarity = Math.min(1, len / 80) * 0.8 + (answer.includes('.') ? 0.2 : 0);
  const relevance = q.competencyTags.some(t => lower.includes(t)) ? 0.65 : 0.4;
  const depth = /\d+/.test(answer) ? 0.7 : lower.includes('result') || lower.includes('outcome') ? 0.6 : 0.4;
  const confidence = lower.includes('i led') || lower.includes('i built') || lower.includes('i delivered') ? 0.8
    : lower.includes('i think') || lower.includes('maybe') ? 0.35 : 0.55;
  const isCompanyKnowledgeQ = q.competencyTags.includes('company knowledge');
  const factsHit = isCompanyKnowledgeQ ? companyKeywords.filter(f => lower.includes(f)).length : 0;
  const companyBonus = isCompanyKnowledgeQ ? Math.min(0.2, factsHit * 0.05) : 0;
  const overall = Math.min(1, Math.round((clarity * 0.25 + relevance * 0.35 + depth * 0.25 + confidence * 0.15 + companyBonus) * 10000) / 10000);
  return {
    clarity, relevance, depth, confidence, overallScore: overall,
    feedback: [
      { dimension: 'clarity', message: len < 40 ? 'Your answer is quite short — aim for at least 60 words.' : 'Good length and structure.', severity: len < 40 ? 'high' : 'low' },
      { dimension: 'depth', message: depth < 0.5 ? 'Add a concrete metric or named outcome.' : 'Good use of specifics.', severity: depth < 0.5 ? 'medium' : 'low' },
    ],
    suggestions: len < 40 ? ['Use the STAR format to structure your answer.'] : [],
  };
}

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
  questionCount?: number;
  preferredName?: string;
  company?: string;
  consentToRecord?: boolean;
  goDeeperEnabled?: boolean;
}

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

// Mike-only phase, then full interview
type RoomPhase =
  | 'intro'
  | 'mike'
  | 'interviewer-intro'
  | 'asking'
  | 'answering'
  | 'scoring'
  | 'coaching'
  | 'done';

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

// ── Go Deeper — probing follow-ups, scaled by difficulty ─────────────────────

const GO_DEEPER_LIMITS: Record<string, { max: number; chance: number }> = {
  Standard: { max: 1, chance: 0.15 },
  Pro: { max: 2, chance: 0.25 },
  Expert: { max: 3, chance: 0.40 },
};

const FOLLOWUP_TRANSITIONS = [
  'Mm, one more thing—',
  "Okay, good answer, but I was thinking—",
  "That's helpful — actually, one follow-up on that—",
  'Just before we move on—',
];

const HANDOFF_LINES: Record<'hr' | 'technical', string[]> = {
  hr: ['James, anything you\'d like to add to that?', 'James, did you want to follow up on that one?'],
  technical: ['Sarah, do you have anything to add to that?', 'Sarah, anything you wanted to dig into there?'],
};

const HANDOFF_ACCEPT_LINES = [
  'Errm, yes — I just wanted to follow up on that.',
  'Yes, actually — one thing I\'d like to know.',
  'I do, actually.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  useParams<{ packId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = (location.state ?? {}) as RoomState;
  const cvCtx = ctx.cvCtx;
  const jobCtx = ctx.jobCtx;

  // The tab title otherwise stays the generic app name for the whole session — no way to
  // tell at a glance (browser tab, screen-share thumbnail, demo recording) which interview
  // is actually running. Restores whatever was there before on unmount/navigate-away.
  useEffect(() => {
    const previousTitle = document.title;
    const jobTitle = ctx.jobTitle?.trim();
    if (jobTitle) document.title = `${jobTitle} — Interview | InterviewMe.global`;
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

  const demoCompany = useMemo(() => pickRandomCompany(), []);

  // Background AI session prep results
  const [bgQuestions, setBgQuestions] = useState<InterviewQuestion[] | null>(null);
  const [bgSarahIntro, setBgSarahIntro] = useState<string | null>(null);
  const [bgJamesIntro, setBgJamesIntro] = useState<string | null>(null);
  const [bgMikeScript, setBgMikeScript] = useState<string | null>(null);
  const bgMikeScriptRef = useRef<string | null>(null); // sync ref — always current when startMike fires
  const [bgCompanyFacts, setBgCompanyFacts] = useState<string[]>([]);
  const [bgSpecialistTitle, setBgSpecialistTitle] = useState<string | null>(null);
  const bgLoadRef = useRef(false);
  const bgLoadedRef = useRef(false); // true once AI results arrive

  // MCQ bonus round — two questions, fixed slots Q3 (index 2) and Q7 (index 6)
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqActive, setMcqActive] = useState(false);
  const [mcqBonusPoints, setMcqBonusPoints] = useState(0);
  const [mcqResults, setMcqResults] = useState<Array<{ correct: boolean; selectedIndex: number; questionIndex: number }>>([]);
  const MCQ_SLOTS = [2, 6]; // fire after Q3 and Q7 (0-based)
  const mcqFiredCountRef = useRef(0); // how many MCQs have fired so far
  // Synchronous guard against mcqFiredCountRef double-incrementing — nextQuestion and
  // handlePass both gate MCQ-firing on the `mcqActive` *state*, but state commits are
  // async, so if either could re-enter within the same tick (e.g. a stray double-call),
  // both would see mcqActive still false and each bump the ref-counted ordinal, causing
  // the first bonus question to announce itself as "second". A ref updates immediately,
  // so this closes the race the state check alone couldn't.
  const mcqFiringRef = useRef(false);
  // active MCQ question for the current overlay
  const [activeMcqQuestion, setActiveMcqQuestion] = useState<MCQQuestion | null>(null);
  const [activeMcqOrdinal, setActiveMcqOrdinal] = useState<'first' | 'second'>('first');

  // Go Deeper — probabilistic probing follow-ups, capped per session and scaled by difficulty
  const goDeeperFiredRef = useRef(0);

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
  const questions = bgQuestions ?? buildDemoQuestions(demoCompany);
  const companyKeywords = bgCompanyFacts.length ? bgCompanyFacts : demoCompany.companyKnowledgeKeywords;
  const specialistTitle = bgSpecialistTitle ?? 'Hiring Manager';
  const effectiveSarahIntro = bgSarahIntro ?? undefined;
  const effectiveJamesIntro = bgJamesIntro ?? undefined;

  // Mike's fallback script — used if AI hasn't loaded yet (it usually finishes before Mike speaks)
  const fallbackMikeScript = `Hi there — I'm Mike, your recruitment consultant. I've set up your interview today and I want to give you a quick briefing before you meet the panel. Your interviewers today are Sarah, who heads up HR, and James, who'll be assessing you on the role itself. They'll guide you through everything — just follow Sarah's instructions on the controls and you'll be absolutely fine. I'll be here throughout if you need anything. The best thing you can do is be specific: use real examples from your experience. Back yourself — you've got this. Good luck!`;
  const mikeScript = bgMikeScript ?? fallbackMikeScript;

    // ── Session recording ─────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFailed, setRecordingFailed] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  // Gates the candidate's own mic in the RECORDING only (never the live room — Sarah/James/
  // Mike are always heard live regardless) so the saved video isn't full of ambient noise —
  // coughs, background chatter — captured over the AI interviewers' lines. Muted by default,
  // opened only while phase === 'answering'; see the effect below that drives it.
  const micGainNodeRef = useRef<GainNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  // Hidden elements that composite the candidate's own webcam (+ a question caption) onto a
  // canvas, which is what's actually recorded. Deliberately NOT getDisplayMedia (screen/tab
  // capture) — no mobile browser exposes that API to web content at all, so relying on it meant
  // every mobile interview silently recorded nothing. canvas.captureStream() works identically
  // on desktop and mobile, needs only the same camera/mic permission the app already asks for.
  const recordVideoElRef = useRef<HTMLVideoElement | null>(null);
  const recordCanvasElRef = useRef<HTMLCanvasElement | null>(null);
  const recordDrawFrameRef = useRef<number>(0);
  const recordCaptionRef = useRef<string>('');
  const chapterMarkersRef = useRef<{ questionIndex: number; questionText: string; competency: string; offsetSeconds: number; isMcq?: boolean; mcqOrdinal?: number }[]>([]);
  // Stable for the whole room session — used as the Cosmos doc id so the auto-upload
  // (below) and closeInterview's navigate() state always refer to the same saved record.
  const interviewIdRef = useRef<string>(crypto.randomUUID());

  const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';
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

  const startRecording = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supportsScreenCapture = typeof (navigator.mediaDevices as any)?.getDisplayMedia === 'function';
    try {
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      let compositeStream: MediaStream;

      if (supportsScreenCapture) {
        // Desktop — capture the full browser tab, unchanged: Sarah, James, question cards,
        // MCQ overlays, coaching, everything visible on screen.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tabStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { displaySurface: 'browser', frameRate: 30 },
          audio: true,           // captures ElevenLabs voices playing in the tab
          preferCurrentTab: true,
        });
        tabStreamRef.current = tabStream;

        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          micStreamRef.current = micStream;
        } catch { /* mic denied — tab audio only */ }

        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        // Limiter — tab audio (already containing the AI voices at full volume) and the raw
        // mic were both connecting straight to dest with no gain staging, so Web Audio just
        // summed them: two full-scale sources add up to a signal that clips, and the clipping
        // gets audibly worse exactly when the combined signal is louder. Routing both through
        // one compressor first keeps the mix under the ceiling instead of clipping past it.
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(dest);
        const tabAudioTracks = tabStream.getAudioTracks();
        if (tabAudioTracks.length > 0) {
          audioCtx.createMediaStreamSource(new MediaStream(tabAudioTracks)).connect(compressor);
        }
        if (micStream) {
          const micGain = audioCtx.createGain();
          micGain.gain.value = 0; // starts muted — the effect watching `phase` opens it
          micGainNodeRef.current = micGain;
          audioCtx.createMediaStreamSource(micStream).connect(micGain).connect(compressor);
        }

        compositeStream = new MediaStream([...tabStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

        tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          micStream?.getTracks().forEach(t => t.stop());
          audioCtx.close();
        });
      } else {
        // Mobile — no browser exposes screen/tab capture to web content here at all, so
        // getDisplayMedia would never even show a prompt. Fall back to the candidate's own
        // camera + a question caption composited onto a canvas, instead of silently
        // recording nothing. Desktop is untouched by this branch entirely.
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: true,
        });
        tabStreamRef.current = camStream; // stopped generically in uploadRecording's cleanup

        const video = recordVideoElRef.current;
        const canvas = recordCanvasElRef.current;
        if (!video || !canvas) throw new Error('recording canvas not mounted');
        video.srcObject = camStream;
        await video.play();

        canvas.width = 1280;
        canvas.height = 720;
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) throw new Error('canvas 2d context unavailable');

        const draw = () => {
          // Mirror the feed, matching every other self-view in this app. Desktop recording
          // is a tab-capture, so the appearance filter is already baked in visually — this
          // mobile path draws its own frame, so the same filter needs applying explicitly.
          ctx2d.save();
          ctx2d.scale(-1, 1);
          ctx2d.filter = FILTER_CSS[filterPresetRef.current];
          ctx2d.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx2d.restore();

          const caption = recordCaptionRef.current;
          if (caption) {
            ctx2d.font = '600 28px -apple-system, "Segoe UI", sans-serif';
            const words = caption.split(/\s+/);
            const lines: string[] = [];
            let line = '';
            for (const word of words) {
              const test = line ? `${line} ${word}` : word;
              if (line && ctx2d.measureText(test).width > canvas.width - 64) { lines.push(line); line = word; }
              else line = test;
            }
            if (line) lines.push(line);
            const capped = lines.slice(0, 3);
            const lineHeight = 36;
            const barHeight = capped.length * lineHeight + 32;
            ctx2d.fillStyle = 'rgba(6,10,20,0.75)';
            ctx2d.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
            ctx2d.fillStyle = '#ffffff';
            ctx2d.textBaseline = 'top';
            capped.forEach((l, i) => ctx2d.fillText(l, 32, canvas.height - barHeight + 16 + i * lineHeight));
          }

          recordDrawFrameRef.current = requestAnimationFrame(draw);
        };
        draw();

        const canvasStream = canvas.captureStream(30);

        // Mix candidate mic + AI interviewer voices (via the shared TTS AudioContext) into
        // one audio track — must be the SAME context speak() uses, nodes can't cross contexts.
        // Desktop doesn't need this: tab-audio capture above already includes ElevenLabs playback.
        const audioCtx = await getTTSAudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        // Same limiter fix as the desktop path above — mic and TTS voices (connected in
        // ttsApi.ts's speak(), via setTTSRecordingDestination) both route through this
        // compressor instead of landing on dest at full gain and summing into clipping.
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(dest);
        const micGain = audioCtx.createGain();
        micGain.gain.value = 0; // starts muted — the effect watching `phase` opens it
        micGainNodeRef.current = micGain;
        audioCtx.createMediaStreamSource(camStream).connect(micGain).connect(compressor);
        setTTSRecordingDestination(dest, compressor);

        compositeStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      }

      recordingStreamRef.current = compositeStream;
      recordingChunksRef.current = [];
      chapterMarkersRef.current = [];
      recordingStartTimeRef.current = Date.now();

      const recorder = new MediaRecorder(compositeStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.start(1000);
      setIsRecording(true);
      setRecordingFailed(false);
    } catch (err) {
      console.error('[InterviewRoom] Failed to start recording:', err);
      setRecordingFailed(true);
      // Interview continues unrecorded, but this is now visible in the status badge
      // instead of silently producing a video-less summary page.
    }
  }, []);

  // Snapshot current chunks into a local blob URL for immediate playback on summary screen.
  // Called BEFORE navigate so the URL is ready when the summary mounts.
  const buildPlaybackUrl = useCallback((): string | null => {
    if (recordingChunksRef.current.length === 0) return null;
    const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    return URL.createObjectURL(blob);
  }, []);

  const uploadRecording = useCallback((answers: SessionAnswer[]) => {
    const recorder = mediaRecorderRef.current;
    const candidateId = getCandidateId();
    const interviewId = interviewIdRef.current;

    // Persist the session even without a recording (screen-share permission denied) —
    // otherwise there'd be no record for the summary page to reload, or for Save/Share to act on.
    const finish = async (videoBlob: Blob | null) => {
      setUploadStatus('uploading');
      try {
        const overallScore = answers.length
          ? answers.reduce((s, a) => s + a.score.overallScore, 0) / answers.length
          : 0;
        const metadata = JSON.stringify({
          candidateId,
          interviewId,
          role: ctx.jobTitle,
          company: ctx.company,
          overallScore: Math.round(overallScore * 100),
          answers,
          mcqQuestions,
          mcqResults,
          mcqBonusPoints,
          chapters: chapterMarkersRef.current,
          cvCtx,
          jobCtx,
          // Real account name — always available, unlike cvCtx.firstName/lastName which is
          // only ever populated if a CV happened to be parsed for this specific session.
          // Every shared interview needs a name at the top regardless of that.
          candidateName: authUser?.name,
        });

        // A real video upload on a poor connection (public/hospital wifi, etc.) can genuinely
        // take a while, but with no timeout at all a stalled connection hangs this forever —
        // the interview never lands, and InterviewSummaryPage's "still uploading" poll then
        // waits on something that will never arrive, with no way for the candidate to know.
        // Timeout + one retry + a video-less fallback so a bad connection loses the video, not
        // the whole session.
        const attemptUpload = async (withVideo: boolean, timeoutMs: number) => {
          const form = new FormData();
          form.append('metadata', metadata);
          if (withVideo && videoBlob) form.append('video', videoBlob, 'session.webm');
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            return await fetch(`${API_BASE}/api/interviews/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${authToken ?? ''}` },
              body: form,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }
        };

        let res: Response | null = null;
        try {
          res = await attemptUpload(true, 120_000);
        } catch (err) {
          console.warn('[InterviewRoom] Upload attempt 1 failed, retrying once:', err);
          try {
            res = await attemptUpload(true, 120_000);
          } catch (err2) {
            console.error('[InterviewRoom] Upload retry also failed — falling back to metadata only, without video:', err2);
            if (videoBlob) {
              try {
                res = await attemptUpload(false, 30_000);
              } catch (err3) {
                console.error('[InterviewRoom] Metadata-only fallback also failed:', err3);
              }
            }
          }
        }

        setUploadStatus(res?.ok ? 'done' : 'error');
        if (!res?.ok) console.error('[InterviewRoom] Upload ultimately failed — no interview record was saved.', res);
      } catch (err) {
        console.error('[InterviewRoom] Unexpected error during upload:', err);
        setUploadStatus('error');
      }
    };

    if (!recorder || recorder.state === 'inactive' || recordingChunksRef.current.length === 0) {
      if (answers.length > 0) void finish(null);
      return;
    }
    recorder.onstop = () => {
      // Stop all streams — composite, tab/camera, and mic — and tear down the mobile-path
      // canvas draw loop + TTS recording tap (harmless no-ops if the desktop path ran instead)
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
      tabStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      tabStreamRef.current = null;
      micStreamRef.current = null;
      micGainNodeRef.current = null;
      cancelAnimationFrame(recordDrawFrameRef.current);
      setTTSRecordingDestination(null);
      setIsRecording(false);
      const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      void finish(blob);
    };
    recorder.stop();
  }, [API_BASE, authToken, ctx.jobTitle, ctx.company, mcqQuestions, mcqResults, mcqBonusPoints, cvCtx, jobCtx]);

  // Upload if component unmounts mid-session — TRUE unmount only (empty deps). A ref indirection
  // is required: uploadRecording's own deps (mcqQuestions, cvCtx, jobCtx, ...) change mid-interview
  // as session-prep data streams in while Mike is still speaking, which previously changed
  // uploadRecording's identity and fired this cleanup on every one of those changes — stopping the
  // still-running recorder and uploading just Mike's intro, then never recording again. Depending on
  // uploadRecording directly here reintroduces that exact bug even with an apparently-correct cleanup.
  const uploadRecordingRef = useRef(uploadRecording);
  useEffect(() => { uploadRecordingRef.current = uploadRecording; }, [uploadRecording]);
  useEffect(() => {
    return () => { uploadRecordingRef.current([]); };
  }, []);

  const consentToRecord = ctx.consentToRecord !== false;
  const [cameraOn, setCameraOn] = useState(true);
  // Appearance filter — same presets as the Profile Video recorder (useVideoFilter.ts),
  // applied here as a plain CSS filter on the self-view rather than that hook's own
  // independent getUserMedia+canvas pipeline, since YouCamera already owns the camera
  // stream here. Desktop recording is a tab-capture (getDisplayMedia), so this filter is
  // automatically included in the saved video for free; the mobile recording path draws
  // its own canvas frame-by-frame (see startRecording below) and needs it applied there too.
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('beauty');
  const filterPresetRef = useRef<FilterPreset>('beauty');
  useEffect(() => { filterPresetRef.current = filterPreset; }, [filterPreset]);

  const [phase, setPhase] = useState<RoomPhase>('intro');
  // Opens the candidate's mic in the recording only during their own answering turn, muted
  // everything else — see micGainNodeRef's doc above. setTargetAtTime ramps over ~50ms rather
  // than snapping the gain instantly, avoiding an audible click/pop at the open and close.
  useEffect(() => {
    const node = micGainNodeRef.current;
    if (!node) return;
    node.gain.setTargetAtTime(phase === 'answering' ? 1 : 0, node.context.currentTime, 0.05);
  }, [phase]);
  const [qIndex, setQIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [useVoice, setUseVoice] = useState(true);
  const [goDeeperEnabled, setGoDeeperEnabled] = useState(ctx.goDeeperEnabled ?? false);
  const [highlightRecord, setHighlightRecord] = useState(false);
  const [sessionLanguage, setSessionLanguage] = useState(ctx.selectedLanguage ?? 'en');
  const [currentScore, setCurrentScore] = useState<ScoreResponse | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [hrState, setHrState] = useState<AvatarState>('idle');
  const [techState, setTechState] = useState<AvatarState>('idle');
  const [hrAnalyser, setHrAnalyser] = useState<AnalyserNode | null>(null);
  const [techAnalyser, setTechAnalyser] = useState<AnalyserNode | null>(null);
  // Stable reference — InterviewerAvatar's video-analyser effect depends on this prop, and
  // setHrAnalyser itself is already stable (React guarantees state setters never change), so
  // wrapping it here (rather than passing an inline arrow at the JSX call site) stops that
  // effect re-running on every re-render while the video plays. It was re-running before:
  // createMediaElementSource can only be called once per <video> element, so each rebuild
  // threw (silently, inside a try/catch) after having already rewired the element's audio
  // output — closing the AudioContext on cleanup then froze the video mid-playback.
  const handleSarahVideoAnalyser = useCallback((a: AnalyserNode) => setHrAnalyser(a), []);

  // Name Bank pilot — a cached personalised "Hi <name>, I'm James" clip, looked up as early
  // as possible (page mount) so it has the whole CV-upload/intake flow to resolve before
  // James's line is ever reached. A miss (404, or just "hasn't resolved yet") is silent and
  // falls through to today's unchanged live-TTS line — nobody ever waits on this.
  const [jamesGreetingUrl, setJamesGreetingUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!authToken || !resolvedPreferredName || sessionLanguage !== 'en') return;
    nameGreetingsApi.get(authToken, 'james', resolvedPreferredName)
      .then(res => setJamesGreetingUrl(res?.videoUrl ?? null))
      .catch(() => { /* treat any failure as a miss — never block James's line on this */ });
  }, [authToken, resolvedPreferredName, sessionLanguage]);
  const [jamesGreetingVideoActive, setJamesGreetingVideoActive] = useState(false);
  const jamesGreetingDoneRef = useRef<() => void>(() => {});
  const handleJamesGreetingVideoEnded = useCallback(() => {
    setJamesGreetingVideoActive(false);
    jamesGreetingDoneRef.current();
  }, []);
  const handleJamesVideoAnalyser = useCallback((a: AnalyserNode) => setTechAnalyser(a), []);

  const [elapsed, setElapsed] = useState(0);
  const [coachingMessage, setCoachingMessage] = useState<CoachingMessage | null>(null);
  const [paused, setPaused] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(ctx.selectedDifficulty ?? 'Standard');
  const [runningScores, setRunningScores] = useState<number[]>([]);
  const [audioCheckState, setAudioCheckState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [waitingForSession, setWaitingForSession] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const thinkStartRef = useRef<number>(0);
  const pausedPhaseRef = useRef<RoomPhase>('answering');
  const onDoneRef = useRef<(() => void) | null>(null);

  const q = questions[qIndex];
  const isHrQuestion = q?.source === 'HR';

  // Keeps the mobile-path recording caption in sync without restarting the draw loop
  useEffect(() => {
    recordCaptionRef.current = (phase === 'asking' || phase === 'answering') ? (q?.questionText ?? '') : '';
  }, [phase, q]);

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

  // spokenTextOverride lets a follow-up prepend a natural transition line ("Mm, one more
  // thing—") to what's actually said aloud, while the stored question.questionText (used
  // for scoring/display) stays the clean follow-up text. questionOverride lets a caller pass
  // a just-spliced question directly — bgQuestions/questions won't reflect a splice until
  // next render, so a same-tick lookup by index would see stale (or missing) data.
  const askQuestion = useCallback((index: number, spokenTextOverride?: string, interviewerOverride?: 'hr' | 'technical', questionOverride?: InterviewQuestion) => {
    const question = questionOverride ?? questions[index];
    if (!question) return;
    // Record chapter marker
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({
        questionIndex: index,
        questionText: question.questionText,
        competency: question.competencyTags?.[0] ?? '',
        offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
      });
    }
    const interviewer: 'hr' | 'technical' = interviewerOverride ?? (question.source === 'HR' ? 'hr' : 'technical');
    setPhase('asking');
    onDoneRef.current = null;
    if (interviewer === 'hr') { setHrState('speaking'); setTechState('listening'); }
    else { setTechState('speaking'); setHrState('listening'); }
    logFlowEvent('QUESTION_DISPLAYED', { questionId: question.questionId, index, source: question.source });
    const onDone = () => {
      setHrState('idle'); setTechState('idle');
      thinkStartRef.current = Date.now();
      setPhase('answering');
    };
    cancelSpeakRef.current = speak(spokenTextOverride ?? question.questionText, interviewer, onDone, (a) => {
      if (interviewer === 'hr') setHrAnalyser(a);
      else setTechAnalyser(a);
    });
  }, [questions]);

  const repeatQuestion = useCallback(() => {
    cancelSpeakRef.current?.();
    askQuestion(qIndex);
  }, [qIndex, askQuestion]);

  const testAudio = useCallback(() => {
    setAudioCheckState('playing');
    speak("Hi there! I'm Sarah, your HR interviewer.", 'hr', () => {
      speak("And I'm James. Great — you can hear us both clearly!", 'technical', () => setAudioCheckState('done'));
    });
  }, []);

  const introStartedRef = useRef(false);

  // English only: sarah-intro-v1.mp4 replaces her live-TTS intro with the same real
  // pre-rendered clip Mike uses (see startMike above) — set true only for the duration of
  // her intro line, cleared again before she starts asking real questions (those are
  // per-candidate and can't be pre-rendered, so she reverts to the static photo).
  const [sarahIntroVideoActive, setSarahIntroVideoActive] = useState(false);
  const sarahIntroDoneRef = useRef<() => void>(() => {});
  const handleSarahIntroVideoEnded = useCallback(() => { sarahIntroDoneRef.current(); }, []);

  const beginInterviewIntro = useCallback(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    setPhase('interviewer-intro');
    // Chapter marker for the same reason as Mike's above — one combined entry for both
    // Sarah's and James's intro lines, since they play back to back with no natural split.
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({
        questionIndex: -1,
        questionText: "Sarah & James's Introduction",
        competency: '',
        offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
      });
    }
    logFlowEvent('INTERVIEW_PHASE_STARTED', {
      questionCount: questions.length,
      aiQuestionsLoaded: bgLoadedRef.current,
      specialistTitle,
    });
    setTimeout(() => {
      setHrState('speaking');
      const sarahText = effectiveSarahIntro ?? SARAH_INTROS[sessionLanguage] ?? SARAH_INTROS.en;
      // Pulse the Record button ~8s in — when Sarah says "click the Record button"
      const pulseOuter = setTimeout(() => {
        setHighlightRecord(true);
        setTimeout(() => setHighlightRecord(false), 6000);
      }, 8000);
      const jamesText = effectiveJamesIntro ??
        "And I'm James — looking forward to hearing about your experience. Let's get started.";

      const afterSarahIntro = () => {
        clearTimeout(pulseOuter);
        setHighlightRecord(false);
        setHrState('idle');
        setSarahIntroVideoActive(false);
        setTechState('speaking');

        const finishJamesIntro = () => {
          setTechState('idle');
          setTimeout(() => askQuestion(0), 500);
        };

        // Name Bank pilot: a cached personalised greeting for this candidate's name, if one
        // exists, fully replaces James's live line (including its difficulty/language mention)
        // — an accepted trade-off for the pilot. Any miss falls straight through to today's
        // unchanged TTS path, exactly as before this feature existed.
        if (sessionLanguage === 'en' && jamesGreetingUrl) {
          jamesGreetingDoneRef.current = finishJamesIntro;
          setJamesGreetingVideoActive(true);
        } else {
          cancelSpeakRef.current = speak(jamesText, 'technical', finishJamesIntro, (a) => setTechAnalyser(a));
        }
      };

      const useSarahVideo = sessionLanguage === 'en';
      if (useSarahVideo) {
        sarahIntroDoneRef.current = afterSarahIntro;
        setSarahIntroVideoActive(true);
      } else {
        cancelSpeakRef.current = speak(sarahText, 'hr', afterSarahIntro, (a) => setHrAnalyser(a));
      }
    }, 600);
  }, [askQuestion, effectiveSarahIntro, effectiveJamesIntro, questions.length, specialistTitle, sessionLanguage]);

  const beginInterviewIntroRef = useRef(beginInterviewIntro);
  useEffect(() => { beginInterviewIntroRef.current = beginInterviewIntro; }, [beginInterviewIntro]);

  // Always hold a ref to the latest startMike so session-prep waiters call the right version
  const startMikeRef = useRef<() => void>(() => {});

  // Fires once Mike's intro is over, whichever path produced that (real TTS via speak(),
  // or the pre-rendered English video's onEnded below) — same completion logic either way.
  const handleMikeIntroDone = useCallback(() => {
    cancelSpeakRef.current = null;
    logFlowEvent('MIKE_INTRO_COMPLETED', {});
    // Give Sarah/James's real AI intros (with the candidate's name) a chance to land even
    // if Phase 2 is still in flight — same wait pattern as Mike's own sessionReadyRef gate.
    // Always deferred by one tick, even when phase2ReadyRef.current is ALREADY true: if
    // Phase 2 resolved only moments before Mike finished speaking, React may not have
    // re-rendered yet, so beginInterviewIntroRef.current could still be the closure from
    // before that state update — the exact stale-closure bug the waiter path already
    // guards against, just reachable here too when the two events land close together.
    setTimeout(() => {
      if (phase2ReadyRef.current) beginInterviewIntroRef.current();
      else phase2WaitersRef.current.push(() => beginInterviewIntroRef.current());
    }, 0);
  }, []);

  const startMike = useCallback(() => {
    setPhase('mike');
    // Chapter marker so the replay's "Jump to question" list can jump back to the intros too,
    // not just the interview questions — negative questionIndex sentinels (-2 Mike, -1 Sarah
    // & James) keep these out of the real 0-based question range; InterviewSummaryPage.tsx's
    // chapter list renders them with their own label instead of a "QN" badge.
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({
        questionIndex: -2,
        questionText: "Mike's Introduction",
        competency: '',
        offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
      });
    }
    logFlowEvent('MIKE_INTRO_STARTED', { hasJobSpec: Boolean(ctx.jobSpecText), hasCv: Boolean(ctx.cvText), selectedLanguage: ctx.selectedLanguage });
    // English: mike-intro-v1.mp4 (real lip-synced video, generic script, generated once and
    // reused forever — see project-photoreal-intro-avatars-plan memory) plays instead, wired
    // in the JSX below; its own onEnded calls handleMikeIntroDone directly, no TTS needed.
    // Every other language keeps the original live-TTS + static-photo path.
    if (sessionLanguage !== 'en') {
      cancelSpeakRef.current = speak(bgMikeScriptRef.current ?? fallbackMikeScript, 'technical', handleMikeIntroDone, (a) => setTechAnalyser(a));
    }
  }, [mikeScript, ctx.jobSpecText, ctx.cvText, ctx.selectedLanguage, sessionLanguage, handleMikeIntroDone]);

  useEffect(() => { startMikeRef.current = startMike; }, [startMike]);

  const startInterview = useCallback(async () => {
    if (consentToRecord) {
      await startRecording(); // wait for browser share dialog before Mike speaks
    }
    startMike();
  }, [startMike, startRecording, consentToRecord]);

  useEffect(() => {
    return () => { cancelSpeakRef.current?.(); };
  }, []);

  // ── Two-phase AI loading ──────────────────────────────────────────────────────
  // Phase 1 (fast ~2s): Mike's script only — unblocks Mike immediately
  // Phase 2 (while Mike speaks ~8s): full interview — questions, intros, facts
  useEffect(() => {
    if (bgLoadRef.current) return;
    bgLoadRef.current = true;

    const resolvedJobTitle = ctx.jobTitle || 'Senior Professional';
    const jobSpec = ctx.jobSpecText || `Job Title: ${resolvedJobTitle}
Company: ${demoCompany.name}
Industry: ${'sector' in demoCompany ? demoCompany.sector : 'Professional Services'}
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
    const resolvePhase2 = () => {
      if (phase2Timeout) clearTimeout(phase2Timeout);
      if (phase2ReadyRef.current) return;
      phase2ReadyRef.current = true;
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
    }).then(script => {
      clearTimeout(mikeTimeout);
      if (script) { bgMikeScriptRef.current = script; setBgMikeScript(script); }
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

      // Phase 2: fires in parallel — doesn't wait for the setTimeout above. Widened from 35s
      // to 55s — sessionPrepareClient's question-count retry/top-up loop (now actually
      // enforcing the configured count, see its own comments) can legitimately need up to 3
      // full generation calls plus a top-up call to land on an exact count, which pushed real
      // Phase 2 completions closer to or past the old 35s cap more often than before. When
      // this fallback fires before the real data arrives, Sarah/James silently fall back to
      // their generic, name-less lines — that's what "James stopped saying my name" was.
      phase2Timeout = setTimeout(resolvePhase2, 55000);
      return sessionPrepareClient(jobSpec, ctx.cvText, ctx.selectedLanguage, ctx.jobTitle, ctx.selectedDifficulty, resolvedPreferredName, ctx.questionCount);

    }).then(result => {
      bgLoadedRef.current = true;
      if (!result) { resolvePhase2(); return; }
      setBgQuestions(result.questions);
      if (result.sarahIntro) setBgSarahIntro(result.sarahIntro);
      if (result.jamesIntro) setBgJamesIntro(result.jamesIntro);
      if (result.companyFacts?.length) setBgCompanyFacts(result.companyFacts);
      if (result.specialistTitle) setBgSpecialistTitle(result.specialistTitle);
      resolvePhase2();
      // MCQs generated in a separate dedicated call — more variety, not anchored to main questions
      generateMCQs(jobSpec, ctx.jobTitle, ctx.cvText).then(mcqs => {
        if (mcqs.length) setMcqQuestions(mcqs);
        else if (result.mcqQuestions?.length) setMcqQuestions(result.mcqQuestions); // fallback
      }).catch(() => {
        if (result.mcqQuestions?.length) setMcqQuestions(result.mcqQuestions);
      });
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

  // Handoff variant: the interviewer who DIDN'T ask the original question delivers the
  // follow-up, after a short spoken handoff exchange between the two. Needs two sequential
  // speak() calls (each call is single-voice) rather than askQuestion's one-call flow.
  // Takes the question object directly — see askQuestion's questionOverride comment.
  const askFollowUpWithHandoff = useCallback((index: number, question: InterviewQuestion, followUpText: string, originalInterviewer: 'hr' | 'technical') => {
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({
        questionIndex: index,
        questionText: question.questionText,
        competency: question.competencyTags?.[0] ?? '',
        offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
      });
    }
    const otherInterviewer: 'hr' | 'technical' = originalInterviewer === 'hr' ? 'technical' : 'hr';
    const handoffLine = pickRandom(HANDOFF_LINES[originalInterviewer]);
    const acceptLine = pickRandom(HANDOFF_ACCEPT_LINES);

    setPhase('asking');
    onDoneRef.current = null;
    if (originalInterviewer === 'hr') { setHrState('speaking'); setTechState('listening'); }
    else { setTechState('speaking'); setHrState('listening'); }
    logFlowEvent('QUESTION_DISPLAYED', { questionId: question.questionId, index, source: question.source, handoff: true });

    const onDone = () => {
      setHrState('idle'); setTechState('idle');
      thinkStartRef.current = Date.now();
      setPhase('answering');
    };

    cancelSpeakRef.current = speak(handoffLine, originalInterviewer, () => {
      if (otherInterviewer === 'hr') { setHrState('speaking'); setTechState('idle'); }
      else { setTechState('speaking'); setHrState('idle'); }
      cancelSpeakRef.current = speak(`${acceptLine} ${followUpText}`, otherInterviewer, onDone, (a) => {
        if (otherInterviewer === 'hr') setHrAnalyser(a); else setTechAnalyser(a);
      });
    }, (a) => {
      if (originalInterviewer === 'hr') setHrAnalyser(a); else setTechAnalyser(a);
    });
  }, []);

  // Rolls whether to fire a Go Deeper probing follow-up after the answer that was just
  // scored/coached. scoreWithAI already decided, in the same call, whether this answer
  // sounded shallow enough to warrant one (score.needsFollowUp/followUpQuestion) — this
  // just applies the session cap + difficulty-scaled "does it actually fire" roll on top,
  // so a genuinely vague answer doesn't get probed every single time (keeps it feeling
  // occasional, not like an interrogation). Splices a synthetic InterviewQuestion into
  // bgQuestions right after the current index so the entire existing ask/answer/score/coach
  // pipeline handles it for free — no new phases needed. Returns true if fired (caller
  // should skip its normal advance-to-next-question logic).
  const maybeGoDeeper = useCallback((lastAnswer: SessionAnswer): boolean => {
    if (!goDeeperEnabled) return false;
    if (lastAnswer.question.questionType === 'Follow-up') return false; // never chain a follow-up onto a follow-up
    if (!lastAnswer.score.needsFollowUp || !lastAnswer.score.followUpQuestion) return false;

    const limits = GO_DEEPER_LIMITS[selectedDifficulty] ?? GO_DEEPER_LIMITS.Standard;
    if (goDeeperFiredRef.current >= limits.max) return false;
    if (Math.random() > limits.chance) return false;

    const followUpText = lastAnswer.score.followUpQuestion;
    goDeeperFiredRef.current += 1;
    const originalInterviewer: 'hr' | 'technical' = lastAnswer.question.source === 'HR' ? 'hr' : 'technical';
    const followUpQuestion: InterviewQuestion = {
      ...lastAnswer.question,
      questionId: `${lastAnswer.question.questionId}-followup-${goDeeperFiredRef.current}`,
      questionText: followUpText,
      questionType: 'Follow-up',
    };

    const insertIndex = qIndex + 1;
    setBgQuestions(prev => {
      const arr = [...(prev ?? questions)];
      arr.splice(insertIndex, 0, followUpQuestion);
      return arr;
    });
    setQIndex(insertIndex);

    const doHandoff = Math.random() < 0.5;
    if (doHandoff) {
      askFollowUpWithHandoff(insertIndex, followUpQuestion, followUpText, originalInterviewer);
    } else {
      const transition = pickRandom(FOLLOWUP_TRANSITIONS);
      askQuestion(insertIndex, `${transition} ${followUpText}`, originalInterviewer, followUpQuestion);
    }
    return true;
  }, [goDeeperEnabled, selectedDifficulty, qIndex, questions, askQuestion, askFollowUpWithHandoff]);

  const closeInterview = useCallback((answers: SessionAnswer[], mcqRes: typeof mcqResults, bonusPts: number) => {
    const name = resolvedPreferredName ? `, ${resolvedPreferredName}` : '';
    const closingLine = `Well${name}, that brings us to the end of your interview — thank you so much for your time today. I'm going to have a quick word with James, and then your agent Mike will be in touch shortly with some feedback. In the meantime, you can watch your full interview replay on the next screen, and retake it anytime you like. Best of luck!`;
    cancelSpeakRef.current?.();
    // Whichever path got us here (normal coaching flow, Pass, or an MCQ finish),
    // leave 'done' so the answer/coaching panels can't stay mounted and clickable
    // underneath Sarah's goodbye speech.
    setPhase('done');
    setCoachingMessage(null);
    setHrState('speaking');
    cancelSpeakRef.current = speak(closingLine, 'hr', () => {
      setHrState('idle');
      navigate(`/interview-summary/${interviewIdRef.current}`, {
        state: {
          answers, cvCtx, jobCtx, mcqResults: mcqRes, mcqQuestions, mcqBonusPoints: bonusPts,
          playbackUrl: buildPlaybackUrl(), chapters: chapterMarkersRef.current,
          interviewId: interviewIdRef.current, candidateId: getCandidateId(),
        },
      });
    }, (a) => setHrAnalyser(a));
  }, [resolvedPreferredName, navigate, cvCtx, jobCtx, mcqQuestions, buildPlaybackUrl]);

  const nextQuestion = useCallback(() => {
    setCurrentScore(null);
    setTypedAnswer('');
    setCoachingMessage(null);
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex });

    // MCQ trigger — fires at Q3 (index 2) and Q7 (index 6)
    const nextMcqIdx = mcqFiredCountRef.current;
    if (!mcqActive && !mcqFiringRef.current && MCQ_SLOTS[nextMcqIdx] === qIndex && mcqQuestions[nextMcqIdx]) {
      mcqFiringRef.current = true;
      mcqFiredCountRef.current += 1;
      cancelSpeakRef.current?.();
      if (recordingStartTimeRef.current > 0) {
        chapterMarkersRef.current.push({
          questionIndex: -1,
          questionText: mcqQuestions[nextMcqIdx].questionText,
          competency: 'bonus',
          offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
          isMcq: true,
          mcqOrdinal: nextMcqIdx + 1,
        });
      }
      setActiveMcqOrdinal(nextMcqIdx === 0 ? 'first' : 'second');
      setActiveMcqQuestion(mcqQuestions[nextMcqIdx]);
      setMcqActive(true);
      return;
    }

    const advance = () => {
      if (qIndex + 1 >= questions.length) {
        uploadRecording(sessionAnswers);
        closeInterview(sessionAnswers, mcqResults, mcqBonusPoints);
      } else {
        const next = qIndex + 1;
        setQIndex(next);
        askQuestion(next);
      }
    };

    const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
    if (lastAnswer) {
      if (!maybeGoDeeper(lastAnswer)) advance();
    } else {
      advance();
    }
  }, [qIndex, questions.length, sessionAnswers, askQuestion, q, uploadRecording, mcqQuestions, mcqResults, mcqBonusPoints, mcqActive, closeInterview, maybeGoDeeper]);

  const resumeAfterMCQ = useCallback((bonusEarned: boolean, selectedIndex: number) => {
    mcqFiringRef.current = false;
    setMcqActive(false);
    setActiveMcqQuestion(null);
    const newResult = { correct: bonusEarned, selectedIndex, questionIndex: qIndex };
    setMcqResults(prev => [...prev, newResult]);
    if (bonusEarned) setMcqBonusPoints(prev => prev + 10);

    const advance = () => {
      const next = qIndex + 1;
      if (next >= questions.length) {
        uploadRecording(sessionAnswers);
        closeInterview(sessionAnswers, [...mcqResults, newResult], mcqBonusPoints + (bonusEarned ? 10 : 0));
      } else {
        setQIndex(next);
        askQuestion(next);
      }
    };

    const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
    if (lastAnswer) {
      if (!maybeGoDeeper(lastAnswer)) advance();
    } else {
      advance();
    }
  }, [qIndex, questions.length, sessionAnswers, askQuestion, uploadRecording, mcqResults, mcqQuestions, mcqBonusPoints, closeInterview, maybeGoDeeper]);

  const handlePass = useCallback(() => {
    if (passInProgressRef.current) return;
    passInProgressRef.current = true;
    setTimeout(() => { passInProgressRef.current = false; }, 800);
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    const passScore: ScoreResponse = {
      clarity: 0, relevance: 0, depth: 0, confidence: 0, overallScore: 0,
      feedback: [{ dimension: 'overall', message: 'Question passed — no answer given.', severity: 'high' }],
      suggestions: ['Attempt all questions in a real interview.'],
    };
    setRunningScores(prev => [...prev, 0]);
    setSessionAnswers(prev => [...prev, { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs }]);
    setCurrentScore(null); setCoachingMessage(null); setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex, passed: true });

    // MCQ trigger — same slots as nextQuestion
    const nextMcqIdx = mcqFiredCountRef.current;
    if (!mcqActive && !mcqFiringRef.current && MCQ_SLOTS[nextMcqIdx] === qIndex && mcqQuestions[nextMcqIdx]) {
      mcqFiringRef.current = true;
      mcqFiredCountRef.current += 1;
      cancelSpeakRef.current?.();
      if (recordingStartTimeRef.current > 0) {
        chapterMarkersRef.current.push({
          questionIndex: -1,
          questionText: mcqQuestions[nextMcqIdx].questionText,
          competency: 'bonus',
          offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
          isMcq: true,
          mcqOrdinal: nextMcqIdx + 1,
        });
      }
      setActiveMcqOrdinal(nextMcqIdx === 0 ? 'first' : 'second');
      setActiveMcqQuestion(mcqQuestions[nextMcqIdx]);
      setMcqActive(true);
      return;
    }

    const passedAnswers = [...sessionAnswers, { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs }];
    if (qIndex + 1 >= questions.length) {
      uploadRecording(passedAnswers);
      closeInterview(passedAnswers, mcqResults, mcqBonusPoints);
    } else {
      const next = qIndex + 1;
      setQIndex(next);
      askQuestion(next);
    }
  }, [q, qIndex, questions.length, sessionAnswers, askQuestion, mcqQuestions, mcqResults, mcqBonusPoints, mcqActive, uploadRecording, closeInterview]);

  const submitAnswer = useCallback(async (text: string, meta?: TranscriptMeta, byVoice = false) => {
    if (!text.trim()) return;
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    setPhase('scoring');
    setHrState('thinking'); setTechState('thinking');
    logFlowEvent('ANSWER_RECEIVED', { questionId: q?.questionId, wordCount: text.trim().split(/\s+/).length, byVoice });

    const goDeeperLimits = GO_DEEPER_LIMITS[selectedDifficulty] ?? GO_DEEPER_LIMITS.Standard;
    const goDeeperEligible = goDeeperEnabled && q?.questionType !== 'Follow-up' && goDeeperFiredRef.current < goDeeperLimits.max;

    let score: ScoreResponse;
    try {
      score = aiScoringConfigured
        ? await scoreWithAI(q, text, cvCtx, jobCtx, { enabled: goDeeperEligible, difficulty: selectedDifficulty }, sessionLanguage)
        : localScore(q, text, companyKeywords);
    } catch {
      score = localScore(q, text, companyKeywords);
    }

    setCurrentScore(score);
    setRunningScores(prev => [...prev, score.overallScore]);
    setSessionAnswers(prev => [...prev, { question: q, answerText: text, meta, score, answeredByVoice: byVoice, thinkTimeMs }]);
    setHrState('idle'); setTechState('idle');

    let coaching: CoachingMessage;
    try {
      coaching = aiScoringConfigured
        ? await coachWithAI(q, text, score, cvCtx, jobCtx, thinkTimeMs, sessionLanguage)
        : generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    } catch (err) {
      console.error('[InterviewRoom] AI coaching failed — using template fallback:', err);
      coaching = generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    }

    setCoachingMessage(coaching);
    setPhase('coaching');
  }, [q, qIndex, cvCtx, jobCtx, companyKeywords, goDeeperEnabled, selectedDifficulty, sessionLanguage]);

  const displayedQuestion = useTypewriter(q?.questionText ?? '', phase === 'asking');
  const coachingCue = useCoachingCue(phase === 'answering');

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
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)' }}>
            InterviewMe · Interview Room
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
          {/* Language switcher — always visible so candidates can switch any time */}
          <select
            value={sessionLanguage}
            onChange={e => setSessionLanguage(e.target.value)}
            title="Switch language"
            style={{
              fontSize: '11px', fontWeight: 600, padding: '5px 8px', borderRadius: '7px',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="en">🇬🇧 English (EN)</option>
            <option value="fr">🇫🇷 French (FR)</option>
            <option value="es">🇪🇸 Spanish (ES)</option>
            <option value="de">🇩🇪 German (DE)</option>
            <option value="pt">🇵🇹 Portuguese (PT)</option>
            <option value="pl">🇵🇱 Polish (PL)</option>
            <option value="nl">🇳🇱 Dutch (NL)</option>
            <option value="it">🇮🇹 Italian (IT)</option>
            <option value="tr">🇹🇷 Turkish (TR)</option>
            <option value="ar">🇸🇦 Arabic (AR)</option>
            <option value="zh">🇨🇳 Chinese (ZH)</option>
            <option value="hi">🇮🇳 Hindi (HI)</option>
          </select>
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
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />Saving…</>
              ) : uploadStatus === 'done' ? (
                <><span style={{ color: '#34D399', userSelect: 'none' }}>✓</span><span style={{ color: '#34D399', userSelect: 'none' }}>Saved</span></>
              ) : uploadStatus === 'error' ? (
                <><span style={{ userSelect: 'none' }}>⚠</span>Save failed</>
              ) : isRecording ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />Recording</>
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
            uploadRecording(sessionAnswers);
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 24px 32px', gap: '20px' }}>

        {/* Sarah + James — hidden while Mike is speaking, fade in after */}
        <AnimatePresence>
          {showInterviewers && (
            <motion.div
              key="interviewers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{ display: 'flex', gap: '16px' }}
            >
              <InterviewerAvatar
                role="hr" state={hrState} active={hrState === 'speaking'} analyserNode={hrAnalyser}
                videoUrl={sarahIntroVideoActive ? '/images/sarah-intro-v1.mp4' : null}
                onVideoEnded={sarahIntroVideoActive ? handleSarahIntroVideoEnded : () => onDoneRef.current?.()}
                onVideoAnalyser={handleSarahVideoAnalyser}
              />
              <InterviewerAvatar
                role="technical" state={techState} active={techState === 'speaking'} specialistTitle={specialistTitle} analyserNode={techAnalyser}
                videoUrl={jamesGreetingVideoActive ? jamesGreetingUrl : null}
                onVideoEnded={jamesGreetingVideoActive ? handleJamesGreetingVideoEnded : () => onDoneRef.current?.()}
                onVideoAnalyser={handleJamesVideoAnalyser}
              />
              <YouCamera cameraOn={cameraOn} speaking={phase === 'answering'} onToggle={() => setCameraOn(v => !v)} />
            </motion.div>
          )}
        </AnimatePresence>

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

                {/* Meta row */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }}
                  style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '5px 14px' }}>
                    {questions.length} questions · Sarah &amp; James
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: elevenLabsConfigured ? 'rgba(52,211,153,0.1)' : 'var(--bg3)', border: `1px solid ${elevenLabsConfigured ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`, borderRadius: '20px', padding: '5px 14px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }} />
                    <span style={{ fontSize: '12px', color: elevenLabsConfigured ? '#34D399' : 'var(--amber)', userSelect: 'none' }}>
                      {elevenLabsConfigured ? 'Neural voices ready' : 'Browser voices'}
                    </span>
                  </div>
                </motion.div>

                {/* Answer mode + audio test */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5 }}
                  style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="radio" checked={useVoice} onChange={() => setUseVoice(true)} style={{ accentColor: '#a78bfa' }} />
                    Speak my answers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="radio" checked={!useVoice} onChange={() => setUseVoice(false)} style={{ accentColor: '#a78bfa' }} />
                    Type my answers
                  </label>
                  <button onClick={testAudio} disabled={audioCheckState === 'playing'}
                    style={{ background: 'transparent', border: `1px solid ${audioCheckState === 'done' ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: audioCheckState === 'playing' ? 'default' : 'pointer', color: audioCheckState === 'done' ? '#34D399' : 'var(--text-2)' }}>
                    {audioCheckState === 'done' ? '✓ Audio OK' : audioCheckState === 'playing' ? 'Playing…' : '🔊 Test audio'}
                  </button>
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
                  {/* Mike's photo — or, in English, his real pre-rendered talking-head clip
                      (see startMike/handleMikeIntroDone above). */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', margin: '0 auto 20px', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
                    {sessionLanguage === 'en' ? (
                      <video
                        src="/images/mike-intro-v1.mp4"
                        autoPlay playsInline
                        onEnded={handleMikeIntroDone}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                      />
                    ) : (
                      <>
                        <img src="/images/mike.png" alt="Mike" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                        {/* Amplitude-driven mouth movement — only relevant on the non-English
                            live-TTS path; MOUTH_OVERLAY_ENABLED is currently false anyway
                            (see project-mouth-movement-avatars memory). */}
                        {MOUTH_OVERLAY_ENABLED && <MouthOverlay analyserNode={techAnalyser} active={phase === 'mike'} {...MOUTH_POSITIONS.mike} />}
                      </>
                    )}
                    {/* Pulse ring while speaking */}
                    <motion.div
                      animate={{ scale: [1, 1.03, 1], opacity: [0.6, 0.15, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{ position: 'absolute', inset: -8, borderRadius: '20px', border: '2px solid var(--blue)', pointerEvents: 'none' }}
                    />
                  </div>
                  <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Mike</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recruitment Consultant</div>
                  {/* Speaking indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'default', userSelect: 'none' }}>
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-3)', userSelect: 'none' }}>Speaking…</span>
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
                  cancelSpeakRef.current?.();
                  if (bgLoadedRef.current) {
                    beginInterviewIntroRef.current();
                  } else {
                    setWaitingForSession(true);
                    const poll = setInterval(() => {
                      if (bgLoadedRef.current) {
                        clearInterval(poll);
                        setWaitingForSession(false);
                        beginInterviewIntroRef.current();
                      }
                    }, 300);
                  }
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

              {/* Chair spinner — shown only if user skips before Phase 2 finishes */}
              {waitingForSession && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '8px' }}>
                  <ChairSpinner label="Preparing your interview…" size={80} />
                </motion.div>
              )}
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
                    onClick={() => { cancelSpeakRef.current?.(); setHrState('idle'); setTechState('idle'); askQuestion(0); }}
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
                      {isHrQuestion ? 'Sarah · HR' : `James · ${specialistTitle}`}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '3px 8px' }}>{selectedDifficulty}</span>
                    {phase === 'answering' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button onClick={repeatQuestion} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: 'var(--blue)', cursor: 'pointer' }}>
                          ↩ Repeat
                        </button>
                        <button onClick={handlePause} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#34D399', cursor: 'pointer' }}>
                          ⏸ Pause
                        </button>
                        <button onClick={handlePass} style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}>
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

                    {/* Difficulty dropdown */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Difficulty</div>
                      <select
                        value={selectedDifficulty}
                        onChange={e => setSelectedDifficulty(e.target.value)}
                        style={{
                          width: '100%', appearance: 'none', WebkitAppearance: 'none',
                          fontSize: '11px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px',
                          background: selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.12)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.12)' : 'rgba(52,211,153,0.1)',
                          color: selectedDifficulty === 'Expert' ? '#EF4444' : selectedDifficulty === 'Pro' ? '#F59E0B' : '#34D399',
                          border: `1px solid ${selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.3)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.3)' : 'rgba(52,211,153,0.25)'}`,
                          cursor: 'pointer', outline: 'none',
                        }}
                      >
                        <option value="Expert" style={{ background: '#1a1e2e', color: '#EF4444' }}>Expert</option>
                        <option value="Pro" style={{ background: '#1a1e2e', color: '#F59E0B' }}>Pro</option>
                        <option value="Standard" style={{ background: '#1a1e2e', color: '#34D399' }}>Standard</option>
                      </select>
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

              {/* Scoring spinner */}
              {phase === 'scoring' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '8px 28px' }}>
                  <ChairSpinner label="Analysing your answer…" size={100} />
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

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
