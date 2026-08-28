// Trimmed down from recruiter-portal's 4-demo "Demos" tab to the 2 that actually matter —
// one showcase of the Magic Button embed style (LinkedIn) and one of the full paid-upsell
// flow (Vallum) — now living under the candidate portal's own "Demo" nav item instead,
// since these were always candidate-facing showcases, not something a recruiter needed.
const DEMOS = [
  { title: 'LinkedIn-style Job Page', url: '/demo/linkedin-job', desc: 'Standard job board layout with the Magic Button in the apply row.' },
  { title: '💳 Vallum — Practice Pack £1', url: '/demo/vallum-job-paid', desc: 'A branded career page with a £1 upsell card — 20 AI‑generated practice questions tailored to this exact role and your CV, for £1.', accent: true },
];

export default function DemoPanel() {
  return (
    <div style={{ padding: '4px 0', maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 6px' }}>Demo</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>See what the Magic Button looks like embedded on a real job page.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEMOS.map(d => (
          <div key={d.url} style={{
            background: 'var(--bg2)', border: `1px solid ${d.accent ? 'rgba(167,139,250,0.35)' : 'var(--border)'}`,
            borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{d.desc}</div>
            </div>
            <button
              onClick={() => window.open(d.url, '_blank')}
              style={{
                background: d.accent ? 'rgba(167,139,250,0.15)' : 'var(--blue)',
                color: d.accent ? 'var(--purple, #a78bfa)' : '#fff',
                border: d.accent ? '1px solid rgba(167,139,250,0.4)' : 'none',
                borderRadius: 8, padding: '9px 18px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
              }}
            >
              Open Demo
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
