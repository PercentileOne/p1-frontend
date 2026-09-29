import { useEffect, useRef, useState } from 'react';
import { AvatarSDK, AvatarManager, AvatarView, DrivingServiceMode, LogLevel, type AvatarController } from '@spatius/avatarkit';
import { useAuthStore } from '../auth/authStore';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';

// Spatius evaluation page (Francis, 2026-09-29): renders Amina and Wayne side by side with Spatius' on-device avatars,
// fed by the SAME ElevenLabs voices the real interview uses, so quality/lip-sync can be judged against HeyGen LiveAvatar
// before committing. Admin-only (the backend endpoint that mints the session token is), not linked from anywhere.
// The API key never reaches the browser — see backend Features/Spatius/Endpoint.cs.
//
// Cost note: Spatius bills connected time, like HeyGen — hence the explicit Disconnect button and the 5-minute idle
// auto-disconnect below, mirroring the cost-control lesson from LiveAvatar.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';
const IDLE_MS = 5 * 60 * 1000;

let sdkReady: Promise<void> | null = null;
async function ensureSdk(authToken: string): Promise<void> {
  if (sdkReady) return sdkReady;
  sdkReady = (async () => {
    const res = await fetch(`${API_BASE}/api/dev/spatius/session-token`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
    const body = await res.json().catch(() => ({})) as { sessionToken?: string; appId?: string; error?: string };
    if (!res.ok || !body.sessionToken || !body.appId) throw new Error(body.error ?? `Token request failed (${res.status})`);
    // ElevenLabs avatar audio is PCM16 mono 24 kHz, so the SDK is told that up front — no resampling needed.
    await AvatarSDK.initialize(body.appId, { drivingServiceMode: DrivingServiceMode.direct, audioFormat: { channelCount: 1, sampleRate: 24000 }, logLevel: LogLevel.warning });
    AvatarSDK.setSessionToken(body.sessionToken);
  })().catch(e => { sdkReady = null; throw e; });
  return sdkReady;
}

type PanelHandle = { speak: (t?: string) => Promise<void> };

function Panel({ name, role, storageKey, handleRef, background, blur }: { name: string; role: 'hr' | 'technical'; storageKey: string; handleRef: { current: PanelHandle | null }; background: string; blur: number }) {
  const token = useAuthStore(s => s.token);
  const boxRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<AvatarView | null>(null);
  const ctrlRef = useRef<AvatarController | null>(null);
  const idleRef = useRef<number | undefined>(undefined);
  const [avatarId, setAvatarId] = useState(() => { try { return localStorage.getItem(storageKey) ?? ''; } catch { return ''; } });
  const [text, setText] = useState(`Hi, I'm ${name}. Thanks for joining. Tell me a little about yourself and why you're interested in this role.`);
  const [status, setStatus] = useState('Not connected');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  function disconnect() {
    window.clearTimeout(idleRef.current);
    try { ctrlRef.current?.close(); } catch { /* already closed */ }
    try { viewRef.current?.dispose(); } catch { /* already disposed */ }
    ctrlRef.current = null; viewRef.current = null;
    setConnected(false);
    setStatus('Not connected');
  }
  // Always release the (billed) session on leaving the page.
  useEffect(() => disconnect, []); // eslint-disable-line react-hooks/exhaustive-deps
  const armIdle = () => {
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => { disconnect(); setStatus('Disconnected (5 min idle, to save cost)'); }, IDLE_MS);
  };

  async function connect() {
    if (!token || !boxRef.current || !avatarId.trim()) { setError('Enter an avatar ID first.'); return; }
    setBusy(true); setError(''); disconnect();
    try {
      try { localStorage.setItem(storageKey, avatarId.trim()); } catch { /* ignore */ }
      setStatus('Getting session…');
      await ensureSdk(token);
      setStatus('Downloading avatar…');
      const avatar = await AvatarManager.shared.load(avatarId.trim(), p => { if (p.progress != null) setStatus(`Downloading avatar… ${Math.round(p.progress * 100)}%`); });
      const view = new AvatarView(avatar, boxRef.current);
      const ctrl = view.controller;
      ctrl.onError = e => setError(`${e.code}: ${e.message}`);
      ctrl.onConversationState = s => setStatus(`Connected · ${s}`);
      await ctrl.initializeAudioContext(); // inside the click gesture, so the browser lets it play sound
      await ctrl.start();
      viewRef.current = view; ctrlRef.current = ctrl;
      setConnected(true);
      setStatus('Connected · idle'); armIdle();
    } catch (e) { disconnect(); setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function speak(overrideText?: string) {
    const ctrl = ctrlRef.current;
    if (!ctrl) { setError('Connect first.'); return; }
    setBusy(true); setError(''); armIdle();
    try {
      const pcm = await fetchAvatarAudioPcm(overrideText ?? text, role);
      ctrl.send(pcm.slice().buffer, true); // copy so the SDK gets its own buffer; true = last chunk of this turn
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  handleRef.current = { speak };

  const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
  const field: React.CSSProperties = { width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13 };
  return (
    <div style={{ flex: '1 1 380px', minWidth: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
        {name} <span style={{ color: 'var(--text-3)', fontWeight: 600, fontSize: 12 }}>({role === 'hr' ? 'HR' : 'Technical'} voice)</span>
      </div>
      {/* The avatar canvas is transparent (premultiplied alpha), so whatever is behind it shows through. The background is its own layer so it
          can be blurred (soft, out-of-focus, like a video call) without blurring the avatar, which mounts in the box above it. */}
      <div style={{ width: '100%', height: 420, borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#0b1020' }}>
        <div style={{ position: 'absolute', inset: -20, background, backgroundSize: 'cover', backgroundPosition: 'center', filter: blur ? `blur(${blur}px)` : 'none' }} />
        <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0' }}>{status}</div>
      <input value={avatarId} onChange={e => setAvatarId(e.target.value)} placeholder="Spatius avatar ID (Avatar Library or your custom avatar)" style={field} />
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={field} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={btn} disabled={busy} onClick={() => void connect()}>Connect</button>
        <button style={btn} disabled={busy || !connected} onClick={() => void speak()}>Speak</button>
        <button style={btn} onClick={disconnect}>Disconnect</button>
      </div>
      {error && <div style={{ color: '#f87171', fontSize: 12.5, marginTop: 8, overflowWrap: 'anywhere' }}>{error}</div>}
    </div>
  );
}

// Backgrounds to try behind the avatars. These CSS ones are stand-ins for gauging edge quality on light/warm scenes; a real office or
// home photo can be loaded with "Use my own image" (kept in this browser only — nothing is uploaded).
const BACKGROUNDS: { label: string; css: string }[] = [
  { label: 'Dark (default)', css: '#0b1020' },
  { label: 'Soft office', css: 'radial-gradient(ellipse at 15% 25%, rgba(255,255,255,0.75) 0, transparent 38%), radial-gradient(ellipse at 85% 30%, rgba(255,255,255,0.45) 0, transparent 30%), linear-gradient(180deg, #dfe4ec 0%, #c3cad6 60%, #98a2b3 100%)' },
  { label: 'Warm home', css: 'radial-gradient(circle at 20% 30%, #f7dcae 0, transparent 42%), radial-gradient(circle at 80% 70%, #d9b88f 0, transparent 45%), linear-gradient(180deg, #ecd9c0 0%, #b89877 100%)' },
  { label: 'Bookshelf (dark wood)', css: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 3px, transparent 3px 46px), linear-gradient(180deg, #5a4030 0%, #3a281c 100%)' },
];

export default function DevSpatiusTest() {
  const amina = useRef<PanelHandle | null>(null);
  const wayne = useRef<PanelHandle | null>(null);
  const [bg, setBg] = useState(BACKGROUNDS[0].css);
  const [blur, setBlur] = useState(6);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickImage = (f: File | undefined) => { if (f) setBg(`url("${URL.createObjectURL(f)}")`); };
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>Spatius avatar test — Amina & Wayne</h1>
      <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
        Side-by-side check of Spatius' on-device avatars, speaking with the same ElevenLabs voices as the real interview. Paste each avatar's ID,
        press Connect, then Speak. Sessions bill while connected, so press Disconnect when done (they also close after 5 idle minutes).
        Compare face quality, lip-sync and start-up time with the HeyGen interview.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Background</span>
        {BACKGROUNDS.map(b => (
          <button key={b.label} onClick={() => setBg(b.css)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: bg === b.css ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{b.label}</button>
        ))}
        <button onClick={() => fileRef.current?.click()}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Use my own image…</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => pickImage(e.target.files?.[0])} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)' }}>
          Blur
          <input type="range" min={0} max={16} value={blur} onChange={e => setBlur(Number(e.target.value))} />
          <span style={{ width: 28, color: 'var(--text-3)' }}>{blur}px</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Panel name="Amina" role="hr" storageKey="tic.spatius.amina" handleRef={amina} background={bg} blur={blur} />
        <Panel name="Wayne" role="technical" storageKey="tic.spatius.wayne" handleRef={wayne} background={bg} blur={blur} />
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(52,211,153,0.10)', color: '#34D399', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={() => { void amina.current?.speak("Welcome. I'm Amina, and this is Wayne. We'll both be interviewing you today."); window.setTimeout(() => void wayne.current?.speak("Hi, I'm Wayne. I'll be asking the technical questions."), 6000); }}
        >
          Amina then Wayne (conversation)
        </button>
      </div>
    </div>
  );
}
