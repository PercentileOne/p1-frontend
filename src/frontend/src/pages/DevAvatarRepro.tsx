import { useState, useRef } from 'react';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { YouCamera } from '../components/YouCamera';

const TEST_LINE = "Hi, this is a short test line used to check whether the audio glitch happens on this very first utterance of a fresh session.";

// Dev-only diagnostic page — NOT part of the real interview/talk flow. Built 2026-09-13 because
// manually reproducing the lip-sync glitch through the full interview room (intake screen,
// recording consent, Mike's whole spoken intro) took 60+ seconds per trial, made the one
// variable that's mattered all day (warm-up duration between attach/tap and the first speak())
// impossible to control precisely, and turned every test into a slow, one-off anecdote instead
// of a real, repeatable experiment. This isolates connect() -> configurable wait -> speak() for
// ONE avatar seat, so a trial takes ~15-20s and the warm-up duration is an exact, settable
// number instead of whatever Mike's script happens to take. Reuses useLiveAvatarSession
// directly — this is the exact same code path as the real rooms, not a simulation of it.
export default function DevAvatarRepro() {
  const [role, setRole] = useState<'hr' | 'technical'>('hr');
  const [warmupSeconds, setWarmupSeconds] = useState(10);
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const avatar = useLiveAvatarSession(role);

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);

  const runTrial = async () => {
    setRunning(true);
    setStatus('connecting…');
    addLog(`Trial ${trialCount + 1} starting — role=${role}, warmup=${warmupSeconds}s`);
    try {
      await avatar.connect();
      setStatus(`connected — waiting ${warmupSeconds}s before speaking`);
      addLog(`connect() resolved — waiting ${warmupSeconds}s (this is the variable we're testing)`);
      await new Promise(r => setTimeout(r, warmupSeconds * 1000));
      setStatus('speaking now — watch/listen for the glitch');
      addLog('speak() called now — WATCH THE VIDEO BELOW');
      await avatar.speak(TEST_LINE, role, () => addLog('AVATAR_SPEAK_STARTED fired'));
      setStatus('done — did lips move before sound?');
      addLog('speak() resolved — trial complete');
    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error — see log');
    } finally {
      setRunning(false);
      setTrialCount(c => c + 1);
    }
  };

  const resetForNextTrial = async () => {
    addLog('Disconnecting to reset for a genuinely fresh session…');
    await avatar.disconnect();
    setStatus('idle');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a12', color: '#e5e7eb', fontFamily: '-apple-system,sans-serif', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>LiveAvatar Glitch Repro Harness</h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Dev-only. Isolates connect() → wait → speak() for one seat — no intake screen, no Mike, no consent dialog. Each trial is a genuinely fresh session (disconnect fully resets it).</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          Avatar seat
          <select value={role} onChange={e => setRole(e.target.value as 'hr' | 'technical')} disabled={running || avatar.status === 'connected'}
            style={{ background: '#151720', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '8px 10px', color: '#e5e7eb' }}>
            <option value="hr">hr (Amina)</option>
            <option value="technical">technical (Wayne)</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          Warm-up before speak() (seconds) — the variable being tested
          <input type="number" min={0} max={600} value={warmupSeconds} onChange={e => setWarmupSeconds(Number(e.target.value))} disabled={running}
            style={{ background: '#151720', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '8px 10px', color: '#e5e7eb', width: '100px' }} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={runTrial} disabled={running || avatar.status === 'connected'}
          style={{ padding: '10px 20px', borderRadius: '8px', background: running ? '#374151' : 'linear-gradient(135deg,#34D399,#4F8EF7)', color: '#fff', border: 'none', fontWeight: 700, cursor: running ? 'default' : 'pointer' }}>
          {running ? 'Running…' : 'Run Trial'}
        </button>
        <button onClick={resetForNextTrial} disabled={running}
          style={{ padding: '10px 20px', borderRadius: '8px', background: '#1f2230', border: '1px solid #2a2d3a', color: '#e5e7eb', fontWeight: 700, cursor: running ? 'default' : 'pointer' }}>
          Disconnect & Reset for Next Trial
        </button>
      </div>

      <div style={{ padding: '12px 16px', background: '#151720', borderRadius: '8px', fontSize: '13px' }}>
        <strong>Status:</strong> {status} &nbsp;|&nbsp; <strong>SDK status:</strong> {avatar.status} &nbsp;|&nbsp; <strong>Trials run:</strong> {trialCount}
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video ref={el => { videoElRef.current = el; avatar.setVideoEl(el); }} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Trial log (full detail is in the browser console — filter TIMING / STATS)</div>
        <div style={{ background: '#0d0e14', border: '1px solid #2a2d3a', borderRadius: '8px', padding: '10px 14px', maxHeight: '240px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
          {log.length === 0 ? <div style={{ color: '#6b7280' }}>No trials run yet.</div> : log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #2a2d3a', paddingTop: '20px', marginTop: '4px' }}>
        <DualSeatTest />
      </div>
    </div>
  );
}

// 2026-09-14 — the single-seat test above has never once glitched across many runs, including at
// 0s warm-up. The real rooms still glitch (now hitting Wayne too, not just Amina, even with
// Mike's own spoken intro removed as a variable). The one thing that test has never exercised at
// all: BOTH avatars connecting and being live at once — exactly what InterviewRoomPage.tsx's
// startInterview always does (liveAvatarHr.connect() and liveAvatarTechnical.connect() fired
// together). This mirrors that: connects both seats concurrently, waits, then has Amina speak
// first and Wayne speak second — the same connect-together-but-speak-sequentially pattern the
// real room uses — to test whether concurrency itself (not timing, not Mike) is the real factor.
function DualSeatTest() {
  const [warmupSeconds, setWarmupSeconds] = useState(10);
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const hrVideoRef = useRef<HTMLVideoElement | null>(null);
  const techVideoRef = useRef<HTMLVideoElement | null>(null);

  const hr = useLiveAvatarSession('hr');
  const technical = useLiveAvatarSession('technical');
  // 2026-09-14 — added after four other controlled variables (Mike's intro, dual-avatar
  // concurrency, recording, 180s idle) each failed to reproduce the glitch here, while a real
  // longtask capture showed the real room's main thread is barely busy during the same window
  // (139ms total). The one thing every real room has that this harness never has at all: the
  // candidate's own live webcam preview (YouCamera), which InterviewRoomPage mounts at the exact
  // same moment both avatars attach (same showInterviewers gate) and which keeps decoding/
  // rendering continuously afterward. Video decode work happens largely off the JS main thread,
  // so it wouldn't show up as a longtask even if it were the real contention source. This toggle
  // adds that same real YouCamera component (not a reimplementation) as a third concurrent video
  // pipeline, to directly test whether ITS presence — never varied before — is what's missing.
  const [includeCamera, setIncludeCamera] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);

  const runTrial = async () => {
    setRunning(true);
    setStatus('connecting both seats concurrently…');
    addLog(`Trial ${trialCount + 1} starting — BOTH seats, warmup=${warmupSeconds}s`);
    try {
      await Promise.all([hr.connect(), technical.connect()]);
      setStatus(`both connected — waiting ${warmupSeconds}s`);
      addLog(`both connect() resolved — waiting ${warmupSeconds}s`);
      await new Promise(r => setTimeout(r, warmupSeconds * 1000));
      setStatus('Amina speaking now — watch/listen for the glitch');
      addLog('Amina speak() called — WATCH THE VIDEOS BELOW');
      await hr.speak(TEST_LINE, 'hr', () => addLog('Amina AVATAR_SPEAK_STARTED fired'));
      addLog('Amina speak() resolved');
      setStatus('Wayne speaking now — watch/listen for the glitch');
      addLog('Wayne speak() called');
      await technical.speak(TEST_LINE, 'technical', () => addLog('Wayne AVATAR_SPEAK_STARTED fired'));
      addLog('Wayne speak() resolved');
      setStatus('done — did either avatar glitch?');
    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error — see log');
    } finally {
      setRunning(false);
      setTrialCount(c => c + 1);
    }
  };

  const resetForNextTrial = async () => {
    addLog('Disconnecting both seats to reset for a genuinely fresh pair of sessions…');
    await Promise.all([hr.disconnect(), technical.disconnect()]);
    setStatus('idle');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>Dual Seat Test — mirrors the real room's concurrency</h2>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Connects Amina AND Wayne at the same time (like startInterview does), waits, then Amina speaks first and Wayne speaks second.</p>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', width: '160px' }}>
        Warm-up before Amina speaks (seconds)
        <input type="number" min={0} max={600} value={warmupSeconds} onChange={e => setWarmupSeconds(Number(e.target.value))} disabled={running}
          style={{ background: '#151720', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '8px 10px', color: '#e5e7eb', width: '100px' }} />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: running ? 'default' : 'pointer' }}>
        <input type="checkbox" checked={includeCamera} onChange={e => setIncludeCamera(e.target.checked)} disabled={running} />
        Include your own webcam preview (mirrors the real room's YouCamera — new variable, never tested)
      </label>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={runTrial} disabled={running || hr.status === 'connected'}
          style={{ padding: '10px 20px', borderRadius: '8px', background: running ? '#374151' : 'linear-gradient(135deg,#F59E0B,#EF4444)', color: '#fff', border: 'none', fontWeight: 700, cursor: running ? 'default' : 'pointer' }}>
          {running ? 'Running…' : 'Run Dual-Seat Trial'}
        </button>
        <button onClick={resetForNextTrial} disabled={running}
          style={{ padding: '10px 20px', borderRadius: '8px', background: '#1f2230', border: '1px solid #2a2d3a', color: '#e5e7eb', fontWeight: 700, cursor: running ? 'default' : 'pointer' }}>
          Disconnect & Reset Both
        </button>
      </div>

      <div style={{ padding: '12px 16px', background: '#151720', borderRadius: '8px', fontSize: '13px' }}>
        <strong>Status:</strong> {status} &nbsp;|&nbsp; <strong>Amina:</strong> {hr.status} &nbsp;|&nbsp; <strong>Wayne:</strong> {technical.status} &nbsp;|&nbsp; <strong>Trials run:</strong> {trialCount}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1, aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, fontSize: '11px', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>Amina (hr)</div>
          <video ref={el => { hrVideoRef.current = el; hr.setVideoEl(el); }} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ position: 'relative', flex: 1, aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, fontSize: '11px', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>Wayne (technical)</div>
          <video ref={el => { techVideoRef.current = el; technical.setVideoEl(el); }} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {includeCamera && <YouCamera cameraOn onToggle={() => {}} />}
      </div>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Trial log</div>
        <div style={{ background: '#0d0e14', border: '1px solid #2a2d3a', borderRadius: '8px', padding: '10px 14px', maxHeight: '240px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
          {log.length === 0 ? <div style={{ color: '#6b7280' }}>No trials run yet.</div> : log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
