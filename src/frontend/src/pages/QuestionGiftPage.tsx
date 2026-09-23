import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getClientGift, type ClientGiftContent } from '../api/clientGiftsApi';

// Public landing page for a recruiter's "gift interview questions to your client" link (Francis,
// 2026-09-23 — see backend Features/ClientGifts). Copied from QuestionPackSuccessPage.tsx and
// trimmed (CLAUDE.md's "copy then trim" convention) — same print/PDF layout, no payment
// confirmation step since this was never a purchase, and a "gifted by" banner instead of a
// receipt.
const GREEN = '#047857';

export default function QuestionGiftPage() {
  const { id } = useParams<{ id: string }>();
  const [gift, setGift] = useState<ClientGiftContent | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'missing'>('loading');

  useEffect(() => {
    if (!id) { setState('missing'); return; }
    let cancelled = false;
    getClientGift(id).then(data => {
      if (cancelled) return;
      if (data) { setGift(data); setState('done'); } else { setState('missing'); }
    });
    return () => { cancelled = true; };
  }, [id]);

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #07080f)', color: 'rgba(255,255,255,0.7)', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          Loading your questions…
        </div>
      </div>
    );
  }
  if (state === 'missing' || !gift) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #07080f)', color: '#fff', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>We can't find that link</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 380, margin: '0 auto' }}>It may have been mistyped — check the email again, or ask your recruiter to resend it.</p>
        </div>
      </div>
    );
  }

  const fromLine = gift.agencyName ? `${gift.recruiterName}, from ${gift.agencyName}` : gift.recruiterName;

  return (
    <div style={{ minHeight: '100vh', background: '#f6fbf8', color: '#0f172a', padding: '32px 16px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .qg-actions { display: none !important; }
          .qg-page { padding: 0 !important; }
          .qg-answers { page-break-before: always; }
        }
      `}</style>

      <div className="qg-actions" style={{ width: '100%', maxWidth: 720, marginBottom: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Download / Print as PDF
        </button>
      </div>

      <div className="qg-page" style={{ width: '100%', maxWidth: 720, background: '#fff', borderRadius: 16, border: `1px solid ${GREEN}33`, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>TIC</div>
          <span style={{ fontWeight: 800, fontSize: 15 }}><span style={{ color: GREEN }}>The</span>Interview<span style={{ color: GREEN }}>Chair</span>.com</span>
        </div>
        <div style={{ marginTop: 18, background: `${GREEN}0f`, border: `1px solid ${GREEN}33`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: GREEN, fontWeight: 700 }}>
          🎁 A gift from {fromLine}{gift.employerCompany ? ` for ${gift.employerCompany}` : ''}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginTop: 18 }}>{gift.questions.length} Interview Questions · {gift.difficulty} Level</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '6px 0 4px' }}>{gift.jobRole}</h1>

        <ol style={{ padding: '0 0 0 22px', margin: '18px 0 0', listStyleType: 'decimal', listStylePosition: 'outside' }}>
          {gift.questions.map((qa, i) => (
            <li key={i} style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 14, color: '#1e293b', paddingLeft: 6 }}>{qa.question}</li>
          ))}
        </ol>

        <div className="qg-answers" style={{ marginTop: 40, paddingTop: 24, borderTop: `2px dashed ${GREEN}44` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginBottom: 16 }}>Model Answers</div>
          {gift.questions.map((qa, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{i + 1}. {qa.question}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569' }}>{qa.answer}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
          Sent to you via TheInterviewChair.com — the AI interview prep platform {fromLine} uses with candidates too.
        </div>
      </div>
    </div>
  );
}
