const TOPICS = ['#firstjob', '#techjob', '#rejection', '#offer', '#prep', '#STAR', '#salarynego', '#remotework'];

export default function Community() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>💬</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 12 }}>✦ COMMUNITY</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 16 }}>
        Where candidates meet
      </h1>
      <p style={{ fontSize: 16, color: '#8080b0', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
        Share your interview story. Read lessons from others.
        Ask questions. Celebrate wins. This space is yours.
      </p>

      <div style={{
        background: 'rgba(120,80,255,0.08)',
        border: '1px solid rgba(120,80,255,0.25)',
        borderRadius: 14, padding: '32px',
        marginBottom: 40,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#c0aaff', marginBottom: 8 }}>Coming in Phase 2</div>
        <p style={{ fontSize: 14, color: '#7070a0', lineHeight: 1.7 }}>
          The Community feed is launching soon. You'll be able to post interview stories,
          share advice, and follow topics that matter to your career.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {TOPICS.map(tag => (
          <div key={tag} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '6px 14px',
            fontSize: 13, color: '#9090c0', cursor: 'pointer',
          }}>{tag}</div>
        ))}
      </div>
    </div>
  );
}
