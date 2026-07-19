import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Users, Briefcase, FileText, BarChart2, CalendarCheck, Settings } from 'lucide-react'
import { ExplainLogo } from '../components/LogoMark'
import InterviewPacks from './InterviewPacks'
import Candidates from './Candidates'
import Analytics from './Analytics'
import JobPositions from './JobPositions'
import Interviews from './Interviews'
import CVsPage from './CVs'

const NAV_ITEMS = [
  { Icon: LayoutDashboard, label: 'Dashboard' },
  { Icon: Package,         label: 'Interview Packs' },
  { Icon: Users,           label: 'Candidates' },
  { Icon: Briefcase,       label: 'Job Positions' },
  { Icon: FileText,        label: 'CVs' },
  { Icon: BarChart2,       label: 'Analytics' },
  { Icon: CalendarCheck,   label: 'Interviews' },
  { Icon: Settings,        label: 'Settings' },
]

const LIVE_STATS = [
  {
    color: '#4F8EF7', bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.2)', shadow: '79,142,247',
    interval: 12000,
    slides: [
      { label: 'Packs Generated', value: '47', change: '+12 this month' },
      { label: 'Drafts in Progress', value: '8', change: '3 pending your review' },
      { label: 'Generated This Week', value: '6', change: 'vs 4 last week' },
    ],
  },
  {
    color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', shadow: '52,211,153',
    interval: 13000,
    slides: [
      { label: 'Sent to Candidates', value: '38', change: '+9 this month' },
      { label: 'Opened Today', value: '12', change: '32% open rate' },
      { label: 'Awaiting Response', value: '5', change: 'avg. 2.3 days to reply' },
    ],
  },
  {
    color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', shadow: '167,139,250',
    interval: 14000,
    slides: [
      { label: 'Interviews Booked', value: '29', change: '76% conversion rate' },
      { label: 'Scheduled This Week', value: '3', change: 'Mon · Tue · Wed' },
      { label: 'Avg. Candidate Score', value: '78%', change: 'above 75% target' },
    ],
  },
  {
    color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', shadow: '245,158,11',
    interval: 15000,
    slides: [
      { label: 'Avg. Candidate Score', value: '74%', change: '+6pts vs last month' },
      { label: 'Top Performing Role', value: 'UX', change: 'UX Design · 91% pass rate' },
      { label: 'Needs Attention', value: '58%', change: 'Data Analyst — below target' },
    ],
  },
]

const PACKS = [
  { candidate: 'James Okafor', role: 'Senior .NET Developer', sent: '18 Jul', score: 82, status: 'Interview Booked', statusColor: '#34D399', statusBg: 'rgba(52,211,153,0.1)' },
  { candidate: 'Sarah Mitchell', role: 'Product Manager', sent: '17 Jul', score: 71, status: 'Confirmed', statusColor: '#4F8EF7', statusBg: 'rgba(79,142,247,0.1)' },
  { candidate: 'Raj Patel', role: 'DevOps Engineer', sent: '17 Jul', score: 68, status: 'Sent', statusColor: '#F59E0B', statusBg: 'rgba(245,158,11,0.1)' },
  { candidate: 'Claire Thompson', role: 'UX Designer', sent: '16 Jul', score: 91, status: 'Interview Booked', statusColor: '#34D399', statusBg: 'rgba(52,211,153,0.1)' },
  { candidate: 'Daniel Osei', role: 'Data Analyst', sent: '15 Jul', score: null, status: 'No Interview', statusColor: '#EF4444', statusBg: 'rgba(239,68,68,0.08)' },
  { candidate: 'Priya Sharma', role: 'Business Analyst', sent: '14 Jul', score: 77, status: 'Confirmed', statusColor: '#4F8EF7', statusBg: 'rgba(79,142,247,0.1)' },
]

const PENDING = [
  { candidate: 'James Okafor', role: 'Senior .NET Developer', date: 'Mon 21 Jul · 10:00am', interviewer: 'Mike Afolabi' },
  { candidate: 'Claire Thompson', role: 'UX Designer', date: 'Tue 22 Jul · 2:30pm', interviewer: 'Sarah Collins' },
  { candidate: 'Priya Sharma', role: 'Business Analyst', date: 'Wed 23 Jul · 11:00am', interviewer: 'Mike Afolabi' },
]

const USER = {
  name: 'Mike',
  fullName: 'Mike Petrie',
  role: 'Chairman',
  title: 'Chairman · Vallum Associates',
  initials: 'MP',
}

const ROLE_NEWS: Record<string, { tag: string; time: string; title: string; color: string }[]> = {
  Chairman: [
    { tag: 'Leadership', time: '1h ago',  title: 'FTSE chairs under pressure to accelerate board diversity targets by 2027', color: '#4F8EF7' },
    { tag: 'Governance', time: '3h ago',  title: 'FRC updates UK Corporate Governance Code — key changes for listed firms', color: '#A78BFA' },
    { tag: 'Strategy',   time: '5h ago',  title: 'Private equity activity in UK recruitment sector rises 18% in H1 2026', color: '#34D399' },
    { tag: 'Economy',    time: '8h ago',  title: 'Bank of England holds rates — business confidence edges higher for Q3', color: '#F59E0B' },
  ],
  CEO: [
    { tag: 'Leadership', time: '1h ago',  title: 'UK SME confidence hits 18-month high as growth outlook improves', color: '#4F8EF7' },
    { tag: 'Talent',     time: '3h ago',  title: 'C-suite retention remains top priority as executive churn rises post-pandemic', color: '#A78BFA' },
    { tag: 'Strategy',   time: '5h ago',  title: 'AI adoption in mid-market firms accelerating faster than enterprise', color: '#34D399' },
    { tag: 'Economy',    time: '8h ago',  title: 'UK GDP growth revised upward to 1.4% for 2026 — CBI forecast', color: '#F59E0B' },
  ],
  CTO: [
    { tag: 'AI',         time: '1h ago',  title: 'OpenAI releases GPT-5 API — enterprise adoption expected to surge', color: '#4F8EF7' },
    { tag: 'Cloud',      time: '3h ago',  title: 'AWS re:Invent previews serverless AI inference at fraction of current cost', color: '#A78BFA' },
    { tag: 'Security',   time: '5h ago',  title: 'NCSC warns UK tech firms of increased state-sponsored cyber threats in Q3', color: '#34D399' },
    { tag: 'Talent',     time: '7h ago',  title: 'Demand for .NET and cloud engineers remains at record highs across London', color: '#F59E0B' },
  ],
  'Managing Director': [
    { tag: 'Recruitment', time: '2h ago', title: 'UK tech hiring rebounds as AI roles surge 34% in Q2 2026', color: '#4F8EF7' },
    { tag: 'Market',      time: '4h ago', title: 'Permanent placements rise for third consecutive month — REC', color: '#34D399' },
    { tag: 'Operations',  time: '6h ago', title: 'Firms investing in AI-powered hiring tools report 40% faster time-to-fill', color: '#A78BFA' },
    { tag: 'IR35',        time: '8h ago', title: 'New IR35 guidance expected to reshape contractor market before year end', color: '#F59E0B' },
  ],
}

const NEWS = ROLE_NEWS[USER.role] ?? ROLE_NEWS['Managing Director']

const TODOS = [
  { done: true, text: 'Send Interview Pack to Raj Patel' },
  { done: false, text: 'Follow up with James Okafor re: interview time' },
  { done: false, text: 'Review Claire Thompson\'s score report' },
  { done: false, text: 'Upload job spec — Head of Engineering role' },
  { done: false, text: 'Call Priya Sharma to confirm Wednesday slot' },
]

const PASS_RATES = [
  { role: '.NET Developer', rate: 82 },
  { role: 'Product Manager', rate: 67 },
  { role: 'DevOps Engineer', rate: 74 },
  { role: 'UX Designer', rate: 91 },
  { role: 'Data Analyst', rate: 58 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [todos, setTodos] = useState(TODOS)
  const [activeNav, setActiveNav] = useState('Dashboard')

  function toggleTodo(i: number) {
    setTodos(t => t.map((todo, idx) => idx === i ? { ...todo, done: !todo.done } : todo))
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'default' }}>
          <ExplainLogo size={72} withAnimation={false} cometDuration={8} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>
              Explain<span style={{ color: '#4F8EF7' }}>.global</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 3 }}>
              Recruiter Portal
            </div>
          </div>
        </div>

        {/* Company badge */}
        <div style={{ padding: '14px 16px', margin: '12px 12px 0', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 10, userSelect: 'none', WebkitUserSelect: 'none' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 3 }}>Company</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Vallum Associates</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ Icon, label }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                background: activeNav === label ? 'rgba(79,142,247,0.12)' : 'transparent',
                color: activeNav === label ? 'var(--blue)' : 'var(--text-2)',
                fontSize: 13, fontWeight: activeNav === label ? 700 : 500,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={15} strokeWidth={activeNav === label ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>MA</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{USER.fullName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{USER.role}</div>
          </div>
          <button onClick={() => navigate('/login')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }} title="Sign out">⇥</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 220, flex: 1, padding: '0 28px 40px' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 24px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 28,
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 5,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Good evening, {USER.fullName} — <span style={{ color: '#4F8EF7' }}>{USER.role}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              Friday, 18 July 2026 · 3 interviews pending this week
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeNav === 'Dashboard' && (
              <button style={{
                padding: '9px 18px', background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                + Generate New Pack
              </button>
            )}
          </div>
        </div>

        {/* ── SUB-PAGES ── */}
        {activeNav === 'Interview Packs' && <InterviewPacks />}
        {activeNav === 'Candidates' && <Candidates />}
        {activeNav === 'Analytics' && <Analytics />}
        {activeNav === 'Job Positions' && <JobPositions />}
        {activeNav === 'Interviews' && <Interviews />}
        {activeNav === 'CVs' && <CVsPage />}
        {activeNav !== 'Dashboard' && activeNav !== 'Interview Packs' && activeNav !== 'Candidates' && activeNav !== 'Analytics' && activeNav !== 'Job Positions' && activeNav !== 'Interviews' && activeNav !== 'CVs' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-3)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
            <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>{activeNav}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Coming soon</div>
          </div>
        )}
        {activeNav === 'Dashboard' && <>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {LIVE_STATS.map((s, i) => <LiveStatCard key={i} card={s} />)}
        </div>

        {/* ── TWO COL LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Pending Interviews */}
            <Card title="⏳ Pending Interviews" action="View all">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PENDING.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', background: 'rgba(79,142,247,0.06)',
                    border: '1px solid rgba(79,142,247,0.15)', borderRadius: 10,
                    userSelect: 'none', WebkitUserSelect: 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.candidate}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.role}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>{p.date}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>with {p.interviewer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Packs */}
            <Card title="📦 Recent Interview Packs" action="View all packs">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Candidate', 'Role', 'Sent', 'Score', 'Status'].map(h => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left', paddingBottom: 10, paddingRight: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PACKS.map((p, i) => (
                    <PackRow key={i} pack={p} i={i} />
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Pass Rate by Role */}
            <Card title="📊 Pass Rate by Role — This Month" action="Full analytics">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PASS_RATES.map((r, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{r.role}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: r.rate >= 80 ? '#34D399' : r.rate >= 65 ? '#F59E0B' : '#EF4444' }}>{r.rate}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${r.rate}%`, borderRadius: 3,
                        background: r.rate >= 80 ? 'linear-gradient(90deg,#34D399,#6ee7b7)' : r.rate >= 65 ? 'linear-gradient(90deg,#F59E0B,#fcd34d)' : 'linear-gradient(90deg,#EF4444,#f87171)',
                        transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Company message */}
            <div style={{
              background: 'linear-gradient(135deg,rgba(79,142,247,0.15),rgba(124,58,237,0.1))',
              border: '1px solid rgba(79,142,247,0.3)', borderRadius: 14, padding: '18px 18px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>📣 Message from Management</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                "Great Q2 everyone. Tech placements are up 34%. Push hard on the .NET and DevOps pipeline — demand is at record levels. Let's make July our best month yet."
              </p>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>— Mike Afolabi, MD · Vallum Associates</div>
            </div>

            {/* Daily quote */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>💬 Quote of the Day</div>
              <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.65 }}>
                "Hiring is not about finding someone who can do the job. It's about finding someone who will."
              </p>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>— Lou Adler</div>
            </div>

            {/* To-do list */}
            <Card title="✅ My To-Dos" action="+ Add">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todos.map((todo, i) => (
                  <div
                    key={i}
                    onClick={() => toggleTodo(i)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      cursor: 'pointer', padding: '6px 0',
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                      border: `2px solid ${todo.done ? '#34D399' : 'var(--border)'}`,
                      background: todo.done ? 'rgba(52,211,153,0.2)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#34D399',
                    }}>
                      {todo.done ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 12, color: todo.done ? 'var(--text-3)' : 'var(--text-2)', textDecoration: todo.done ? 'line-through' : 'none', lineHeight: 1.5 }}>
                      {todo.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Industry news */}
            <Card title={`📰 ${USER.role} News`} action="More">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NEWS.map((n, i) => (
                  <div key={i} style={{ paddingBottom: 12, borderBottom: i < NEWS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: n.color, background: `${n.color}18`, padding: '2px 8px', borderRadius: 20 }}>{n.tag}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{n.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 500 }}>{n.title}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Sports */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>⚽ Sport</div>
              {[
                { match: 'Arsenal 2 — 1 Chelsea', comp: 'Pre-Season Friendly · FT' },
                { match: 'Man City 0 — 0 Liverpool', comp: 'Pre-Season Friendly · HT' },
                { match: 'Federer Invitational · R2 Results', comp: 'Tennis · Wimbledon Exhibition' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.match}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.comp}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        </>}
      </main>
    </div>
  )
}

function PackRow({ pack: p, i }: { pack: typeof PACKS[0]; i: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(79,142,247,0.08)' : i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      <td style={{ padding: '11px 12px 11px 8px', fontSize: 13, fontWeight: 700, color: 'var(--text)', borderRadius: '6px 0 0 6px' }}>{p.candidate}</td>
      <td style={{ padding: '11px 12px 11px 0', fontSize: 12, color: 'var(--text-2)' }}>{p.role}</td>
      <td style={{ padding: '11px 12px 11px 0', fontSize: 12, color: 'var(--text-3)' }}>{p.sent}</td>
      <td style={{ padding: '11px 12px 11px 0', fontSize: 13, fontWeight: 700, color: p.score ? (p.score >= 80 ? '#34D399' : p.score >= 65 ? '#F59E0B' : '#EF4444') : 'var(--text-3)' }}>
        {p.score ? `${p.score}%` : '—'}
      </td>
      <td style={{ padding: '11px 8px 11px 0', borderRadius: '0 6px 6px 0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: p.statusColor, background: p.statusBg, padding: '3px 10px', borderRadius: 20 }}>{p.status}</span>
      </td>
    </tr>
  )
}

type CardSlide = { label: string; value: string; change: string }
type LiveCard = { color: string; bg: string; border: string; shadow: string; interval: number; slides: CardSlide[] }

function LiveStatCard({ card }: { card: LiveCard }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % card.slides.length)
        setVisible(true)
      }, 280)
    }, card.interval)
    return () => clearInterval(t)
  }, [card.interval, card.slides.length])

  const slide = card.slides[idx]

  return (
    <div style={{
      background: card.bg,
      border: `1px solid ${card.border}`,
      borderRadius: 14,
      padding: '20px 22px 16px',
      boxShadow: `0 4px 24px rgba(${card.shadow},0.18), 0 1px 4px rgba(0,0,0,0.4)`,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 110,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      cursor: 'pointer',
    }}>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.28s ease, transform 0.28s ease',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: card.color, marginBottom: 10 }}>{slide.label}</div>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>{slide.value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{slide.change}</div>
      </div>
      {/* Slide indicator dots */}
      <div style={{ display: 'flex', gap: 4, position: 'absolute', bottom: 12, right: 14 }}>
        {card.slides.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 14 : 5,
            height: 5, borderRadius: 3,
            background: i === idx ? card.color : `rgba(${card.shadow},0.3)`,
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </div>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', bottom: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(ellipse,rgba(${card.shadow},0.12) 0%,transparent 70%)`,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

function Card({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
        {action && <button style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{action} →</button>}
      </div>
      {children}
    </div>
  )
}

