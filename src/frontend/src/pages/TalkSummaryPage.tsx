import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { TalkSaveDecisionPanel } from '../components/TalkSaveDecisionPanel';
import { WaveformBars } from '../components/InterviewerAvatar';
import { speak } from '../api/ttsApi';
import type { TalkScoreResult, DimensionScore } from '../api/talksApi';

// Wayne's blue, matching PROFILES.technical in InterviewerAvatar.tsx — he's the one giving
// feedback here (Francis's own casting: Amina stays the encouraging live presence in the room,
// Wayne — "knows the subject" per useTalkAvatars.ts's own intro line — is the natural one to
// deliver the more analytical debrief, same split InterviewSummaryPage.tsx uses between the
// live interviewers and Mike as a separate "just compared notes" character).
const WAYNE_COLOR = '#4F8EF7';

const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function DimensionRow({ label, dim }: { label: string; dim: DimensionScore }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(dim.score) }}>{dim.score}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${dim.score}%` }} transition={{ duration: 0.6 }}
          style={{ height: '100%', background: scoreColor(dim.score) }} />
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>{dim.description}</div>
    </div>
  );
}

// Talk-room counterpart to InterviewSummaryPage.tsx — considerably simpler, since a talk has
// no per-question chapters/answers list, just one continuous transcript and one score. No
// upload-polling either (unlike Interviews, uploadTalk() is awaited synchronously before
// TalkRoomPage ever navigates here, so the document already exists by the time this loads).
export default function TalkSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const authUser = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);

  const hasRouteState = !!location.state;
  const [fetched, setFetched] = useState<Record<string, unknown> | null>(null);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (hasRouteState || !routeId || !authUser?.id || !authToken) return;
    setFetchState('loading');
    fetch(`${API_BASE}/api/talks/${encodeURIComponent(authUser.id)}/${encodeURIComponent(routeId)}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: Record<string, unknown>) => { setFetched(data); setFetchState('done'); })
      .catch(() => setFetchState('error'));
  }, [hasRouteState, routeId, authUser?.id, authToken]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = (location.state ?? fetched ?? {}) as any;
  const subject: string = src.subject ?? '';
  const scoreResult: TalkScoreResult | null = src.scoreResult ?? null;
  const transcript: string = src.transcript ?? '';
  const isShared: boolean = src.isShared ?? false;
  const talkId = routeId ?? src.id;
  // Immediately after finishing, this is a local blob: URL TalkRoomPage.tsx built from the
  // just-uploaded recording; on a later revisit/refresh it's the real hosted URL the backend
  // returns instead (BuildResponseJson in Features/Talks/Endpoint.cs). Null for talks recorded
  // before this feature existed, or if recording was declined/failed.
  const videoUrl: string | null = src.videoUrl ?? null;

  // Only ever revoke a LOCAL blob: URL, never the real hosted one — same distinction
  // useInterviewRecording.ts's own playback URL handling makes.
  useEffect(() => {
    if (!videoUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  // ── Wayne's verbal debrief ── same pattern as InterviewSummaryPage.tsx's Mike debrief:
  // click-to-play (never autoplay — a candidate landing on this page shouldn't get spoken audio
  // without asking for it), built from this talk's own real scoring data, not a canned line.
  // State, not a ref — it's read during render to choose the button/status text below.
  const [wayneSpoke, setWayneSpoke] = useState(false);
  const [wayneActive, setWayneActive] = useState(false);
  const cancelWayneRef = useRef<(() => void) | null>(null);
  const [wayneAnalyser, setWayneAnalyser] = useState<AnalyserNode | null>(null);

  const buildWayneScript = useCallback(() => {
    if (!scoreResult) return '';
    const name = authUser?.firstName ?? 'there';
    const pct = Math.round(scoreResult.overall);

    const opening = `Hi ${name}, it's Wayne — I've just had a chat with Amina about your talk on "${subject}", and she wanted me to share some feedback.`;

    let scoreComment: string;
    if (pct >= 85) scoreComment = `First of all, brilliant talk — you scored ${pct} percent overall. That's genuinely impressive.`;
    else if (pct >= 65) scoreComment = `You scored ${pct} percent overall — a solid effort, and there's real potential here.`;
    else scoreComment = `You scored ${pct} percent overall. It's a start, and with a bit of focused practice, you'll see that number climb quickly.`;

    // Takeaway Score gets its own line — it's the measure Francis himself singled out as one
    // of the most important, so Wayne should speak to it directly, not just the dimension list.
    const takeaways = scoreResult.takeaways ?? [];
    const takeawayComment = takeaways.length > 0
      ? `You gave us ${takeaways.length} clear ${takeaways.length === 1 ? 'takeaway' : 'takeaways'} — that's exactly what a good talk should leave people with.`
      : `One thing to work on: we couldn't pull out a single clear takeaway from this one — worth tightening around one or two central points next time.`;

    // Pick the single lowest-scoring of the 7 AI-judged dimensions as the one thing to focus
    // on — same "one concrete area, not a laundry list" approach as Mike's weakestTag logic,
    // simplified since talks have no per-answer breakdown to draw a strength/weakness pair from.
    const dimensions: [string, DimensionScore | undefined][] = [
      ['clarity', scoreResult.clarity], ['structure', scoreResult.structure],
      ['opening and closing strength', scoreResult.openingClosingStrength],
      ['depth', scoreResult.depth], ['accuracy', scoreResult.accuracy],
      ['confidence', scoreResult.confidence], ['engagement', scoreResult.engagement],
    ];
    const scored = dimensions.filter((d): d is [string, DimensionScore] => d[1] !== undefined);
    const weakest = scored.length ? scored.reduce((min, d) => d[1].score < min[1].score ? d : min) : null;
    const improvementComment = weakest && pct < 100
      ? `One area to focus on next time is your ${weakest[0]} — if you can sharpen that up, it'll make a real difference.`
      : '';

    const closing = `Good luck with your next one, ${name} — every talk makes you sharper. Speak soon.`;

    return [opening, scoreComment, takeawayComment, improvementComment, closing].filter(Boolean).join(' ');
  }, [scoreResult, subject, authUser]);

  function handleGetFeedback() {
    if (wayneActive) {
      cancelWayneRef.current?.();
      cancelWayneRef.current = null;
      setWayneAnalyser(null);
      setWayneActive(false);
      return;
    }
    if (!scoreResult) return;
    setWayneSpoke(true);
    setWayneActive(true);
    cancelWayneRef.current = speak(buildWayneScript(), 'technical', () => {
      setWayneActive(false);
      setWayneAnalyser(null);
      cancelWayneRef.current = null;
    }, (a) => setWayneAnalyser(a));
  }

  // Stop Wayne if the candidate navigates away mid-debrief, rather than leaving him talking
  // into an unmounted page.
  useEffect(() => {
    return () => { cancelWayneRef.current?.(); };
  }, []);

  if (fetchState === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>Loading your talk…</div>;
  }
  if (fetchState === 'error' && !hasRouteState) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>Couldn't find that talk.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button onClick={() => navigate('/dashboard?tab=talks')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          <ArrowLeft size={14} /> Back to My Talks
        </button>

        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginBottom: '6px' }}>🎤 {subject}</h1>

        {/* ── Wayne Debrief Banner ── same click-to-play pattern as InterviewSummaryPage.tsx's
            Mike banner, sized as a card within this page's single-column layout rather than a
            separate full-width strip, matching how every other block on this page is styled. */}
        {scoreResult && (
          <AnimatePresence>
            {wayneActive ? (
              <motion.div
                key="wayne-speaking"
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                style={{
                  background: `linear-gradient(135deg, ${WAYNE_COLOR}14, rgba(52,211,153,0.06))`,
                  border: `1px solid ${WAYNE_COLOR}33`, borderRadius: '16px', padding: '16px 20px', marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1B3A6B, #2563eb)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 800, color: '#fff', position: 'relative', zIndex: 1,
                    }}>WL</div>
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${WAYNE_COLOR}80`, animation: 'wayne-pulse 1.4s ease-in-out infinite' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: WAYNE_COLOR, marginBottom: '2px' }}>Wayne · Feedback</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Delivering your debrief…</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <WaveformBars active={wayneActive} color={WAYNE_COLOR} analyserNode={wayneAnalyser} />
                    <button onClick={handleGetFeedback} style={{ flexShrink: 0, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                      Stop Feedback
                    </button>
                  </div>
                </div>
                <style>{`@keyframes wayne-pulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.25);opacity:0} }`}</style>
              </motion.div>
            ) : (
              <motion.div
                key="wayne-cta"
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                style={{
                  background: `linear-gradient(135deg, ${WAYNE_COLOR}0d, rgba(52,211,153,0.04))`,
                  border: `1px solid ${WAYNE_COLOR}26`, borderRadius: '16px', padding: '14px 18px', marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1B3A6B, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>WL</div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: WAYNE_COLOR, marginBottom: '2px' }}>Wayne · Feedback</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                      {wayneSpoke ? 'Want to hear that again?' : 'Ready to give you a personalised debrief on your talk.'}
                    </div>
                  </div>
                  <button onClick={handleGetFeedback} style={{ marginLeft: 'auto', flexShrink: 0, background: `linear-gradient(135deg, ${WAYNE_COLOR}, #34D399)`, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    {wayneSpoke ? 'Play Feedback' : 'Get Feedback'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Leads with video, same principle as the interview summary page — the recording is
            the primary artifact, everything else (score, transcript) is analysis of it. A
            simple native player is enough here: talks have no chapter markers to scrub between,
            unlike InterviewSummaryPage.tsx's InterviewReplayPlayer. */}
        {videoUrl && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden' }}>
              <video src={videoUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
        )}

        {scoreResult ? (() => {
          // Talks saved before the Takeaway Score existed have no `takeaways` field at all in
          // their stored JSON — fall back to null (not shown) rather than crashing on
          // .length/.map for those older records.
          const takeaways = scoreResult.takeaways ?? null;
          return (
          <>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: scoreColor(scoreResult.overall) }}>{scoreResult.overall}</div>
                <div style={{ fontSize: '16px', color: 'var(--text-3)' }}>/ 100 — {scoreResult.grade}</div>
              </div>

              {/* Takeaway Score — a count, not a rating: the distinct points a listener would
                  actually walk away with. Given its own prominent slot rather than folded into
                  the six dimension rows below, since it's a fundamentally different kind of
                  measure (what stuck, not how well it was delivered) and a genuinely useful
                  number on its own — zero is a real, meaningful result, not a bug. */}
              {takeaways && (
                <div style={{
                  background: takeaways.length === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(52,211,153,0.06)',
                  border: `1px solid ${takeaways.length === 0 ? 'rgba(239,68,68,0.25)' : 'rgba(52,211,153,0.25)'}`,
                  borderRadius: '12px', padding: '16px 18px', marginBottom: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: takeaways.length > 0 ? '10px' : 0 }}>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: takeaways.length === 0 ? '#EF4444' : '#34D399' }}>
                      {takeaways.length}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Takeaway{takeaways.length === 1 ? '' : 's'} a listener would walk away with
                    </div>
                  </div>
                  {takeaways.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {takeaways.map((takeaway, i) => (
                        <li key={i} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{takeaway}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                      Nothing distinct enough for a listener to walk away with — worth tightening around one or two clear points next time.
                    </div>
                  )}
                </div>
              )}

              <DimensionRow label="Clarity" dim={scoreResult.clarity} />
              <DimensionRow label="Structure" dim={scoreResult.structure} />
              {scoreResult.openingClosingStrength && (
                <DimensionRow label="Starting & Ending Strength" dim={scoreResult.openingClosingStrength} />
              )}
              <DimensionRow label="Depth" dim={scoreResult.depth} />
              <DimensionRow label="Accuracy" dim={scoreResult.accuracy} />
              <DimensionRow label="Confidence" dim={scoreResult.confidence} />
              <DimensionRow label="Engagement" dim={scoreResult.engagement} />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px' }}>
                <DimensionRow label="Time Management" dim={scoreResult.timeManagement} />
              </div>
              <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginTop: '8px' }}>
                {scoreResult.overallFeedback}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <TalkSaveDecisionPanel
                score={scoreResult.overall}
                subject={subject}
                candidateId={authUser?.id}
                talkId={talkId}
                alreadyShared={isShared}
              />
            </div>
          </>
          );
        })() : (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'var(--amber)', marginBottom: '20px' }}>
            {/* Distinguishes "nothing to score" (empty transcript — ScoreHandler.cs rejects this
                before ever calling Claude) from a genuine scoring/AI failure. The generic message
                read like a system error even when the real cause was simply not speaking during
                the talk (Francis, 2026-09-18 — hit this live on "Being in Care"). */}
            {!transcript.trim()
              ? "We didn't catch any speech during that talk, so there was nothing to score — the recording is still saved. Try again and make sure your mic is picking you up."
              : "Scoring didn't complete for this talk, but it was still saved."}
          </div>
        )}

        {transcript && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '12px' }}>Transcript</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{transcript}</div>
          </div>
        )}
      </div>
    </div>
  );
}
