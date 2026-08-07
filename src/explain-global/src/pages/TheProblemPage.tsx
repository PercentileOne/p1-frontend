export default function TheProblemPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#060A12',
      color: '#F1F5F9',
      fontFamily: "-apple-system,'Segoe UI',system-ui,sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes scrollPulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .tp-fade { animation: fadeUp 0.7s ease both; }
        .tp-fade-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .tp-fade-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .stat-card { transition: transform 0.2s ease; }
        .stat-card:hover { transform: translateY(-4px); }
        table tr.data-row { transition: background 0.15s; }
        table tr.data-row:hover { background: rgba(255,255,255,0.03); }
        .hook-card { transition: border-color 0.2s; }
        .hook-card:hover { border-color: rgba(79,142,247,0.3) !important; }
        @media (max-width:640px) {
          .big-stats-grid { grid-template-columns: 1fr !important; }
          .market-grid { grid-template-columns: repeat(2,1fr) !important; }
          .hooks-grid { grid-template-columns: 1fr !important; }
          .tp-nav { padding: 14px 20px !important; }
          .tp-nav-btn { display: none !important; }
          .tp-hero { padding: 100px 20px 60px !important; }
          .tp-section { padding: 56px 20px !important; }
          .tp-quote-card { padding: 36px 24px !important; }
          .tp-cta-inner { padding: 40px 24px !important; }
          .tp-footer { padding: 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .stat-card { padding: 28px 22px !important; border-radius: 18px !important; }
          .tp-table-source { display: none !important; }
          .tp-table-stat { font-size: 13px !important; }
          .tp-table-fig { font-size: 16px !important; }
        }
        @media (max-width:480px) {
          .market-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="tp-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px',
        background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <a href="https://explain.global" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            overflow: 'hidden', flexShrink: 0, position: 'relative',
            background: '#060a12',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,142,247,0.15)',
          }}>
            <img src="/images/mastermind-chair.png" alt="Explain" style={{
              width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block',
            }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Explain<span style={{ color: '#4F8EF7' }}>.global</span>
          </span>
        </a>
        <a href="https://recruiter.explain.global" className="tp-nav-btn" style={{
          fontSize: 12, fontWeight: 700, color: '#4F8EF7',
          padding: '8px 18px', border: '1px solid rgba(79,142,247,0.3)',
          borderRadius: 20, textDecoration: 'none',
          background: 'rgba(79,142,247,0.08)',
        }}>
          Try the Portal →
        </a>
      </nav>

      {/* HERO */}
      <div className="tp-hero" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 800, borderRadius: '50%',
          background: 'radial-gradient(ellipse,rgba(79,142,247,0.08) 0%,transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="tp-fade" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#4F8EF7', padding: '7px 16px',
          border: '1px solid rgba(79,142,247,0.25)', borderRadius: 20,
          background: 'rgba(79,142,247,0.08)', marginBottom: 32,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F8EF7', boxShadow: '0 0 8px #4F8EF7' }} />
          The Data Doesn't Lie
        </div>
        <h1 className="tp-fade-2" style={{
          fontSize: 'clamp(2.6rem,6vw,5rem)', fontWeight: 900,
          lineHeight: 1.08, letterSpacing: '-0.03em', color: '#fff',
          maxWidth: 900, margin: '0 auto 24px',
        }}>
          Most candidates fail interviews<br />before they even walk in.
        </h1>
        <p className="tp-fade-3" style={{
          fontSize: 'clamp(1rem,2.2vw,1.25rem)', color: '#64748B',
          maxWidth: 560, margin: '0 auto 56px', lineHeight: 1.65,
        }}>
          We went through the global research so you don't have to.
          Here's what's really happening in the interview room — and why <span style={{ color: '#4F8EF7', fontWeight: 700 }}>Explain</span> exists.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#334155', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom,rgba(255,255,255,0.15),transparent)', animation: 'scrollPulse 2s ease-in-out infinite' }} />
          Scroll to see the data
        </div>
      </div>

      {/* FAILURE STATS */}
      <section className="tp-section" style={{ background: '#0A0F1C', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Eyebrow color="#EF4444">Why Candidates Fail</Eyebrow>
            <h2 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.025em', color: '#fff', marginBottom: 14 }}>
              The numbers are<br />uncomfortable.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              These aren't edge cases. This is what's happening in every interview, in every sector, every single day.
            </p>
          </div>
          <div className="big-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            <StatCard number="74%" label="of candidates spend little or no time practising interview questions before applying" color="#EF4444" source="Michael Page UK, Global Interview Research 2024" geo="US / UK" />
            <StatCard number="47%" label="are rejected because they know nothing meaningful about the company they're applying to" color="#F59E0B" source="LinkedIn Talent Trends, CareerBuilder Survey" geo="US" />
            <StatCard number="40%" label="of rejections come down to lack of confidence — not lack of knowledge or experience" color="#8B5CF6" source="Recruiter Insights Report 2024" geo="US / UK" />
            <StatCard number="42" label="applications the average candidate sends just to earn a single interview invitation" color="#4F8EF7" source="Ashby / Recruitee State of Hiring 2025" geo="Global" />
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="tp-section" style={{ background: '#060A12', padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="tp-quote-card" style={{
            maxWidth: 780, margin: '0 auto', textAlign: 'center', padding: '56px 40px',
            background: 'linear-gradient(135deg,rgba(79,142,247,0.06),rgba(139,92,246,0.06))',
            border: '1px solid rgba(79,142,247,0.12)', borderRadius: 28,
          }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>💬</div>
            <blockquote style={{ fontSize: 'clamp(1.1rem,2.5vw,1.45rem)', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 16 }}>
              "Nobody likes googling interview questions two minutes before the candidate walks in the door. And nobody likes walking into an interview they weren't prepared for."
            </blockquote>
            <cite style={{ fontSize: 13, color: '#334155', fontStyle: 'normal' }}>— The reality for every recruiter and every candidate. Explain fixes both sides.</cite>
          </div>
        </div>
      </section>

      {/* DATA TABLE */}
      <section style={{ background: '#060A12', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Eyebrow color="#4F8EF7">Full Data Breakdown</Eyebrow>
            <h2 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.025em', color: '#fff', marginBottom: 14 }}>
              Every number.<br />Every source.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              The complete picture — failure reasons, market size, and regional context, all in one place.
            </p>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'rgba(79,142,247,0.08)', borderBottom: '1px solid rgba(79,142,247,0.2)' }}>
                  {['Statistic','Figure','Geography','Source'].map((h, i) => (
                    <th key={h} className={i === 3 ? 'tp-table-source' : ''} style={{ textAlign: i === 0 || i === 3 ? 'left' : 'center', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4F8EF7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableGroup label="Why Candidates Fail" color="#EF4444" />
                <TableRow stat="Spend little or no time practising interview questions" figure="74%" figColor="#EF4444" geo="US / UK" source="Michael Page UK, Global Interview Research 2024" />
                <TableRow stat="Rejected for knowing nothing about the company" figure="47%" figColor="#F59E0B" geo="US" source="LinkedIn Talent Trends, CareerBuilder Survey" />
                <TableRow stat="Rejected for lack of confidence — not knowledge" figure="40%" figColor="#8B5CF6" geo="US / UK" source="Recruiter Insights Report 2024" />
                <TableRow stat="Rejection rate — body language & eye contact failures" figure="65%" figColor="#EF4444" geo="US / UK" source="NovoResume Interview Statistics 2026" />
                <TableRow stat="Don't research the company at all before interviewing" figure="46%" figColor="#F59E0B" geo="Global" source="StandOut CV Global Interview Statistics 2026" />

                <TableGroup label="Interview Volume" color="#4F8EF7" />
                <TableRow stat="Average applications needed to land one interview" figure="42" figColor="#4F8EF7" geo="Global" source="Ashby / Recruitee State of Hiring 2025" />
                <TableRow stat="Applications received per job posting on average" figure="340" figColor="#4F8EF7" geo="Global" source="Recruitee Global Hiring Insights 2025 (↑182% since 2021)" />
                <TableRow stat="Average number of interviews per hire" figure="5.5×" figColor="#4F8EF7" geo="Global" source="High5Test Interview Statistics 2024–2025" />
                <TableRow stat="Candidates who reach the interview stage" figure="2–3%" figColor="#4F8EF7" geo="Global" source="Ashby Hiring Data / Enterprise Apps Today" />
                <TableRow stat="UK businesses now using video interviews" figure="76%" figColor="#4F8EF7" geo="UK" source="StandOut CV UK Interview Statistics 2026" />
                <TableRow stat="US employers planning to use video interviews" figure="69%" figColor="#4F8EF7" geo="US" source="Zety HR Statistics & Trends 2024" />

                <TableGroup label="Market Opportunity" color="#34D399" />
                <TableRow stat="Global interview prep market size (2024)" figure="$5.3B" figColor="#34D399" geo="Global" source="Business Research Insights, Mock Interview Market Report" />
                <TableRow stat="Projected market size by 2032" figure="$7.3B" figColor="#34D399" geo="Global" source="Business Research Insights, CAGR 6.7% 2025–2032" />
                <TableRow stat="Psychometric / assessment testing industry (UK)" figure="£7.1B" figColor="#34D399" geo="UK" source="Zety HR Statistics 2024" />
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: '#334155', marginTop: 14, textAlign: 'right' }}>
            All figures sourced from published research 2024–2026. Geography column indicates primary data collection region.
          </p>
        </div>
      </section>

      {/* OPPORTUNITY */}
      <section className="tp-section" style={{ background: '#0D1420', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Eyebrow color="#34D399">The Opportunity</Eyebrow>
            <h2 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.025em', color: '#fff', marginBottom: 14 }}>
              A $5 billion market<br />nobody has cracked yet.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Interview preparation is one of the fastest-growing segments in HR tech — and it's still waiting for a product people actually want to use every day.
            </p>
          </div>
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { value: '$5.3B', label: 'Interview prep market size in 2024', sub: 'Growing to $7.3B by 2032' },
              { value: '6.7%', label: 'Annual growth rate (CAGR)', sub: 'Consistent — not a bubble' },
              { value: '340', label: 'Applications per job posting on average', sub: 'Up 182% since 2021' },
              { value: '5.5×', label: 'Interviews per hire on average', sub: 'Candidates face multiple rounds' },
            ].map(s => (
              <div key={s.value} style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: '#34D399', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 10 }}>{s.value}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 5, lineHeight: 1.4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIKTOK HOOKS */}
      <section className="tp-section" style={{ background: '#0A0F1C', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Eyebrow color="#4F8EF7">Content Angles</Eyebrow>
            <h2 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.025em', color: '#fff', marginBottom: 14 }}>Every stat is a story.</h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Each data point is a TikTok, a LinkedIn post, a reel. The audience already knows the pain — we just give it a number.
            </p>
          </div>
          <div className="hooks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {[
              { icon: '📱', title: '"Got an interview coming up?"', body: '74% of candidates didn\'t practise. Don\'t be in that group. Here\'s what to do instead.' },
              { icon: '😬', title: '"47% fail for THIS reason"', body: 'They had the skills. They had the experience. But they knew nothing about the company and it cost them the job.' },
              { icon: '🎯', title: '"You sent 42 applications for this moment"', body: "Don't waste it. One hour of practice with Explain is the difference between offer and rejection." },
              { icon: '💪', title: '"Confidence is learnable"', body: '40% of rejections are about delivery, not knowledge. Your answer was right. You just didn\'t sound like you believed it.' },
            ].map(h => (
              <div key={h.title} className="hook-card" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{h.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{h.title}</div>
                  <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.55 }}>{h.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="tp-section" style={{ background: '#060A12', padding: '100px 24px', textAlign: 'center' }}>
        <div className="tp-cta-inner" style={{ maxWidth: 640, margin: '0 auto', padding: '60px 48px', background: 'linear-gradient(135deg,rgba(79,142,247,0.07),rgba(139,92,246,0.07))', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 32 }}>
          <Eyebrow color="#4F8EF7" center>Explain.global</Eyebrow>
          <h2 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', margin: '24px 0 14px' }}>
            The platform that turns every interview into data your competitors don't have.
          </h2>
          <p style={{ color: '#64748B', marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>
            AI interviewers. Real scoring. Free packs to share with candidates. Built for recruiters who want to hire better — and candidates who want to perform at their best.
          </p>
          <a href="https://recruiter.explain.global" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '16px 36px', borderRadius: 14, border: 'none',
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
            background: 'linear-gradient(135deg,#3B7EF7,#4F8EF7)',
            color: '#fff', boxShadow: '0 4px 24px rgba(79,142,247,0.4)',
            textDecoration: 'none',
          }}>
            Try the Recruiter Portal →
          </a>
        </div>
      </section>

      {/* SOURCES */}
      <section style={{ background: '#060A12', padding: '40px 24px 60px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', marginBottom: 16 }}>Sources & Research</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Job Interview Statistics 2026 — StandOut CV (UK & Global)', 'https://standout-cv.com/stats/job-interview-statistics'],
              ['State of Hiring 2025: Data-Driven Insights for Recruiters — Recruitee', 'https://recruitee.com/blog/global-hiring-insights'],
              ['95 Interview Statistics & Huge Trends 2025 — Passive Secrets', 'https://passivesecrets.com/job-interview-statistics/'],
              ['Job Candidates Failing to Prepare Beyond First Impressions — Michael Page UK', 'https://www.michaelpage.co.uk/news-and-research/media-releases/job-candidates-failing-to-prepare-beyond-first-impressions'],
              ['Mock Interview Service Market Size & Share — Business Research Insights', 'https://www.businessresearchinsights.com/market-reports/mock-interview-service-market-113771'],
              ['Job Interview Statistics by Country, Industry & Demographic — Enterprise Apps Today', 'https://www.enterpriseappstoday.com/stats/job-interview-statistics.html'],
              ['25+ Crucial Job Interview Statistics US & Global 2024–2025 — High5Test', 'https://high5test.com/job-interview-statistics/'],
            ].map(([label, url]) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4F8EF7', textDecoration: 'none', opacity: 0.8 }}>→ {label}</a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="tp-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#3B7EF7,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>E</div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Explain<span style={{ color: '#4F8EF7' }}>.global</span></span>
        </div>
        <p style={{ fontSize: 12, color: '#334155' }}>© 2026 Explain — Percentile.One Ltd. All rights reserved.</p>
        <a href="https://explain.global" style={{ fontSize: 12, color: '#4F8EF7', textDecoration: 'none' }}>explain.global</a>
      </footer>
    </div>
  )
}

function Eyebrow({ children, color, center }: { children: React.ReactNode; color: string; center?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      color, padding: '7px 16px',
      border: `1px solid ${color}40`, borderRadius: 20,
      background: `${color}14`, marginBottom: 20,
      ...(center ? { margin: '0 auto 20px', display: 'flex', width: 'fit-content' } : {}),
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      {children}
    </div>
  )
}

function StatCard({ number, label, color, source, geo }: { number: string; label: string; color: string; source: string; geo: string }) {
  return (
    <div className="stat-card" style={{
      borderRadius: 24, padding: '36px 32px',
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative', overflow: 'hidden',
      background: `${color}12`, border: `1px solid ${color}2E`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)`, borderRadius: '24px 24px 0 0' }} />
      <div style={{ fontSize: 'clamp(4rem,10vw,6.5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color }}>{number}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: '#94a3b8', lineHeight: 1.5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: '#64748B' }}>{geo}</span>
        <span style={{ fontSize: 11, color: '#334155' }}>{source}</span>
      </div>
    </div>
  )
}

function TableGroup({ label, color }: { label: string; color: string }) {
  return (
    <tr style={{ background: `${color}0A`, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td colSpan={4} style={{ padding: '10px 20px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color, opacity: 0.85 }}>{label}</td>
    </tr>
  )
}

function TableRow({ stat, figure, figColor, geo, source }: { stat: string; figure: string; figColor: string; geo: string; source: string }) {
  return (
    <tr className="data-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td className="tp-table-stat" style={{ padding: '16px 20px', color: '#cbd5e1', lineHeight: 1.45 }}>{stat}</td>
      <td className="tp-table-fig" style={{ padding: '16px 20px', textAlign: 'center', fontSize: 20, fontWeight: 900, color: figColor }}>{figure}</td>
      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: '#64748B' }}>{geo}</span>
      </td>
      <td className="tp-table-source" style={{ padding: '16px 20px', color: '#475569', fontSize: 12 }}>{source}</td>
    </tr>
  )
}
