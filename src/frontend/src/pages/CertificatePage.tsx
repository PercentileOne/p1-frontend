import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCertificate, type PublicCertificate } from '../api/certificateApi';
import { PLATFORMS } from '../components/ShareModal';

// Public, no-login pass certificate (Francis, 2026-09-19): shareable, printable to PDF, and — deliberately — an
// advert for the platform. Always labelled a practice certificate; for a company-specific mock it says "mock" and that
// the company isn't involved, so it can't be mistaken for the real thing.
export default function CertificatePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [cert, setCert] = useState<PublicCertificate | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'missing'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) { setState('missing'); return; }
    getCertificate(token).then(c => { if (c) { setCert(c); setState('done'); } else setState('missing'); });
  }, [token]);

  if (state === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-2)' }}>Loading certificate…</div>;
  }
  if (state === 'missing' || !cert) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>This certificate isn't available</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380, margin: '0 auto 18px' }}>The link may be mistyped, or the interview it belongs to may have been deleted.</p>
          <button onClick={() => navigate('/interview-pack/start')} style={{ background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 800, cursor: 'pointer' }}>Try a mock interview</button>
        </div>
      </div>
    );
  }

  const name = cert.candidateName?.trim() || 'A TheInterviewChair.com candidate';
  const employer = cert.company?.trim() || '';
  const isCompanyMock = cert.companyMock && !!employer;
  const date = new Date(cert.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = isCompanyMock
    ? `I just passed my mock ${employer} interview on TheInterviewChair.com with ${cert.overallScore}%! 🏆 Practice for your dream company too:`
    : `I just passed my ${cert.role ? `${cert.role} ` : ''}mock interview on TheInterviewChair.com with ${cert.overallScore}%! 🏆`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Print: just the certificate, on white, no chrome. */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .cert-actions, .cert-cta { display: none !important; }
          .cert-page { background: #fff !important; padding: 0 !important; }
          .cert-card { box-shadow: none !important; border: 6px double #047857 !important; }
        }
      `}</style>

      <div className="cert-page" style={{ width: '100%', maxWidth: '760px' }}>
        <div className="cert-card" style={{
          background: 'linear-gradient(180deg,#ffffff 0%,#f6fbf8 100%)', color: '#0f172a', borderRadius: '20px',
          border: '6px double #047857', padding: '44px 40px', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>TIC</div>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}><span style={{ color: '#047857' }}>The</span>Interview<span style={{ color: '#047857' }}>Chair</span>.com</span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#047857' }}>Certificate of Achievement</div>
          <div style={{ fontSize: 40, margin: '10px 0 4px' }}>🏆</div>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>This certifies that</div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.15 }}>{name}</div>
          <div style={{ fontSize: 16, color: '#334155', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            {isCompanyMock
              ? <>passed a <strong>mock {employer} interview</strong>{cert.role ? <> for the role of <strong>{cert.role}</strong></> : null}, modelled on how {employer} publicly hires.</>
              : <>passed a <strong>{cert.difficulty}-level mock interview</strong>{cert.role ? <> for the role of <strong>{cert.role}</strong></> : null}.</>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', margin: '28px 0 6px' }}>
            <Stat label="Score" value={`${cert.overallScore}%`} accent />
            <Stat label="Pass mark" value={`${cert.passMark}%`} />
            <Stat label="Level" value={cert.difficulty} />
            <Stat label="Date" value={date} />
          </div>

          <div style={{ marginTop: 26, paddingTop: 16, borderTop: '1px solid #d1e7dc', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
            A practice certificate from TheInterviewChair.com — not an official qualification{isCompanyMock ? `, and not affiliated with or endorsed by ${employer}` : ''}.
            <br />Verify at {url.replace(/^https?:\/\//, '')}
          </div>
        </div>

        <div className="cert-actions" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => window.print()} style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            Download / Print as PDF
          </button>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'center', marginTop: 6 }}>Share your pass</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {PLATFORMS.map(p => (
              <a key={p.id} href={p.getUrl(url, shareText)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: 10, padding: '12px 14px', color: p.id === 'x' ? '#fff' : p.color, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                {p.icon}{p.label}
              </a>
            ))}
            <button onClick={copy} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? 'Link copied ✓' : 'Copy link'}
            </button>
          </div>
        </div>

        <div className="cert-cta" style={{ marginTop: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 12 }}>
            {isCompanyMock ? `Think you could pass a ${employer} interview?` : 'Think you could pass?'} Practice on any role — or interview like Google, Microsoft, M&amp;S and 190 more.
          </div>
          <button onClick={() => navigate('/interview-pack/start')} style={{ background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 26px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            Try your own mock interview →
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ? '#047857' : '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}
