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

function PremiumCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{
      borderRadius: '14px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A66C2, #004182)',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '8px',
      }}>
        <ExplainLogo />
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Prepare for this interview</span>
      </div>

      {/* Body */}
      <div style={{ background: '#fff', padding: '28px' }}>
        {/* Hero row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, flex: 1 }}>
            Get your tailored Interview Pack for this exact role — only £1
          </div>
          <div style={{
            background: '#FFE8A3',
            color: '#7A5A00',
            fontWeight: 700,
            fontSize: '15px',
            padding: '4px 10px',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            flexShrink: 0,
          }}>£1</div>
        </div>

        {/* Sub text */}
        <div style={{ fontSize: '15px', color: '#4A4A4A', lineHeight: 1.5, marginBottom: '20px' }}>
          20 AI‑generated practice questions<br />
          Tailored to your CV • Tailored to this job • Instant access
        </div>

        {/* CTA */}
        <button
          onClick={onOpen}
          style={{
            width: '100%',
            height: '52px',
            background: '#0A66C2',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#004182'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0A66C2'; }}
        >
          Get Interview Pack — £1
        </button>
      </div>

      {/* Footer */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '12px 28px 16px',
        fontSize: '12px',
        color: '#7A7A7A',
        textAlign: 'center',
      }}>
        <div>No login needed • Instant access</div>
        <div style={{ marginTop: '6px' }}>Powered by <span style={{ fontWeight: 700, color: '#555' }}>Explain</span>.global</div>
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
