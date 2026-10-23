import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { useSpatiusAvatarSession, setSpatiusStarvationMode } from '../hooks/useSpatiusAvatarSession';
import { base64ToBytes, pcmRateOf, resamplePcm16, silence } from '../lib/pcmAudio';

// Prototype of the homepage talking guide (Francis, 2026-10-22; plan in docs/specs/site-agents-plan.md). Admin-only and not linked from anywhere, so the cost and the quality can
// be judged before any visitor can reach it. ElevenLabs runs the conversation (the browser connects with a signed link our server makes; the key never reaches the browser), and
// the Spatius face is drawn from the agent's voice as it arrives. The ElevenLabs player is muted: the face plays the sound, so the lips and the voice stay together.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';
const DEV_SPATIUS_TOKEN_PATH = '/api/dev/spatius/session-token';
const FACE_RATE = 24000;
// How close the face is framed (1 = the room's automatic fit). The automatic fit left her too small in this wide tile; the size she is first drawn at looked right, about 30% closer.
// The voice reaches us in pieces, and a piece that arrives late makes the face hold the sound while the lips catch up (a pause on the same word every time, 2026-10-23). So the
// start of each answer is held back until this much has arrived (or the answer is over), and the rest then flows straight through.
// To try other amounts without a new release, add ?prebuffer=1500 (milliseconds) to the page address.
const PREBUFFER_MS = (() => { const n = Number(new URLSearchParams(window.location.search).get('prebuffer')); return Number.isFinite(n) && n >= 0 && n <= 5000 && new URLSearchParams(window.location.search).has('prebuffer') ? n : 800; })();
const FACE_ZOOM = 1.15;

type Audience = 'recruiter' | 'candidate';
type Phase = 'idle' | 'starting' | 'live' | 'error';
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
  const [keepVoiceFlowing, setKeepVoiceFlowing] = useState(false);
  const convRef = useRef<{ endSession: () => Promise<void>; setVolume: (o: { volume: number }) => void } | null>(null);
  const rateRef = useRef(16000);
  const speakingRef = useRef(false);
  const pendingRef = useRef<Uint8Array[]>([]);
  const pendingBytesRef = useRef(0);
  const turnStartedRef = useRef(false);
  const prebufferTimerRef = useRef<number | undefined>(undefined);
  // Measurements for finding why the face runs out of lip animation at the same word each time: when each piece of the agent's voice arrives, and how far ahead of playback we are.
  const turnT0Ref = useRef(0);       // when the first piece of the current answer arrived
  const fedMsRef = useRef(0);        // how much voice (ms) has arrived in the current answer
  const lastPieceAtRef = useRef(0);
  const gapsRef = useRef<number[]>([]);
  const [report, setReport] = useState('');
  const timerRef = useRef<number | undefined>(undefined);
  const face = pickFace(roster, audience);

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
  function resetTurn() {
    window.clearTimeout(prebufferTimerRef.current);
    pendingRef.current = []; pendingBytesRef.current = 0;
    turnStartedRef.current = false;
  }

  async function start() {
    if (!token) { setError('Please sign in as an admin first.'); setPhase('error'); return; }
    if (!face) { setError('No face found for this guide (check Admin > Interviewers).'); setPhase('error'); return; }
    setPhase('starting'); setError(''); setLines([]);
    setSpatiusStarvationMode(keepVoiceFlowing ? 'audioIndependent' : 'strictSync');
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
          if (turnStartedRef.current) { spatius.feed(bytes.slice().buffer as ArrayBuffer, false); return; }
          pendingRef.current.push(bytes.slice());
          pendingBytesRef.current += bytes.length;
          if (pendingBytesRef.current >= (FACE_RATE * 2 * PREBUFFER_MS) / 1000) flushPending();
          else { window.clearTimeout(prebufferTimerRef.current); prebufferTimerRef.current = window.setTimeout(flushPending, PREBUFFER_MS + 400); }
        },
        onModeChange: ({ mode }) => {
          setAgentMode(mode === 'speaking' ? 'speaking' : 'listening');
          // The agent has finished its turn: tell the face this was the last piece.
          if (mode !== 'speaking' && speakingRef.current) {
            speakingRef.current = false;
            if (!turnStartedRef.current) flushPending();   // a short answer that never reached the held-back amount
            spatius.feed(silence(FACE_RATE, 20), true);
            const gaps = gapsRef.current;
            setReport(`last answer: ${gaps.length + 1} pieces, longest wait between pieces ${gaps.length ? Math.max(...gaps) : 0} ms, hold-back ${PREBUFFER_MS} ms`);
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
        onDisconnect: () => { void stop(); },
        onError: msg => { setError(String(msg)); },
      });
      convRef.current = conv as unknown as typeof convRef.current;
      conv.setVolume({ volume: 0 });   // the face plays the sound
      setPhase('live');
      const limit = session.maxSeconds ?? 180;
      setSecondsLeft(limit);
      timerRef.current = window.setInterval(() => setSecondsLeft(s => { if (s <= 1) { void stop(); return 0; } return s - 1; }), 1000);
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
