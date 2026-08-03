import { MagicButton, EXPLAIN_CTA_LONG } from '../components/MagicButton';

const JOB_DESCRIPTION = `
Senior Software Engineer – FinTech Platform
Vallum Associates · London, UK (Hybrid) · Full-time

About the role:
We are looking for a Senior Software Engineer to join our growing FinTech platform team. You will own critical infrastructure powering real-time payments and data pipelines for institutional clients.

Responsibilities:
- Design and build high-throughput, low-latency APIs in C# / .NET 8
- Lead technical decisions across a team of 4–6 engineers
- Collaborate with product and compliance to ship features quickly and safely
- Maintain 99.99% uptime for payment processing systems
- Drive adoption of platform engineering standards

Requirements:
- 5+ years of backend engineering experience
- Strong C# / .NET background; Azure experience preferred
- Experience with event-driven architectures (Kafka or Service Bus)
- Track record of mentoring junior engineers
- Financial services or regulated industry experience a plus
`.trim();

const sections = [
  {
    label: 'About the company',
    content: 'Vallum Associates is a leading mid-market investment bank headquartered in London, operating across 14 countries with over 2,400 employees. We deliver institutional-grade financial services with a technology-first philosophy.',
  },
  {
    label: 'What we offer',
    content: '£90,000–£120,000 base salary · Annual performance bonus · 30 days holiday · Comprehensive pension · Private health (Bupa) · Flexible hybrid working',
  },
  {
    label: 'Skills',
    content: 'C# · .NET · Azure · Microservices · SQL Server · CI/CD · Kafka · Docker · Kubernetes',
  },
];

// ── £1 Practice Pack card — demo only, no backend, no payment ────────────────

function CinematicChair() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 160,
      background: 'linear-gradient(180deg, #060518 0%, #08061a 60%, #07060f 100%)',
      overflow: 'hidden',
      borderRadius: '14px 14px 0 0',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -55%)',
        width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(79,142,247,0.11) 0%, rgba(123,92,245,0.05) 40%, transparent 72%)',
        pointerEvents: 'none',
      }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }} viewBox="0 0 300 160" preserveAspectRatio="none">
        {[0,60,120,180,240,300].map(x => <line key={x} x1={x} y1="0" x2={x} y2="160" stroke="white" strokeWidth="0.5"/>)}
        {[0,40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="white" strokeWidth="0.5"/>)}
      </svg>
      <div style={{
        position: 'absolute', top: '46%', left: '50%',
        transform: 'translate(-50%, -52%)', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(145deg, #0f0d2a, #1a1560)',
          border: '1.5px solid rgba(79,142,247,0.4)',
          margin: '0 auto 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          boxShadow: '0 0 0 4px rgba(79,142,247,0.05), 0 0 28px rgba(79,142,247,0.13)',
        }}>👩‍💼</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>Sarah Mitchell</div>
        <div style={{ fontSize: 9, color: 'rgba(160,168,192,0.65)', marginBottom: 8 }}>HR Director · AI Interviewer</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '2px 9px' }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(34,197,94,0.8)', letterSpacing: '0.08em' }}>LIVE SESSION</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2, alignItems: 'center' }}>
        {[2,4,7,11,6,4,9,5,3,8,4].map((h, i) => (
          <div key={i} style={{ width: 2, height: h, background: i % 3 === 0 ? 'rgba(79,142,247,0.65)' : 'rgba(79,142,247,0.22)', borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, background: 'linear-gradient(transparent, #07060f)', pointerEvents: 'none' }} />
    </div>
  );
}

function PracticePack() {
  return (
    <div style={{
      background: '#07060f',
      border: '1px solid rgba(79,142,247,0.15)',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(79,142,247,0.07)',
      fontFamily: '-apple-system, "Segoe UI", sans-serif',
    }}>
      <CinematicChair />

      {/* Brand strip */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid rgba(79,142,247,0.07)', marginTop: -2 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="1" width="9" height="12" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.25" fill="none"/>
            <path d="M13 6.5L11.2 10h2.3L11.8 14" stroke="rgba(79,142,247,0.9)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(79,142,247,0.6)' }}>
          Explain.Global · Interview Preparation
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Get your tailored Interview Pack for this exact role
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>only £1</div>
        <div style={{ fontSize: 12, color: '#555070', lineHeight: 1.65, marginBottom: 16 }}>
          20 AI-generated practice questions · Tailored to your CV · Tailored to this job · Instant access
        </div>
        <button style={{
          width: '100%', height: 46,
          background: 'linear-gradient(135deg, #4F8EF7 0%, #7b5cf5 100%)',
          color: '#fff', border: 'none', borderRadius: '9px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(79,142,247,0.28)',
        }}>
          Get Interview Pack — £1
        </button>
      </div>

      <div style={{ padding: '10px 16px 14px', fontSize: 10, color: '#252340', textAlign: 'center', lineHeight: 1.6 }}>
        No login needed · Instant access<br />
        <span style={{ color: 'rgba(79,142,247,0.45)', fontWeight: 600 }}>Powered by Explain.Global</span>
      </div>
    </div>
  );
}

export default function DemoLinkedInPaid() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f2ef', fontFamily: '-apple-system, "Segoe UI", sans-serif' }}>
      {/* LinkedIn-style top nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 16px' }}>
        <div style={{ maxWidth: '1128px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '52px', gap: '8px' }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="4" fill="#0A66C2"/><text x="5" y="26" fontSize="22" fontWeight="800" fill="#fff">in</text></svg>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '13px', color: '#666', background: '#f3f2ef', border: '1px solid #c9c9c9', borderRadius: '16px', padding: '6px 16px', cursor: 'default' }}>Jobs</div>
          <div style={{ fontSize: '13px', color: '#0A66C2', fontWeight: 600, border: '1px solid #0A66C2', borderRadius: '16px', padding: '6px 16px', cursor: 'pointer' }}>Sign in</div>
        </div>
      </nav>

      <div style={{ maxWidth: '1128px', margin: '0 auto', padding: '24px 16px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Main job card */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '24px' }}>
          {/* Company + role header */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', background: '#0A66C2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 800, flexShrink: 0 }}>V</div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#000', margin: '0 0 4px' }}>Senior Software Engineer – FinTech Platform</h1>
              <div style={{ fontSize: '14px', color: '#0A66C2', fontWeight: 500, marginBottom: '2px' }}>Vallum Associates</div>
              <div style={{ fontSize: '13px', color: '#666' }}>London, England, United Kingdom · Hybrid · Full-time</div>
            </div>
          </div>

          {/* Meta chips */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {['201–500 employees', '24 applicants', 'Be an early applicant'].map(t => (
              <span key={t} style={{ fontSize: '12px', color: '#666', background: '#f3f2ef', borderRadius: '4px', padding: '4px 10px' }}>{t}</span>
            ))}
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
            <button style={{ background: '#0A66C2', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Easy Apply</button>
            <button style={{ background: 'transparent', color: '#0A66C2', border: '1px solid #0A66C2', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Save</button>

            {/* Magic Button */}
            <MagicButton jobDescriptionText={JOB_DESCRIPTION} />
          </div>

          {/* Job description */}
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: '0 0 12px' }}>About the job</h2>
          {sections.map(s => (
            <div key={s.label} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#000', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>{s.content}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#000', marginBottom: '8px' }}>Full job description</div>
            <pre style={{ fontFamily: 'inherit', fontSize: '14px', color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{JOB_DESCRIPTION}</pre>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          {/* £1 Practice Pack card — demo only */}
          <PracticePack />

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#000', marginBottom: '12px' }}>Similar jobs</div>
            {['Principal Backend Engineer · Monzo', 'Staff Engineer · Revolut', 'Lead .NET Developer · HSBC'].map(j => (
              <div key={j} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px', color: '#0A66C2', cursor: 'pointer' }}>{j}</div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: '#000', fontWeight: 700, marginBottom: '6px' }}>Powered by Explain AI</div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
              {EXPLAIN_CTA_LONG}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
