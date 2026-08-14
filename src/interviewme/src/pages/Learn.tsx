const CATEGORIES = [
  { icon: '🗣️', name: 'Communication', modules: 12, desc: 'Active listening, clarity under pressure, narrative structuring' },
  { icon: '💻', name: 'Technical', modules: 28, desc: 'System design, code interviews, architecture thinking' },
  { icon: '🧠', name: 'Behavioural', modules: 18, desc: 'STAR method, conflict resolution, leadership stories' },
  { icon: '🏦', name: 'Domain', modules: 34, desc: 'Finance, technology, healthcare, retail, energy sector modules' },
  { icon: '🤝', name: 'Culture Fit', modules: 9, desc: 'Remote team dynamics, leadership presence, values alignment' },
  { icon: '📊', name: 'Data & Analytics', modules: 16, desc: 'Data storytelling, SQL, visualisation, ML fundamentals' },
];

export default function Learn() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 12 }}>✦ LEARN ENGINE</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 16 }}>
          Turn interview signals into skills
        </h1>
        <p style={{ fontSize: 16, color: '#8080b0', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
          LEARN maps your real interview gaps to personalised modules — not generic content.
          Run an interview first, then let LEARN build your roadmap.
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(120,80,255,0.1)',
          border: '1px solid rgba(120,80,255,0.25)',
          borderRadius: 12, padding: '16px 24px',
          marginTop: 32, fontSize: 14, color: '#c0aaff',
        }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          Personalised roadmaps unlock after your first interview.
          <a href="https://recruiter.explain.global/demo/vallum-job" style={{ color: '#7b5cf5', fontWeight: 700, textDecoration: 'none' }}>
            Run a practice interview →
          </a>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#c0b8e0', marginBottom: 24 }}>Module categories</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {CATEGORIES.map(cat => (
          <div key={cat.name} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '22px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(120,80,255,0.35)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{cat.icon}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e0dcff' }}>{cat.name}</div>
              <div style={{ fontSize: 11, color: '#6060a0' }}>{cat.modules} modules</div>
            </div>
            <div style={{ fontSize: 13, color: '#7070a0', lineHeight: 1.6 }}>{cat.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
