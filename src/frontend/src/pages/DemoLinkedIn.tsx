import { useNavigate } from 'react-router-dom';

// Ported from recruiter-portal's DemoLinkedIn.tsx — now lives under the candidate portal's
// own "Demo" nav item instead, since these were always candidate-facing showcases of the
// Magic Button embed, not something a recruiter needed. Simplified from the original's
// MagicButton+PackPopup modal to a direct navigate — this page is reached from inside the
// already-logged-in candidate app now, not a public marketing page, so the popup's own
// CV-upload/job-spec-entry step is redundant with InterviewPackStart, which does the same
// thing as a full page.
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

function AIDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <rect x="1.5" y="1" width="9" height="12" rx="1.5" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" fill="none" />
      <line x1="4" y1="4.5" x2="8.5" y2="4.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="6.5" x2="7" y2="6.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="8.5" x2="8.5" y2="8.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" />
      <path d="M13 6.5L11.2 10h2.3L11.8 14" stroke="rgba(255,255,255,0.95)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DemoLinkedIn() {
  const navigate = useNavigate();

  const handleMagicButton = () => {
    navigate('/interview-pack/start', {
      state: {
        jobSpec: JOB_DESCRIPTION,
        jobTitle: 'Senior Software Engineer – FinTech Platform',
        company: 'Vallum Associates',
      },
    });
  };

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
            <button
              onClick={handleMagicButton}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px',
                padding: '11px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37,99,235,0.38), 0 1px 3px rgba(0,0,0,0.12)',
                letterSpacing: '-0.01em', whiteSpace: 'nowrap', fontFamily: 'inherit',
              }}
            >
              <AIDocIcon />
              Get Interview Pack
            </button>
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
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#000', marginBottom: '12px' }}>Similar jobs</div>
            {['Principal Backend Engineer · Monzo', 'Staff Engineer · Revolut', 'Lead .NET Developer · HSBC'].map(j => (
              <div key={j} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px', color: '#0A66C2', cursor: 'pointer' }}>{j}</div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: '#000', fontWeight: 700, marginBottom: '6px' }}>Powered by InterviewMe AI</div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
              Get 20 AI‑generated interview questions tailored to this exact role and your CV.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
