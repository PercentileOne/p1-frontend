import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Inbox, Send, Briefcase, BarChart2, Settings, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Introductions from './Introductions'
import Alerts from './Alerts'
import CandidateSearch from './CandidateSearch'

const NAV_ITEMS = [
  { Icon: LayoutDashboard, label: 'Dashboard' },
  { Icon: Users,           label: 'Candidate Marketplace' },
  { Icon: Inbox,           label: 'Introductions' },
  { Icon: Bell,            label: 'Alerts' },
  { Icon: Send,            label: 'Direct Applications' },
  { Icon: Briefcase,       label: 'Open Roles' },
  { Icon: BarChart2,       label: 'Analytics' },
  { Icon: Settings,        label: 'Settings' },
]

const LIVE_STATS = [
  {
    color: '#4F8EF7', bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.2)', shadow: '79,142,247',
    interval: 12000,
    slides: [
      { label: 'Candidates in Pipeline', value: '16', change: '+4 this week' },
      { label: 'New This Week', value: '4', change: 'across 3 open roles' },
      { label: 'Shortlisted', value: '6', change: '2 awaiting your review' },
    ],
  },
  {
    color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', shadow: '52,211,153',
    interval: 13000,
    slides: [
      { label: 'Interviews Watched', value: '23', change: '+7 this month' },
      { label: 'Watched This Week', value: '5', change: 'avg. 8 min per session' },
      { label: 'Not Yet Watched', value: '3', change: 'sitting in your inbox' },
    ],
  },
  {
    color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', shadow: '167,139,250',
    interval: 14000,
    slides: [
      { label: 'Recruiter Introductions', value: '9', change: '2 pending review' },
      { label: 'Accepted This Month', value: '5', change: '56% acceptance rate' },
      { label: 'From Vallum Associates', value: '6', change: 'your top introducer' },
    ],
  },
  {
    color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', shadow: '245,158,11',
    interval: 15000,
    slides: [
      { label: 'Avg. Candidate Score', value: '76%', change: '+4pts vs last month' },
      { label: 'Top Performing Role', value: 'Backend', change: 'Backend Engineer · 88% avg' },
      { label: 'Needs Attention', value: '52%', change: 'Support Lead — below target' },
    ],
  },
]

const CANDIDATES = [
  { candidate: 'James Okafor', role: 'Senior Backend Engineer', source: 'Vallum Associates', sent: '18 Jul', score: 82, status: 'Shortlisted', statusColor: '#34D399', statusBg: 'rgba(52,211,153,0.1)' },
  { candidate: 'Sarah Mitchell', role: 'Product Manager', source: 'Direct', sent: '17 Jul', score: 71, status: 'Reviewing', statusColor: '#4F8EF7', statusBg: 'rgba(79,142,247,0.1)' },
  { candidate: 'Raj Patel', role: 'DevOps Engineer', source: 'Vallum Associates', sent: '17 Jul', score: 68, status: 'New', statusColor: '#F59E0B', statusBg: 'rgba(245,158,11,0.1)' },
  { candidate: 'Claire Thompson', role: 'UX Designer', source: 'Direct', sent: '16 Jul', score: 91, status: 'Shortlisted', statusColor: '#34D399', statusBg: 'rgba(52,211,153,0.1)' },
  { candidate: 'Daniel Osei', role: 'Support Lead', source: 'Direct', sent: '15 Jul', score: null, status: 'Declined', statusColor: '#EF4444', statusBg: 'rgba(239,68,68,0.08)' },
  { candidate: 'Priya Sharma', role: 'Business Analyst', source: 'Vallum Associates', sent: '14 Jul', score: 77, status: 'Reviewing', statusColor: '#4F8EF7', statusBg: 'rgba(79,142,247,0.1)' },
]

const PENDING = [
  { candidate: 'James Okafor', role: 'Senior Backend Engineer', date: 'Introduced Mon 21 Jul', interviewer: 'Vallum Associates' },
  { candidate: 'Claire Thompson', role: 'UX Designer', date: 'Applied Tue 22 Jul', interviewer: 'Direct application' },
  { candidate: 'Priya Sharma', role: 'Business Analyst', date: 'Introduced Wed 23 Jul', interviewer: 'Vallum Associates' },
]

const USER = {
  name: 'Sarah',
  fullName: 'Sarah Chen',
  role: 'Head of Talent',
  title: 'Head of Talent · Brightline Technologies',
  initials: 'SC',
}

const ROLE_NEWS: Record<string, { tag: string; time: string; title: string; color: string }[]> = {
  'Head of Talent': [
    { tag: 'Hiring', time: '1h ago',  title: 'UK tech hiring rebounds as AI roles surge 34% in Q2 2026', color: '#4F8EF7' },
    { tag: 'Retention', time: '3h ago', title: 'Candidate experience now the top driver of offer acceptance — LinkedIn Talent report', color: '#A78BFA' },
    { tag: 'Market',   time: '5h ago', title: 'Permanent placements rise for third consecutive month — REC', color: '#34D399' },
    { tag: 'Tools',     time: '8h ago', title: 'Firms using pre-screened video interviews report 40% faster time-to-fill', color: '#F59E0B' },
  ],
}

const NEWS = ROLE_NEWS[USER.role] ?? ROLE_NEWS['Head of Talent']

const TODOS = [
  { done: true,  text: 'Watch James Okafor\'s interview' },
  { done: false, text: 'Respond to Vallum Associates\' introduction for Priya Sharma' },
  { done: false, text: 'Shortlist or decline Raj Patel' },
  { done: false, text: 'Post new role — Staff Engineer' },
  { done: false, text: 'Review Claire Thompson\'s score report' },
]

const SCORE_BY_ROLE = [
  { role: 'Backend Engineer', rate: 82 },
  { role: 'Product Manager', rate: 71 },
  { role: 'DevOps Engineer', rate: 68 },
  { role: 'UX Designer', rate: 91 },
  { role: 'Support Lead', rate: 52 },
]

export default function Dashboard() {
  const { signOut } = useAuth()
  const [todos, setTodos] = useState(TODOS)
  const [activeNav, setActiveNav] = useState('Dashboard')

  function toggleTodo(i: number) {
    setTodos(t => t.map((todo, idx) => idx === i ? { ...todo, done: !todo.done } : todo))
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'default' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#34D399,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em' }}>IM</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.2 }}>
              Interview<span style={{ color: '#34D399' }}>Me</span><span style={{ color: '#4F8EF7' }}>.global</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 3 }}>
              Employer Portal
            </div>
          </div>
        </div>

        {/* Company badge */}
        <div style={{ padding: '14px 16px', margin: '12px 12px 0', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, userSelect: 'none', WebkitUserSelect: 'none' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34D399', marginBottom: 3 }}>Company</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Brightline Technologies</div>
        </div>

        {/* Nav — overflowY:auto so the logo header and user footer stay put and only this
            list scrolls once there are more items than fit (see the same fix in
            recruiter-portal's Dashboard.tsx, where this was found live). */}
        <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            background: 'linear-gradient(135deg,#34D399,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>{USER.initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{USER.fullName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{USER.role}</div>
          </div>
          <button onClick={() => { signOut(); window.location.href = 'https://www.interviewme.global/login' }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }} title="Sign out">⇥</button>
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
              Good evening, {USER.fullName} — <span style={{ color: '#34D399' }}>{USER.role}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · 3 candidates awaiting your review
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeNav === 'Dashboard' && (
              <button style={{
                padding: '9px 18px', background: '#34D399', color: '#06210f',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                + Post New Role
              </button>
            )}
          </div>
        </div>

        {activeNav === 'Candidate Marketplace' && <CandidateSearch />}
        {activeNav === 'Introductions' && <Introductions />}
        {activeNav === 'Alerts' && <Alerts />}

        {activeNav !== 'Dashboard' && activeNav !== 'Candidate Marketplace' && activeNav !== 'Introductions' && activeNav !== 'Alerts' && (
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

            {/* Pending review */}
            <Card title="⏳ Awaiting Your Review" action="View all">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PENDING.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', background: 'rgba(52,211,153,0.06)',
                    border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10,
                    userSelect: 'none', WebkitUserSelect: 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.candidate}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.role}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#34D399' }}>{p.date}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.interviewer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent candidates */}
            <Card title="👥 Recent Candidates" action="View marketplace">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Candidate', 'Role', 'Source', 'Score', 'Status'].map(h => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left', paddingBottom: 10, paddingRight: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CANDIDATES.map((c, i) => (
                    <CandidateRow key={i} candidate={c} i={i} />
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Score by role */}
            <Card title="📊 Avg. Score by Role — Candidates Reviewed" action="Full analytics">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SCORE_BY_ROLE.map((r, i) => (
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

            {/* Recruiter message */}
            <div style={{
              background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(79,142,247,0.1))',
              border: '1px solid rgba(52,211,153,0.3)', borderRadius: 14, padding: '18px 18px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34D399', marginBottom: 10 }}>📣 From Vallum Associates</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                "Priya Sharma scored 77% on the Business Analyst pack we tailored to your role — strong stakeholder-management answers. Worth a look before she's snapped up elsewhere."
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

          </div>
        </div>

        </>}
      </main>
    </div>
  )
}

function CandidateRow({ candidate: c, i }: { candidate: typeof CANDIDATES[0]; i: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(52,211,153,0.08)' : i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      <td style={{ padding: '11px 12px 11px 8px', fontSize: 13, fontWeight: 700, color: 'var(--text)', borderRadius: '6px 0 0 6px' }}>{c.candidate}</td>
      <td style={{ padding: '11px 12px 11px 0', fontSize: 12, color: 'var(--text-2)' }}>{c.role}</td>
      <td style={{ padding: '11px 12px 11px 0', fontSize: 12, color: 'var(--text-3)' }}>{c.source}</td>
      <td style={{ padding: '11px 12px 11px 0', fontSize: 13, fontWeight: 700, color: c.score ? (c.score >= 80 ? '#34D399' : c.score >= 65 ? '#F59E0B' : '#EF4444') : 'var(--text-3)' }}>
        {c.score ? `${c.score}%` : '—'}
      </td>
      <td style={{ padding: '11px 8px 11px 0', borderRadius: '0 6px 6px 0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c.statusColor, background: c.statusBg, padding: '3px 10px', borderRadius: 20 }}>{c.status}</span>
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
        {action && <button style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{action} →</button>}
      </div>
      {children}
    </div>
  )
}
