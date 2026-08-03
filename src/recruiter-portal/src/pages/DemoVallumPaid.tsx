import { useNavigate } from 'react-router-dom';

const JOB_DESCRIPTION = `
Head of Engineering – Digital Transformation
Vallum Associates · London (Hybrid)

We are seeking a Head of Engineering to lead our 40-person digital transformation programme. Reporting to the CTO, you will drive the modernisation of our core banking platform from legacy monolith to cloud-native microservices.

Key Responsibilities:
- Own the technical strategy and roadmap for platform modernisation
- Lead and grow a team of 4 engineering managers and 40 engineers
- Establish platform engineering and developer experience standards
- Deliver programme milestones on time and within £8m annual budget
- Partner with the CTO and COO to align engineering goals with business outcomes

Experience Required:
- 10+ years in software engineering, 4+ years in senior engineering leadership
- Delivered large-scale cloud migrations (Azure preferred)
- Strong C-level stakeholder management skills
- Financial services or regulated industry background
- Lean/Agile transformation experience
`.trim();

function ExplainLogo() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      overflow: 'hidden',
    }}>
      <img
        src="/assets/explain-logo.svg"
        alt="Explain"
        width={22}
        height={22}
        style={{ display: 'block' }}
      />
    </div>
  );
}

function CinematicChair() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 180,
      background: 'linear-gradient(180deg, #060518 0%, #08061a 60%, #07060f 100%)',
      overflow: 'hidden',
      borderRadius: '16px 16px 0 0',
    }}>
      {/* Ambient radial glow — screen light in a dark room */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -55%)',
        width: 200, height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(79,142,247,0.12) 0%, rgba(123,92,245,0.06) 40%, transparent 72%)',
        pointerEvents: 'none',
      }} />
      {/* Secondary warm rim light */}
      <div style={{
        position: 'absolute',
        top: 20, left: '50%',
        transform: 'translateX(-50%)',
        width: 140, height: 80,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(123,92,245,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Subtle grid lines — interview room floor feel */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }} viewBox="0 0 300 180" preserveAspectRatio="none">
        {[0,60,120,180,240,300].map(x => <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="white" strokeWidth="0.5"/>)}
        {[0,45,90,135,180].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="white" strokeWidth="0.5"/>)}
      </svg>

      {/* Interviewer presence — centred, cinematic */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -52%)',
        textAlign: 'center',
      }}>
        {/* Avatar ring */}
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #0f0d2a, #1a1560)',
          border: '1.5px solid rgba(79,142,247,0.4)',
          margin: '0 auto 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
          boxShadow: '0 0 0 4px rgba(79,142,247,0.06), 0 0 32px rgba(79,142,247,0.15)',
        }}>👩‍💼</div>

        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em', marginBottom: 3 }}>
          Sarah Mitchell
        </div>
        <div style={{ fontSize: 10, color: 'rgba(160,168,192,0.7)', marginBottom: 10, letterSpacing: '0.02em' }}>
          HR Director · AI Interviewer
        </div>

        {/* Live indicator */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.22)',
          borderRadius: 20, padding: '3px 10px',
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(34,197,94,0.85)', letterSpacing: '0.08em' }}>LIVE SESSION</span>
        </div>
      </div>

      {/* Waveform at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 2.5, alignItems: 'center',
      }}>
        {[2,4,8,12,7,4,10,6,3,9,5,2,8,11,5].map((h, i) => (
          <div key={i} style={{
            width: 2,
            height: h,
            background: i % 3 === 0 ? 'rgba(79,142,247,0.7)' : 'rgba(79,142,247,0.25)',
            borderRadius: 2,
          }} />
        ))}
      </div>

      {/* Bottom gradient fade into card body */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 48,
        background: 'linear-gradient(transparent, #07060f)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function PremiumCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{
      borderRadius: '16px',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      background: '#07060f',
      border: '1px solid rgba(79,142,247,0.16)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(79,142,247,0.08)',
    }}>
      {/* Cinematic chair — full width background hero */}
      <CinematicChair />

      {/* Brand strip — minimal, sits just below the chair scene */}
      <div style={{
        padding: '0 20px 16px',
        display: 'flex', alignItems: 'center', gap: '8px',
        borderBottom: '1px solid rgba(79,142,247,0.08)',
        marginTop: -4,
      }}>
        <ExplainLogo />
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(79,142,247,0.7)' }}>
          Explain.Global · Interview Preparation
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.02em', marginBottom: 5 }}>
          Get your tailored Interview Pack for this exact role
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 14, letterSpacing: '0.01em' }}>
          only £1
        </div>
        <div style={{ fontSize: 13, color: '#606080', lineHeight: 1.65, marginBottom: 20 }}>
          20 AI-generated practice questions · Tailored to your CV · Tailored to this job · Instant access
        </div>

        <button
          onClick={onOpen}
          style={{
            width: '100%',
            height: 50,
            background: 'linear-gradient(135deg, #4F8EF7 0%, #7b5cf5 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
            boxShadow: '0 4px 20px rgba(79,142,247,0.3)',
            transition: 'opacity 0.18s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          Get Interview Pack — £1
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px 16px',
        fontSize: 11,
        color: '#2a2840',
        textAlign: 'center',
        lineHeight: 1.7,
        marginTop: 4,
      }}>
        No login needed · Instant access<br />
        <span style={{ color: 'rgba(79,142,247,0.5)', fontWeight: 600 }}>Powered by Explain.Global</span>
      </div>
    </div>
  );
}

export default function DemoVallumPaid() {
  const navigate = useNavigate();

  const handleGetPack = () => {
    navigate('/interview-pack/start', {
      state: {
        jobSpec: JOB_DESCRIPTION,
        jobTitle: 'Head of Engineering – Digital Transformation',
        company: 'Vallum Associates',
      },
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '"Segoe UI", Arial, sans-serif', color: '#1a1a2e' }}>

      {/* Vallum nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '70px', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '16px', flexShrink: 0 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="6" fill="#1B3A6B"/>
              <text x="8" y="30" fontSize="18" fontWeight="800" fill="#fff" fontFamily="Arial">VA</text>
            </svg>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#1B3A6B', lineHeight: 1.1 }}>VALLUM</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#1B3A6B', letterSpacing: '0.05em', lineHeight: 1 }}>ASSOCIATES</div>
            </div>
          </div>
          {['About us', 'Industries', 'Employers', 'Candidates', 'Resources', 'Contact us'].map(n => (
            <span key={n} style={{ fontSize: '14px', color: '#333', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {n} {['About us','Industries','Employers','Candidates','Resources'].includes(n) ? '▾' : ''}
            </span>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            <button style={{ background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Search jobs</button>
            <button style={{ background: '#fff', color: '#1B3A6B', border: '2px solid #1B3A6B', borderRadius: '6px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Find talent</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>

        {/* Main content */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            <span style={{ color: '#1B3A6B', cursor: 'pointer' }}>← Back to jobs</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFF3CD', border: '1px solid #FFCD39', borderRadius: '4px', padding: '4px 10px', marginBottom: '16px', fontSize: '12px', fontWeight: 700, color: '#856404' }}>
            ★ Featured
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1a2e', margin: '0 0 24px', lineHeight: 1.2 }}>
            Head of Engineering – Digital Transformation
          </h1>
          <div style={{ background: '#f8f9fa', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                ['Posted', '20 July 2026'],
                ['Salary', '£150,000–£200,000 DOE'],
                ['Location', 'London (Hybrid)'],
                ['Job type', 'Permanent'],
                ['Discipline', 'Technology & Engineering'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>{k}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px' }}>Job description</h2>
          <pre style={{ fontFamily: 'inherit', fontSize: '14px', color: '#444', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: '0 0 32px' }}>{JOB_DESCRIPTION}</pre>
        </div>

        {/* Sidebar */}
        <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '60px' }}>
          <button style={{ width: '100%', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '8px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Apply Now <span>→</span>
          </button>
          <button style={{ width: '100%', background: '#fff', color: '#1B3A6B', border: '2px solid #1B3A6B', borderRadius: '8px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Save this job <span>→</span>
          </button>

          <PremiumCard onOpen={handleGetPack} />

          {/* Consultant */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '20px' }}>
            <img
              src="https://ui-avatars.com/api/?name=Jakub+Tomasik&background=1B3A6B&color=fff&size=64&bold=true"
              alt="Jakub Tomasik"
              style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '10px' }}
            />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', marginBottom: '2px' }}>Jakub (Kuba) Tomasik</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Senior Consultant</div>
            <div style={{ fontSize: '12px', color: '#1B3A6B', marginBottom: '4px' }}>✉ jakub@vallumassociates.com</div>
            <div style={{ fontSize: '12px', color: '#1B3A6B' }}>📞 +44 (0) 2045 143 809</div>
          </div>

          {/* Share */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px' }}>Share this job</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['in', 'X', 'f', '✉', '💬'].map(icon => (
                <div key={icon} style={{ width: '36px', height: '36px', border: '1px solid #e8e8e8', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer', color: '#444' }}>{icon}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
