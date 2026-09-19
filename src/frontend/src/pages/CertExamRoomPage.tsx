import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../auth/authStore';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { getExamCatalogEntry, ensureExamBlueprint, type ExamCatalogEntry } from '../api/examCatalogApi';
import { generateExamQuestions, computeScaledScore, saveCertExamSession, type ExamQuestion } from '../api/certExamApi';
import { ExamQuestionCard } from '../components/ExamQuestionCard';
import { logFlowEvent } from '../api/flowLogger';

interface IncomingState {
  certId?: string;
  questionCount?: number;
  preferredName?: string;
}

type Phase = 'briefing' | 'generating' | 'exam' | 'saving';
// 'preparing' = a stub entry with no blueprint yet, being generated on demand (a few seconds, one-off).
type CertLoadState = 'loading' | 'preparing' | 'ready' | 'not-found' | 'not-ready';

// Deliberately NOT copy-trimmed from InterviewRoomPage.tsx — that machinery is built around
// concurrent Sarah/James-style HR+technical avatar handoffs with real regression history (see
// project-liveavatar-lipsync-investigation memory). A pure-MCQ exam needs none of that: one
// avatar, one briefing line, then a plain question loop. Built fresh and small on purpose.
export default function CertExamRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { examId } = useParams<{ examId: string }>();
  const incoming = (location.state as IncomingState | null) ?? {};
  const certId = examId ?? incoming.certId ?? '';
  const questionCount = incoming.questionCount ?? 30;

  const authUser = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);
  const preferredName = incoming.preferredName || authUser?.firstName?.trim() || undefined;

  const [cert, setCert] = useState<ExamCatalogEntry | null>(null);
  const [certLoadState, setCertLoadState] = useState<CertLoadState>('loading');

  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    if (!certId) { setCertLoadState('not-found'); return; }
    let cancelled = false;
    setCertLoadState('loading');
    getExamCatalogEntry(certId).then(async entry => {
      if (cancelled) return;
      if (!entry) { setCertLoadState('not-found'); return; }
      if (entry.domains.length === 0) {
        // A stub — draft its blueprint now instead of dead-ending (2026-09-19). Saved into the
        // catalog server-side, so this only ever costs anything for the first person to pick it.
        setCertLoadState('preparing');
        const prepared = await ensureExamBlueprint(certId);
        if (cancelled) return;
        if (!prepared || prepared.domains.length === 0) { setCertLoadState('not-ready'); return; }
        setCert(prepared);
        setCertLoadState('ready');
        return;
      }
      setCert(entry);
      setCertLoadState('ready');
    });
    return () => { cancelled = true; };
  }, [certId, loadAttempt]);

  const [phase, setPhase] = useState<Phase>('briefing');
  const liveAvatarMichelle = useLiveAvatarSession('michelle');

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: ExamQuestion; selectedIndex: number }[]>([]);
  const briefingStartedRef = useRef(false);

  const startBriefing = useCallback(async () => {
    if (!cert || briefingStartedRef.current) return;
    briefingStartedRef.current = true;
    logFlowEvent('CERT_EXAM_BRIEFING_STARTED', { certId: cert.id });

    // Kick question generation off now, in parallel with the spoken briefing, instead of
    // waiting until she finishes — by the time she's done talking, the first questions are
    // usually already back.
    const questionsPromise = generateExamQuestions(cert, questionCount);

    const name = preferredName ? `${preferredName}, ` : '';
    const briefingText = `${name}I'm Michelle. You're about to take a mock ${cert.name} exam — ${questionCount} questions, all multiple choice, just like the real thing. Take your time, read each question carefully, and remember: this is practice, so there's no pressure. Good luck.`;

    try {
      await liveAvatarMichelle.connect();
      await liveAvatarMichelle.speak(briefingText, 'michelle');
    } catch (err) {
      console.error('[CertExamRoom] Michelle briefing failed, continuing without avatar:', err);
    } finally {
      // Disconnect the instant the briefing ends, before the MCQ loop starts — same
      // billed-per-connected-minute discipline as everywhere else LiveAvatar is used; there's
      // no reason to hold a live avatar session open for a 15-60 question exam.
      void liveAvatarMichelle.disconnect();
    }

    setPhase('generating');
    const generated = await questionsPromise;
    setQuestions(generated);
    setPhase('exam');
    logFlowEvent('CERT_EXAM_QUESTIONS_READY', { certId: cert.id, count: generated.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once, deliberately not
    // re-run on every liveAvatarMichelle identity change (it's not memoised).
  }, [cert, questionCount, preferredName]);

  useEffect(() => { void startBriefing(); }, [startBriefing]);

  // Michelle's session is per-page, not shared with any other room — always tear it down if the
  // candidate navigates away mid-briefing, same as every other LiveAvatar use in this codebase.
  useEffect(() => {
    return () => { void liveAvatarMichelle.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback(async (selectedIndex: number) => {
    const question = questions[qIndex];
    const nextAnswers = [...answers, { question, selectedIndex }];
    setAnswers(nextAnswers);

    if (qIndex + 1 < questions.length) {
      setQIndex(i => i + 1);
      return;
    }

    // Last question — score, save, and move on.
    if (!cert) return;
    setPhase('saving');
    const result = computeScaledScore(cert, nextAnswers);
    logFlowEvent('CERT_EXAM_COMPLETED', { certId: cert.id, passed: result.passed, scaledScore: result.scaledScore });

    const sessionId = crypto.randomUUID();
    try {
      if (authToken) {
        await saveCertExamSession(authToken, {
          id: sessionId,
          certId: cert.id,
          certName: cert.name,
          passed: result.passed,
          scaledScore: result.scaledScore,
          maxScore: result.maxScore,
          createdAt: new Date().toISOString(),
          sessionData: {
            answers: nextAnswers, domainAccuracy: result.domainAccuracy, candidateName: authUser?.name,
            gradeLabel: result.gradeLabel, blueprintStatus: cert.blueprintStatus,
          },
        });
      }
    } catch (err) {
      console.error('[CertExamRoom] Failed to save session, continuing to summary anyway:', err);
    }

    navigate(`/cert-exam-summary/${sessionId}`, {
      state: {
        certId: cert.id, certName: cert.name, passed: result.passed,
        scaledScore: result.scaledScore, maxScore: result.maxScore,
        gradeLabel: result.gradeLabel, blueprintStatus: cert.blueprintStatus,
        answers: nextAnswers, domainAccuracy: result.domainAccuracy,
      },
    });
  }, [answers, qIndex, questions, cert, authToken, authUser, navigate]);

  if (certLoadState === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-2)' }}>
        Loading your exam…
      </div>
    );
  }

  if (certLoadState === 'preparing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-2)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(79,142,247,0.25)', borderTopColor: 'var(--blue)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Building your exam…</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            We're setting up the content areas for this exam for the first time. It only takes a few seconds and only happens once.
          </div>
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>
            {certLoadState === 'not-ready'
              ? "We couldn't get this exam ready just now. Please try again in a moment, or pick another exam."
              : "That certification or exam isn't available yet."}
          </p>
          {certLoadState === 'not-ready' && (
            <button onClick={() => setLoadAttempt(n => n + 1)} style={{ background: 'transparent', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', marginRight: 10, marginBottom: 10 }}>
              Try again
            </button>
          )}
          <button onClick={() => navigate('/cert-exam/start')} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}>
            Back to picker
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {cert.blueprintStatus === 'ai-draft' && (
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: 560, width: 'calc(100% - 32px)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '8px 14px', fontSize: 12, lineHeight: 1.5, color: '#fbbf24', textAlign: 'center' }}>
          AI-drafted practice exam — the topic areas may differ from the official specification. Practice only, not an official paper.
        </div>
      )}
      <AnimatePresence mode="wait">
        {(phase === 'briefing' || phase === 'generating') && (
          <motion.div key="briefing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', margin: '0 auto 20px', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
              <img src="/images/michelle-static-avatar.png" alt="Michelle" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <video ref={liveAvatarMichelle.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <motion.div
                animate={{ scale: [1, 1.03, 1], opacity: [0.6, 0.15, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                style={{ position: 'absolute', inset: -8, borderRadius: '20px', border: '2px solid var(--blue)', pointerEvents: 'none' }}
              />
              {/* HeyGen's cold-start handshake can take 30-40s — the pulsing border ring alone
                  wasn't a clear enough "something is happening" signal (live-reported: "she's
                  just staring at me"). A real spinner + explicit copy while not yet connected,
                  swapped out the instant her session goes live. */}
              {liveAvatarMichelle.status !== 'connected' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,20,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(79,142,247,0.25)', borderTopColor: 'var(--blue)' }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Connecting you to Michelle…</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>Michelle</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              {liveAvatarMichelle.status !== 'connected'
                ? 'Setting up your live briefing — this can take up to a minute…'
                : phase === 'briefing' ? 'Briefing you on your mock exam…' : 'Preparing your questions…'}
            </div>
          </motion.div>
        )}

        {phase === 'exam' && questions[qIndex] && (
          <ExamQuestionCard
            key={qIndex}
            question={questions[qIndex]}
            index={qIndex}
            total={questions.length}
            onAnswer={handleAnswer}
            examId={cert.id}
          />
        )}

        {phase === 'saving' && (
          <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Scoring your exam…
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
