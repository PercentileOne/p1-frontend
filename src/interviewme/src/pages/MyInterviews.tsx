export default function MyInterviews() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🎤</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 12 }}>✦ INTERVIEW HUB</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 16 }}>
        Your interview history
      </h1>
      <p style={{ fontSize: 16, color: '#8080b0', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
        See every interview you've run — scores, Q-by-Q feedback,
        LEARN recommendations, and playback (where permitted).
      </p>

      <div style={{
        background: 'rgba(120,80,255,0.08)',
        border: '1px solid rgba(120,80,255,0.25)',
        borderRadius: 14, padding: '32px', marginBottom: 32,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#c0aaff', marginBottom: 8 }}>Sign in to see your interviews</div>
        <p style={{ fontSize: 14, color: '#7070a0', lineHeight: 1.7, marginBottom: 20 }}>
          Your interview data is linked to your Explain account.
          Sign in to access your history, scores, and LEARN roadmap.
        </p>
        <button style={{
          background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
          color: '#fff', border: 'none',
          borderRadius: 10, padding: '12px 24px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          Sign in to Explain →
        </button>
      </div>

      <p style={{ fontSize: 13, color: '#5050a0' }}>
        No account?{' '}
        <a href="https://recruiter.explain.global/demo/vallum-job" style={{ color: '#7b5cf5', textDecoration: 'none', fontWeight: 600 }}>
          Run a free practice interview first →
        </a>
      </p>
    </div>
  );
}
