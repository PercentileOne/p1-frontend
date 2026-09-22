import { useEffect, useRef, useState } from 'react';
import { previewQuestion, startQuestionPackCheckout } from '../api/questionPacksApi';

// "Printable Interview Questions" (Francis, 2026-09-22) — the standalone, no-login, no-live-interview product: name a job role,
// see one free sample question, pay a small one-off fee, land on /questions/success with a printable PDF of 25 questions + model
// answers. Meant to be advertised on LinkedIn and next to job adverts — the whole point is minimum friction, so there's no
// account, no email collection here (Stripe Checkout collects the buyer's email itself).
const GREEN = '#34D399';
const FOCUS_CHIPS = ['Leadership', 'Remote work', 'Salary negotiation', 'Behavioural', 'Technical depth', 'Career change', 'First-time manager', 'AI & automation'];
const PRICE = '£1.99';

export default function QuestionPackPage() {
  const [role, setRole] = useState(() => { try { return (new URLSearchParams(window.location.search).get('role') ?? '').slice(0, 120); } catch { return ''; } });
  const [focus, setFocus] = useState<string[]>([]);
  const [customFocus, setCustomFocus] = useState('');
  const [sample, setSample] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleFocus = (chip: string) => setFocus(f => f.includes(chip) ? f.filter(c => c !== chip) : f.length < 6 ? [...f, chip] : f);
  const allFocus = () => customFocus.trim() ? [...focus, customFocus.trim()] : focus;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = role.trim();
    if (trimmed.length < 2) { setSample(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSampleLoading(true);
      const res = await previewQuestion(trimmed, allFocus());
      setSampleLoading(false);
      if (res.ok) setSample(res.data.question);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, focus, customFocus]);

  const buy = async () => {
    const trimmed = role.trim();
    if (trimmed.length < 2) { setError('Tell us the job role first.'); return; }
    setError(null);
    setBuying(true);
    const res = await startQuestionPackCheckout(trimmed, allFocus());
    if (res.ok) { window.location.href = res.data.checkoutUrl; return; }
    setBuying(false);
    setError(res.message);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07080f', color: '#fff', padding: '48px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>What's hot right now? <span style={{ fontWeight: 500, textTransform: 'none', color: 'rgba(255,255,255,0.35)' }}>(optional, pick up to 6)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {FOCUS_CHIPS.map(chip => {
              const active = focus.includes(chip);
              return (
                <button key={chip} onClick={() => toggleFocus(chip)} style={{
                  background: active ? `${GREEN}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? GREEN : 'rgba(255,255,255,0.12)'}`,
                  color: active ? GREEN : 'rgba(255,255,255,0.7)', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{chip}</button>
              );
            })}
          </div>
          <input
            value={customFocus}
            onChange={e => setCustomFocus(e.target.value.slice(0, 60))}
            placeholder="Or add your own focus — e.g. a specific tool, framework, or company"
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, color: '#fff', marginBottom: 22 }}
          />

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
