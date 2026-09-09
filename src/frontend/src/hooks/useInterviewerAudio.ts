import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarState } from '../components/InterviewerAvatar';
import type { InterviewQuestion } from '../api/explainApi';
import { speak } from '../api/ttsApi';
import { logFlowEvent } from '../api/flowLogger';
import type { ChapterMarker, RoomPhase } from '../pages/interview-room/types';

// ── Multilingual Amina intro fallbacks — used only when no real AI-generated intro landed ──
const SARAH_INTROS: Record<string, string> = {
  en: "Hi — I'm Amina, HR Director. Lovely to have you here. I'll be joined by Wayne, who'll lead the role-specific questions. When each question appears, click the Record button to start your answer, and click Stop when you've finished. You can also use the Repeat button if you'd like to hear a question again, or Pause if you need a moment. Just speak naturally, take your time, and don't worry about being perfect. Ready when you are.",
  fr: "Bonjour — je suis Amina, Directrice des Ressources Humaines. Ravie de vous accueillir. Wayne me rejoindra pour les questions spécifiques au poste. Lorsqu'une question apparaît, cliquez sur Enregistrer pour commencer votre réponse, et sur Stop quand vous avez terminé. Vous pouvez aussi utiliser Répéter pour réécouter une question, ou Pause si vous avez besoin d'un moment. Parlez naturellement, prenez votre temps. Prête quand vous l'êtes.",
  es: "Hola — soy Amina, Directora de Recursos Humanos. Encantada de tenerte aquí. Wayne se unirá para las preguntas específicas del puesto. Cuando aparezca cada pregunta, haz clic en Grabar para comenzar tu respuesta y en Detener cuando hayas terminado. También puedes usar Repetir para escuchar la pregunta de nuevo, o Pausar si necesitas un momento. Habla con naturalidad, tómate tu tiempo. Lista cuando quieras.",
  de: "Hallo — ich bin Amina, HR-Direktorin. Schön, dass Sie hier sind. Wayne wird sich für die rollenspezifischen Fragen zu mir gesellen. Wenn eine Frage erscheint, klicken Sie auf Aufnehmen, um Ihre Antwort zu beginnen, und auf Stopp, wenn Sie fertig sind. Sie können auch Wiederholen verwenden, um eine Frage nochmals zu hören, oder Pause, wenn Sie einen Moment brauchen. Sprechen Sie natürlich, lassen Sie sich Zeit.",
  pt: "Olá — sou Amina, Directora de Recursos Humanos. Prazer em tê-lo aqui. Wayne juntar-se-á a mim para as perguntas específicas da função. Quando cada pergunta aparecer, clique em Gravar para iniciar a sua resposta e em Parar quando terminar. Pode usar Repetir para ouvir novamente uma pergunta, ou Pausar se precisar de um momento. Fale naturalmente, leve o seu tempo.",
  pl: "Cześć — jestem Amina, Dyrektor HR. Miło mieć cię tutaj. Dołączy do mnie Wayne z pytaniami dotyczącymi stanowiska. Gdy pojawi się pytanie, kliknij Nagraj, aby rozpocząć odpowiedź, a Stop gdy skończysz. Możesz też użyć Powtórz, by ponownie usłyszeć pytanie, lub Pauza, jeśli potrzebujesz chwili. Mów naturalnie, nie spiesz się.",
  nl: "Hoi — ik ben Amina, HR-directeur. Fijn dat je er bent. Wayne sluit zich bij me aan voor de functiespecifieke vragen. Als er een vraag verschijnt, klik op Opnemen om te beginnen en op Stop als je klaar bent. Je kunt ook Herhalen gebruiken om een vraag opnieuw te horen, of Pauze als je even nodig hebt. Spreek gewoon, neem de tijd.",
  it: "Ciao — sono Amina, Direttrice delle Risorse Umane. Piacere di averti qui. Wayne si unirà a me per le domande specifiche al ruolo. Quando appare una domanda, clicca Registra per iniziare la risposta e Stop quando hai finito. Puoi usare Ripeti per riascoltare una domanda, o Pausa se hai bisogno di un momento. Parla naturalmente, prenditi il tempo che ti serve.",
  tr: "Merhaba — ben Amina, İK Direktörü. Burada olmanıza sevindik. Wayne, role özel sorular için bana katılacak. Her soru göründüğünde, cevabınıza başlamak için Kayıt düğmesine tıklayın ve bitirdiğinizde Durdur'a tıklayın. Bir soruyu tekrar duymak için Tekrar'ı, bir anlığına durmak için Duraklat'ı kullanabilirsiniz. Doğal konuşun, acele etmeyin.",
  ar: "مرحباً — أنا أمينة، مديرة الموارد البشرية. يسعدنا وجودك معنا. سينضم إليّ واين للأسئلة المتعلقة بالوظيفة. عندما تظهر كل سؤال، انقر على زر التسجيل لبدء إجابتك، وانقر إيقاف عند الانتهاء. يمكنك أيضاً استخدام إعادة لسماع السؤال مرة أخرى، أو إيقاف مؤقت إذا احتجت لحظة. تحدث بشكل طبيعي وخذ وقتك.",
  zh: "您好 — 我是 Amina，人力资源总监。很高兴您能来。Wayne 将加入我进行岗位相关问题的提问。当每道题出现时，请点击录音按钮开始作答，完成后点击停止。如果您想重听题目，可以点击重复；需要暂停时，点击暂停即可。请自然地回答，慢慢来，不必紧张。",
  hi: "नमस्ते — मैं Amina हूँ, HR Director। आपका यहाँ स्वागत है। Wayne मेरे साथ भूमिका-विशिष्ट प्रश्नों के लिए जुड़ेंगे। जब प्रत्येक प्रश्न दिखे, तो Record बटन दबाएं और उत्तर देना शुरू करें, तथा समाप्त होने पर Stop दबाएं। Repeat बटन से प्रश्न फिर सुन सकते हैं, या Pause से थोड़ा रुक सकते हैं। स्वाभाविक रूप से बोलें, समय लें।",
};

const HANDOFF_LINES: Record<'hr' | 'technical', string[]> = {
  hr: ['Wayne, anything you\'d like to add to that?', 'Wayne, did you want to follow up on that one?'],
  technical: ['Amina, do you have anything to add to that?', 'Amina, anything you wanted to dig into there?'],
};

const HANDOFF_ACCEPT_LINES = [
  'Errm, yes — I just wanted to follow up on that.',
  'Yes, actually — one thing I\'d like to know.',
  'I do, actually.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// mike-intro-v1.mp4 (see project-photoreal-intro-avatars-plan memory) was recorded once via
// DeeVid, weeks before Sarah->Wayne->Amina/Wayne — its baked-in audio literally says "Sarah
// and James", which is now flatly wrong. Disabled until a new video is recorded with correct
// names; falls through to the live-TTS + static-photo path (used for every non-English session
// already) instead of leaving a video actively saying the wrong interviewer names. Same
// disabled-not-deleted pattern as MOUTH_OVERLAY_ENABLED elsewhere in this codebase.
export const MIKE_VIDEO_ENABLED = false;

// Mike's fallback script — used if AI hasn't loaded yet (it usually finishes before Mike speaks)
const FALLBACK_MIKE_SCRIPT = `Hi there — I'm Mike, your recruitment consultant. I've set up your interview today and I want to give you a quick briefing before you meet the panel. Your interviewers today are Amina, who heads up HR, and Wayne, who'll be assessing you on the role itself. They'll guide you through everything — just follow Amina's instructions on the controls and you'll be absolutely fine. I'll be here throughout if you need anything. The best thing you can do is be specific: use real examples from your experience. Back yourself — you've got this. Good luck!`;

export interface UseInterviewerAudioParams {
  questions: InterviewQuestion[];
  qIndex: number;
  setPhase: (phase: RoomPhase) => void;
  sessionLanguage: string;
  effectiveSarahIntro?: string;
  effectiveJamesIntro?: string;
  bgMikeScriptRef: React.RefObject<string | null>;
  specialistTitle: string;
  resolvedPreferredName?: string;
  /** The role the candidate is actually interviewing for (e.g. ".NET Programmer") — distinct
   * from specialistTitle, which is Wayne's own interviewer persona title (e.g. "Engineering
   * Manager"). Woven into the fallback intro the same way resolvedPreferredName is, so the
   * candidate hears which role they're being assessed for even when the AI-generated intro
   * hasn't landed yet. */
  jobTitle?: string;
  aiQuestionsLoaded: boolean;
  chapterMarkersRef: React.RefObject<ChapterMarker[]>;
  recordingStartTimeRef: React.RefObject<number>;
  phase2ReadyRef: React.RefObject<boolean>;
  phase2WaitersRef: React.RefObject<Array<() => void>>;
  jobSpecText?: string;
  cvText?: string;
  ctxSelectedLanguage?: string;
  setHighlightRecord: (v: boolean) => void;
  setAudioCheckState: (s: 'idle' | 'playing' | 'done') => void;
  /** LiveAvatar path for Amina's (hr) intro + real interview questions. Follow-up handoffs,
   * Mike's briefing, and the closing line are deliberately untouched for now — still plain
   * speak(). Same (text, onEnd, onAnalyser) => cancelFn contract as ttsApi.ts's speak(), just
   * pre-bound to the 'hr' role and backed by a live avatar session instead of audio-only TTS.
   * Only used when liveAvatarActive is true (the kill switch is on) — askQuestion/
   * beginInterviewIntro silently fall back to the existing speak() path otherwise, so the
   * switch being off (or a slow/failed avatar connection) never blocks or breaks a real
   * interview. */
  liveAvatarSpeak?: (text: string, onEnd: () => void, onAnalyser?: (a: AnalyserNode | null) => void) => () => void;
  liveAvatarActive?: boolean;
  /** Same contract as liveAvatarSpeak, for Wayne's (technical) seat. */
  liveAvatarSpeakTechnical?: (text: string, onEnd: () => void, onAnalyser?: (a: AnalyserNode | null) => void) => () => void;
  liveAvatarActiveTechnical?: boolean;
  /** Raw connect() from useLiveAvatarSession, separate from liveAvatarSpeak's combined
   * connect+speak — fired proactively the instant Mike's intro starts (startMike below),
   * so the WebRTC handshake's several seconds of latency happen during his ~15-30s intro
   * instead of after it. Both idempotent (see useLiveAvatarSession's own connectedRef/
   * connectPromiseRef guards) — calling this here is purely additive warm-up; the later
   * liveAvatarSpeak call in beginInterviewIntro just finds an already-connected session (or
   * awaits the same in-flight promise) instead of starting the handshake from scratch. */
  liveAvatarConnect?: () => Promise<void>;
  /** Same, for Wayne's (technical) seat. */
  liveAvatarConnectTechnical?: () => Promise<void>;
}

export interface UseInterviewerAudioReturn {
  hrState: AvatarState;
  techState: AvatarState;
  hrAnalyser: AnalyserNode | null;
  techAnalyser: AnalyserNode | null;
  sarahIntroVideoActive: boolean;
  /** English only — james-intro-v1.mp4, the generic pre-rendered clip matching Sarah's/Mike's
   * own. Superseded by the live avatar whenever it's active (see liveAvatarActiveTechnical). */
  jamesIntroVideoActive: boolean;
  /** English only — james-idle-v1.mp4, a silent looping "listening" clip that plays under
   * James's slot for as long as Sarah's own intro video is playing (see the state's own
   * declaration for why it's tied 1:1 to sarahIntroVideoActive). */
  jamesAmbientVideoActive: boolean;
  /** sarah-idle-v1.mp4 — a silent looping "listening" clip that plays under Sarah's slot for
   * as long as James is actively speaking a question (live TTS, any language — unlike the
   * other video clips this isn't English-gated, since there's no spoken content to it, just
   * nodding/glancing, so there's no language for it to be wrong in). See the state's own
   * declaration for why it's a plain derived value rather than its own useState. */
  sarahAmbientVideoActive: boolean;
  awaitingHandoff: boolean;
  /** Typed to accept null (not just InterviewerAvatar's own AnalyserNode-only prop shape) so
   * the same handler can also be passed straight to speak()'s onAnalyser callback, which can
   * fire with null — see closeInterview, the one call site outside this hook that reuses it. */
  handleSarahVideoAnalyser: (a: AnalyserNode | null) => void;
  handleJamesVideoAnalyser: (a: AnalyserNode | null) => void;
  handleSarahIntroVideoEnded: () => void;
  handleJamesIntroVideoEnded: () => void;
  /** The one function every interruption point (Skip buttons, question transitions, ending
   * the interview early) must call instead of cancelSpeakRef directly — see its own doc
   * comment below for why. */
  stopAllInterviewerAudio: () => void;
  askQuestion: (index: number, spokenTextOverride?: string, interviewerOverride?: 'hr' | 'technical', questionOverride?: InterviewQuestion) => void;
  repeatQuestion: () => void;
  testAudio: () => void;
  startMike: () => void;
  /** Wired directly as the pre-rendered English Mike video's onEnded in the room's own JSX —
   * the non-English path fires it itself (as speak()'s onEnd) entirely inside this hook. */
  handleMikeIntroDone: () => void;
  /** beginInterviewIntro itself is never called directly outside this hook (only via this
   * always-fresh ref, from the Skip-Mike's-intro button) — exposing the function itself would
   * invite the exact stale-closure bug the ref exists to dodge. */
  beginInterviewIntroRef: React.RefObject<() => void>;
  askFollowUpWithHandoff: (index: number, question: InterviewQuestion, followUpText: string, originalInterviewer: 'hr' | 'technical') => void;
  /** Still read directly by the orchestrator in a few places (submitAnswer's think-time
   * computation, handlePass, closeInterview/nextQuestion/resumeAfterMCQ's own cancelSpeakRef
   * calls before navigating away) — exposed rather than duplicated. */
  cancelSpeakRef: React.RefObject<(() => void) | null>;
  thinkStartRef: React.RefObject<number>;
  /** Read directly by the room's JSX as InterviewerAvatar's onVideoEnded fallback — always
   * null in practice today (nothing ever assigns it), preserved as-is rather than removed,
   * since that's a pre-existing behavior this extraction shouldn't change. */
  onDoneRef: React.RefObject<(() => void) | null>;
  /** Exposed rather than wrapped in more single-purpose functions — a few orchestrator sites
   * (submitAnswer's "thinking" state, the interviewer-intro Skip button, closeInterview's
   * goodbye line) need to drive the avatar state directly for reasons that are genuinely
   * orchestrator-owned, not interviewer-audio-owned. React guarantees these setters are
   * stable across renders, so exposing them doesn't create any extra re-render risk. */
  setHrState: (s: AvatarState) => void;
  setTechState: (s: AvatarState) => void;
}

export function useInterviewerAudio(params: UseInterviewerAudioParams): UseInterviewerAudioReturn {
  const {
    questions, qIndex, setPhase, sessionLanguage,
    effectiveSarahIntro, effectiveJamesIntro, bgMikeScriptRef, specialistTitle,
    resolvedPreferredName, jobTitle, aiQuestionsLoaded,
    chapterMarkersRef, recordingStartTimeRef,
    phase2ReadyRef, phase2WaitersRef,
    jobSpecText, cvText, ctxSelectedLanguage, setHighlightRecord, setAudioCheckState,
    liveAvatarSpeak, liveAvatarActive, liveAvatarSpeakTechnical, liveAvatarActiveTechnical,
    liveAvatarConnect, liveAvatarConnectTechnical,
  } = params;

  const [hrState, setHrState] = useState<AvatarState>('idle');
  const [techState, setTechState] = useState<AvatarState>('idle');
  const [hrAnalyser, setHrAnalyser] = useState<AnalyserNode | null>(null);
  const [techAnalyser, setTechAnalyser] = useState<AnalyserNode | null>(null);

  // English only: sarah-idle-v1.mp4 — a silent, looping "listening" clip (nods, glances)
  // that plays under Sarah's static slot for as long as James is actively speaking. Unlike
  // James's own ambient clip above (tied to a fixed-length video's start/end), this is a
  // pure derivation of state that already toggles correctly everywhere James speaks a
  // question (askQuestion, askFollowUpWithHandoff, Go Deeper) — no separate on/off wiring
  // needed, and no entry in stopAllInterviewerAudio either, since there's nothing to "stop":
  // the moment hrState/techState change away from this combination (candidate's turn to
  // answer, question over, interview paused/skipped, whatever), this naturally goes false.
  const sarahAmbientVideoActive = hrState === 'listening' && techState === 'speaking';
  // Stable reference — InterviewerAvatar's video-analyser effect depends on this prop, and
  // setHrAnalyser itself is already stable (React guarantees state setters never change), so
  // wrapping it here (rather than passing an inline arrow at the JSX call site) stops that
  // effect re-running on every re-render while the video plays. It was re-running before:
  // createMediaElementSource can only be called once per <video> element, so each rebuild
  // threw (silently, inside a try/catch) after having already rewired the element's audio
  // output — closing the AudioContext on cleanup then froze the video mid-playback.
  const handleSarahVideoAnalyser = useCallback((a: AnalyserNode | null) => setHrAnalyser(a), []);
  const handleJamesVideoAnalyser = useCallback((a: AnalyserNode | null) => setTechAnalyser(a), []);

  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const thinkStartRef = useRef<number>(0);
  const onDoneRef = useRef<(() => void) | null>(null);

  // spokenTextOverride lets a follow-up prepend a natural transition line ("Mm, one more
  // thing—") to what's actually said aloud, while the stored question.questionText (used
  // for scoring/display) stays the clean follow-up text. questionOverride lets a caller pass
  // a just-spliced question directly — bgQuestions/questions won't reflect a splice until
  // next render, so a same-tick lookup by index would see stale (or missing) data.
  const askQuestion = useCallback((index: number, spokenTextOverride?: string, interviewerOverride?: 'hr' | 'technical', questionOverride?: InterviewQuestion) => {
    const question = questionOverride ?? questions[index];
    if (!question) return;
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
    const spokenText = spokenTextOverride ?? question.questionText;
    if (interviewer === 'hr' && liveAvatarActive && liveAvatarSpeak) {
      cancelSpeakRef.current = liveAvatarSpeak(spokenText, onDone, (a) => setHrAnalyser(a));
    } else if (interviewer === 'technical' && liveAvatarActiveTechnical && liveAvatarSpeakTechnical) {
      cancelSpeakRef.current = liveAvatarSpeakTechnical(spokenText, onDone, (a) => setTechAnalyser(a));
    } else {
      cancelSpeakRef.current = speak(spokenText, interviewer, onDone, (a) => {
        if (interviewer === 'hr') setHrAnalyser(a);
        else setTechAnalyser(a);
      });
    }
  }, [questions, setPhase, chapterMarkersRef, recordingStartTimeRef, liveAvatarSpeak, liveAvatarActive, liveAvatarSpeakTechnical, liveAvatarActiveTechnical]);

  // Always-fresh reference to askQuestion — needed by finishJamesIntro below, which lives
  // inside beginInterviewIntro's body. That body is guarded to run exactly once per session
  // (introStartedRef), so whatever askQuestion closure it captured is frozen for the rest of
  // the session even after the real AI-generated questions replace the fallback set moments
  // later — the exact "spoken question doesn't match the displayed one" bug Francis hit live.
  // Calling askQuestionRef.current(...) instead of the closed-over askQuestion sidesteps this
  // regardless of timing, the same way beginInterviewIntroRef/startMikeRef already do for
  // their own functions elsewhere in this file.
  const askQuestionRef = useRef(askQuestion);
  useEffect(() => { askQuestionRef.current = askQuestion; }, [askQuestion]);

  const repeatQuestion = useCallback(() => {
    cancelSpeakRef.current?.();
    askQuestion(qIndex);
  }, [qIndex, askQuestion]);

  const testAudio = useCallback(() => {
    setAudioCheckState('playing');
    speak("Hi there! I'm Amina, your HR interviewer.", 'hr', () => {
      speak("And I'm Wayne. Great — you can hear us both clearly!", 'technical', () => setAudioCheckState('done'));
    });
  }, [setAudioCheckState]);

  const introStartedRef = useRef(false);

  // English only: sarah-intro-v1.mp4 replaces her live-TTS intro with the same real
  // pre-rendered clip Mike uses (see startMike below) — set true only for the duration of
  // her intro line, cleared again before she starts asking real questions (those are
  // per-candidate and can't be pre-rendered, so she reverts to the static photo).
  const [sarahIntroVideoActive, setSarahIntroVideoActive] = useState(false);
  const sarahIntroDoneRef = useRef<() => void>(() => {});
  const handleSarahIntroVideoEnded = useCallback(() => { sarahIntroDoneRef.current(); }, []);

  // English, no Name Bank hit: james-intro-v1.mp4 — the generic pre-rendered clip matching
  // Sarah's/Mike's own, filling the gap a personalised clip would otherwise leave (static
  // photo + live TTS). Same shape as sarahIntroVideoActive above.
  const [jamesIntroVideoActive, setJamesIntroVideoActive] = useState(false);
  const jamesIntroDoneRef = useRef<() => void>(() => {});
  const handleJamesIntroVideoEnded = useCallback(() => {
    setJamesIntroVideoActive(false);
    jamesIntroDoneRef.current();
  }, []);

  // English only: james-idle-v1.mp4 — a silent, looping "listening" clip (nods, glances)
  // that plays under James's static slot for as long as Sarah's own intro video is playing,
  // so he doesn't just sit frozen on his photo while she talks. Turned on/off in lockstep
  // with sarahIntroVideoActive below — never active at the same time as either of James's
  // own speaking clips (Name Bank greeting, his generic intro), which take over the instant
  // Sarah's video ends. No onEnded/done-ref needed: it's purely decorative, doesn't drive
  // any phase transition, and native `loop` means the video's 'ended' event never fires.
  const [jamesAmbientVideoActive, setJamesAmbientVideoActive] = useState(false);

  // Single place that knows about every audio source this room can have active at once —
  // live TTS (cancelSpeakRef) AND every pre-rendered video clip (Sarah's intro, James's
  // generic intro), which each carry their own embedded audio and were added later without
  // the original "skip"/"interrupt" points ever being updated to know about them. Calling
  // cancelSpeakRef alone (the old behaviour) left a still-playing video's audio running
  // underneath whatever started next — that's the "2-3 voices at once" bug. Every
  // interruption point (Skip buttons, question transitions, ending the interview early)
  // should call this instead of cancelSpeakRef directly. Any new video-active flag added to
  // this hook must be added here too.
  const stopAllInterviewerAudio = useCallback(() => {
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    setSarahIntroVideoActive(false);
    setJamesIntroVideoActive(false);
    setJamesAmbientVideoActive(false);
  }, []);

  const beginInterviewIntro = useCallback(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    setPhase('interviewer-intro');
    // Chapter marker for the same reason as Mike's above — one combined entry for both
    // Amina's and Wayne's intro lines, since they play back to back with no natural split.
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({
        questionIndex: -1,
        questionText: "Amina & Wayne's Introduction",
        competency: '',
        offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
      });
    }
    logFlowEvent('INTERVIEW_PHASE_STARTED', {
      questionCount: questions.length,
      aiQuestionsLoaded,
      specialistTitle,
    });
    setTimeout(() => {
      setHrState('speaking');
      // The candidate's name is ours to insert regardless of whether the real AI-generated
      // intro (which already names them, per its own prompt rules) landed in time — the
      // fallback text is entirely our own copy, so there's no reason it has to be name-less
      // just because a slow generation call timed out. Only prepended when falling back
      // (effectiveSarahIntro/effectiveJamesIntro absent) — the AI version already handles
      // this itself, prepending here too would say the name twice.
      const namePrefix = resolvedPreferredName ? `${resolvedPreferredName} — ` : '';
      const sarahText = effectiveSarahIntro ?? `${namePrefix}${SARAH_INTROS[sessionLanguage] ?? SARAH_INTROS.en}`;
      // Pulse the Record button ~8s in — when Sarah says "click the Record button"
      const pulseOuter = setTimeout(() => {
        setHighlightRecord(true);
        setTimeout(() => setHighlightRecord(false), 6000);
      }, 8000);
      // Job title, same reasoning as namePrefix above — ours to insert regardless of whether
      // the AI-generated version (which mentions it via its own prompt) landed in time. Lives
      // on Wayne's line specifically rather than Amina's, so the role only gets said once
      // across both intros, and because he's already the role-specific interviewer (see
      // specialistTitle's own pairing with him in the UI).
      const jobTitlePhrase = jobTitle?.trim() ? ` for the ${jobTitle.trim()} role` : '';
      const jamesText = effectiveJamesIntro ??
        `${namePrefix}And I'm Wayne — looking forward to hearing about your experience${jobTitlePhrase}. Let's get started.`;

      const afterSarahIntro = () => {
        clearTimeout(pulseOuter);
        setHighlightRecord(false);
        // 'listening' (not 'idle') — Wayne is about to introduce himself, and this is exactly
        // the hrState==='listening' && techState==='speaking' combination sarahAmbientVideoActive
        // already watches for, so her idle loop now covers his intro moment too, not just his
        // later interview questions, for free — no separate on/off wiring needed here.
        setHrState('listening');
        setSarahIntroVideoActive(false);
        setJamesAmbientVideoActive(false);
        setTechState('speaking');

        const finishJamesIntro = () => {
          setTechState('idle');
          setTimeout(() => askQuestionRef.current(0), 500);
        };

        if (liveAvatarActiveTechnical && liveAvatarSpeakTechnical) {
          // Wayne's full presence — intro included, not just his questions — prefers the live
          // avatar, same as Amina's above. Falls through to the pre-existing paths below only
          // if his live avatar isn't active at all.
          cancelSpeakRef.current = liveAvatarSpeakTechnical(jamesText, finishJamesIntro, (a) => setTechAnalyser(a));
        } else if (sessionLanguage === 'en') {
          jamesIntroDoneRef.current = finishJamesIntro;
          setJamesIntroVideoActive(true);
        } else {
          cancelSpeakRef.current = speak(jamesText, 'technical', finishJamesIntro, (a) => setTechAnalyser(a));
        }
      };

      // James's ambient idle loop plays under his slot for as long as Sarah's own intro is
      // being delivered, however that happens — true regardless of which of the three paths
      // below actually speaks it.
      setJamesAmbientVideoActive(true);

      if (liveAvatarActive && liveAvatarSpeak) {
        // Sarah's full presence — intro included, not just her questions — now prefers the
        // live avatar. This is also the earliest point in the whole session where connecting
        // makes sense: liveAvatarSpeak connects lazily on first use, so triggering it here
        // (her first line) rather than at her first *question* (after the full Mike + intro
        // sequence) front-loads the connection's few seconds of latency onto the most
        // tolerable possible moment, instead of a mid-interview question. Falls through to
        // the pre-existing paths below only if the live avatar isn't active at all.
        cancelSpeakRef.current = liveAvatarSpeak(sarahText, afterSarahIntro, (a) => setHrAnalyser(a));
      } else if (sessionLanguage === 'en') {
        sarahIntroDoneRef.current = afterSarahIntro;
        setSarahIntroVideoActive(true);
      } else {
        cancelSpeakRef.current = speak(sarahText, 'hr', afterSarahIntro, (a) => setHrAnalyser(a));
      }
    }, 600);
  }, [effectiveSarahIntro, effectiveJamesIntro, questions.length, specialistTitle, sessionLanguage, aiQuestionsLoaded, setPhase, chapterMarkersRef, recordingStartTimeRef, setHighlightRecord, liveAvatarSpeak, liveAvatarActive, liveAvatarSpeakTechnical, liveAvatarActiveTechnical, resolvedPreferredName, jobTitle]);

  const beginInterviewIntroRef = useRef(beginInterviewIntro);
  useEffect(() => { beginInterviewIntroRef.current = beginInterviewIntro; }, [beginInterviewIntro]);

  // Always hold a ref to the latest startMike so session-prep waiters call the right version
  const startMikeRef = useRef<() => void>(() => {});

  // True for the (usually brief, occasionally not) window between Mike finishing his line
  // and Sarah/James actually appearing — Mike's video/photo has nothing of its own to show
  // for this gap (his clip just freezes on its last frame, mouth mid-word), so this drives a
  // real "thinking" indicator instead of leaving the screen looking frozen/broken.
  const [awaitingHandoff, setAwaitingHandoff] = useState(false);

  // Fires once Mike's intro is over, whichever path produced that (real TTS via speak(),
  // or the pre-rendered English video's onEnded, wired in the room's own JSX) — same
  // completion logic either way.
  const handleMikeIntroDone = useCallback(() => {
    cancelSpeakRef.current = null;
    setAwaitingHandoff(true);
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
  }, [phase2ReadyRef, phase2WaitersRef]);

  const startMike = useCallback(() => {
    setPhase('mike');
    // Warm-start Amina and Wayne's LiveAvatar sessions the instant Mike begins talking, not
    // when it's actually their turn to speak (previously: not until beginInterviewIntro,
    // i.e. after his entire intro finishes) — front-loads the WebRTC handshake's several
    // seconds of latency onto his ~15-30s intro window instead of a dead-air gap after it.
    // Fire-and-forget: a connection failure here is silently absorbed by the real speak()
    // call's own connect-if-needed + fallback-to-TTS logic later, exactly as before this
    // existed — this is pure warm-up, nothing here is on the critical path.
    if (liveAvatarActive) void liveAvatarConnect?.().catch(() => {});
    if (liveAvatarActiveTechnical) void liveAvatarConnectTechnical?.().catch(() => {});
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
    logFlowEvent('MIKE_INTRO_STARTED', { hasJobSpec: Boolean(jobSpecText), hasCv: Boolean(cvText), selectedLanguage: ctxSelectedLanguage });
    // English, when MIKE_VIDEO_ENABLED: mike-intro-v1.mp4 (real lip-synced video) plays
    // instead, wired in the room's own JSX; its own onEnded calls handleMikeIntroDone
    // directly, no TTS needed. Currently disabled (see MIKE_VIDEO_ENABLED's own comment) —
    // every language runs the live-TTS + static-photo path below for now.
    if (sessionLanguage !== 'en' || !MIKE_VIDEO_ENABLED) {
      cancelSpeakRef.current = speak(bgMikeScriptRef.current ?? FALLBACK_MIKE_SCRIPT, 'technical', handleMikeIntroDone, (a) => setTechAnalyser(a));
    }
  }, [jobSpecText, cvText, ctxSelectedLanguage, sessionLanguage, handleMikeIntroDone, setPhase, chapterMarkersRef, recordingStartTimeRef, bgMikeScriptRef, liveAvatarActive, liveAvatarConnect, liveAvatarActiveTechnical, liveAvatarConnectTechnical]);

  useEffect(() => { startMikeRef.current = startMike; }, [startMike]);

  useEffect(() => {
    return () => { cancelSpeakRef.current?.(); };
  }, []);

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
  }, [setPhase, chapterMarkersRef, recordingStartTimeRef]);

  return {
    hrState, techState, hrAnalyser, techAnalyser,
    sarahIntroVideoActive, jamesIntroVideoActive, jamesAmbientVideoActive, sarahAmbientVideoActive, awaitingHandoff,
    handleSarahVideoAnalyser, handleJamesVideoAnalyser,
    handleSarahIntroVideoEnded, handleJamesIntroVideoEnded,
    stopAllInterviewerAudio,
    askQuestion, repeatQuestion, testAudio, startMike, handleMikeIntroDone,
    beginInterviewIntroRef,
    askFollowUpWithHandoff,
    cancelSpeakRef, thinkStartRef, onDoneRef,
    setHrState, setTechState,
  };
}
