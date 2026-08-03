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

function MastermindChairHero() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 188,
      background: 'linear-gradient(180deg, #06102a 0%, #050d20 65%, #040a18 100%)',
      overflow: 'hidden',
      borderRadius: '16px 16px 0 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Overhead interrogation spotlight — cone from top */}
      <div style={{
        position: 'absolute',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', height: '100%',
        background: 'radial-gradient(ellipse 55% 90% at 50% -5%, rgba(160,190,255,0.32) 0%, rgba(90,130,220,0.14) 28%, rgba(30,60,130,0.04) 58%, transparent 78%)',
        pointerEvents: 'none',
      }} />

      {/* The Mastermind / Eames chair — centred, cinematic */}
      <svg viewBox="0 0 185 228" style={{ height: 142, width: 'auto', display: 'block', flexShrink: 0, position: 'relative', zIndex: 1 }} aria-label="Interview Chair">
        <defs>
          <linearGradient id="vPad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#bcc4d6"/>
            <stop offset="8%"   stopColor="#5a5270"/>
            <stop offset="22%"  stopColor="#1a1630"/>
            <stop offset="100%" stopColor="#050310"/>
          </linearGradient>
          <linearGradient id="vChr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#dce0ee"/>
            <stop offset="28%"  stopColor="#888ca8"/>
            <stop offset="62%"  stopColor="#b8bcd0"/>
            <stop offset="100%" stopColor="#606478"/>
          </linearGradient>
          <linearGradient id="vHr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#d0d8e8"/>
            <stop offset="14%"  stopColor="#504868"/>
            <stop offset="35%"  stopColor="#18142c"/>
            <stop offset="100%" stopColor="#050310"/>
          </linearGradient>
          <linearGradient id="vSt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#181430"/>
            <stop offset="100%" stopColor="#040210"/>
          </linearGradient>
        </defs>
        {/* Rails */}
        <rect x="33" y="16" width="9"   height="111" rx="3"   fill="#a0a8c4"/>
        <rect x="33" y="16" width="2.5" height="111" rx="1"   fill="rgba(240,246,255,0.72)"/>
        <rect x="143" y="16" width="9"  height="111" rx="3"   fill="#4a4e66"/>
        {/* Top cap */}
        <rect x="33" y="11" width="119" height="8"   rx="3"   fill="url(#vChr)"/>
        <rect x="33" y="11" width="119" height="2.5" rx="1"   fill="rgba(240,248,255,0.8)"/>
        {/* Headrest */}
        <rect x="42" y="19" width="101" height="18"  rx="4"   fill="url(#vHr)"/>
        <rect x="42" y="19" width="101" height="4.5" rx="2"   fill="rgba(210,220,240,0.34)"/>
        <rect x="42" y="34" width="101" height="3"           fill="rgba(0,0,0,0.65)"/>
        {/* Strip below headrest */}
        <rect x="33" y="37" width="119" height="8"   rx="1.5" fill="url(#vChr)"/>
        <rect x="33" y="37" width="119" height="2.5" rx="1"   fill="rgba(230,238,255,0.65)"/>
        <rect x="33" y="43" width="119" height="2"           fill="rgba(0,0,0,0.4)"/>
        {/* Pad 1 */}
        <rect x="42" y="45" width="101" height="24"  rx="3"   fill="url(#vPad)"/>
        <rect x="42" y="45" width="101" height="5.5" rx="2"   fill="rgba(190,200,220,0.28)"/>
        <rect x="42" y="66" width="101" height="3"           fill="rgba(0,0,0,0.65)"/>
        {/* Strip 1 */}
        <rect x="33" y="69" width="119" height="8"   rx="1.5" fill="url(#vChr)"/>
        <rect x="33" y="69" width="119" height="2.5" rx="1"   fill="rgba(220,230,250,0.6)"/>
        <rect x="33" y="75" width="119" height="2"           fill="rgba(0,0,0,0.38)"/>
        {/* Pad 2 */}
        <rect x="42" y="77" width="101" height="24"  rx="3"   fill="url(#vPad)"/>
        <rect x="42" y="77" width="101" height="5"   rx="2"   fill="rgba(170,180,205,0.23)"/>
        <rect x="42" y="98" width="101" height="3"           fill="rgba(0,0,0,0.62)"/>
        {/* Strip 2 */}
        <rect x="33" y="101" width="119" height="8"  rx="1.5" fill="url(#vChr)"/>
        <rect x="33" y="101" width="119" height="2.5" rx="1"  fill="rgba(210,222,248,0.55)"/>
        <rect x="33" y="107" width="119" height="2"          fill="rgba(0,0,0,0.36)"/>
        {/* Pad 3 */}
        <rect x="42" y="109" width="101" height="22" rx="3"   fill="url(#vPad)"/>
        <rect x="42" y="109" width="101" height="4.5" rx="2"  fill="rgba(150,162,192,0.2)"/>
        <rect x="42" y="128" width="101" height="3"          fill="rgba(0,0,0,0.6)"/>
        {/* Bottom bar */}
        <rect x="33" y="131" width="119" height="8"  rx="1.5" fill="url(#vChr)"/>
        <rect x="33" y="131" width="119" height="2.5" rx="1"  fill="rgba(200,214,244,0.5)"/>
        {/* Arms */}
        <rect x="14"  y="119" width="23" height="7"  rx="3.5" fill="url(#vChr)"/>
        <rect x="14"  y="119" width="23" height="2.5" rx="1"  fill="rgba(230,238,255,0.56)"/>
        <rect x="17"  y="126" width="8"  height="20" rx="2"   fill="#7880a0"/>
        <rect x="148" y="119" width="23" height="7"  rx="3.5" fill="#606480"/>
        <rect x="160" y="126" width="8"  height="20" rx="2"   fill="#484862"/>
        {/* Seat frame */}
        <rect x="17"  y="139" width="151" height="7" rx="3"   fill="url(#vChr)"/>
        <rect x="17"  y="139" width="151" height="2.5" rx="1" fill="rgba(210,222,248,0.47)"/>
        {/* Seat cushion */}
        <rect x="19"  y="146" width="147" height="27" rx="4"  fill="url(#vSt)"/>
        <rect x="19"  y="146" width="147" height="6"  rx="3"  fill="rgba(80,90,130,0.22)"/>
        <rect x="19"  y="170" width="147" height="3"         fill="rgba(0,0,0,0.6)"/>
        <rect x="17"  y="173" width="151" height="5"  rx="2"  fill="url(#vChr)"/>
        {/* Stem */}
        <rect x="78"  y="177" width="29"  height="8"  rx="3.5" fill="url(#vChr)"/>
        <rect x="83"  y="185" width="19"  height="14" rx="4"  fill="#131028"/>
        <rect x="86"  y="197" width="13"  height="7"  rx="3"  fill="url(#vChr)"/>
        {/* Base hub + spokes + casters */}
        <circle cx="92" cy="208" r="6"   fill="url(#vChr)"/>
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
        {/* Floor shadow pool */}
        <ellipse cx="92" cy="226" rx="56" ry="4.5" fill="rgba(0,0,0,0.4)"/>
      </svg>

      {/* Bottom gradient fade into card body */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0, height: 44,
        background: 'linear-gradient(transparent, #040a18)',
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
      background: 'linear-gradient(180deg, #07112a 0%, #050d20 60%, #040a18 100%)',
      border: '1px solid rgba(79,142,247,0.2)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(79,142,247,0.1)',
    }}>
      {/* Mastermind chair hero */}
      <MastermindChairHero />

      {/* Brand strip */}
      <div style={{
        padding: '10px 20px 14px',
        borderBottom: '1px solid rgba(79,142,247,0.1)',
        marginTop: -4,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.01em' }}>
          <span style={{ color: '#4F8EF7' }}>www</span>
          <span style={{ color: '#ffffff' }}>.Explain.global</span>
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.02em', marginBottom: 5 }}>
          Get your tailored Interview Pack for this exact role
        </div>
        <div style={{ fontSize: 14, color: '#22c55e', fontWeight: 700, marginBottom: 14, letterSpacing: '0.01em' }}>
          only £1
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: 20 }}>
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
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        lineHeight: 1.7,
        marginTop: 4,
      }}>
        No login needed · Instant access<br />
        <span style={{ color: '#4F8EF7', fontWeight: 700 }}>Powered by Explain.Global</span>
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
