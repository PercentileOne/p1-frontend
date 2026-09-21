import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { speak as speakTts } from '../api/ttsApi';
import { setInterviewTicket } from '../api/entitlementsApi';
import { VoiceInput } from '../components/VoiceInput';
import { startTryOut, scoreTryOut, type TryOutStart, type TryOutFeedback } from '../api/tryOutApi';

// "Try it live" (Francis, 2026-09-21) — the public, no-account taste of the product for visitors from the marketing site and LinkedIn:
// name ANY subject, a live avatar asks three questions, answer by voice or text, get an instant scored card, then be invited to
// register for the free full interview. Everything costly is capped server-side (see Features/TryOut); when the live-avatar allowance
// for the day is used up, or the avatar can't connect, the same flow runs voice-only. Public route: no sign-in needed.

const GREEN = '#34D399';
const EXAMPLES = ['Product Manager at Spotify', 'A-level Biology', 'Nurse — first job', 'Driving theory test', 'Software Engineer at Google', 'Marketing Manager'];
const REGISTER_URL = 'https://login.theinterviewchair.com/register';
const DIMENSIONS: { key: keyof TryOutFeedback['dimensions']; label: string }[] = [
  { key: 'clarity', label: 'Clarity' }, { key: 'relevance', label: 'Relevance' }, { key: 'accuracy', label: 'Accuracy' },
  { key: 'depth', label: 'Depth' }, { key: 'confidence', label: 'Confidence' },
];

type Phase = 'topic' | 'starting' | 'asking' | 'answering' | 'scoring' | 'results' | 'blocked';

export default function TryItLivePage() {
  const [phase, setPhase] = useState<Phase>('topic');
  // The marketing site's hero passes ?topic= so the visitor's subject is already filled in.
  const [topic, setTopic] = useState(() => { try { return (new URLSearchParams(window.location.search).get('topic') ?? '').slice(0, 90); } catch { return ''; } });
  const [start, setStart] = useState<TryOutStart | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [feedback, setFeedback] = useState<TryOutFeedback | null>(null);
  const [message, setMessage] = useState('');
  const [capped, setCapped] = useState(false);
  const [useAvatar, setUseAvatar] = useState(false);
  const [avatarState, setAvatarState] = useState<'off' | 'connecting' | 'live'>('off');
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  const hr = useLiveAvatarSession('hr');
  const technical = useLiveAvatarSession('technical');
  const avatar = start?.interviewer === 'technical' ? technical : hr;

  // Never leave a billable avatar connection or a voice running when the page is left.
  useEffect(() => () => { cancelSpeechRef.current?.(); void hr.disconnect(); void technical.disconnect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speakLine = useCallback(async (text: string, s: TryOutStart, viaAvatar: boolean) => {
    const seat = s.interviewer === 'technical' ? technical : hr;
    if (viaAvatar) {
      try { await seat.speak(text, s.interviewer); return; }
      catch { setUseAvatar(false); setAvatarState('off'); /* fall through to the voice-only path */ }
    }
    await new Promise<void>(resolve => { cancelSpeechRef.current = speakTts(text, s.interviewer, resolve); });
  }, [hr, technical]);

  const ask = useCallback(async (i: number, s: TryOutStart, viaAvatar: boolean) => {
    setPhase('asking'); setDraft('');
    const q = s.questions[i];
    const line = i === 0 ? `Hi, I'm ${s.interviewerName}. Let's talk about ${s.subject}. ${q}` : q;
    await speakLine(line, s, viaAvatar);
    setPhase('answering');
  }, [speakLine]);

  async function begin() {
    const subject = topic.trim();
    if (subject.length < 2) return;
    setPhase('starting'); setMessage(''); setCapped(false);
    const r = await startTryOut(subject);
    if (!r.ok) { setMessage(r.message); setCapped(r.capped); setPhase('blocked'); return; }
    const s = r.data;
    setStart(s); setIndex(0); setAnswers([]); setFeedback(null);
    // Must begin from this click so the browser lets audio play. Connecting can fail or be slow — the interview goes ahead either way.
    let live = false;
    if (s.avatarAvailable) {
      setInterviewTicket(s.ticket);
      setAvatarState('connecting');
      try { await (s.interviewer === 'technical' ? technical : hr).connect(); live = true; setAvatarState('live'); }
      catch { setAvatarState('off'); }
    }
    setUseAvatar(live);
    setPhase('asking');
    // Let the video element mount and attach before the avatar's first words, or the opening of the greeting can be lost.
    if (live) await new Promise(r => setTimeout(r, 600));
    void ask(0, s, live);
  }

  async function submitAnswer() {
    if (!start || !draft.trim()) return;
    cancelSpeechRef.current?.();
    const next = [...answers, { question: start.questions[index], answer: draft.trim() }];
    setAnswers(next);
    if (index + 1 < start.questions.length) {
      setIndex(index + 1);
      void ask(index + 1, start, useAvatar);
      return;
    }
    // Done: stop the (billed) avatar connection straight away, then score.
    setPhase('scoring');
    void avatar.disconnect(); setAvatarState('off');
    const r = await scoreTryOut(start.subject, next);
    if (!r.ok) { setMessage(r.message); setCapped(r.capped); setPhase('blocked'); return; }
    setFeedback(r.data); setPhase('results');
  }

  function restart() {
    cancelSpeechRef.current?.();
    void hr.disconnect(); void technical.disconnect();
    setStart(null); setAnswers([]); setFeedback(null); setDraft(''); setIndex(0); setAvatarState('off'); setUseAvatar(false); setPhase('topic');
  }

  const card: React.CSSProperties = { background: 'var(--bg2, #0f1829)', border: '1px solid var(--border, rgba(255,255,255,0.1))', borderRadius: 18, padding: 22 };
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg3, #14213a)', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: 12, padding: '13px 14px', color: 'var(--text, #f1f5f9)', fontSize: 15, outline: 'none', fontFamily: 'inherit' };
  const primary: React.CSSProperties = { background: `linear-gradient(135deg,${GREEN},#047857)`, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 22px', fontSize: 15, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', textAlign: 'center' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #070d1a)', color: 'var(--text, #f1f5f9)', fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
          <a href="https://www.theinterviewchair.com" style={{ textDecoration: 'none', fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>
            <span style={{ color: GREEN }}>The</span>Interview<span style={{ color: GREEN }}>Chair</span><span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>.com</span>
          </a>
          <a href="https://www.theinterviewchair.com" style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)', textDecoration: 'none' }}>← Back to site</a>
        </div>

        {phase === 'topic' && (
          <div>
            <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 20, padding: '5px 12px', marginBottom: 14 }}>Free · no account · about 3 minutes</div>
            <h1 style={{ fontSize: 'clamp(28px,6vw,42px)', lineHeight: 1.1, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Try it live.<br /><span style={{ color: GREEN }}>Be interviewed on anything.</span></h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', margin: '0 0 22px' }}>
              Name a job, a company, an exam or a subject you're studying. A live AI interviewer asks you three questions, and you get a scored result in seconds.
            </p>
            <div style={card}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3, #94a3b8)', marginBottom: 8 }}>What should we interview you on?</label>
              <input
                value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && void begin()} maxLength={90}
                placeholder="e.g. Product Manager at Spotify" style={inputStyle} autoFocus
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 18px' }}>
                {EXAMPLES.map(x => (
                  <button key={x} onClick={() => setTopic(x)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border, rgba(255,255,255,0.12))', color: 'var(--text-2, #cbd5e1)', borderRadius: 20, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>{x}</button>
                ))}
              </div>
              <button onClick={() => void begin()} disabled={topic.trim().length < 2} style={{ ...primary, width: '100%', opacity: topic.trim().length < 2 ? 0.5 : 1 }}>Start my mini interview →</button>
              <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', marginTop: 12, textAlign: 'center' }}>You can speak your answers or type them. Nothing is saved unless you create an account.</div>
            </div>
          </div>
        )}

        {phase === 'starting' && (
          <div style={{ ...card, textAlign: 'center', padding: '48px 22px' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Preparing your interview…</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-3, #94a3b8)', marginTop: 8 }}>{avatarState === 'connecting' ? 'Your interviewer is taking their seat' : 'Writing three questions on your subject'}</div>
          </div>
        )}

        {(phase === 'asking' || phase === 'answering' || phase === 'scoring') && start && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)', overflowWrap: 'anywhere' }}>Interview on <strong style={{ color: 'var(--text, #f1f5f9)' }}>{start.subject}</strong></div>
              <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, whiteSpace: 'nowrap' }}>Question {Math.min(index + 1, start.questions.length)} of {start.questions.length}</div>
            </div>
            <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#05080f', border: '1px solid var(--border, rgba(255,255,255,0.1))', aspectRatio: '16 / 9' }}>
              {useAvatar
                ? <video ref={avatar.setVideoEl} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: `linear-gradient(135deg,${GREEN},#047857)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900, color: '#fff', boxShadow: phase === 'asking' ? '0 0 0 10px rgba(52,211,153,0.15)' : 'none', transition: 'box-shadow 0.3s' }}>{start.interviewerName[0]}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)' }}>Voice interview</div>
                  </div>
                )}
              <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
                {start.interviewerName} · {start.interviewer === 'technical' ? 'Technical interviewer' : 'HR Director'}{phase === 'asking' ? ' · speaking…' : ''}
              </div>
            </div>

            {phase !== 'scoring' && (
              <div style={{ ...card, marginTop: 14 }}>
                <div style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 700, marginBottom: 14 }}>{start.questions[index]}</div>
                {phase === 'answering' ? (
                  <>
                    <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} placeholder="Speak with the mic below, or type your answer here…" style={{ ...inputStyle, resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 12 }}>
                      <VoiceInput onTranscript={text => setDraft(d => (d ? d + ' ' : '') + text)} />
                      <button onClick={() => void submitAnswer()} disabled={!draft.trim()} style={{ ...primary, opacity: draft.trim() ? 1 : 0.5 }}>
                        {index + 1 < start.questions.length ? 'Next question →' : 'Get my score →'}
                      </button>
                    </div>
                  </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)' }}>Listen to the question, then answer…</div>}
              </div>
            )}
            {phase === 'scoring' && <div style={{ ...card, marginTop: 14, textAlign: 'center', fontWeight: 700 }}>Scoring your answers…</div>}
          </div>
        )}

        {phase === 'results' && feedback && start && (
          <div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN }}>Your result · {start.subject}</div>
              <div style={{ margin: '14px auto 6px', position: 'relative', width: 132, height: 132 }}>
                <svg viewBox="0 0 120 120" width="132" height="132">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={GREEN} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(feedback.overall / 100) * 326.7} 326.7`} transform="rotate(-90 60 60)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900 }}>{feedback.overall}</div>
              </div>
              {feedback.headline && <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{feedback.headline}</div>}
              <div style={{ textAlign: 'left', marginTop: 20 }}>
                {DIMENSIONS.map(d => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', fontSize: 13 }}>
                    <div style={{ width: 84, color: 'var(--text-2, #cbd5e1)' }}>{d.label}</div>
                    <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${feedback.dimensions[d.key] * 10}%`, height: '100%', background: `linear-gradient(90deg,${GREEN},#059669)` }} />
                    </div>
                    <div style={{ width: 34, textAlign: 'right', fontWeight: 800 }}>{feedback.dimensions[d.key]}/10</div>
                  </div>
                ))}
              </div>
            </div>

            {answers.map((a, i) => (
              <div key={i} style={{ ...card, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3, #94a3b8)', marginBottom: 6 }}>QUESTION {i + 1} · {feedback.questions[i]?.score ?? 0}/10</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>{a.question}</div>
                {feedback.questions[i]?.feedback && <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)' }}>{feedback.questions[i].feedback}</div>}
                {feedback.questions[i]?.strongerAnswer && (
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: GREEN }}>What a stronger answer sounds like</summary>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginTop: 8 }}>{feedback.questions[i].strongerAnswer}</div>
                  </details>
                )}
              </div>
            ))}

            {feedback.nextStep && <div style={{ ...card, marginTop: 12, fontSize: 14.5, lineHeight: 1.6 }}><strong style={{ color: GREEN }}>Next step: </strong>{feedback.nextStep}</div>}

            <div style={{ ...card, marginTop: 14, textAlign: 'center', border: '1px solid rgba(52,211,153,0.35)', background: 'linear-gradient(135deg,rgba(52,211,153,0.10),rgba(4,120,87,0.06))' }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>That was 3 questions. The full interview is 10+.</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 16 }}>
                Create a free account and your first full interview is on us — with both interviewers, your CV and target role, a full scored report, and a shareable profile recruiters can watch.
              </div>
              <a href={REGISTER_URL} style={{ ...primary, display: 'block' }}>Start my free interview →</a>
              <button onClick={restart} style={{ background: 'none', border: 'none', color: 'var(--text-3, #94a3b8)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginTop: 12 }}>Try a different subject</button>
            </div>
          </div>
        )}

        {phase === 'blocked' && (
          <div style={{ ...card, textAlign: 'center', padding: '36px 22px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{capped ? "That's the free tries for now" : 'Something went wrong'}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 20 }}>{message}</div>
            {capped
              ? <a href={REGISTER_URL} style={primary}>Create a free account →</a>
              : <button onClick={restart} style={primary}>Try again</button>}
          </div>
        )}
      </div>
    </div>
  );
}
