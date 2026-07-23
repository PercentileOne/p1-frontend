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

export default function DemoLinkedIn() {
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
