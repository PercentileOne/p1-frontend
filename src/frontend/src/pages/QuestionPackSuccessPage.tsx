import { useEffect, useRef, useState } from 'react';
import { getQuestionPackByCheckoutSession, type QuestionPackContent } from '../api/questionPacksApi';

// Printable delivery page for a paid "Printable Interview Questions" pack (Francis, 2026-09-22) — same window.print() PDF
// pattern as CertificatePage.tsx, no library needed. Questions are listed first, model answers further down the page (after a
// print page-break) so a quick glance/print of page one alone doesn't hand over the answers immediately.
//
// The Stripe webhook (not this redirect) is what actually marks the pack paid, and it can lag the browser's own redirect by a
// second or two — so this polls a few times before giving up, rather than showing "not found" on a payment that's still landing.
const GREEN = '#047857';

export default function QuestionPackSuccessPage() {
  const [pack, setPack] = useState<QuestionPackContent | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'pending' | 'missing'>('loading');
  const attemptsRef = useRef(0);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) { setState('missing'); return; }

    let cancelled = false;
    const attempt = async () => {
      attemptsRef.current += 1;
      const res = await getQuestionPackByCheckoutSession(sessionId);
      if (cancelled) return;
      if (res.ok) { setPack(res.data); setState('done'); return; }
      if (attemptsRef.current >= 8) { setState('missing'); return; }
      setState('pending');
      setTimeout(attempt, 1500);
    };
    attempt();
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading' || state === 'pending') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #07080f)', color: 'rgba(255,255,255,0.7)', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          Confirming your payment…
        </div>
      </div>
    );
  }
  if (state === 'missing' || !pack) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #07080f)', color: '#fff', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>We can't find that order yet</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 380, margin: '0 auto 18px' }}>If you were just charged, refresh this page in a moment — or contact us if the questions still don't appear.</p>
          <a href="/questions" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', borderRadius: 12, padding: '12px 22px', fontWeight: 800, textDecoration: 'none' }}>Back to questions</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6fbf8', color: '#0f172a', padding: '32px 16px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .qp-actions { display: none !important; }
          .qp-page { padding: 0 !important; }
          .qp-answers { page-break-before: always; }
        }
      `}</style>

      <div className="qp-actions" style={{ width: '100%', maxWidth: 720, marginBottom: 18, display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <a href="/questions" style={{ fontSize: 13, fontWeight: 700, color: GREEN, textDecoration: 'none' }}>← Buy another pack</a>
        <button onClick={() => window.print()} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Download / Print as PDF
        </button>
      </div>

      <div className="qp-page" style={{ width: '100%', maxWidth: 720, background: '#fff', borderRadius: 16, border: `1px solid ${GREEN}33`, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>TIC</div>
          <span style={{ fontWeight: 800, fontSize: 15 }}><span style={{ color: GREEN }}>The</span>Interview<span style={{ color: GREEN }}>Chair</span>.com</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginTop: 18 }}>25 Interview Questions · {pack.difficulty} Level</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '6px 0 4px' }}>{pack.jobRole}</h1>
        {pack.focusAreas && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>Focus: {pack.focusAreas}</div>}

        <ol style={{ padding: '0 0 0 22px', margin: '18px 0 0', listStyleType: 'decimal', listStylePosition: 'outside' }}>
          {pack.questions.map((qa, i) => (
            <li key={i} style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 14, color: '#1e293b', paddingLeft: 6 }}>{qa.question}</li>
          ))}
        </ol>

        <div className="qp-answers" style={{ marginTop: 40, paddingTop: 24, borderTop: `2px dashed ${GREEN}44` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginBottom: 16 }}>Model Answers</div>
          {pack.questions.map((qa, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{i + 1}. {qa.question}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569' }}>{qa.answer}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
          Generated by TheInterviewChair.com — practice as many times as you like at candidate.theinterviewchair.com
        </div>
      </div>
    </div>
  );
}
