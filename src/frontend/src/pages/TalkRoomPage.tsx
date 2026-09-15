import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { InterviewerAvatar, PROFILES, WaveformBars } from '../components/InterviewerAvatar';
import { YouCamera } from '../components/YouCamera';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { useTalkAvatars } from '../hooks/useTalkAvatars';
import { useTalkTranscript } from '../hooks/useTalkTranscript';
import { useTalkRecording } from '../hooks/useTalkRecording';
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

// Named after the real dimensions the AI is actually judging (see ScoreHandler.cs's
// BuildPrompt) — ticks off in the same order the score card below lists them, so this isn't
// generic "please wait" filler, it's a preview of what's about to appear. Francis's own
// feedback, 2026-09-14: the gap between finishing a talk and Amina's outro was "just a dead
// moment", then, after seeing a first version (single cycling line): a filling checklist reads
// as real progress far better than text swapping out — same pattern well-designed "thinking"
// indicators elsewhere use, and the whole point is to make the wait forgettable, not just filled.
const ANALYSIS_STEPS = [
  'Reviewing your transcript…',
  'Checking your clarity and structure…',
  'Weighing your opening and closing…',
  'Assessing depth and accuracy…',
  'Gauging confidence and engagement…',
  'Counting your key takeaways…',
  'Putting it all together…',
];

const ANALYSIS_ACCENT = '#7b5cf5';

function AnalyzingTalk() {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    // Stops one short of the end deliberately — there's no real "finished" signal to tie the
    // last step to (scoreTalk() could still be mid-flight), so it's more honest to leave the
    // final step visibly "in progress" for however long that actually takes than to fake 100%.
    if (completedCount >= ANALYSIS_STEPS.length - 1) return;
    const id = setTimeout(() => setCompletedCount(c => c + 1), 1100);
    return () => clearTimeout(id);
  }, [completedCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
        style={{
          width: '56px', height: '56px', borderRadius: '50%', marginBottom: '28px', flexShrink: 0,
          background: `conic-gradient(${ANALYSIS_ACCENT}, transparent 75%)`, padding: '3px',
        }}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
          📊
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', minWidth: '280px' }}>
        {ANALYSIS_STEPS.map((label, i) => {
          const isDone = i < completedCount;
          const isActive = i === completedCount;
          return (
            <motion.div key={label} animate={{ opacity: isDone || isActive ? 1 : 0.35 }} transition={{ duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isDone ? 'var(--text)' : isActive ? ANALYSIS_ACCENT : 'var(--text-3)' }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#34D399' : 'transparent',
                border: isDone ? 'none' : `2px solid ${isActive ? ANALYSIS_ACCENT : 'var(--border)'}`,
              }}>
                {isDone ? (
                  <Check size={11} strokeWidth={3.5} color="#0a0a12" />
                ) : isActive ? (
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: ANALYSIS_ACCENT }} />
                ) : null}
              </div>
              <span>{label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Candidate-portal "My Talks" live room — sibling to InterviewRoomPage.tsx, deliberately NOT
// built on top of it: no questions, no per-turn scoring, no MCQ/Go Deeper. Reuses the pieces
// that generalize cleanly (useLiveAvatarSession as-is, the same InterviewerAvatar/PROFILES/
// YouCamera rendering) and gives the talk-specific parts (avatar orchestration, transcript,
// scoring) their own small hooks instead of forcing this shape into useInterviewerAudio/
// useAnswerScoring, which are both built around a Q&A flow.
//
// Video recording (2026-09-14): useTalkRecording.ts owns just the capture mechanics
// (getDisplayMedia/canvas + MediaRecorder) — deliberately NOT useInterviewRecording, whose
// uploadRecording() hardcodes interview-shaped metadata and POSTs to /api/interviews/upload,
// which would silently write bogus documents into the wrong Cosmos container if reused as-is.
// uploadTalk() already accepted a video blob from day one (Features/Talks/Endpoint.cs's
// /api/talks/upload always supported it) — it just never received one until now.
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
  const consentToRecord = incoming.consentToRecord ?? true;

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
  const recording = useTalkRecording({ micOpen: phase === 'talk' });

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

  const beginTalk = useCallback(async () => {
    // Started before Mike even speaks, same reasoning as InterviewRoomPage.tsx's
    // startInterview — the recording captures the whole session from the top, and on desktop
    // this is also the point the browser's share-tab permission dialog appears.
    if (consentToRecord) {
      await recording.startRecording();
    }
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
  }, [talkAvatars, transcript, incoming.selectedLanguage, consentToRecord, recording]);

  const finishTalk = useCallback(async () => {
    // Cost control (Francis, 2026-09-15, after watching a real End Talk sit through a long
    // scoring/upload wait): same lesson InterviewRoomPage already learned on 2026-09-11 — HeyGen
    // bills per minute CONNECTED, not per minute talking, so leaving both avatars connected
    // through the whole scoring/upload wait (often the longest stretch of the whole talk) burns
    // money for zero benefit. Disconnect immediately rather than just stopping the listening
    // pose. This does mean Amina's live spoken outro (giveOutro, added 2026-09-14) can no longer
    // run here — reconnecting just for a ~10s closing line would be slow and risks the exact
    // first-utterance warm-up glitch the lipsync investigation is about, so it's dropped in favor
    // of going straight to the summary page, matching how InterviewRoomPage's own final scoring
    // wait already works (no live outro there either — see its own 'scoring' phase handling).
    if (liveAvatarHr.status === 'connected') void liveAvatarHr.disconnect();
    if (liveAvatarTechnical.status === 'connected') void liveAvatarTechnical.disconnect();
    const finalTranscript = transcript.stop();
    setPhase('scoring');
    // Stopped before scoring/upload so the blob is ready by the time uploadTalk() needs it —
    // recording.stopRecording() resolves null if it was never started (consent declined) or
    // nothing was captured, same as videoBlob being null always has been.
    const videoBlob = await recording.stopRecording();

    let result: TalkScoreResult | null = null;
    try {
      result = await scoreTalk(subject, finalTranscript, elapsed, targetDurationSeconds, isPersonalStory);
    } catch {
      setScoringError(true);
    }

    // Every talk still saves its transcript and scores even if the recording failed or was
    // declined — videoBlob being null degrades gracefully, same as before video existed at all.
    try {
      await uploadTalk({
        talkId: talkIdRef.current,
        candidateId: authUser?.id ?? '',
        subject, isPersonalStory, transcript: finalTranscript,
        durationSeconds: elapsed, targetDurationSeconds,
        overallScore: result?.overall ?? 0,
        scoreResult: result,
        // Public Talks byline — first name only, same informal-attribution convention the
        // dashboard's own "Good afternoon, Francis" greeting already uses.
        authorFirstName: authUser?.firstName || 'A candidate',
      }, videoBlob);
    } catch { /* best-effort — the summary page falls back to route state if this fails */ }

    // Local blob URL for immediate playback on the summary screen — same reasoning as
    // useInterviewRecording.ts's buildPlaybackUrl: the real, hosted videoUrl only exists once
    // BuildResponseJson (Features/Talks/Endpoint.cs) can return it on a later GET, which won't
    // happen on this same navigate. Built from the same blob already uploaded above, not a
    // second recording.
    const playbackUrl = videoBlob ? URL.createObjectURL(videoBlob) : null;

    // Straight to the summary page — no live spoken outro now that both avatars disconnect
    // immediately above (see that comment for why). TalkSummaryPage's own Wayne Debrief Banner
    // still delivers Wayne's real spoken feedback, via its own fresh connect once there.
    setPhase('done');
    navigate(`/talk-summary/${talkIdRef.current}`, {
      state: { subject, scoreResult: result, transcript: finalTranscript, durationSeconds: elapsed, targetDurationSeconds, videoUrl: playbackUrl },
    });
  }, [liveAvatarHr, liveAvatarTechnical, transcript, recording, subject, elapsed, targetDurationSeconds, isPersonalStory, authUser, navigate]);

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

  // Excludes 'scoring'/'done' too (2026-09-15, Francis: "we all sat staring at each other" during
  // a real scoring wait) — the avatar row and self-camera were rendering unconditionally through
  // the whole wait, pushing AnalyzingTalk's checklist below the fold even though it was correctly
  // mounted the entire time. This still uses the same opacity/position toggle as always, never
  // unmounting the <video> elements — see the comment below.
  const showAvatars = phase !== 'intro' && phase !== 'scoring' && phase !== 'done';
  // 2026-09-14 — the moment the avatar tiles are actually revealed to the candidate; see the
  // InterviewRoomPage.tsx block comment (same fix, ported here) for why this now controls only
  // an opacity/position reveal of a permanently-mounted block, never the mount/unmount of the
  // <video> elements themselves.
  const revealAvatars = showAvatars && phase !== 'mike-prep';
  const progress = Math.min(1, elapsed / targetDurationSeconds);
  const overTarget = elapsed > targetDurationSeconds;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system,"Segoe UI",sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>🎤 {subject}</div>
        {phase === 'talk' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {consentToRecord && (recording.isRecording || recording.recordingFailed) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', userSelect: 'none' }}>
                {recording.isRecording ? (
                  <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} /><span>Recording</span></>
                ) : (
                  <><span>⚠</span><span>No video — camera/mic denied</span></>
                )}
              </div>
            )}
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', maxWidth: '900px', width: '100%', margin: '0 auto', padding: '24px', gap: '20px' }}>

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

        {/* 2026-09-14 — permanently mounted (never torn down by AnimatePresence), same fix as
            InterviewRoomPage.tsx's interviewer block: revealAvatars now controls only an
            opacity/position reveal of the SAME never-recreated <video> elements, so attach()
            fires once, the instant each session's stream is ready, with zero gap. See that
            file's block comment for the full root-cause explanation. */}
        <motion.div
          key="avatars"
          animate={{ opacity: revealAvatars ? 1 : 0 }}
          style={revealAvatars
            ? { display: 'flex', gap: '16px' }
            : { display: 'flex', gap: '16px', position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}
        >
              <div style={{ position: 'relative', flex: 1, display: 'flex', aspectRatio: '4/3' }}>
                <InterviewerAvatar role="hr" state={talkAvatars.hrState} active={talkAvatars.hrState === 'speaking'} analyserNode={hrAnalyser} videoUrl={null} />
                <video ref={liveAvatarHr.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                {liveAvatarHr.status === 'connected' && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', pointerEvents: 'none' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{PROFILES.hr.name}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{PROFILES.hr.title}</div>
                      </div>
                      {talkAvatars.hrState === 'speaking'
                        ? <WaveformBars active color={PROFILES.hr.barColor} analyserNode={hrAnalyser} />
                        : <div style={{ fontSize: '10px', color: '#4F8EF7' }}>Listening</div>}
                    </div>
                )}
              </div>
              <div style={{ position: 'relative', flex: 1, display: 'flex', aspectRatio: '4/3' }}>
                <InterviewerAvatar role="technical" state={talkAvatars.techState} active={talkAvatars.techState === 'speaking'} analyserNode={techAnalyser} videoUrl={null} />
                <video ref={liveAvatarTechnical.setVideoEl} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                {liveAvatarTechnical.status === 'connected' && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', pointerEvents: 'none' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{PROFILES.technical.name}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{PROFILES.technical.title}</div>
                      </div>
                      {talkAvatars.techState === 'speaking'
                        ? <WaveformBars active color={PROFILES.technical.barColor} analyserNode={techAnalyser} />
                        : <div style={{ fontSize: '10px', color: '#4F8EF7' }}>Listening</div>}
                    </div>
                )}
              </div>
        </motion.div>

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
          <div style={{ textAlign: 'center' }}>
            <AnalyzingTalk />
            {scoringError && <div style={{ fontSize: '13px', color: '#f87171', marginTop: '-24px', marginBottom: '24px' }}>Scoring failed — your talk was still saved.</div>}
          </div>
        )}

        {/* Hidden elements for the mobile-path recording (canvas-composited webcam) — never
            visible, but must be real DOM elements for captureStream() to work reliably. */}
        <video ref={recording.videoElRef} playsInline muted style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />
        <canvas ref={recording.canvasElRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

      </div>
    </div>
  );
}
