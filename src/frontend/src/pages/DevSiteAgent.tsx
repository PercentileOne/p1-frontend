import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { useSpatiusAvatarSession, setSpatiusStarvationMode, setSpatiusReapplyFraming } from '../hooks/useSpatiusAvatarSession';
import { base64ToBytes, pcmRateOf, resamplePcm16, silence } from '../lib/pcmAudio';

// Prototype of the homepage talking guide (Francis, 2026-10-22; plan in docs/specs/site-agents-plan.md). Admin-only and not linked from anywhere, so the cost and the quality can
// be judged before any visitor can reach it. ElevenLabs runs the conversation (the browser connects with a signed link our server makes; the key never reaches the browser), and
// the Spatius face is drawn from the agent's voice as it arrives. The ElevenLabs player is muted: the face plays the sound, so the lips and the voice stay together.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';
const DEV_SPATIUS_TOKEN_PATH = '/api/dev/spatius/session-token';
const FACE_RATE = 24000;
const SiteAgentRulesCleanName = (raw: string) => raw.replace(/[^\p{L}\p{M} '-]/gu, '').trim().slice(0, 30) || 'there';
// How close the face is framed (1 = the room's automatic fit). The automatic fit left her too small in this wide tile; the size she is first drawn at looked right, about 30% closer.
// The voice reaches us in pieces, and a piece that arrives late makes the face hold the sound while the lips catch up (a pause on the same word every time, 2026-10-23). So the
// start of each answer is held back until this much has arrived (or the answer is over), and the rest then flows straight through.
// To try other amounts without a new release, add ?prebuffer=1500 (milliseconds) to the page address.
// Spatius's audio guide: its lip-sync service needs audio AHEAD of playback. A voice that arrives faster than it plays (a text-to-speech engine) can be passed straight through; a voice that
// arrives at about the speed it plays (as a live agent's can) must be held back at the start of each answer, "enough audio buffered for Motion Server to stay ahead", or the face stalls.
// So: once FAST_START_MS of voice has arrived, start at once if it is arriving at least FAST_RATE times faster than it plays; otherwise wait until PREBUFFER_MS has arrived.
const FAST_START_MS = 800;
const FAST_RATE = 2;
const PREBUFFER_MS_DEFAULT = 2200;
// Measured 2026-10-23: the agent's voice arrives 5 to 7 times faster than it plays, as 6 to 30 small pieces (some 95 ms long), and the face still stalled once per answer. The interview
// room, where the face is smooth, sends each line as ONE complete clip. So by default the pieces of an answer are collected and sent as one clip once the pieces stop arriving.
// An answer is taken to be complete when no new piece has arrived for WHOLE_IDLE_MS; a very long one is started after WHOLE_MAX_MS of voice has been collected, and the rest streams.
const WHOLE_IDLE_MS = 350;
const WHOLE_MAX_MS = 14000;
const PREBUFFER_MS = (() => { const n = Number(new URLSearchParams(window.location.search).get('prebuffer')); return Number.isFinite(n) && n >= 0 && n <= 5000 && new URLSearchParams(window.location.search).has('prebuffer') ? n : PREBUFFER_MS_DEFAULT; })();
const FACE_ZOOM = 1.15;

type Audience = 'recruiter' | 'candidate';
type Phase = 'idle' | 'starting' | 'live' | 'ended' | 'error';
type Line = { who: 'you' | 'guide'; text: string };

// Recruiters are met by Amina (the HR interviewer), candidates by Michelle (the briefing consultant): faces people already know from the product.
const pickFace = (roster: PublicInterviewer[], audience: Audience) =>
  roster.find(i => i.defaultFor === (audience === 'recruiter' ? 'hr' : 'briefing')) ?? roster.find(i => i.role === (audience === 'recruiter' ? 'hr' : 'briefing'));

const btn: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

export default function DevSiteAgent() {
  const token = useAuthStore(s => s.token);
  const stageRef = useRef<HTMLDivElement>(null);
  const spatius = useSpatiusAvatarSession(stageRef);
  const [audience, setAudience] = useState<Audience>('recruiter');
  const [name, setName] = useState('Francis');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [agentMode, setAgentMode] = useState<'listening' | 'speaking'>('listening');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [roster, setRoster] = useState<PublicInterviewer[]>([]);
  // Test switch for the pause-on-one-word problem: keep the voice flowing even if the lips are late.
  // Francis's test 2026-10-23: with both of these on the guide speaks smoothly; with either alone she still paused once per answer. So both are on by default.
  const [keepVoiceFlowing, setKeepVoiceFlowing] = useState(true);
  const [frameOnce, setFrameOnce] = useState(true);
  const [wholeClip, setWholeClip] = useState(true);   // each answer goes to the face as one clip: Francis found this completely smooth (2026-10-23), so it is the default; the box turns it off to compare
  const [faceTest, setFaceTest] = useState(false);
  const convRef = useRef<{ endSession: () => Promise<void>; setVolume: (o: { volume: number }) => void } | null>(null);
  const rateRef = useRef(16000);
  const speakingRef = useRef(false);
  const pendingRef = useRef<Uint8Array[]>([]);
  const pendingBytesRef = useRef(0);
  const turnStartedRef = useRef(false);
  const turnEndedRef = useRef(false);          // the whole answer has already been sent as one clip, with its end marker
  const wholeClipRef = useRef(true);           // test switch: send each answer as one clip (like the interview room)
  const prebufferTimerRef = useRef<number | undefined>(undefined);
  // Measurements for finding why the face runs out of lip animation at the same word each time: when each piece of the agent's voice arrives, and how far ahead of playback we are.
  const turnT0Ref = useRef(0);       // when the first piece of the current answer arrived
  const fedMsRef = useRef(0);        // how much voice (ms) has arrived in the current answer
  const lastPieceAtRef = useRef(0);
  const gapsRef = useRef<number[]>([]);
  const [report, setReport] = useState('');
  const timerRef = useRef<number | undefined>(undefined);
  const finishingRef = useRef(false);
  const faceSpeakingRef = useRef(false);
  const face = pickFace(roster, audience);
  useEffect(() => { faceSpeakingRef.current = spatius.speaking; }, [spatius.speaking]);

  useEffect(() => { void fetchInterviewers().then(setRoster); }, []);

  const stop = useCallback(async () => {
    window.clearInterval(timerRef.current);
    const c = convRef.current; convRef.current = null;
    try { await c?.endSession(); } catch { /* already closed */ }
    try { await spatius.disconnect(true); } catch { /* already closed */ }
    speakingRef.current = false;
    resetTurn();
    setPhase(p => (p === 'error' ? p : 'idle'));
    setAgentMode('listening');
  }, [spatius]);

  // The conversation is over (the time limit, a long silence, or the agent hung up): let her finish the sentence she is in, then close the billed connection but leave her on screen,
  // with a clear next step. Tearing the face down the moment the line closed made her vanish in the middle of "That's our time for now" (Francis, 2026-10-23).
  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    window.clearInterval(timerRef.current);
    const c = convRef.current; convRef.current = null;
    try { await c?.endSession(); } catch { /* already closed */ }
    // Anything still held back (a short final answer) goes to the face now, with its end marker.
    if (!turnStartedRef.current) flushPending();
    if (!turnEndedRef.current) spatius.feed(silence(FACE_RATE, 20), true);
    let quietSince = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      const busy = faceSpeakingRef.current;
      if (busy) quietSince = 0; else if (!quietSince) quietSince = performance.now();
      if (quietSince && performance.now() - quietSince > 1500) break;
      await new Promise(r => window.setTimeout(r, 200));
    }
    try { await spatius.disconnect(false); } catch { /* already closed */ }   // soft close: the billed connection ends, her picture stays
    speakingRef.current = false;
    resetTurn();
    setAgentMode('listening');
    setPhase(p => (p === 'error' ? p : 'ended'));
    finishingRef.current = false;
  }, [spatius]);

  // After the end card: put the page back as it started.
  async function talkAgain() {
    try { await spatius.disconnect(true); } catch { /* already closed */ }
    setPhase('idle'); setLines([]); setReport('');
  }

  // Never leave a billed conversation or face running when the page goes away.
  useEffect(() => () => { window.clearInterval(timerRef.current); void convRef.current?.endSession().catch(() => undefined); }, []);

  // Hands the held-back start of an answer to the face (once), then everything after goes straight through.
  function flushPending() {
    window.clearTimeout(prebufferTimerRef.current);
    const parts = pendingRef.current;
    if (parts.length > 0) {
      const all = new Uint8Array(pendingBytesRef.current);
      let at = 0;
      for (const part of parts) { all.set(part, at); at += part.length; }
      spatius.feed(all.buffer as ArrayBuffer, false);
    }
    pendingRef.current = []; pendingBytesRef.current = 0;
    turnStartedRef.current = true;
  }
  // Sends everything collected so far as ONE clip and marks the end of the answer (the way the interview room sends a line).
  function flushWhole() {
    window.clearTimeout(prebufferTimerRef.current);
    const parts = pendingRef.current;
    if (parts.length > 0) {
      const all = new Uint8Array(pendingBytesRef.current);
      let at = 0;
      for (const part of parts) { all.set(part, at); at += part.length; }
      spatius.feed(all.buffer as ArrayBuffer, true);
    }
    pendingRef.current = []; pendingBytesRef.current = 0;
    turnStartedRef.current = true; turnEndedRef.current = true;
  }
  function resetTurn() {
    window.clearTimeout(prebufferTimerRef.current);
    pendingRef.current = []; pendingBytesRef.current = 0;
    turnStartedRef.current = false; turnEndedRef.current = false;
  }

  // Test: the face alone, saying the same greeting with the interview room's own proven method (one complete clip, no streaming). Compare it with the live guide.
  async function faceOnlyTest() {
    if (!token || !face) return;
    setFaceTest(true); setError(''); setPhase('starting');
    setSpatiusStarvationMode(keepVoiceFlowing ? 'audioIndependent' : 'strictSync');
    setSpatiusReapplyFraming(!frameOnce);
    try {
      await spatius.connect(face.avatarId, '', undefined, DEV_SPATIUS_TOKEN_PATH, FACE_ZOOM);
      setPhase('live');
      await spatius.speak(`Hi ${SiteAgentRulesCleanName(name)}, what would you like to know about the TheInterviewChair.com recruiter portal?`, face.role === 'technical' ? 'technical' : 'hr', undefined, face.id);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    try { await spatius.disconnect(true); } catch { /* already closed */ }
    setFaceTest(false); setPhase('idle');
  }

  async function start() {
    if (!token) { setError('Please sign in as an admin first.'); setPhase('error'); return; }
    if (!face) { setError('No face found for this guide (check Admin > Interviewers).'); setPhase('error'); return; }
    setPhase('starting'); setError(''); setLines([]);
    setSpatiusStarvationMode(keepVoiceFlowing ? 'audioIndependent' : 'strictSync');
    setSpatiusReapplyFraming(!frameOnce);
    wholeClipRef.current = wholeClip;
    try {
      // 1) The face, first: it needs a click to start its sound, and this is the click.
      await spatius.connect(face.avatarId, '', undefined, DEV_SPATIUS_TOKEN_PATH, FACE_ZOOM);
      // 2) A signed link for the conversation, from our server.
      const res = await fetch(`${API_BASE}/api/dev/site-agent/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ audience, name }) });
      const session = await res.json().catch(() => ({})) as { signedUrl?: string; maxSeconds?: number; dynamicVariables?: Record<string, string>; error?: string };
      if (!res.ok || !session.signedUrl) throw new Error(session.error ?? `Could not start the guide (${res.status}).`);
      // 3) The conversation. The SDK is loaded only now, so nobody downloads it unless they use this page.
      const { Conversation, stripAudioTags } = await import('@elevenlabs/client');
      const conv = await Conversation.startSession({
        signedUrl: session.signedUrl,
        connectionType: 'websocket',
        dynamicVariables: session.dynamicVariables,
        onConversationMetadata: meta => { const r = pcmRateOf((meta as { agent_output_audio_format?: string }).agent_output_audio_format); if (r) rateRef.current = r; },
        onAudio: b64 => {
          // The agent's voice arrives in small pieces at its own sample rate: bring each to the face's rate and hand it over.
          const bytes = resamplePcm16(base64ToBytes(b64), rateRef.current, FACE_RATE);
          {
            const now = performance.now();
            const pieceMs = Math.round((bytes.length / 2 / FACE_RATE) * 1000);
            if (!speakingRef.current) { turnT0Ref.current = now; fedMsRef.current = 0; gapsRef.current = []; }
            else gapsRef.current.push(Math.round(now - lastPieceAtRef.current));
            fedMsRef.current += pieceMs;
            const aheadMs = Math.round(fedMsRef.current - (now - turnT0Ref.current));   // negative = playback has caught up with what has arrived
            lastPieceAtRef.current = now;
            console.info(`[guide] voice piece at +${Math.round(now - turnT0Ref.current)} ms, ${pieceMs} ms long, ${aheadMs} ms ahead of playback`);
          }
          speakingRef.current = true;
          if (turnStartedRef.current) { if (!turnEndedRef.current) spatius.feed(bytes.slice().buffer as ArrayBuffer, false); return; }
          pendingRef.current.push(bytes.slice());
          pendingBytesRef.current += bytes.length;
          if (wholeClipRef.current) {
            const heldMs = (pendingBytesRef.current / 2 / FACE_RATE) * 1000;
            window.clearTimeout(prebufferTimerRef.current);
            if (heldMs >= WHOLE_MAX_MS) { flushPending(); return; }   // a very long answer: start it now, the rest streams
            prebufferTimerRef.current = window.setTimeout(flushWhole, WHOLE_IDLE_MS);   // no new piece for a moment: the answer is complete
            return;
          }
          {
            const heldMs = (pendingBytesRef.current / 2 / FACE_RATE) * 1000;
            const waitedMs = Math.max(1, performance.now() - turnT0Ref.current);
            const arrivingFast = heldMs / waitedMs >= FAST_RATE;   // audio held per millisecond that has passed: 2 or more means it comes in at least twice as fast as it plays
            if (heldMs >= PREBUFFER_MS || (heldMs >= FAST_START_MS && arrivingFast)) { flushPending(); return; }
          }
          window.clearTimeout(prebufferTimerRef.current); prebufferTimerRef.current = window.setTimeout(flushPending, PREBUFFER_MS + 600);
        },
        onModeChange: ({ mode }) => {
          setAgentMode(mode === 'speaking' ? 'speaking' : 'listening');
          // The agent has finished its turn: tell the face this was the last piece.
          if (mode !== 'speaking' && speakingRef.current) {
            speakingRef.current = false;
            if (!turnStartedRef.current) flushPending();   // a short answer that never reached the held-back amount
            if (!turnEndedRef.current) spatius.feed(silence(FACE_RATE, 20), true);
            const gaps = gapsRef.current;
            const spanMs = Math.max(1, lastPieceAtRef.current - turnT0Ref.current);
            setReport(`last answer: ${gaps.length + 1} pieces, ${Math.round(fedMsRef.current)} ms of voice arrived over ${Math.round(spanMs)} ms (${(fedMsRef.current / spanMs).toFixed(1)}x playing speed), longest wait between pieces ${gaps.length ? Math.max(...gaps) : 0} ms, hold-back up to ${PREBUFFER_MS} ms`);
            resetTurn();
          }
        },
        onInterruption: () => { speakingRef.current = false; resetTurn(); spatius.interrupt(); },   // the visitor spoke over the agent
        // The agent's words can carry delivery tags such as [warm] that tell its voice how to sound; they are not for reading, so they are taken out of the transcript. A silent
        // moment arrives as "..." and is not shown either.
        onMessage: m => {
          const text = stripAudioTags(m.message).trim();
          if (!text || /^\.{2,}$/.test(text)) return;
          setLines(l => [...l, { who: m.source === 'user' ? 'you' : 'guide', text }]);
        },
        onDisconnect: () => { void finish(); },
        onError: msg => { setError(String(msg)); },
      });
      convRef.current = conv as unknown as typeof convRef.current;
      conv.setVolume({ volume: 0 });   // the face plays the sound
      setPhase('live');
      const limit = session.maxSeconds ?? 180;
      setSecondsLeft(limit);
      // ElevenLabs enforces the limit itself and has the guide say goodbye, then closes the line (which calls finish()). This clock only counts down for the display, and is a
      // safety net: if the line has not closed 20 seconds after the limit, finish anyway.
      let elapsed = 0;
      timerRef.current = window.setInterval(() => {
        elapsed += 1;
        setSecondsLeft(Math.max(0, limit - elapsed));
        if (elapsed >= limit + 20) void finish();
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
      void stop();
    }
  }

  const live = phase === 'live' || phase === 'starting';
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '28px 16px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>Site guide prototype</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 18px', lineHeight: 1.55 }}>
          Admin only. Talk to the guide the way a homepage visitor would. Each conversation stops by itself after 3 minutes. Use headphones if you can: the guide listens while it talks, and speakers can feed its own voice back to it.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['recruiter', 'candidate'] as Audience[]).map(a => (
            <button key={a} type="button" disabled={live} onClick={() => setAudience(a)}
              style={{ ...btn, borderColor: audience === a ? '#34D399' : 'var(--border)', color: audience === a ? '#34D399' : 'var(--text)', opacity: live ? 0.6 : 1 }}>
              {a === 'recruiter' ? 'Recruiter' : 'Candidate'}
            </button>
          ))}
        </div>

        <div ref={stageRef} style={{
          position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)',
          background: face?.backgroundUrl ? `center / cover no-repeat url(${face.backgroundUrl})` : '#0b1220',
        }}>
          {phase === 'idle' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{face ? `${face.displayName} will greet you` : 'Loading…'}</div>}
          {phase === 'starting' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, background: 'rgba(0,0,0,0.35)' }}>Getting ready…</div>}
          {phase === 'ended' && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'linear-gradient(to top, rgba(4,8,16,0.92), rgba(4,8,16,0))' }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'center' }}>Thanks for talking, {SiteAgentRulesCleanName(name)}.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={audience === 'recruiter' ? 'https://recruiter.theinterviewchair.com/register' : 'https://candidate.theinterviewchair.com/register'}
                  style={{ ...btn, background: 'linear-gradient(135deg,#34D399,#047857)', border: 'none', color: '#fff', textDecoration: 'none' }}>Create a free account →</a>
                <button type="button" onClick={() => void talkAgain()} style={btn}>Talk again</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={30} disabled={live} placeholder="Your first name" aria-label="Your first name"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', minWidth: 160 }} />
          {live
            ? <button type="button" onClick={() => void stop()} style={{ ...btn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.4)' }}>End</button>
            : <button type="button" onClick={() => void start()} style={{ ...btn, background: 'linear-gradient(135deg,#34D399,#047857)', border: 'none', color: '#fff' }}>
                {audience === 'recruiter' ? 'How does it work for Recruiters' : 'How does it work for Candidates'}
              </button>}
          {phase === 'live' && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{agentMode === 'speaking' ? 'Speaking…' : 'Listening…'} · {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} left · voice held for the lips {spatius.heldCount}×</span>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
          <input type="checkbox" checked={wholeClip} disabled={live} onChange={e => setWholeClip(e.target.checked)} />
          Send each answer as one clip, like the interview room (recommended; takes effect on the next start)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
          <input type="checkbox" checked={frameOnce} disabled={live} onChange={e => setFrameOnce(e.target.checked)} />
          Frame once: do not keep re-adjusting her size (test, takes effect on the next start)
        </label>
        <button type="button" disabled={live || faceTest} onClick={() => void faceOnlyTest()} style={{ ...btn, marginBottom: 12, fontSize: 13, padding: '8px 14px' }}>
          Test 1: face only, same greeting (no streaming)
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          <input type="checkbox" checked={keepVoiceFlowing} disabled={live} onChange={e => setKeepVoiceFlowing(e.target.checked)} />
          Keep the voice flowing even if the lips are late (test, takes effect on the next start)
        </label>

        {report && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>{report}</div>}

        {error && <div role="alert" style={{ fontSize: 13, color: '#F59E0B', marginBottom: 12 }}>{error}</div>}

        {lines.length > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                <strong style={{ color: l.who === 'you' ? 'var(--text-2)' : '#34D399' }}>{l.who === 'you' ? 'You' : face?.displayName ?? 'Guide'}: </strong>{l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
