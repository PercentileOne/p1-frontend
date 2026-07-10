const cols = [
  { head: 'Product', links: ['Features','Cockpit','Percentile Ranking','My Story','Top Stories','Pricing'] },
  { head: 'Company', links: ['About','Blog','Careers','Press','Partners','Contact'] },
  { head: 'Legal',   links: ['Privacy Policy','Terms of Service','Cookie Policy','GDPR','Accessibility'] },
]

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-dark)', borderTop: '1px solid rgba(255,255,255,.06)', padding: '64px 0 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>P</div>
              <span style={{ fontWeight: 900, fontSize: 16, color: '#F1F5F9', letterSpacing: -0.5 }}>Percentile.One</span>
            </div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, maxWidth: 280, marginBottom: 20 }}>The world's first Personal Operating System. Track your identity, goals, habits, and skills — and discover exactly where you stand.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {['𝕏','in','f','▶'].map(s => (
                <div key={s} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#475569', cursor: 'pointer' }}>{s}</div>
              ))}
            </div>
          </div>
          {cols.map(c => (
            <div key={c.head}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#334155', marginBottom: 16 }}>{c.head}</div>
              {c.links.map(l => (
                <div key={l} style={{ fontSize: 13, color: '#475569', marginBottom: 10, cursor: 'pointer', transition: 'color .15s' }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#334155' }}>© 2025 Percentile.One Ltd. All rights reserved.</div>
          <div style={{ fontSize: 12, color: '#334155' }}>Built by founders, for founders. 🇬🇧</div>
        </div>
      </div>
    </footer>
  )
}
