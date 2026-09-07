// Throwaway diagnostic page — not linked from any nav. Exists purely to prove the
// useLiveAvatarSession hook actually connects, renders video, and speaks, before wiring it
// into the real interview room's state machine. Safe to delete once that wiring is done and
// verified in place.
import { useState } from 'react';
import { useLiveAvatarSession } from '../../hooks/useLiveAvatarSession';

export default function AvatarTestPage() {
  const { status, connect, disconnect, speak, startListening, stopListening, setVideoEl } = useLiveAvatarSession();
  const [text, setText] = useState('Hello, this is a test of the live avatar integration.');
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSpeak = async () => {
    setError(null);
    setSpeaking(true);
    try {
      await speak(text, 'hr');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 640 }}>
      <h1>LiveAvatar test page</h1>
      <p>Status: <strong>{status}</strong></p>

      <video ref={setVideoEl} autoPlay playsInline style={{ width: 480, height: 270, background: '#111', borderRadius: 12 }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button onClick={connect} disabled={status === 'connecting' || status === 'connected'}>Connect</button>
        <button onClick={disconnect} disabled={status !== 'connected'}>Disconnect</button>
        <button onClick={() => startListening()} disabled={status !== 'connected'}>Start Listening</button>
        <button onClick={() => stopListening()} disabled={status !== 'connected'}>Stop Listening</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ width: '100%' }} />
        <button onClick={handleSpeak} disabled={status !== 'connected' || speaking} style={{ marginTop: 8 }}>
          {speaking ? 'Speaking…' : 'Speak'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
