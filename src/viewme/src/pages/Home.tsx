import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const DEMO_CANDIDATES = [
  { slug: 'francis-cobbinah-head-of-engineering', name: 'Francis C.', role: 'Head of Engineering', location: 'London, UK', score: 91, grade: 'A+', tags: ['System Design', 'Azure', 'Leadership'], questions: 15 },
  { slug: 'sarah-oduya-product-manager', name: 'Sarah O.', role: 'Senior Product Manager', location: 'Manchester, UK', score: 87, grade: 'A', tags: ['Roadmapping', 'Agile', 'B2B SaaS'], questions: 18 },
  { slug: 'marcus-chen-data-scientist', name: 'Marcus C.', role: 'Data Scientist', location: 'Remote', score: 84, grade: 'A', tags: ['Python', 'ML', 'SQL', 'NLP'], questions: 15 },
  { slug: 'aisha-ibrahim-ux-lead', name: 'Aisha I.', role: 'UX Lead', location: 'Birmingham, UK', score: 93, grade: 'A+', tags: ['Figma', 'Research', 'Design Systems'], questions: 20 },
  { slug: 'tom-bradley-devops', name: 'Tom B.', role: 'DevOps Engineer', location: 'Edinburgh, UK', score: 79, grade: 'B+', tags: ['Kubernetes', 'Terraform', 'CI/CD'], questions: 15 },
  { slug: 'priya-sharma-finance', name: 'Priya S.', role: 'Finance Director', location: 'London, UK', score: 88, grade: 'A', tags: ['FP&A', 'SaaS Metrics', 'Series B'], questions: 16 },
]

export default function Home() {
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [gateVisible, setGateVisible] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setGateVisible(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060A12' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:.4}50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        .vm-card:hover { transform: translateY(-4px); border-color: rgba(79,142,247,0.25) !important; }
        .vm-card { transition: transform 0.2s ease, border-color 0.2s ease; }
        @media(max-width:768px){
          .vm-candidates{grid-template-columns:1fr !important;}
          .vm-stats{grid-template-columns:repeat(2,1fr)!important;}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'rgba(6,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', background: '#060a12' }}>
            <img src="https://explain.global/images/mastermind-chair.png" alt="Explain" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            interview<span style={{ color: '#4F8EF7' }}>me</span><span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, fontSize: 13 }}>.global</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="https://explain.global" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>Powered by Explain</a>
          <Link to="/login" style={{ fontSize: 13, fontWeight: 700, color: '#4F8EF7', padding: '8px 20px', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 20, textDecoration: 'none', background: 'rgba(79,142,247,0.08)' }}>
            Employer Login →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center', padding: '140px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(79,142,247,0.09) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#4F8EF7', textTransform: 'uppercase', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F8EF7', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            The world's first interview search engine
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem,6vw,4.2rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>
            Find candidates who've<br />
            <span style={{ color: '#4F8EF7' }}>already proved it.</span>
          </h1>

          <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: '#64748b', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.65 }}>
            Real AI-led interviews. Scored. Searchable. No CV needed.<br />
            Watch a candidate answer under pressure — then decide.
          </p>

          {/* SEARCH */}
          <form onSubmit={handleSearch} style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${searchFocused ? 'rgba(79,142,247,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 16, padding: '10px 10px 10px 20px', transition: 'border-color 0.2s', boxShadow: searchFocused ? '0 0 0 3px rgba(79,142,247,0.1)' : 'none' }}>
              <input
                type="text"
                placeholder='Try "Head of Engineering" or "Product Manager"'
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 15, fontFamily: 'inherit' }}
              />
              <button type="submit" style={{ padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#3b7ef7,#4F8EF7)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Search →
              </button>
            </div>
            {gateVisible && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0, background: '#0d1220', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 14, padding: '20px 24px', textAlign: 'left', zIndex: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🔒 Search requires a subscription</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>
                  Search access is available to verified employers and recruiters from <strong style={{ color: '#e2e8f0' }}>£599/month</strong>. Direct links to individual candidate profiles are always free.
                </div>
                <Link to="/login" style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#3b7ef7,#8B5CF6)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                  Get Search Access →
                </Link>
              </motion.div>
            )}
          </form>

          <div style={{ marginTop: 20, fontSize: 12, color: '#334155' }}>
            Individual profiles are always public · <a href="https://explain.global" style={{ color: '#4F8EF7', textDecoration: 'none' }}>Create your InterviewMe profile →</a>
          </div>
        </motion.div>
      </section>

      {/* STATS ROW */}
      <section style={{ padding: '0 24px 60px' }}>
        <div className="vm-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 860, margin: '0 auto' }}>
          {[
            { value: '15+', label: 'Questions per interview', sub: 'Minimum to go public' },
            { value: '5', label: 'Dimensions scored', sub: 'Depth, understanding & more' },
            { value: '£0', label: 'To watch a public profile', sub: 'Always free for candidates' },
            { value: '£599', label: 'Per month for search', sub: 'Unlimited candidate discovery' },
          ].map(s => (
            <div key={s.value} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#4F8EF7', letterSpacing: '-0.03em', marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SAMPLE CANDIDATES */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Featured Candidates</div>
              <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Recently interviewed</h2>
            </div>
            <button onClick={() => setGateVisible(true)} style={{ fontSize: 13, fontWeight: 700, color: '#4F8EF7', background: 'transparent', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 20, padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Search all candidates →
            </button>
          </div>

          <div className="vm-candidates" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {DEMO_CANDIDATES.map((c, i) => (
              <motion.div key={c.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.5 }}>
                <Link to={`/${c.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="vm-card" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 3 }}>{c.name}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>{c.role}</div>
                        <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{c.location}</div>
                      </div>
                      <div style={{ textAlign: 'center', background: c.score >= 90 ? 'rgba(52,211,153,0.08)' : 'rgba(79,142,247,0.08)', border: `1px solid ${c.score >= 90 ? 'rgba(52,211,153,0.2)' : 'rgba(79,142,247,0.2)'}`, borderRadius: 12, padding: '8px 12px', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c.score >= 90 ? '#34D399' : '#4F8EF7', lineHeight: 1 }}>{c.score}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{c.grade}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                      {c.tags.map(t => (
                        <span key={t} style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2px 8px' }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#334155' }}>✓ {c.questions} questions · Verified by Explain AI</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#0A0F1C', padding: '80px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#4F8EF7', textTransform: 'uppercase', marginBottom: 12 }}>How It Works</div>
          <h2 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 48 }}>
            A hiring channel that didn't exist before.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { icon: '🎙️', step: '1', title: 'Candidate completes a real interview', body: 'AI-led, 15+ questions, scored across 5 dimensions. No prep notes. No second takes.' },
              { icon: '🔗', step: '2', title: 'They share their link on LinkedIn', body: 'interviewme.global/their-name — visible to anyone, proving competence before the first conversation.' },
              { icon: '💬', step: '3', title: 'You send a Chat invitation', body: 'Skip the job board. Skip the application. Find someone who already proved they can do it, and start a conversation.' },
            ].map(s => (
              <div key={s.step} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 24px', textAlign: 'left' }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4F8EF7', marginBottom: 8, letterSpacing: '0.05em' }}>Step {s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, overflow: 'hidden', background: '#060a12', border: '1px solid rgba(255,255,255,0.10)' }}>
            <img src="https://explain.global/images/mastermind-chair.png" alt="Explain" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>interview<span style={{ color: '#4F8EF7' }}>me</span>.global</span>
        </div>
        <p style={{ fontSize: 12, color: '#334155' }}>© 2026 InterviewMe — Percentile.One Ltd. Powered by <a href="https://explain.global" style={{ color: '#4F8EF7', textDecoration: 'none' }}>Explain.global</a></p>
        <a href="https://explain.global" style={{ fontSize: 12, color: '#4F8EF7', textDecoration: 'none' }}>explain.global →</a>
      </footer>
    </div>
  )
}
