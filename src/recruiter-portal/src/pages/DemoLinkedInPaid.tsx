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

function MastermindChairHeroLi() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 174,
      background: 'linear-gradient(180deg, #06102a 0%, #050d20 65%, #040a18 100%)',
      overflow: 'hidden',
      borderRadius: '14px 14px 0 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Overhead interrogation spotlight */}
      <div style={{
        position: 'absolute',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', height: '100%',
        background: 'radial-gradient(ellipse 55% 90% at 50% -5%, rgba(160,190,255,0.32) 0%, rgba(90,130,220,0.14) 28%, rgba(30,60,130,0.04) 58%, transparent 78%)',
        pointerEvents: 'none',
      }} />

      {/* Mastermind chair */}
      <svg viewBox="0 0 185 228" style={{ height: 130, width: 'auto', display: 'block', flexShrink: 0, position: 'relative', zIndex: 1 }} aria-label="Interview Chair">
        <defs>
          <linearGradient id="liPad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#bcc4d6"/>
            <stop offset="8%"   stopColor="#5a5270"/>
            <stop offset="22%"  stopColor="#1a1630"/>
            <stop offset="100%" stopColor="#050310"/>
          </linearGradient>
          <linearGradient id="liChr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#dce0ee"/>
            <stop offset="28%"  stopColor="#888ca8"/>
            <stop offset="62%"  stopColor="#b8bcd0"/>
            <stop offset="100%" stopColor="#606478"/>
          </linearGradient>
          <linearGradient id="liHr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#d0d8e8"/>
            <stop offset="14%"  stopColor="#504868"/>
            <stop offset="35%"  stopColor="#18142c"/>
            <stop offset="100%" stopColor="#050310"/>
          </linearGradient>
          <linearGradient id="liSt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#181430"/>
            <stop offset="100%" stopColor="#040210"/>
          </linearGradient>
        </defs>
        <rect x="33" y="16" width="9"   height="111" rx="3"   fill="#a0a8c4"/>
        <rect x="33" y="16" width="2.5" height="111" rx="1"   fill="rgba(240,246,255,0.72)"/>
        <rect x="143" y="16" width="9"  height="111" rx="3"   fill="#4a4e66"/>
        <rect x="33" y="11" width="119" height="8"   rx="3"   fill="url(#liChr)"/>
        <rect x="33" y="11" width="119" height="2.5" rx="1"   fill="rgba(240,248,255,0.8)"/>
        <rect x="42" y="19" width="101" height="18"  rx="4"   fill="url(#liHr)"/>
        <rect x="42" y="19" width="101" height="4.5" rx="2"   fill="rgba(210,220,240,0.34)"/>
        <rect x="42" y="34" width="101" height="3"           fill="rgba(0,0,0,0.65)"/>
        <rect x="33" y="37" width="119" height="8"   rx="1.5" fill="url(#liChr)"/>
        <rect x="33" y="37" width="119" height="2.5" rx="1"   fill="rgba(230,238,255,0.65)"/>
        <rect x="33" y="43" width="119" height="2"           fill="rgba(0,0,0,0.4)"/>
        <rect x="42" y="45" width="101" height="24"  rx="3"   fill="url(#liPad)"/>
        <rect x="42" y="45" width="101" height="5.5" rx="2"   fill="rgba(190,200,220,0.28)"/>
        <rect x="42" y="66" width="101" height="3"           fill="rgba(0,0,0,0.65)"/>
        <rect x="33" y="69" width="119" height="8"   rx="1.5" fill="url(#liChr)"/>
        <rect x="33" y="69" width="119" height="2.5" rx="1"   fill="rgba(220,230,250,0.6)"/>
        <rect x="33" y="75" width="119" height="2"           fill="rgba(0,0,0,0.38)"/>
        <rect x="42" y="77" width="101" height="24"  rx="3"   fill="url(#liPad)"/>
        <rect x="42" y="77" width="101" height="5"   rx="2"   fill="rgba(170,180,205,0.23)"/>
        <rect x="42" y="98" width="101" height="3"           fill="rgba(0,0,0,0.62)"/>
        <rect x="33" y="101" width="119" height="8"  rx="1.5" fill="url(#liChr)"/>
        <rect x="33" y="101" width="119" height="2.5" rx="1"  fill="rgba(210,222,248,0.55)"/>
        <rect x="33" y="107" width="119" height="2"          fill="rgba(0,0,0,0.36)"/>
        <rect x="42" y="109" width="101" height="22" rx="3"   fill="url(#liPad)"/>
        <rect x="42" y="109" width="101" height="4.5" rx="2"  fill="rgba(150,162,192,0.2)"/>
        <rect x="42" y="128" width="101" height="3"          fill="rgba(0,0,0,0.6)"/>
        <rect x="33" y="131" width="119" height="8"  rx="1.5" fill="url(#liChr)"/>
        <rect x="33" y="131" width="119" height="2.5" rx="1"  fill="rgba(200,214,244,0.5)"/>
        <rect x="14"  y="119" width="23" height="7"  rx="3.5" fill="url(#liChr)"/>
        <rect x="14"  y="119" width="23" height="2.5" rx="1"  fill="rgba(230,238,255,0.56)"/>
        <rect x="17"  y="126" width="8"  height="20" rx="2"   fill="#7880a0"/>
        <rect x="148" y="119" width="23" height="7"  rx="3.5" fill="#606480"/>
        <rect x="160" y="126" width="8"  height="20" rx="2"   fill="#484862"/>
        <rect x="17"  y="139" width="151" height="7" rx="3"   fill="url(#liChr)"/>
        <rect x="17"  y="139" width="151" height="2.5" rx="1" fill="rgba(210,222,248,0.47)"/>
        <rect x="19"  y="146" width="147" height="27" rx="4"  fill="url(#liSt)"/>
        <rect x="19"  y="146" width="147" height="6"  rx="3"  fill="rgba(80,90,130,0.22)"/>
        <rect x="19"  y="170" width="147" height="3"         fill="rgba(0,0,0,0.6)"/>
        <rect x="17"  y="173" width="151" height="5"  rx="2"  fill="url(#liChr)"/>
        <rect x="78"  y="177" width="29"  height="8"  rx="3.5" fill="url(#liChr)"/>
        <rect x="83"  y="185" width="19"  height="14" rx="4"  fill="#131028"/>
        <rect x="86"  y="197" width="13"  height="7"  rx="3"  fill="url(#liChr)"/>
        <circle cx="92" cy="208" r="6"   fill="url(#liChr)"/>
        <circle cx="92" cy="208" r="2"   fill="rgba(240,248,255,0.7)"/>
        <g stroke="#9298b2" strokeWidth="5.5" strokeLinecap="round">
          <line x1="92" y1="208" x2="92" y2="220" transform="rotate(36,92,208)"/>
          <line x1="92" y1="208" x2="92" y2="220" transform="rotate(108,92,208)"/>
          <line x1="92" y1="208" x2="92" y2="220" transform="rotate(180,92,208)"/>
          <line x1="92" y1="208" x2="92" y2="220" transform="rotate(252,92,208)"/>
          <line x1="92" y1="208" x2="92" y2="220" transform="rotate(324,92,208)"/>
        </g>
        <g fill="#8890a4">
          <circle cx="92" cy="220" r="4" transform="rotate(36,92,208)"/>
          <circle cx="92" cy="220" r="4" transform="rotate(108,92,208)"/>
          <circle cx="92" cy="220" r="4" transform="rotate(180,92,208)"/>
          <circle cx="92" cy="220" r="4" transform="rotate(252,92,208)"/>
          <circle cx="92" cy="220" r="4" transform="rotate(324,92,208)"/>
        </g>
        <ellipse cx="92" cy="226" rx="56" ry="4.5" fill="rgba(0,0,0,0.4)"/>
      </svg>

      {/* Bottom gradient fade */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0, height: 40,
        background: 'linear-gradient(transparent, #040a18)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function PracticePack() {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #07112a 0%, #050d20 60%, #040a18 100%)',
      border: '1px solid rgba(79,142,247,0.2)',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(79,142,247,0.1)',
      fontFamily: '-apple-system, "Segoe UI", sans-serif',
    }}>
      <MastermindChairHeroLi />

      {/* Brand strip */}
      <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid rgba(79,142,247,0.1)', marginTop: -2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.01em' }}>
          <span style={{ color: '#4F8EF7' }}>www.</span>
          <span style={{ color: '#ffffff' }}>Interview</span>
          <span style={{ color: '#34D399' }}>Me</span>
          <span style={{ color: '#4F8EF7' }}>.global</span>
        </span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Get your tailored Interview Pack for this exact role
        </div>
        <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, marginBottom: 12 }}>only £1</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: 16 }}>
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

      <div style={{ padding: '10px 16px 14px', fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6 }}>
        No login needed · Instant access<br />
        <span style={{ color: '#4F8EF7', fontWeight: 700 }}>Powered by InterviewMe.Global</span>
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
            <div style={{ fontSize: '13px', color: '#000', fontWeight: 700, marginBottom: '6px' }}>Powered by InterviewMe AI</div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
              {EXPLAIN_CTA_LONG}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
