import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveAvatarSession } from '../hooks/useLiveAvatarSession';
import { speak as speakTts } from '../api/ttsApi';
import { setInterviewTicket } from '../api/entitlementsApi';
import { VoiceInput } from '../components/VoiceInput';
import { startTryOut, scoreTryOut, coachTryOut, type TryOutStart, type TryOutFeedback, type TryOutResult } from '../api/tryOutApi';

// "Try it live" (Francis, 2026-09-21) — the public, no-account taste of the product for visitors from the marketing site and LinkedIn:
// name a job role, a live avatar asks three questions, answer by voice or text, and after each answer the Guardian Angel coach (the same
// plain narrator voice the full interview uses — not the avatar) gives brief coaching in its own coloured card, then the interviewer carries
// on by themselves. Finally an instant scored card and an invitation to register. Everything costly is capped server-side (see Features/TryOut);
// when the live-avatar allowance for the day is used up, or the avatar can't connect, the same flow runs voice-only.

const GREEN = '#34D399';
const AMBER = '#FBBF24';
const RED = '#F87171';
const ROLE_CHIPS = ['Product Manager', 'Software Engineer', 'Nurse', 'Marketing Manager', 'Data Analyst', 'Teacher'];
const REGISTER_URL = 'https://login.theinterviewchair.com/register';
const SHARE_URL = 'https://candidate.theinterviewchair.com/try?ref=share';
const DIMENSIONS: { key: keyof TryOutFeedback['dimensions']; label: string }[] = [
  { key: 'clarity', label: 'Clarity' }, { key: 'relevance', label: 'Relevance' }, { key: 'accuracy', label: 'Accuracy' },
  { key: 'depth', label: 'Depth' }, { key: 'confidence', label: 'Confidence' },
];

// Red below 3, amber below 7, green from 7 (scores are 0–10; the overall score is 0–100, so it is scaled).
const scoreColour = (score: number, outOf = 10) => { const s = outOf === 100 ? score / 10 : score; return s < 3 ? RED : s < 7 ? AMBER : GREEN; };
const coachTone = (score: number) => score >= 7 ? { emoji: '⭐', label: 'Great answer', accent: GREEN } : score >= 3 ? { emoji: '💡', label: "Good — here's how to level up", accent: AMBER } : { emoji: '🎯', label: "Let's strengthen this", accent: RED };

type Phase = 'topic' | 'starting' | 'asking' | 'answering' | 'coaching' | 'scoring' | 'results' | 'blocked';

export default function TryItLivePage() {
  const [phase, setPhase] = useState<Phase>('topic');
  // The marketing site's hero passes ?topic= so the visitor's role is already filled in.
  const [topic, setTopic] = useState(() => { try { return (new URLSearchParams(window.location.search).get('topic') ?? '').slice(0, 90); } catch { return ''; } });
  const [name, setName] = useState('');
  const [start, setStart] = useState<TryOutStart | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [coaching, setCoaching] = useState<{ text: string; score: number } | null>(null);
  const [feedback, setFeedback] = useState<TryOutFeedback | null>(null);
  const [message, setMessage] = useState('');
  const [capped, setCapped] = useState(false);
  const [useAvatar, setUseAvatar] = useState(false);
  const [avatarState, setAvatarState] = useState<'off' | 'connecting' | 'live'>('off');
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const busyRef = useRef(false);

  const hr = useLiveAvatarSession('hr');
  const technical = useLiveAvatarSession('technical');
  const avatar = start?.interviewer === 'technical' ? technical : hr;
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  // Never leave a billable avatar connection or a voice running when the page is left.
  useEffect(() => () => { cancelSpeechRef.current?.(); void hr.disconnect(); void technical.disconnect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The interviewer speaking: the live avatar when connected, otherwise their plain voice.
  const speakLine = useCallback(async (text: string, s: TryOutStart, viaAvatar: boolean) => {
    const seat = s.interviewer === 'technical' ? technical : hr;
    if (viaAvatar) {
      try { await seat.speak(text, s.interviewer); return; }
      catch { setUseAvatar(false); setAvatarState('off'); /* fall through to the voice-only path */ }
    }
    await new Promise<void>(resolve => { cancelSpeechRef.current = speakTts(text, s.interviewer, resolve); });
  }, [hr, technical]);

  // The Guardian Angel coach: always the plain narrator voice ('hr'), never the avatar — same as the full interview.
  const speakAsCoach = useCallback((text: string) => new Promise<void>(resolve => { cancelSpeechRef.current = speakTts(text, 'hr', resolve); }), []);

  const ask = useCallback(async (i: number, s: TryOutStart, viaAvatar: boolean) => {
    setPhase('asking'); setDraft(''); setCoaching(null);
    const q = s.questions[i];
    const hello = firstName ? `Hi ${firstName}, I'm ${s.interviewerName}.` : `Hi, I'm ${s.interviewerName}.`;
    // The first question also tells them exactly what to do — the most common confusion in early tests was not knowing how to answer or move on.
    const line = i === 0
      ? `${hello} Thanks for joining — let's start your ${s.subject} interview. ${q} When you're ready, click the green microphone button to answer out loud, or just type your answer below. Then click Next question — or skip it if you'd rather pass.`
      : q;
    await speakLine(line, s, viaAvatar);
    setPhase('answering');
  }, [speakLine, firstName]);

  async function begin() {
    const subject = topic.trim();
    if (subject.length < 2) return;
    setPhase('starting'); setMessage(''); setCapped(false);
    const r = await startTryOut(subject);
    if (!r.ok) { setMessage(r.message); setCapped(r.capped); setPhase('blocked'); return; }
    const s = r.data;
    setStart(s); setIndex(0); setAnswers([]); setSkipped(0); setFeedback(null); setShareOpen(false);
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
    if (live) await new Promise(res => setTimeout(res, 600));
    void ask(0, s, live);
  }

  // Answer (or skip) the current question: the Guardian Angel coach reacts, then the interviewer carries on by themselves —
  // no waiting for a second click, as in the full interview.
  async function submit(skip: boolean) {
    if (!start || busyRef.current) return;
    const text = skip ? '' : draft.trim();
    if (!skip && !text) return;
    busyRef.current = true;
    cancelSpeechRef.current?.();

    const q = start.questions[index];
    const isLast = index + 1 >= start.questions.length;
    const nextAnswers = skip ? answers : [...answers, { question: q, answer: text }];
    if (skip) setSkipped(n => n + 1); else setAnswers(nextAnswers);
    setPhase('coaching'); setCoaching(null);

    // On the last question, start scoring now so the result is ready by the time the closing words finish.
    let scoring: Promise<TryOutResult<TryOutFeedback>> | null = null;
    if (isLast && nextAnswers.length > 0) scoring = scoreTryOut(start.subject, nextAnswers);

    if (!skip) {
      const c = await coachTryOut(start.subject, q, text, firstName);
      const coach = c.ok ? { text: c.data.coaching, score: c.data.score } : { text: 'Thank you — that gives us something to work with.', score: 5 };
      setCoaching(coach);
      await speakAsCoach(coach.text);
    }
    const transition = skip
      ? (isLast ? "No problem. That's your three questions — let me put your result together." : "No problem — let's move on.")
      : (isLast ? "Thank you. That's your three questions — let me put your result together." : "Okay, let's continue your interview.");
    await speakLine(transition, start, useAvatar);

    if (!isLast) { setIndex(index + 1); busyRef.current = false; void ask(index + 1, start, useAvatar); return; }

    // Done: stop the (billed) avatar connection straight away.
    void avatar.disconnect(); setAvatarState('off');
    setPhase('scoring');
    if (!scoring) { setMessage("You skipped every question, so there's nothing to score yet. Try again whenever you're ready — even a short answer works."); setCapped(false); setPhase('blocked'); busyRef.current = false; return; }
    const r = await scoring;
    busyRef.current = false;
    if (!r.ok) { setMessage(r.message); setCapped(r.capped); setPhase('blocked'); return; }
    setFeedback(r.data); setPhase('results');
  }

  function restart() {
    cancelSpeechRef.current?.(); busyRef.current = false;
    void hr.disconnect(); void technical.disconnect();
    setStart(null); setAnswers([]); setSkipped(0); setFeedback(null); setDraft(''); setCoaching(null); setIndex(0); setAvatarState('off'); setUseAvatar(false); setShareOpen(false); setPhase('topic');
  }

  // ── Sharing ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const shareText = feedback && start
    ? `I just did a live AI mini interview for ${start.subject} on TheInterviewChair.com and scored ${feedback.overall}/100. Try yours free:`
    : 'I just tried a live AI mini interview on TheInterviewChair.com — pick any job role and be interviewed in 3 minutes. Free:';
  async function share() {
    const data = { title: 'TheInterviewChair.com', text: shareText, url: SHARE_URL };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share(data); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    setShareOpen(o => !o);
  }
  async function copyShare() {
    try { await navigator.clipboard.writeText(`${shareText} ${SHARE_URL}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }
  const enc = encodeURIComponent;

  const card: React.CSSProperties = { background: 'var(--bg2, #0f1829)', border: '1px solid var(--border, rgba(255,255,255,0.1))', borderRadius: 18, padding: 22 };
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg3, #14213a)', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: 12, padding: '13px 14px', color: 'var(--text, #f1f5f9)', fontSize: 15, outline: 'none', fontFamily: 'inherit' };
  const primary: React.CSSProperties = { background: `linear-gradient(135deg,${GREEN},#047857)`, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 22px', fontSize: 15, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', textAlign: 'center' };
  const ghost: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: 'var(--text, #f1f5f9)', border: '1px solid var(--border, rgba(255,255,255,0.14))', borderRadius: 12, padding: '14px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', textAlign: 'center' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3, #94a3b8)', marginBottom: 8 };

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
            <h1 style={{ fontSize: 'clamp(28px,6vw,42px)', lineHeight: 1.1, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Try it live.<br /><span style={{ color: GREEN }}>Be interviewed for real.</span></h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', margin: '0 0 22px' }}>
              Tell us the job you're going for. A live AI interviewer asks you three questions, your Guardian Angel coach helps after each answer, and you get a scored result.
            </p>
            <div style={card}>
              <label style={labelStyle} htmlFor="tryRole">Which job role should we interview you on?</label>
              <input id="tryRole" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && void begin()} maxLength={90}
                placeholder="e.g. Product Manager or Software Engineer" style={inputStyle} autoFocus />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 18px' }}>
                {ROLE_CHIPS.map(x => (
                  <button key={x} onClick={() => setTopic(x)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border, rgba(255,255,255,0.12))', color: 'var(--text-2, #cbd5e1)', borderRadius: 20, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>{x}</button>
                ))}
              </div>
              <label style={labelStyle} htmlFor="tryName">How should we address you? <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input id="tryName" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && void begin()} maxLength={30}
                placeholder="e.g. Sam" style={{ ...inputStyle, marginBottom: 18 }} autoComplete="given-name" />
              <button onClick={() => void begin()} disabled={topic.trim().length < 2} style={{ ...primary, width: '100%', opacity: topic.trim().length < 2 ? 0.5 : 1 }}>Start my mini interview →</button>
              <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', marginTop: 12, textAlign: 'center' }}>You can speak your answers or type them. Nothing is saved unless you create an account.</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => void share()} style={{ background: 'none', border: 'none', color: 'var(--text-3, #94a3b8)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>Know someone with an interview coming up? Share this</button>
              {shareOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`}>LinkedIn</a>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc(`${shareText} ${SHARE_URL}`)}`}>WhatsApp</a>
                  <button style={ghost} onClick={() => void copyShare()}>{copied ? 'Copied ✓' : 'Copy text + link'}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'starting' && (
          <div style={{ ...card, textAlign: 'center', padding: '48px 22px' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Preparing your interview…</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-3, #94a3b8)', marginTop: 8 }}>{avatarState === 'connecting' ? 'Your interviewer is taking their seat' : 'Writing three questions for your role'}</div>
          </div>
        )}

        {(phase === 'asking' || phase === 'answering' || phase === 'coaching' || phase === 'scoring') && start && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)', overflowWrap: 'anywhere' }}>Interview for <strong style={{ color: 'var(--text, #f1f5f9)' }}>{start.subject}</strong>{start.unlimited && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, color: AMBER }}>· demo mode — no limits</span>}</div>
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
                {phase === 'coaching'
                  ? (() => {
                    const tone = coaching ? coachTone(coaching.score) : { emoji: '👼', label: 'Considering your answer…', accent: GREEN };
                    return (
                      <div style={{ borderLeft: `4px solid ${tone.accent}`, paddingLeft: 16, boxShadow: `0 0 34px ${tone.accent}22` }}>
                        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: tone.accent, marginBottom: 8 }}>👼 Your Guardian Angel coach · {tone.emoji} {tone.label}</div>
                        <div style={{ fontSize: 16, lineHeight: 1.6 }}>{coaching?.text ?? 'Listening to how you did…'}</div>
                      </div>
                    );
                  })()
                  : (
                    <>
                      <div style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 700, marginBottom: 14 }}>{start.questions[index]}</div>
                      {phase === 'answering' ? (
                        <>
                          <div style={{ fontSize: 13.5, color: 'var(--text-2, #cbd5e1)', marginBottom: 10 }}>
                            Click the <strong style={{ color: GREEN }}>green microphone</strong> to answer out loud, or type your answer. Then click <strong>Next question</strong>.
                          </div>
                          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} placeholder="Type your answer here, or use the microphone…" style={{ ...inputStyle, resize: 'vertical' }} />
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 12 }}>
                            <VoiceInput onTranscript={text => setDraft(d => (d ? d + ' ' : '') + text)} />
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <button onClick={() => void submit(true)} style={ghost}>Skip</button>
                              <button onClick={() => void submit(false)} disabled={!draft.trim()} style={{ ...primary, opacity: draft.trim() ? 1 : 0.5 }}>
                                {index + 1 < start.questions.length ? 'Next question →' : 'Finish & get my score →'}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : <div style={{ fontSize: 13, color: 'var(--text-3, #94a3b8)' }}>Listen to the question — then it's your turn…</div>}
                    </>
                  )}
              </div>
            )}
            {phase === 'scoring' && <div style={{ ...card, marginTop: 14, textAlign: 'center', fontWeight: 700 }}>Scoring your answers…</div>}
          </div>
        )}

        {phase === 'results' && feedback && start && (
          <div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN }}>{firstName ? `${firstName}, your result` : 'Your result'} · {start.subject}</div>
              <div style={{ margin: '14px auto 6px', position: 'relative', width: 132, height: 132 }}>
                <svg viewBox="0 0 120 120" width="132" height="132">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColour(feedback.overall, 100)} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(feedback.overall / 100) * 326.7} 326.7`} transform="rotate(-90 60 60)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900, color: scoreColour(feedback.overall, 100) }}>{feedback.overall}</div>
              </div>
              {feedback.headline && <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{feedback.headline}</div>}
              <div style={{ textAlign: 'left', marginTop: 20 }}>
                {DIMENSIONS.map(d => {
                  const v = feedback.dimensions[d.key]; const c = scoreColour(v);
                  return (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', fontSize: 13 }}>
                      <div style={{ width: 84, color: 'var(--text-2, #cbd5e1)' }}>{d.label}</div>
                      <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${v * 10}%`, height: '100%', background: c, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ width: 40, textAlign: 'right', fontWeight: 800, color: c }}>{v}/10</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14, fontSize: 11.5, color: 'var(--text-3, #94a3b8)' }}>
                <span><span style={{ color: RED }}>●</span> needs work (under 3)</span><span><span style={{ color: AMBER }}>●</span> getting there (3–6)</span><span><span style={{ color: GREEN }}>●</span> strong (7+)</span>
              </div>
            </div>

            {answers.map((a, i) => {
              const sc = feedback.questions[i]?.score ?? 0;
              return (
                <div key={i} style={{ ...card, marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3, #94a3b8)', marginBottom: 6 }}>ANSWER {i + 1} · <span style={{ color: scoreColour(sc) }}>{sc}/10</span></div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>{a.question}</div>
                  {feedback.questions[i]?.feedback && <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)' }}>{feedback.questions[i].feedback}</div>}
                  {feedback.questions[i]?.strongerAnswer && (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: GREEN }}>What a stronger answer sounds like</summary>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginTop: 8 }}>{feedback.questions[i].strongerAnswer}</div>
                    </details>
                  )}
                </div>
              );
            })}
            {skipped > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-3, #94a3b8)', textAlign: 'center', marginTop: 10 }}>You skipped {skipped} question{skipped === 1 ? '' : 's'}, so only your answers are scored.</div>}

            {feedback.nextStep && <div style={{ ...card, marginTop: 12, fontSize: 14.5, lineHeight: 1.6 }}><strong style={{ color: GREEN }}>Next step: </strong>{feedback.nextStep}</div>}

            <div style={{ ...card, marginTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Proud of that? Show someone.</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-3, #94a3b8)', marginBottom: 14 }}>Share your result — and let a friend try it free.</div>
              <button onClick={() => void share()} style={primary}>Share my result</button>
              {shareOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 14 }}>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`}>LinkedIn</a>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc(`${shareText} ${SHARE_URL}`)}`}>WhatsApp</a>
                  <a style={ghost} target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(SHARE_URL)}`}>X</a>
                  <a style={ghost} href={`mailto:?subject=${enc('Try this AI mock interview')}&body=${enc(`${shareText}\n${SHARE_URL}`)}`}>Email</a>
                  <button style={ghost} onClick={() => void copyShare()}>{copied ? 'Copied ✓' : 'Copy text + link'}</button>
                </div>
              )}
            </div>

            <div style={{ ...card, marginTop: 14, textAlign: 'center', border: '1px solid rgba(52,211,153,0.35)', background: 'linear-gradient(135deg,rgba(52,211,153,0.10),rgba(4,120,87,0.06))' }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>That was 3 questions. The full interview is 10+.</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)', marginBottom: 16 }}>
                Create a free account and your first full interview is on us — with both interviewers, your CV and target role, a full scored report, and a shareable profile recruiters can watch.
              </div>
              <a href={REGISTER_URL} style={{ ...primary, display: 'block' }}>Start my free interview →</a>
              <button onClick={restart} style={{ background: 'none', border: 'none', color: 'var(--text-3, #94a3b8)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginTop: 12 }}>Try a different role</button>
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
