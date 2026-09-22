import { useCallback, useEffect, useRef, useState } from 'react';
import { previewQuestion, getHotTopics, startQuestionPackCheckout } from '../api/questionPacksApi';

// "Printable Interview Questions" (Francis, 2026-09-22) — the standalone, no-login, no-live-interview product: name a job role,
// see one free sample question, pay a small one-off fee, land on /questions/success with a printable PDF of 25 questions + model
// answers. Meant to be advertised on LinkedIn and next to job adverts — the whole point is minimum friction, so there's no
// account, no email collection here (Stripe Checkout collects the buyer's email itself).
const GREEN = '#34D399';
const PRICE = '£1.99';

export default function QuestionPackPage() {
  const [role, setRole] = useState(() => { try { return (new URLSearchParams(window.location.search).get('role') ?? '').slice(0, 120); } catch { return ''; } });

  // Special Focus — same feature as the logged-in interview intake screen (InterviewPackStart.tsx): typed chips,
  // optionally seeded by "What's Hot" (currently in-demand topics for the named role, via its own capped endpoint —
  // see questionPacksApi.ts's own note on why this isn't the raw generateHotTopics/ai-proxy call that screen uses).
  const [focusInput, setFocusInput] = useState('');
  const [focusChips, setFocusChips] = useState<string[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);

  const [sample, setSample] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (trimmed.length < 2) { setSample(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSampleLoading(true);
      const res = await previewQuestion(trimmed, focusChips);
      setSampleLoading(false);
      if (res.ok) setSample(res.data.question);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, focusChips]);

  const buy = async () => {
    const trimmed = role.trim();
    if (trimmed.length < 2) { setError('Tell us the job role first.'); return; }
    setError(null);
    setBuying(true);
    const res = await startQuestionPackCheckout(trimmed, focusChips);
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
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, marginBottom: 8 }}>Sample question — free preview</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: sampleLoading ? 'rgba(255,255,255,0.4)' : '#fff' }}>{sampleLoading ? 'Thinking of a good one…' : sample}</div>
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
