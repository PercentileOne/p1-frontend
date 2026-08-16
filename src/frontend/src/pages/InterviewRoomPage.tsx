import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar, type AvatarState } from '../components/InterviewerAvatar';
import { YouCamera } from '../components/YouCamera';
import { VoiceInput, type TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import { speak, elevenLabsConfigured } from '../api/ttsApi';
import type { CVContext, JobSpecContext } from '../utils/contextBuilder';
import { CoachingOverlay } from '../components/CoachingOverlay';
import { generateCoachingMessage, type CoachingMessage } from '../utils/coachingEngine';
import { scoreWithAI, coachWithAI, aiScoringConfigured, sessionPrepareClient, generateMikeScriptOnly, generateMCQs, type MCQQuestion } from '../api/aiScoring';
import { ChairSpinner } from '../components/ChairSpinner';
import CinematicMCQ from '../components/CinematicMCQ';
import { pickRandomCompany, type Company } from '../data/companyBank';
import { logFlowEvent } from '../api/flowLogger';

// ── Multilingual Sarah intro fallbacks ───────────────────────────────────────
const SARAH_INTROS: Record<string, string> = {
  en: "Hi — I'm Sarah, HR Director. Lovely to have you here. I'll be joined by James, who'll lead the role-specific questions. When each question appears, click the Record button to start your answer, and click Stop when you've finished. You can also use the Repeat button if you'd like to hear a question again, or Pause if you need a moment. Just speak naturally, take your time, and don't worry about being perfect. Ready when you are.",
  fr: "Bonjour — je suis Sarah, Directrice des Ressources Humaines. Ravi de vous accueillir. James me rejoindra pour les questions spécifiques au poste. Lorsqu'une question apparaît, cliquez sur Enregistrer pour commencer votre réponse, et sur Stop quand vous avez terminé. Vous pouvez aussi utiliser Répéter pour réécouter une question, ou Pause si vous avez besoin d'un moment. Parlez naturellement, prenez votre temps.",
  es: "Hola — soy Sarah, Directora de Recursos Humanos. Encantada de tenerte aquí. James se unirá para las preguntas específicas del puesto. Cuando aparezca cada pregunta, haz clic en Grabar para comenzar tu respuesta y en Detener cuando hayas terminado. Habla con naturalidad, tómate tu tiempo.",
  de: "Hallo — ich bin Sarah, HR-Direktorin. Schön, dass Sie hier sind. James wird sich für die rollenspezifischen Fragen zu mir gesellen. Wenn eine Frage erscheint, klicken Sie auf Aufnehmen, um Ihre Antwort zu beginnen, und auf Stopp, wenn Sie fertig sind.",
  pt: "Olá — sou Sarah, Directora de Recursos Humanos. Prazer em tê-lo aqui. James juntar-se-á a mim para as perguntas específicas da função.",
  pl: "Cześć — jestem Sarah, Dyrektor HR. Miło mieć cię tutaj. Dołączy do mnie James z pytaniami dotyczącymi stanowiska.",
  nl: "Hoi — ik ben Sarah, HR-directeur. Fijn dat je er bent. James sluit zich bij me aan voor de functiespecifieke vragen.",
  it: "Ciao — sono Sarah, Direttrice delle Risorse Umane. Piacere di averti qui. James si unirà a me per le domande specifiche al ruolo.",
  tr: "Merhaba — ben Sarah, İK Direktörü. Burada olmanıza sevindik. James, role özel sorular için bana katılacak.",
  ar: "مرحباً — أنا سارة، مديرة الموارد البشرية. يسعدنا وجودك معنا. سينضم إليّ جيمس للأسئلة المتعلقة بالوظيفة.",
  zh: "您好 — 我是 Sarah，人力资源总监。很高兴您能来。James 将加入我进行岗位相关问题的提问。",
  hi: "नमस्ते — मैं Sarah हूँ, HR Director। आपका यहाँ स्वागत है। James मेरे साथ भूमिका-विशिष्ट प्रश्नों के लिए जुड़ेंगे।",
};

// ── Demo fallback questions ───────────────────────────────────────────────────

function buildDemoQuestions(company: Company): InterviewQuestion[] {
  return [
    { questionId: 'q1', questionText: 'Walk me through the most complex challenge you have faced in this type of role. What did you do and what was the outcome?', modelAnswer: 'Cover: context, your specific actions, trade-offs made, and the measurable result.', questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['problem-solving'] },
    { questionId: 'q2', questionText: 'Tell me about a time you had to deliver under significant pressure. How did you manage it?', modelAnswer: 'Cover: the pressures involved, your approach, how you prioritised, and the outcome.', questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['delivery', 'resilience'] },
    { questionId: 'q3', questionText: 'Describe a situation where you had to work closely with a team to achieve something difficult. What role did you play?', modelAnswer: 'Cover: the team dynamic, your specific contribution, any conflict or challenge, and the result.', questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['teamwork', 'collaboration'] },
    { questionId: 'q4', questionText: 'Tell me about a time you disagreed with a decision made by your manager or leadership. How did you handle it?', modelAnswer: 'Cover: the nature of the disagreement, how you raised it professionally, and what you learned.', questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['communication', 'professional judgement'] },
    { questionId: 'q5', questionText: 'Give me an example of when you had to adapt quickly to a significant change at work. What did you do?', modelAnswer: 'Cover: what changed, how you responded, what you prioritised, and how you helped others if relevant.', questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['adaptability', 'change management'] },
    { questionId: 'q6', questionText: 'Describe a time you identified a problem that others had missed. How did you spot it and what did you do?', modelAnswer: 'Cover: what the problem was, how you identified it, the action you took, and the impact.', questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['initiative', 'analytical thinking'] },
    { questionId: 'q7', questionText: 'Tell me about a time you had to manage competing priorities with limited resources. How did you decide what to focus on?', modelAnswer: 'Cover: the competing demands, your prioritisation framework, trade-offs, and the outcome.', questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['prioritisation', 'decision-making'] },
    { questionId: 'q8', questionText: 'Describe an achievement you are genuinely proud of from your career so far. What made it significant?', modelAnswer: 'Cover: what you did, the scale or difficulty, your personal contribution, and why it matters.', questionType: 'Competency', difficulty: 'Easy', source: 'Role', competencyTags: ['achievement', 'motivation'] },
    { questionId: 'q9', questionText: 'Describe a time you delivered difficult feedback to someone. How did you approach it?', modelAnswer: 'Use STAR. Emphasise empathy, specificity, listening to the response, and the relationship outcome.', questionType: 'Behavioural', difficulty: 'Medium', source: 'HR', competencyTags: ['communication', 'stakeholder management'] },
    { questionId: 'q10', questionText: `What do you know about ${company.name} and why does this role specifically appeal to you?`, modelAnswer: `Show genuine research into ${company.name}. Connect their mission to your own motivations and experience.`, questionType: 'Behavioural', difficulty: 'Easy', source: 'HR', competencyTags: ['company knowledge', 'motivation'] },
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
  preferredName?: string;
  company?: string;
  consentToRecord?: boolean;
}

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

type RoomPhase = 'intro' | 'mike' | 'interviewer-intro' | 'asking' | 'answering' | 'scoring' | 'coaching' | 'done';

// ── Coaching cues ─────────────────────────────────────────────────────────────

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
  const jobCtx = ctx.jobCtx;
  const resolvedPreferredName = ctx.preferredName?.trim() || cvCtx?.firstName?.trim() || undefined;

  const demoCompany = useMemo(() => pickRandomCompany(), []);

  const [bgQuestions, setBgQuestions] = useState<InterviewQuestion[] | null>(null);
  const [bgSarahIntro, setBgSarahIntro] = useState<string | null>(null);
  const [bgJamesIntro, setBgJamesIntro] = useState<string | null>(null);
  const [bgMikeScript, setBgMikeScript] = useState<string | null>(null);
  const bgMikeScriptRef = useRef<string | null>(null);
  const [bgCompanyFacts, setBgCompanyFacts] = useState<string[]>([]);
  const [bgSpecialistTitle, setBgSpecialistTitle] = useState<string | null>(null);
  const bgLoadRef = useRef(false);
  const bgLoadedRef = useRef(false);

  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqActive, setMcqActive] = useState(false);
  const [mcqBonusPoints, setMcqBonusPoints] = useState(0);
  const [mcqResults, setMcqResults] = useState<Array<{ correct: boolean; selectedIndex: number; questionIndex: number }>>([]);
  const MCQ_SLOTS = [2, 6];
  const mcqFiredCountRef = useRef(0);
  const [activeMcqQuestion, setActiveMcqQuestion] = useState<MCQQuestion | null>(null);
  const [activeMcqOrdinal, setActiveMcqOrdinal] = useState<'first' | 'second'>('first');

  const passInProgressRef = useRef(false);

  const sessionReadyRef = useRef(false);
  const sessionWaitersRef = useRef<Array<() => void>>([]);

  const questions = bgQuestions ?? buildDemoQuestions(demoCompany);
  const companyKeywords = bgCompanyFacts.length ? bgCompanyFacts : demoCompany.companyKnowledgeKeywords;
  const specialistTitle = bgSpecialistTitle ?? 'Hiring Manager';
  const effectiveSarahIntro = bgSarahIntro ?? undefined;
  const effectiveJamesIntro = bgJamesIntro ?? undefined;

  const fallbackMikeScript = `Hi there — I'm Mike, your recruitment consultant. I've set up your interview today and I want to give you a quick briefing before you meet the panel. Your interviewers today are Sarah, who heads up HR, and James, who'll be assessing you on the role itself. They'll guide you through everything — just follow Sarah's instructions on the controls and you'll be absolutely fine. The best thing you can do is be specific: use real examples from your experience. Back yourself — you've got this. Good luck!`;
  const mikeScript = bgMikeScript ?? fallbackMikeScript;

  // ── Session recording ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const chapterMarkersRef = useRef<{ questionIndex: number; questionText: string; competency: string; offsetSeconds: number; isMcq?: boolean; mcqOrdinal?: number }[]>([]);

  const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://explain-api.azurewebsites.net';

  const getCandidateId = () => {
    const key = 'explain_candidate_id';
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  };

  const startRecording = useCallback(async () => {
    try {
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'audio/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tabStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: 30 },
        audio: true,
        preferCurrentTab: true,
      });
      let micStream: MediaStream | null = null;
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch { /* no mic */ }

      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const tabAudioTracks = tabStream.getAudioTracks();
      if (tabAudioTracks.length > 0) {
        const tabSource = audioCtx.createMediaStreamSource(new MediaStream(tabAudioTracks));
        tabSource.connect(dest);
      }
      if (micStream) {
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(dest);
      }
      const compositeStream = new MediaStream([...tabStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      recordingStreamRef.current = compositeStream;
      recordingChunksRef.current = [];
      chapterMarkersRef.current = [];
      recordingStartTimeRef.current = Date.now();
      const recorder = new MediaRecorder(compositeStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.start(1000);
      setIsRecording(true);
      tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        micStream?.getTracks().forEach(t => t.stop());
        audioCtx.close();
      });
    } catch { /* user dismissed share dialog — interview continues unrecorded */ }
  }, []);

  const buildPlaybackUrl = useCallback((): string | null => {
    if (recordingChunksRef.current.length === 0) return null;
    const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    return URL.createObjectURL(blob);
  }, []);

  const uploadRecording = useCallback((answers: SessionAnswer[]) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive' || recordingChunksRef.current.length === 0) return;
    setUploadStatus('uploading');
    recorder.onstop = async () => {
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      try {
        const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const durationSeconds = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        const overallScore = answers.length ? answers.reduce((s, a) => s + a.score.overallScore, 0) / answers.length : 0;
        const candidateId = getCandidateId();
        const answerSummaries = answers.map((a, i) => ({ questionIndex: i, questionText: a.question.questionText, answerText: a.answerText, score: Math.round(a.score.overallScore * 100), passed: a.answerText === '' }));
        const metadata = JSON.stringify({ chapters: chapterMarkersRef.current, answers: answerSummaries });
        const qs = new URLSearchParams({ candidateId, candidateName: resolvedPreferredName ?? 'Candidate', jobTitle: ctx.jobTitle ?? 'Interview', company: ctx.company ?? '', durationSeconds: String(durationSeconds), overallScore: String(Math.round(overallScore * 100)) });
        await fetch(`${API_BASE}/api/interviews/upload?${qs}`, { method: 'POST', headers: { 'Content-Type': mimeType, 'X-Interview-Metadata': metadata }, body: blob });
        setUploadStatus('done');
      } catch { setUploadStatus('error'); }
    };
    recorder.stop();
  }, [API_BASE, resolvedPreferredName, ctx.jobTitle, ctx.company]);

  useEffect(() => () => { uploadRecording([]); }, [uploadRecording]);

  const consentToRecord = ctx.consentToRecord !== false;
  const [cameraOn, setCameraOn] = useState(true);
  const [phase, setPhase] = useState<RoomPhase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [useVoice, setUseVoice] = useState(true);
  const [highlightRecord, setHighlightRecord] = useState(false);
  const [sessionLanguage, setSessionLanguage] = useState(ctx.selectedLanguage ?? 'en');
  const [currentScore, setCurrentScore] = useState<ScoreResponse | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [hrState, setHrState] = useState<AvatarState>('idle');
  const [techState, setTechState] = useState<AvatarState>('idle');
  const [hrAnalyser, setHrAnalyser] = useState<AnalyserNode | null>(null);
  const [techAnalyser, setTechAnalyser] = useState<AnalyserNode | null>(null);
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

  const avgScore = runningScores.length > 0
    ? Math.round(runningScores.reduce((s, v) => s + v, 0) / runningScores.length * 100)
    : null;

  useEffect(() => {
    if (phase === 'answering' && !paused) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, paused]);

  const askQuestion = useCallback((index: number) => {
    const question = questions[index];
    if (!question) return;
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({ questionIndex: index, questionText: question.questionText, competency: question.competencyTags?.[0] ?? '', offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000) });
    }
    const interviewer: 'hr' | 'technical' = question.source === 'HR' ? 'hr' : 'technical';
    setPhase('asking');
    onDoneRef.current = null;
    if (interviewer === 'hr') { setHrState('speaking'); setTechState('listening'); }
    else { setTechState('speaking'); setHrState('listening'); }
    logFlowEvent('QUESTION_DISPLAYED', { questionId: question.questionId, index, source: question.source });
    const onDone = () => { setHrState('idle'); setTechState('idle'); thinkStartRef.current = Date.now(); setPhase('answering'); };
    cancelSpeakRef.current = speak(question.questionText, interviewer, onDone, (a) => {
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

  const beginInterviewIntro = useCallback(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    setPhase('interviewer-intro');
    logFlowEvent('INTERVIEW_PHASE_STARTED', { questionCount: questions.length, aiQuestionsLoaded: bgLoadedRef.current, specialistTitle });
    setTimeout(() => {
      setHrState('speaking');
      const sarahText = effectiveSarahIntro ?? SARAH_INTROS[sessionLanguage] ?? SARAH_INTROS.en;
      const pulseOuter = setTimeout(() => { setHighlightRecord(true); setTimeout(() => setHighlightRecord(false), 6000); }, 8000);
      const jamesText = effectiveJamesIntro ?? "And I'm James — looking forward to hearing about your experience. Let's get started.";
      cancelSpeakRef.current = speak(sarahText, 'hr', () => {
        clearTimeout(pulseOuter);
        setHighlightRecord(false);
        setHrState('idle');
        setTechState('speaking');
        cancelSpeakRef.current = speak(jamesText, 'technical', () => {
          setTechState('idle');
          setTimeout(() => askQuestion(0), 500);
        }, (a) => setTechAnalyser(a));
      }, (a) => setHrAnalyser(a));
    }, 600);
  }, [askQuestion, effectiveSarahIntro, effectiveJamesIntro, questions.length, specialistTitle, sessionLanguage]);

  const beginInterviewIntroRef = useRef(beginInterviewIntro);
  useEffect(() => { beginInterviewIntroRef.current = beginInterviewIntro; }, [beginInterviewIntro]);

  const startMikeRef = useRef<() => void>(() => {});

  const startMike = useCallback(() => {
    setPhase('mike');
    logFlowEvent('MIKE_INTRO_STARTED', { hasJobSpec: Boolean(ctx.jobSpecText), hasCv: Boolean(ctx.cvText), selectedLanguage: ctx.selectedLanguage });
    cancelSpeakRef.current = speak(bgMikeScriptRef.current ?? fallbackMikeScript, 'technical', () => {
      cancelSpeakRef.current = null;
      logFlowEvent('MIKE_INTRO_COMPLETED', {});
      beginInterviewIntroRef.current();
    }, (a) => setTechAnalyser(a));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mikeScript, ctx.jobSpecText, ctx.cvText, ctx.selectedLanguage]);

  useEffect(() => { startMikeRef.current = startMike; }, [startMike]);

  const startInterview = useCallback(async () => {
    if (consentToRecord) await startRecording();
    startMike();
  }, [startMike, startRecording, consentToRecord]);

  useEffect(() => { return () => { cancelSpeakRef.current?.(); }; }, []);

  // ── Two-phase AI loading ──────────────────────────────────────────────────────
  useEffect(() => {
    if (bgLoadRef.current) return;
    bgLoadRef.current = true;

    const resolvedJobTitle = ctx.jobTitle || 'Senior Professional';
    const jobSpec = ctx.jobSpecText || `Job Title: ${resolvedJobTitle}
Company: ${demoCompany.name}
Industry: Professional Services
Location: United Kingdom

We are looking for an experienced ${resolvedJobTitle} to join our team. The successful candidate will bring strong problem-solving ability, excellent communication skills, and a track record of delivering results under pressure.`;

    const mikeTimeout = setTimeout(() => {
      if (!sessionReadyRef.current) {
        sessionReadyRef.current = true;
        sessionWaitersRef.current.forEach(cb => cb());
        sessionWaitersRef.current = [];
      }
    }, 5000);

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

      setTimeout(() => {
        if (!sessionReadyRef.current) {
          sessionReadyRef.current = true;
          sessionWaitersRef.current.forEach(cb => cb());
          sessionWaitersRef.current = [];
        }
      }, 0);

      return sessionPrepareClient(jobSpec, ctx.cvText, ctx.selectedLanguage, ctx.jobTitle, ctx.selectedDifficulty, resolvedPreferredName);

    }).then(result => {
      bgLoadedRef.current = true;
      if (!result) return;
      setBgQuestions(result.questions);
      if (result.sarahIntro) setBgSarahIntro(result.sarahIntro);
      if (result.jamesIntro) setBgJamesIntro(result.jamesIntro);
      if (result.companyFacts?.length) setBgCompanyFacts(result.companyFacts);
      if (result.specialistTitle) setBgSpecialistTitle(result.specialistTitle);
      generateMCQs(jobSpec, ctx.jobTitle, ctx.cvText).then(mcqs => {
        if (mcqs.length) setMcqQuestions(mcqs);
        else if (result.mcqQuestions?.length) setMcqQuestions(result.mcqQuestions);
      }).catch(() => { if (result.mcqQuestions?.length) setMcqQuestions(result.mcqQuestions); });
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
    });

    return () => clearTimeout(mikeTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const closeInterview = useCallback((answers: SessionAnswer[], mcqRes: typeof mcqResults, bonusPts: number) => {
    const name = resolvedPreferredName ? `, ${resolvedPreferredName}` : '';
    const closingLine = `Well${name}, that brings us to the end of your interview — thank you so much for your time today. I'm going to have a quick word with James, and then your agent Mike will be in touch shortly with some feedback. In the meantime, you can watch your full interview replay on the next screen, and retake it anytime you like. Best of luck!`;
    cancelSpeakRef.current?.();
    setHrState('speaking');
    cancelSpeakRef.current = speak(closingLine, 'hr', () => {
      setHrState('idle');
      navigate(`/interview-summary/session-${Date.now()}`, {
        state: { answers, cvCtx, jobCtx, mcqResults: mcqRes, mcqQuestions, mcqBonusPoints: bonusPts, playbackUrl: buildPlaybackUrl(), chapters: chapterMarkersRef.current },
      });
    }, (a) => setHrAnalyser(a));
  }, [resolvedPreferredName, navigate, cvCtx, jobCtx, mcqQuestions, buildPlaybackUrl]);

  const nextQuestion = useCallback(() => {
    setCurrentScore(null);
    setTypedAnswer('');
    setCoachingMessage(null);
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex });

    const nextMcqIdx = mcqFiredCountRef.current;
    if (!mcqActive && MCQ_SLOTS[nextMcqIdx] === qIndex && mcqQuestions[nextMcqIdx]) {
      mcqFiredCountRef.current += 1;
      cancelSpeakRef.current?.();
      if (recordingStartTimeRef.current > 0) {
        chapterMarkersRef.current.push({ questionIndex: -1, questionText: mcqQuestions[nextMcqIdx].questionText, competency: 'bonus', offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000), isMcq: true, mcqOrdinal: nextMcqIdx + 1 });
      }
      setActiveMcqOrdinal(nextMcqIdx === 0 ? 'first' : 'second');
      setActiveMcqQuestion(mcqQuestions[nextMcqIdx]);
      setMcqActive(true);
      return;
    }

    if (qIndex + 1 >= questions.length) {
      uploadRecording(sessionAnswers);
      closeInterview(sessionAnswers, mcqResults, mcqBonusPoints);
    } else {
      const next = qIndex + 1;
      setQIndex(next);
      askQuestion(next);
    }
  }, [qIndex, questions.length, sessionAnswers, askQuestion, q, uploadRecording, mcqQuestions, mcqResults, mcqBonusPoints, mcqActive, closeInterview]);

  const resumeAfterMCQ = useCallback((bonusEarned: boolean, selectedIndex: number) => {
    setMcqActive(false);
    setActiveMcqQuestion(null);
    const newResult = { correct: bonusEarned, selectedIndex, questionIndex: qIndex };
    setMcqResults(prev => [...prev, newResult]);
    if (bonusEarned) setMcqBonusPoints(prev => prev + 10);
    const next = qIndex + 1;
    if (next >= questions.length) {
      uploadRecording(sessionAnswers);
      closeInterview(sessionAnswers, [...mcqResults, newResult], mcqBonusPoints + (bonusEarned ? 10 : 0));
    } else {
      setQIndex(next);
      askQuestion(next);
    }
  }, [qIndex, questions.length, sessionAnswers, askQuestion, uploadRecording, mcqResults, mcqBonusPoints, closeInterview]);

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

    const nextMcqIdx = mcqFiredCountRef.current;
    if (!mcqActive && MCQ_SLOTS[nextMcqIdx] === qIndex && mcqQuestions[nextMcqIdx]) {
      mcqFiredCountRef.current += 1;
      cancelSpeakRef.current?.();
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

    let score: ScoreResponse;
    try {
      score = aiScoringConfigured ? await scoreWithAI(q, text, cvCtx, jobCtx) : localScore(q, text, companyKeywords);
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
        ? await coachWithAI(q, text, score, cvCtx, jobCtx, thinkTimeMs)
        : generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    } catch (err) {
      console.error('[InterviewRoom] AI coaching failed — using template fallback:', err);
      coaching = generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    }

    setCoachingMessage(coaching);
    setPhase('coaching');
  }, [q, cvCtx, jobCtx, companyKeywords]);

  const displayedQuestion = useTypewriter(q?.questionText ?? '', phase === 'asking');
  const coachingCue = useCoachingCue(phase === 'answering');

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = (qIndex + (phase === 'scoring' ? 1 : 0)) / questions.length;
  const scoreColor = avgScore === null ? 'var(--text-3)' : avgScore >= 70 ? '#34D399' : avgScore >= 50 ? '#F59E0B' : '#EF4444';
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
    <div ref={roomRef} style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Cinematic MCQ overlay */}
      {mcqActive && activeMcqQuestion && (
        <CinematicMCQ mcq={activeMcqQuestion} candidateName={resolvedPreferredName} questionOrdinal={activeMcqOrdinal} onComplete={resumeAfterMCQ} />
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
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
                <div style={{ fontSize: '12px', fontWeight: 800, color: scoreColor, background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`, borderRadius: '6px', padding: '3px 10px' }}>
                  {avgScore}%
                </div>
              )}
              {mcqBonusPoints > 0 && (
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '6px', padding: '3px 10px' }}>
                  +{mcqBonusPoints} bonus
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={sessionLanguage} onChange={e => setSessionLanguage(e.target.value)}
            style={{ fontSize: '11px', fontWeight: 600, padding: '5px 8px', borderRadius: '7px', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', outline: 'none' }}>
            <option value="en">🇬🇧 EN</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="es">🇪🇸 ES</option>
            <option value="de">🇩🇪 DE</option>
            <option value="pt">🇵🇹 PT</option>
            <option value="pl">🇵🇱 PL</option>
            <option value="nl">🇳🇱 NL</option>
            <option value="it">🇮🇹 IT</option>
            <option value="tr">🇹🇷 TR</option>
            <option value="ar">🇸🇦 AR</option>
            <option value="zh">🇨🇳 ZH</option>
            <option value="hi">🇮🇳 HI</option>
          </select>
          {phase === 'answering' && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: elapsed > 120 ? 'var(--amber)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</div>
          )}
          {phase !== 'intro' && (
            <button onClick={() => setCameraOn(v => !v)}
              style={{ background: cameraOn ? 'none' : 'rgba(239,68,68,0.15)', border: `1px solid ${cameraOn ? 'var(--border)' : 'rgba(239,68,68,0.5)'}`, borderRadius: '8px', padding: '7px 10px', color: cameraOn ? 'var(--text-3)' : '#EF4444', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
              {cameraOn ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><line x1="3" y1="3" x2="21" y2="21"/></svg>
              )}
              {cameraOn ? 'Camera' : 'Cam Off'}
            </button>
          )}
          {phase !== 'intro' && phase !== 'mike' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              {uploadStatus === 'uploading' ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />Saving…</>
              ) : uploadStatus === 'done' ? (
                <><span style={{ color: '#34D399' }}>✓</span><span style={{ color: '#34D399' }}>Saved</span></>
              ) : uploadStatus === 'error' ? (
                <><span>⚠</span>Save failed</>
              ) : isRecording ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />Recording</>
              ) : (
                <><span style={{ color: 'var(--text-3)' }}>⏺</span><span style={{ color: 'var(--text-3)' }}>Standby</span></>
              )}
            </div>
          )}
          {phase !== 'intro' && phase !== 'done' && (
            <button onClick={handlePause} style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '7px 12px', color: '#34D399', fontSize: '12px', cursor: 'pointer' }}>
              ⏸ Pause
            </button>
          )}
          <button onClick={toggleFullscreen} style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(124,58,237,0.14))', border: '1px solid rgba(167,139,250,0.45)', borderRadius: '8px', padding: '7px 14px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            )}
            {isFullscreen ? 'Exit Full' : 'Full Screen'}
          </button>
          <button onClick={() => { uploadRecording(sessionAnswers); closeInterview(sessionAnswers, mcqResults, mcqBonusPoints); }}
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '7px 14px', color: '#34D399', fontSize: '12px', cursor: 'pointer' }}>
            End Session
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--bg3)' }}>
        <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5 }} style={{ height: '100%', background: 'var(--blue)' }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 24px 32px', gap: '20px' }}>

        {/* Sarah + James tiles */}
        <AnimatePresence>
          {showInterviewers && (
            <motion.div key="interviewers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} style={{ display: 'flex', gap: '16px' }}>
              <InterviewerAvatar role="hr" state={hrState} active={hrState === 'speaking'} analyserNode={hrAnalyser} onVideoEnded={() => onDoneRef.current?.()} />
              <InterviewerAvatar role="technical" state={techState} active={techState === 'speaking'} specialistTitle={specialistTitle} analyserNode={techAnalyser} onVideoEnded={() => onDoneRef.current?.()} />
              <YouCamera cameraOn={cameraOn} speaking={phase === 'answering'} onToggle={() => setCameraOn(v => !v)} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="sync">

          {/* ── INTRO ─────────────────────────────────────────────────────── */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.8 }}
              style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', minHeight: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', background: '#000' }}>
              <motion.img src="/images/mastermind-chair.png" alt="" initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 3.5, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 1, width: '100%', padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}
                  style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.8)' }}>
                  Your interview awaits
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.7 }}
                  style={{ fontSize: '26px', fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                  The seat is yours.<br />
                  <span style={{ color: 'rgba(167,139,250,0.9)' }}>Make every answer count.</span>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.6 }}
                  style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(240,244,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '5px 14px' }}>
                    {questions.length} questions · Sarah &amp; James
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: elevenLabsConfigured ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${elevenLabsConfigured ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '20px', padding: '5px 14px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }} />
                    <span style={{ fontSize: '12px', color: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }}>
                      {elevenLabsConfigured ? 'Neural voices ready' : 'Browser voices'}
                    </span>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.5 }}
                  style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'rgba(240,244,255,0.65)', cursor: 'pointer' }}>
                    <input type="radio" checked={useVoice} onChange={() => setUseVoice(true)} style={{ accentColor: '#a78bfa' }} />
                    Speak my answers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'rgba(240,244,255,0.65)', cursor: 'pointer' }}>
                    <input type="radio" checked={!useVoice} onChange={() => setUseVoice(false)} style={{ accentColor: '#a78bfa' }} />
                    Type my answers
                  </label>
                  <button onClick={testAudio} disabled={audioCheckState === 'playing'}
                    style={{ background: 'transparent', border: `1px solid ${audioCheckState === 'done' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: audioCheckState === 'playing' ? 'default' : 'pointer', color: audioCheckState === 'done' ? '#34D399' : 'rgba(240,244,255,0.55)' }}>
                    {audioCheckState === 'done' ? '✓ Audio OK' : audioCheckState === 'playing' ? 'Playing…' : '🔊 Test audio'}
                  </button>
                </motion.div>
                <motion.button onClick={startInterview} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.6, duration: 0.5 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '13px', padding: '15px 48px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em', boxShadow: '0 0 40px rgba(167,139,250,0.35)' }}>
                  Begin Interview →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── MIKE ──────────────────────────────────────────────────────── */}
          {phase === 'mike' && (
            <motion.div key="mike" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '20px' }}>
                Your Recruitment Consultant
              </div>
              <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 20px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
                <img src="/images/mike.png" alt="Mike" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.15, 0.6] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid var(--blue)', pointerEvents: 'none' }} />
              </div>
              <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Mike</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recruitment Consultant</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Speaking…</span>
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
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 28px', color: 'var(--text-2)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Skip Intro →
              </button>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Your interviewers are introducing themselves…</div>
                  </div>
                  <button onClick={() => { cancelSpeakRef.current?.(); setHrState('idle'); setTechState('idle'); askQuestion(0); }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px', flexShrink: 0 }}>
                    Skip Intro →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { icon: '🎙️', text: 'When a question appears, click Record to start your answer' },
                    { icon: '⏹️', text: "Click Stop when you've finished speaking" },
                    { icon: '↩️', text: "Use Repeat if you'd like to hear the question again" },
                    { icon: '⏸️', text: 'Hit Pause anytime you need a moment to collect your thoughts' },
                    { icon: '✨', text: "Speak naturally — take your time and don't worry about being perfect" },
                  ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.55, duration: 0.45, ease: 'easeOut' }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
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
                        <button onClick={repeatQuestion} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: 'var(--blue)', cursor: 'pointer' }}>↩ Repeat</button>
                        <button onClick={handlePause} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#34D399', cursor: 'pointer' }}>⏸ Pause</button>
                        <button onClick={handlePass} style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}>Pass →</button>
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

              {(phase === 'asking' || phase === 'answering') && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                  {/* Left — answer input */}
                  <div style={{ flex: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {useVoice && (
                      <VoiceInput onTranscript={(text, meta) => submitAnswer(text, meta, true)} onInterimTranscript={() => {}} highlightRecord={highlightRecord} />
                    )}
                    <div style={{ flex: 1 }}>
                      {useVoice && <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Or type your answer</div>}
                      <textarea value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} placeholder="Type your answer here…" rows={3}
                        style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.65, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    {typedAnswer.trim() && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => submitAnswer(typedAnswer, undefined, false)}
                          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                          Submit Answer
                        </button>
                      </div>
                    )}
                    {sessionAnswers.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Previous Answers</div>
                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0, paddingRight: '2px' }}>
                          {sessionAnswers.map((sa, i) => {
                            const pct = Math.round(sa.score.overallScore * 100);
                            const sc = pct >= 70 ? '#34D399' : pct >= 50 ? '#F59E0B' : '#EF4444';
                            const passed = sa.answerText === '';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', flexShrink: 0 }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: passed ? 'var(--text-3)' : sc, minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>
                                  {passed ? '—' : <>{pct}<span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-3)' }}>%</span></>}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.5, flex: 1 }}>{sa.question.questionText}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right — session stats */}
                  <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Progress</div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                        {questions.map((_, i) => (
                          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < qIndex ? 'var(--blue)' : i === qIndex ? 'rgba(79,142,247,0.4)' : 'var(--bg3)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Q{qIndex + 1} of {questions.length}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Time on answer</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: elapsed > 120 ? 'var(--amber)' : 'var(--text)' }}>{fmt(elapsed)}</div>
                    </div>
                    {avgScore !== null && (
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Avg score</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: scoreColor }}>{avgScore}%</div>
                      </div>
                    )}
                    <motion.div key={coachingCue} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Coach</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'rgba(167,139,250,0.9)', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '8px', padding: '8px 10px' }}>
                        {coachingCue}
                      </div>
                    </motion.div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Difficulty</div>
                      <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}
                        style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', fontSize: '11px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px', background: selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.12)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.12)' : 'rgba(52,211,153,0.1)', color: selectedDifficulty === 'Expert' ? '#EF4444' : selectedDifficulty === 'Pro' ? '#F59E0B' : '#34D399', border: `1px solid ${selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.3)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.3)' : 'rgba(52,211,153,0.25)'}`, cursor: 'pointer', outline: 'none' }}>
                        <option value="Expert" style={{ background: '#1a1e2e', color: '#EF4444' }}>Expert</option>
                        <option value="Pro" style={{ background: '#1a1e2e', color: '#F59E0B' }}>Pro</option>
                        <option value="Standard" style={{ background: '#1a1e2e', color: '#34D399' }}>Standard</option>
                      </select>
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                      <button onClick={handlePause} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 0', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
                        Pause
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
