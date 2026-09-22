import { useCallback, useEffect, useRef, useState } from 'react';
import { previewQuestion, getPreviewAnswer, getHotTopics, startQuestionPackCheckout, type QuestionPackDifficulty } from '../api/questionPacksApi';
import { speak } from '../api/ttsApi';

// "Printable Interview Questions" (Francis, 2026-09-22) — the standalone, no-login, no-live-interview product: name a job role,
// see one free sample question (with a revealable model answer), pay a small one-off fee, land on /questions/success with a
// printable PDF of 25 questions + model answers. Meant to be advertised on LinkedIn and next to job adverts — the whole point
// is minimum friction, so there's no account, no email collection here (Stripe Checkout collects the buyer's email itself).
const GREEN = '#34D399';
const PRICE = '£1.99';

// Same three levels/colours as InterviewPackStart.tsx's DIFFICULTIES — Beginner deliberately excluded here (Francis,
// 2026-09-22): this is a paid prep product for people already committing £1.99, Pro is the sensible default.
const DIFFICULTIES: { value: QuestionPackDifficulty; color: string; desc: string }[] = [
  { value: 'Standard', color: '#34D399', desc: 'Well-rounded questions to build genuine confidence.' },
  { value: 'Pro', color: '#F59E0B', desc: 'Challenging questions that probe deeper.' },
  { value: 'Expert', color: '#EF4444', desc: "Intense, technical — treated like the leading authority in the field." },
];

export default function QuestionPackPage() {
  const [role, setRole] = useState(() => { try { return (new URLSearchParams(window.location.search).get('role') ?? '').slice(0, 120); } catch { return ''; } });
  const [difficulty, setDifficulty] = useState<QuestionPackDifficulty>('Pro');

  // Special Focus — same feature as the logged-in interview intake screen (InterviewPackStart.tsx): typed chips,
  // optionally seeded by "What's Hot" (currently in-demand topics for the named role, via its own capped endpoint —
  // see questionPacksApi.ts's own note on why this isn't the raw generateHotTopics/ai-proxy call that screen uses).
  const [focusInput, setFocusInput] = useState('');
  const [focusChips, setFocusChips] = useState<string[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);

  const [sample, setSample] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read-aloud, Wayne's voice (same ElevenLabs proxy + role every /try session uses — see ttsApi.ts's speak()).
  const [speakingWhich, setSpeakingWhich] = useState<'question' | 'answer' | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelSpeechRef.current?.(), []); // never leave audio playing after navigating away

  const toggleSpeak = useCallback((which: 'question' | 'answer', text: string) => {
    cancelSpeechRef.current?.();
    if (speakingWhich === which) { setSpeakingWhich(null); return; }
    setSpeakingWhich(which);
    cancelSpeechRef.current = speak(text, 'technical', () => setSpeakingWhich(null));
  }, [speakingWhich]);

  const addFocusChip = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setFocusChips(prev => prev.some(c => c.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]);
  }, []);
  const removeFocusChip = useCallback((value: string) => setFocusChips(prev => prev.filter(c => c !== value)), []);

  const handleWhatsHot = useCallback(async () => {
    const trimmed = role.trim();
    if (!trimmed || hotTopicsLoading) return;
    setHotTopicsLoading(true);
    const res = await getHotTopics(trimmed);
    setHotTopicsLoading(false);
    if (res.ok) res.data.topics.forEach(addFocusChip);
  }, [role, hotTopicsLoading, addFocusChip]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = role.trim();
    setAnswer(null); setAnswerRevealed(false); // a new sample means any previously revealed answer no longer applies
    cancelSpeechRef.current?.(); setSpeakingWhich(null); // a new sample means any read-aloud in progress no longer matches what's on screen
    if (trimmed.length < 2) { setSample(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSampleLoading(true);
      const res = await previewQuestion(trimmed, focusChips, difficulty);
      setSampleLoading(false);
      setSample(res.ok ? res.data.question : null);
      // A capped/failed preview used to fail completely silently — the box just never appeared, which read as
      // "broken" rather than "try again shortly" (Francis, 2026-09-22).
      setError(res.ok ? null : res.message);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, focusChips, difficulty]);

  const revealAnswer = async () => {
    setAnswerRevealed(true);
    if (answer || answerLoading || !sample) return;
    setAnswerLoading(true);
    const res = await getPreviewAnswer(role.trim(), sample);
    setAnswerLoading(false);
    setAnswer(res.ok ? res.data.answer : "Couldn't load an example answer right now — please try again.");
  };

  const buy = async () => {
    const trimmed = role.trim();
    if (trimmed.length < 2) { setError('Tell us the job role first.'); return; }
    setError(null);
    setBuying(true);
    const res = await startQuestionPackCheckout(trimmed, focusChips, difficulty);
    if (res.ok) { window.location.href = res.data.checkoutUrl; return; }
    setBuying(false);
    setError(res.message);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07080f', color: '#fff', padding: '48px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{'@keyframes qpSpin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>No account needed · No live interview</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.2 }}>Download 25 AI Interview Questions</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Name the role. Get a printable PDF of 25 realistic questions with model answers — for {PRICE}, ready in seconds.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Job role</label>
          <input
            value={role}
            onChange={e => setRole(e.target.value.slice(0, 120))}
            placeholder="e.g. Product Manager at a fintech startup"
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#fff', marginBottom: 20 }}
          />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Level</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {DIFFICULTIES.map(d => {
              const active = difficulty === d.value;
              return (
                <button key={d.value} type="button" onClick={() => setDifficulty(d.value)} title={d.desc} style={{
                  flex: 1, background: active ? `${d.color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? d.color : 'rgba(255,255,255,0.12)'}`,
                  color: active ? d.color : 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 8px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}>{d.value}</button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Special Focus</span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>(optional — narrows questions to specific topics)</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              value={focusInput}
              onChange={e => setFocusInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFocusChip(focusInput); setFocusInput(''); }
              }}
              placeholder="e.g. Agentic AI Patterns — press Enter to add"
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 14px', fontSize: 14, color: '#fff' }}
            />
            <button
              type="button"
              onClick={handleWhatsHot}
              disabled={!role.trim() || hotTopicsLoading}
              title={!role.trim() ? 'Enter a job role first' : undefined}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)',
                borderRadius: 12, padding: '0 18px', color: '#a78bfa', fontSize: 13, fontWeight: 700,
                cursor: !role.trim() || hotTopicsLoading ? 'not-allowed' : 'pointer', opacity: !role.trim() ? 0.5 : 1,
              }}
            >
              {hotTopicsLoading ? (
                <span style={{ display: 'inline-block', width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.25)', borderTopColor: '#a78bfa', animation: 'qpSpin 0.7s linear infinite' }} />
              ) : '🔥'}
              What's Hot
            </button>
          </div>

          {focusChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {focusChips.map(chip => (
                <span key={chip} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 20, padding: '6px 8px 6px 14px', fontSize: 12.5, color: '#fff', fontWeight: 600 }}>
                  {chip}
                  <button type="button" onClick={() => removeFocusChip(chip)} aria-label={`Remove ${chip}`} style={{ width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          )}

          {(sampleLoading || sample) && (
            <div style={{ background: 'rgba(52,211,153,0.06)', border: `1px solid ${GREEN}33`, borderRadius: 14, padding: '16px 18px', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN }}>Sample question — free preview</div>
                {sample && !sampleLoading && <SpeakerButton active={speakingWhich === 'question'} onClick={() => toggleSpeak('question', sample)} />}
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: sampleLoading ? 'rgba(255,255,255,0.4)' : '#fff' }}>{sampleLoading ? 'Thinking of a good one…' : sample}</div>

              {sample && !sampleLoading && (
                answerRevealed ? (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Example answer</div>
                      {answer && !answerLoading && <SpeakerButton active={speakingWhich === 'answer'} onClick={() => toggleSpeak('answer', answer)} />}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>
                      {answerLoading ? 'Writing a strong example answer…' : answer}
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={revealAnswer} style={{
                    marginTop: 14, background: 'none', border: 'none', color: GREEN, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3,
                  }}>
                    Reveal example answer ▾
                  </button>
                )
              )}
            </div>
          )}

          {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</div>}

          <button onClick={buy} disabled={buying} style={{
            width: '100%', background: buying ? 'rgba(52,211,153,0.4)' : `linear-gradient(135deg,${GREEN},#047857)`, color: '#fff', border: 'none',
            borderRadius: 14, padding: '16px', fontSize: 15.5, fontWeight: 800, cursor: buying ? 'default' : 'pointer',
            boxShadow: buying ? 'none' : `0 10px 30px ${GREEN}33`,
          }}>
            {buying ? 'Preparing your questions…' : `Download 25 AI Interview Questions — ${PRICE}`}
          </button>
          <div style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 12 }}>Secure payment via Stripe. Instant PDF, no waiting.</div>
        </div>
      </div>
    </div>
  );
}

function SpeakerButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={active ? 'Stop reading aloud' : 'Read aloud'} title={active ? 'Stop' : "Read aloud — Wayne's voice"} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      background: active ? `${GREEN}33` : 'rgba(255,255,255,0.08)', border: `1px solid ${active ? GREEN : 'rgba(255,255,255,0.15)'}`,
      color: active ? GREEN : 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer',
    }}>
      {active ? '⏸' : '🔊'}
    </button>
  );
}
