import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import { useSpatiusAvatarSession, INTERVIEW_TOKEN_PATH } from '../hooks/useSpatiusAvatarSession';
import { getInterviewTicket } from '../api/entitlementsApi';
import { SpatiusSeatStage } from '../components/SpatiusSeatStage';
import { unlockTTSAudio } from '../api/ttsApi';

// Staff tool (2026-10-08): "Record greeting". Each interviewer's "Watch me speak" is a short video of their face saying hello, made once here and then played instantly everywhere
// (the interviewer picker and the homepage), instead of building a live face for every press (slow, heavy on the graphics chip, and it timed out on the first download).
//
// How it works: the page shows the interviewer's face in a 4:3 window (the same shape as the picker's portrait). "Record" asks the browser to share THIS tab, crops the recording
// to just that window, brings the live face up, and records it saying the greeting, with the sound. The result can be watched, retaken, or saved to the interviewer.
// Needs a computer, Chrome or Edge (the cropping uses "region capture"), and a staff sign-in.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

interface AdminInterviewer {
  id: string; displayName: string; role: 'hr' | 'technical' | 'briefing'; spatiusAvatarId: string; backgroundUrl: string | null; portraitUrl: string | null; greetingUrl: string | null; active: boolean;
}

type Step = 'idle' | 'sharing' | 'preparing' | 'recording' | 'review' | 'saving' | 'error';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const full = (u: string | null) => (u ? `${API_BASE}${u}` : null);

export default function StaffGreetingsPage() {
  const token = useAuthStore(s => s.token);
  const [list, setList] = useState<AdminInterviewer[] | null>(null);
  const [error, setError] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [note, setNote] = useState('');
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sp = useSpatiusAvatarSession(stageRef);
  const [faceOn, setFaceOn] = useState(false);

  async function load() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/interviewers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status === 403 ? 'Your account does not have access to this tool.' : `Could not load the interviewers (${res.status}).`);
      const rows = await res.json() as AdminInterviewer[];
      setList(rows.filter(r => r.role !== 'briefing' || true));
      setPickedId(p => p ?? rows[0]?.id ?? null);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);

  const iv = list?.find(i => i.id === pickedId) ?? null;
  const portrait = iv ? (full(iv.portraitUrl) ?? `/images/interviewers/${iv.id}.jpg`) : null;

  async function record() {
    if (!iv || !token) return;
    unlockTTSAudio();
    setError(''); setNote('');
    if (clip) { URL.revokeObjectURL(clip.url); setClip(null); }
    // The browser's share-this-tab prompt must come first (it needs the click that started this).
    let stream: MediaStream | null = null;
    try {
      setStep('sharing');
      stream = await (navigator.mediaDevices as unknown as { getDisplayMedia: (c: unknown) => Promise<MediaStream> }).getDisplayMedia({
        video: { displaySurface: 'browser' }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'include',
      });
      const track = stream.getVideoTracks()[0];
      const CropTargetCtor = (window as unknown as { CropTarget?: { fromElement: (el: Element) => Promise<unknown> } }).CropTarget;
      const cropTo = (track as unknown as { cropTo?: (t: unknown) => Promise<void> }).cropTo;
      if (!CropTargetCtor || !cropTo || !stageBoxRef.current) throw new Error('This browser cannot crop the recording to the face window. Please use Chrome or Edge on a computer.');
      await cropTo.call(track, await CropTargetCtor.fromElement(stageBoxRef.current));
      if (!stream.getAudioTracks().length) throw new Error('No sound was shared. When the browser asks, choose "This tab" and tick "Also share tab audio".');

      setStep('preparing'); setNote('Getting the face ready…');
      setFaceOn(true);
      await sp.disconnect(true);
      await Promise.race([
        sp.connect(iv.spatiusAvatarId, getInterviewTicket() ?? '', undefined, INTERVIEW_TOKEN_PATH),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The face took too long to load. Try again (the first time for a face can be slow).')), 90000)),
      ]);
      for (let i = 0; i < 80 && !stageBoxRef.current?.querySelector('canvas'); i++) await wait(250); // the first picture drawn
      await wait(1500);

      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : { videoBitsPerSecond: 2_500_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
      setStep('recording'); setNote('Recording — please keep this tab in front and quiet.');
      recorder.start(250);
      await wait(700);
      await sp.speak(`Hi there, I'm ${iv.displayName}, welcome to TheInterviewChair.com.`, iv.role === 'technical' ? 'technical' : 'hr', undefined, iv.id);
      await wait(800);
      recorder.stop();
      await stopped;
      stream.getTracks().forEach(t => t.stop());
      await sp.disconnect();
      const blob = new Blob(chunks, { type: mime ?? 'video/webm' });
      setClip({ blob, url: URL.createObjectURL(blob) });
      setStep('review'); setNote('');
    } catch (e) {
      stream?.getTracks().forEach(t => t.stop());
      void sp.disconnect(true);
      setFaceOn(false);
      setStep('error'); setNote('');
      setError((e as Error).message || 'The recording did not work.');
    }
  }

  async function save() {
    if (!iv || !token || !clip) return;
    setStep('saving'); setError('');
    try {
      const form = new FormData();
      form.append('file', new File([clip.blob], 'greeting.webm', { type: clip.blob.type || 'video/webm' }));
      const res = await fetch(`${API_BASE}/api/admin/interviewers/${encodeURIComponent(iv.id)}/greeting`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new Error(b.error ?? `Saving failed (${res.status}).`); }
      await load();
      setClip(null); setStep('idle'); setNote(`${iv.displayName}'s greeting is saved.`);
    } catch (e) { setStep('review'); setError((e as Error).message); }
  }

  const busy = step === 'sharing' || step === 'preparing' || step === 'recording' || step === 'saving';
  const btn: React.CSSProperties = { borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#f1f5f9', fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Record greetings</h1>
        <p style={{ fontSize: 13.5, color: '#94a3b8', marginBottom: 18, lineHeight: 1.55 }}>
          Staff only. Pick an interviewer, press <b>Record</b>, and choose <b>This tab</b> (tick <b>Also share tab audio</b>) when your browser asks. The interviewer says hello, and the clip is saved
          for the "Watch me speak" buttons. Use Chrome or Edge on a computer, with the sound on.
        </p>

        {!token && <div style={{ color: '#fbbf24', fontSize: 14 }}>Please sign in to the candidate site as a staff member first, then come back to this page.</div>}
        {error && <div style={{ color: '#f87171', fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
        {note && <div style={{ color: '#34d399', fontSize: 13.5, marginBottom: 12 }}>{note}</div>}

        {list && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              {list.map(i => (
                <button key={i.id} type="button" disabled={busy} onClick={() => { setPickedId(i.id); setStep('idle'); setFaceOn(false); setError(''); setNote(''); if (clip) { URL.revokeObjectURL(clip.url); setClip(null); } void sp.disconnect(true); }}
                  style={{ ...btn, textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 8, borderColor: i.id === pickedId ? '#34d399' : 'rgba(255,255,255,0.18)', background: i.id === pickedId ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)' }}>
                  <span>{i.displayName}{!i.active ? ' (hidden)' : ''}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i.greetingUrl ? '#34d399' : '#94a3b8' }}>{i.greetingUrl ? '🎬 recorded' : 'no clip'}</span>
                </button>
              ))}
            </div>

            {iv && (
              <div>
                <div ref={stageBoxRef} style={{ position: 'relative', width: 640, maxWidth: '100%', aspectRatio: '4 / 3', borderRadius: 14, overflow: 'hidden', background: '#04060c' }}>
                  {portrait && <img src={portrait} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />}
                  {faceOn && <SpatiusSeatStage seat={iv.role === 'technical' ? 'technical' : 'hr'} avatarId={iv.spatiusAvatarId} backgroundUrl={full(iv.backgroundUrl)} stageRef={stageRef} visible={sp.rendered} live={sp.status === 'connected'} rendered={sp.rendered} rounded={false} />}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
                  <button type="button" style={{ ...btn, background: '#34d399', color: '#04120c', border: 'none', opacity: busy || !token ? 0.6 : 1 }} disabled={busy || !token} onClick={() => void record()}>
                    {step === 'sharing' ? 'Waiting for you to share this tab…' : step === 'preparing' ? 'Getting ready…' : step === 'recording' ? '● Recording…' : clip ? 'Record again' : `Record ${iv.displayName}'s greeting`}
                  </button>
                </div>

                {clip && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Watch it back (with sound). If you are happy, save it.</div>
                    <video src={clip.url} controls playsInline style={{ width: 640, maxWidth: '100%', aspectRatio: '4 / 3', borderRadius: 12, background: '#000' }} />
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button type="button" style={{ ...btn, background: '#34d399', color: '#04120c', border: 'none' }} disabled={step === 'saving'} onClick={() => void save()}>{step === 'saving' ? 'Saving…' : 'Save this clip'}</button>
                      <button type="button" style={btn} disabled={step === 'saving'} onClick={() => { URL.revokeObjectURL(clip.url); setClip(null); setStep('idle'); }}>Discard</button>
                    </div>
                  </div>
                )}

                {!clip && iv.greetingUrl && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>The saved clip:</div>
                    <video key={iv.greetingUrl} src={full(iv.greetingUrl) ?? undefined} controls playsInline style={{ width: 640, maxWidth: '100%', aspectRatio: '4 / 3', borderRadius: 12, background: '#000' }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
