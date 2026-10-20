import { useState } from 'react'
import { LayoutDashboard, Users, Inbox, Send, Briefcase, BarChart2, Settings, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Introductions from './Introductions'
import Alerts from './Alerts'
import CandidateSearch from './CandidateSearch'
import IndustryStatsCard from '../components/IndustryStatsCard'
import { DashboardOverview } from '../components/DashboardOverview'
import { PageIntro, showAllPageIntros } from '../components/PageIntro'
import { PAGE_INTROS } from '../help/pageIntros'

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

export default function Dashboard() {
  const { signOut, token, user } = useAuth()
  const [activeNav, setActiveNav] = useState('Dashboard')
  // The signed-in employer's own details (Francis, 2026-10-20). This page used to show a fixed name, role and company to everyone.
  const fullName = user?.name?.trim() || user?.email || 'there'
  const initials = (user?.name ?? '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || (user?.email?.[0] ?? '?').toUpperCase()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  // Hidden page descriptions come back when this changes (this portal has no Help Centre to hold the button).
  const [tipsKey, setTipsKey] = useState(0)
  const [tipsMsg, setTipsMsg] = useState('')

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

        {/* Brings the page descriptions back after they have been hidden */}
        <div style={{ padding: '0 16px 10px' }}>
          <button type="button" onClick={() => { const n = showAllPageIntros(); setTipsKey(k => k + 1); setTipsMsg(n > 0 ? 'Page descriptions are showing again.' : 'Every page description is already showing.') }}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-3)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Show page descriptions again</button>
          {tipsMsg && <div role="status" style={{ fontSize: 11, color: '#34D399', marginTop: 4 }}>{tipsMsg}</div>}
        </div>

        {/* User */}
        <div style={{ padding: '16px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg,#34D399,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{fullName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Employer</div>
          </div>
          <button onClick={() => { signOut(); window.location.href = '/login' }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }} title="Sign out">⇥</button>
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
              {greeting}, {fullName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              {today}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeNav === 'Dashboard' && (
              <button onClick={() => setActiveNav('Introductions')} style={{
                padding: '9px 18px', background: '#34D399', color: '#06210f',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                View introductions
              </button>
            )}
          </div>
        </div>

        {/* ── ABOUT THIS PAGE: a short description of what the page is for (Francis, 2026-10-20) ── */}
        {PAGE_INTROS[activeNav] && <PageIntro key={`${activeNav}-${tipsKey}`} label={activeNav} text={PAGE_INTROS[activeNav]} />}

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

        <IndustryStatsCard />

        <DashboardOverview token={token} onNavigate={setActiveNav} />

        </>}
      </main>
    </div>
  )
}
