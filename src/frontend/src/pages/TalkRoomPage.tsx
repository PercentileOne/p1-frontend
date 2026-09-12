import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar, PROFILES, WaveformBars } from '../components/InterviewerAvatar';
import { YouCamera } from '../components/YouCamera';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { useTalkAvatars } from '../hooks/useTalkAvatars';
import { useTalkTranscript } from '../hooks/useTalkTranscript';
import { scoreTalk, uploadTalk, type TalkScoreResult } from '../api/talksApi';
import { useAuthStore } from '../auth/authStore';

type TalkPhase = 'intro' | 'mike-prep' | 'wayne-tips' | 'talk' | 'scoring' | 'done';

interface IncomingState {
  subject?: string;
  isPersonalStory?: boolean;
  targetDurationSeconds?: number;
  preferredName?: string;
  selectedLanguage?: string;
  consentToRecord?: boolean;
  notesFiles?: File[];
}

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Candidate-portal "My Talks" live room — sibling to InterviewRoomPage.tsx, deliberately NOT
// built on top of it: no questions, no per-turn scoring, no MCQ/Go Deeper. Reuses the pieces
// that generalize cleanly (useLiveAvatarSession as-is, the same InterviewerAvatar/PROFILES/
// YouCamera rendering) and gives the talk-specific parts (avatar orchestration, transcript,
// scoring) their own small hooks instead of forcing this shape into useInterviewerAudio/
// useAnswerScoring, which are both built around a Q&A flow.
//
// Video recording is deliberately NOT wired up yet: useInterviewRecording's uploadRecording()
// hardcodes interview-shaped metadata and POSTs to /api/interviews/upload — reusing it as-is
// would silently write bogus documents into the wrong Cosmos container. Capturing/uploading a
// talk recording needs its own small, dedicated extraction of just the getDisplayMedia/canvas
// capture mechanics (no interview-specific upload logic) as deliberate follow-up work, not a
// rushed change to that shared hook. Transcript + scoring + save all work correctly without it.
export default function TalkRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state ?? {}) as IncomingState;
  const authUser = useAuthStore(s => s.user);

  useEffect(() => {
    if (!incoming.subject) navigate('/talk-pack/start', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subject = incoming.subject ?? '';
  const isPersonalStory = incoming.isPersonalStory ?? false;
  const targetDurationSeconds = incoming.targetDurationSeconds ?? 180;
  const resolvedPreferredName = incoming.preferredName || authUser?.firstName;
  // incoming.consentToRecord isn't read yet — no video capture exists in this pass (see this
  // file's own top comment); it'll gate the future recording start once that's built.

  const [phase, setPhase] = useState<TalkPhase>('intro');
  const [cameraOn, setCameraOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scoringError, setScoringError] = useState(false);
  const [noteIndex, setNoteIndex] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  // Stable id for this talk session — becomes the Cosmos document id, same role interviewIdRef
  // plays in useInterviewRecording.
  const talkIdRef = useRef<string>(crypto.randomUUID());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const notesFiles = incoming.notesFiles ?? [];
  // Object URLs are display-only and entirely client-side — see TalkPackStart's own comment
  // on why these never touch the backend.
  const noteUrls = useMemo(() => notesFiles.map(f => URL.createObjectURL(f)), [notesFiles]);
  useEffect(() => () => { noteUrls.forEach(u => URL.revokeObjectURL(u)); }, [noteUrls]);

  const [hrAnalyser, setHrAnalyser] = useState<AnalyserNode | null>(null);
  const [techAnalyser, setTechAnalyser] = useState<AnalyserNode | null>(null);
  const liveAvatarHr = useLiveAvatarSession('hr', setHrAnalyser);
  const liveAvatarTechnical = useLiveAvatarSession('technical', setTechAnalyser);

  const talkAvatars = useTalkAvatars({
    liveAvatarHr, liveAvatarTechnical,
    onHrAnalyser: setHrAnalyser, onTechAnalyser: setTechAnalyser,
    resolvedPreferredName, subject, isPersonalStory,
  });

  const transcript = useTalkTranscript();

  // Timer — counts UP toward the target; Time Management scoring compares this to the target
  // rather than gating anything live, so a candidate running slightly over isn't cut off mid-word.
  useEffect(() => {
    if (phase === 'talk' && !paused) {
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, paused]);

  const beginTalk = useCallback(() => {
    setPhase('mike-prep');
    talkAvatars.startMikePrep(() => {
      setPhase('wayne-tips');
      void talkAvatars.startAminaAndWayneTips(() => {
        setPhase('talk');
        setElapsed(0);
        talkAvatars.beginTalkPresence();
        transcript.start(incoming.selectedLanguage ?? 'en');
      });
    });
  }, [talkAvatars, transcript, incoming.selectedLanguage]);

  const finishTalk = useCallback(async () => {
    talkAvatars.endTalkPresence();
    const finalTranscript = transcript.stop();
    setPhase('scoring');

    let result: TalkScoreResult | null = null;
    try {
      result = await scoreTalk(subject, finalTranscript, elapsed, targetDurationSeconds, isPersonalStory);
    } catch {
      setScoringError(true);
    }

    // No video yet (see this file's own top comment) — every talk still saves its transcript
    // and scores regardless of the consentToRecord toggle, which currently has nothing to gate.
    try {
      await uploadTalk({
        talkId: talkIdRef.current,
        candidateId: authUser?.id ?? '',
        subject, isPersonalStory, transcript: finalTranscript,
        durationSeconds: elapsed, targetDurationSeconds,
        overallScore: result?.overall ?? 0,
        scoreResult: result,
      }, null);
    } catch { /* best-effort — the summary page falls back to route state if this fails */ }

    talkAvatars.giveOutro(result?.overall ?? null, () => {
      setPhase('done');
      navigate(`/talk-summary/${talkIdRef.current}`, {
        state: { subject, scoreResult: result, transcript: finalTranscript, durationSeconds: elapsed, targetDurationSeconds },
      });
    });
  }, [talkAvatars, transcript, subject, elapsed, targetDurationSeconds, isPersonalStory, authUser, navigate]);

  // Always-fresh ref, not a direct dependency — useTalkAvatars returns a brand-new object
  // literal every render (its own hrState/techState legitimately change constantly while an
  // avatar is speaking), so `[talkAvatars]` as a dependency array made this cleanup fire after
  // EVERY re-render, not just true unmount — interrupting both avatar sessions moments after
  // connect() had been kicked off, before the handshake even finished, which is exactly what
  // crashed the page (found live 2026-09-12). Same idiom already used elsewhere in this
  // codebase (askQuestionRef, beginInterviewIntroRef) for the same class of stale-closure risk.
  const talkAvatarsRef = useRef(talkAvatars);
  useEffect(() => { talkAvatarsRef.current = talkAvatars; });
  useEffect(() => () => { talkAvatarsRef.current.stopAll(); }, []);

  const showAvatars = phase !== 'intro';
  const progress = Math.min(1, elapsed / targetDurationSeconds);
  const overTarget = elapsed > targetDurationSeconds;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system,"Segoe UI",sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>🎤 {subject}</div>
        {phase === 'talk' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: overTarget ? '#f59e0b' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMmSs(elapsed)} / {formatMmSs(targetDurationSeconds)}
            </div>
            <button onClick={() => setPaused(p => !p)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 14px', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={() => void finishTalk()} style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '6px 14px', color: '#34D399', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              End Talk
            </button>
          </div>
        )}
      </div>

      {phase === 'talk' && (
        <div style={{ height: '2px', background: 'var(--bg3)' }}>
          <motion.div animate={{ width: `${progress * 100}%` }} style={{ height: '100%', background: overTarget ? '#f59e0b' : 'var(--blue)' }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px', width: '100%', margin: '0 auto', padding: '24px', gap: '20px' }}>

        {phase === 'intro' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px' }}>Ready when you are</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '32px' }}>
              Mike will brief you, then Amina and Wayne will be right there the whole time.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <YouCamera cameraOn={cameraOn} onToggle={() => setCameraOn(v => !v)} width={320} height={240} />
            </div>
            <button onClick={beginTalk} style={{ background: 'linear-gradient(135deg, var(--blue), #a78bfa)', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px 40px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}>
              Begin Talk →
            </button>
          </div>
        )}

        {phase === 'mike-prep' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <img src="/images/mike.png" alt="Mike" style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', marginBottom: '20px' }} />
            <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Mike is briefing you…</div>
          </div>
        )}

        <AnimatePresence>
          {showAvatars && phase !== 'mike-prep' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '16px' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', aspectRatio: '4/3' }}>
                <InterviewerAvatar role="hr" state={talkAvatars.hrState} active={talkAvatars.hrState === 'speaking'} analyserNode={hrAnalyser} videoUrl={null} />
                {liveAvatarHr.status === 'connected' && (
                  <>
                    <video ref={liveAvatarHr.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', pointerEvents: 'none' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{PROFILES.hr.name}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{PROFILES.hr.title}</div>
                      </div>
                      {talkAvatars.hrState === 'speaking'
                        ? <WaveformBars active color={PROFILES.hr.barColor} analyserNode={hrAnalyser} />
                        : <div style={{ fontSize: '10px', color: '#4F8EF7' }}>Listening</div>}
                    </div>
                  </>
                )}
              </div>
              <div style={{ position: 'relative', flex: 1, display: 'flex', aspectRatio: '4/3' }}>
                <InterviewerAvatar role="technical" state={talkAvatars.techState} active={talkAvatars.techState === 'speaking'} analyserNode={techAnalyser} videoUrl={null} />
                {liveAvatarTechnical.status === 'connected' && (
                  <>
                    <video ref={liveAvatarTechnical.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', pointerEvents: 'none' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{PROFILES.technical.name}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{PROFILES.technical.title}</div>
                      </div>
                      {talkAvatars.techState === 'speaking'
                        ? <WaveformBars active color={PROFILES.technical.barColor} analyserNode={techAnalyser} />
                        : <div style={{ fontSize: '10px', color: '#4F8EF7' }}>Listening</div>}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Much larger self-view than the interview room's small "YOU" tile — per Francis's own
            request, this sits BELOW the avatar row (not beside it), full width. */}
        {showAvatars && phase !== 'mike-prep' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <YouCamera cameraOn={cameraOn} speaking={phase === 'talk'} onToggle={() => setCameraOn(v => !v)} width={640} height={420} />
          </div>
        )}

        {phase === 'talk' && (
          <>
            {/* Live transcript */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', minHeight: '70px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
              {transcript.finalText || transcript.interimText || <span style={{ color: 'var(--text-3)' }}>Start speaking — your words will appear here…</span>}
              {transcript.interimText && <span style={{ color: 'var(--text-3)' }}> {transcript.interimText}</span>}
            </div>

            {/* Notes/diagrams flip-through */}
            {noteUrls.length > 0 && (
              <div>
                <button onClick={() => setNotesOpen(v => !v)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer' }}>
                  📎 {notesOpen ? 'Hide' : 'Show'} notes ({noteIndex + 1}/{noteUrls.length})
                </button>
                {notesOpen && (
                  <div style={{ marginTop: '10px', position: 'relative', background: '#0a0a12', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={noteUrls[noteIndex]} alt="" style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block' }} />
                    {noteUrls.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.5)' }}>
                        <button onClick={() => setNoteIndex(i => Math.max(0, i - 1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>◀ Prev</button>
                        <button onClick={() => setNoteIndex(i => Math.min(noteUrls.length - 1, i + 1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Next ▶</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {phase === 'scoring' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Scoring your talk…</div>
            {scoringError && <div style={{ fontSize: '13px', color: '#f87171', marginTop: '10px' }}>Scoring failed — your talk was still saved.</div>}
          </div>
        )}

      </div>
    </div>
  );
}
