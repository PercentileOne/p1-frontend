export default function AboutModal({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'modal-in .25s cubic-bezier(.34,1.56,.64,1) both' }}>
        <style>{`@keyframes modal-in{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', padding: '28px 32px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>P</div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>✕</button>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: -.5 }}>Why Percentile.One Exists</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', margin: 0 }}>The story behind the platform</p>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'none' }}>

          {/* Pull quote */}
          <div style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', borderLeft: '3px solid #6366F1', borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ fontSize: 15, fontStyle: 'italic', color: '#CBD5E1', lineHeight: 1.7, margin: 0 }}>
              "I was on dialysis three times a week. And I still had to show up. For my boys. For my ideas. For myself."
            </p>
          </div>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.8, margin: 0 }}>
            I didn't build Percentile.One in a fancy office. I built it from a hospital chair, a kidney ward, and a small room where I refused to give up.
          </p>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.8, margin: 0 }}>
            For years I managed my life through a daily template — morning prayers, blood pressure readings, medication schedules, gym goals, business ideas, gratitude lists. Every single day. It was the only thing that kept me moving forward when everything else said stop.
          </p>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.8, margin: 0 }}>
            I noticed something. The days I followed the system, I made progress. The days I didn't, I drifted. That template wasn't just organisation — it was the difference between surviving and building something real.
          </p>

          {/* Highlight */}
          <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 14, color: '#6EE7B7', lineHeight: 1.7, margin: 0, fontWeight: 600 }}>
              But no app existed that could track my habits over time, score my progress, connect my health, goals, identity and skills into one picture — and show me exactly where I stood.
            </p>
          </div>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.8, margin: 0 }}>
            So I built what I needed. Percentile.One is that daily template — reimagined as a full Personal Operating System.
          </p>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.8, margin: 0 }}>
            It's for anyone who has ever had to fight harder than most just to keep going. For anyone managing an illness, raising children alone, rebuilding after setbacks, or simply trying to become who they know they're capable of being.
          </p>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.8, margin: 0 }}>
            This platform was built for you.
          </p>

          {/* Founder sign-off */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0 0', borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 4 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0 }}>FC</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#E2E8F0' }}>Francis Cobbinah</div>
              <div style={{ fontSize: 12, color: '#475569' }}>Founder · Percentile.One</div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => { onClose(); onContact() }}
            style={{ width: '100%', padding: '14px 0', borderRadius: 50, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,.4)', marginTop: 4 }}
          >
            🚀 Start Your Journey
          </button>
        </div>
      </div>
    </div>
  )
}
