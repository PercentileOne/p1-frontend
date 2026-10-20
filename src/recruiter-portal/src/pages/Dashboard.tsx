import { useState, useEffect } from 'react'
import { LayoutDashboard, BarChart2, Settings, Send, Bell, Search, Wallet, Users, Gift, LifeBuoy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import CvAnalysisHistory from './CvAnalysisHistory'
import InterviewPacks from './InterviewPacks'
import InterviewPreps from './InterviewPreps'
import ClientGifts from './ClientGifts'
import Candidates from './Candidates'
import CandidateSearch from './CandidateSearch'
import Analytics from './Analytics'
import JobPositions from './JobPositions'
import Interviews from './Interviews'
import CVsPage from './CVs'
import PackBuilder from './PackBuilder'
import PackHistory from './PackHistory'
import ScreenCandidates from './ScreenCandidates'
import InterviewHistory from './InterviewHistory'
import Alerts from './Alerts'
import TeamPage from './TeamPage'
import HelpCentre from './HelpCentre'
import { GettingStartedCard } from '../components/GettingStartedCard'
import { HelpHint } from '../components/HelpHint'
import { PageIntro } from '../components/PageIntro'
import { PAGE_INTROS } from '../help/pageIntros'
import { RECRUITER_ARTICLES } from '../help/articles'
import { logEvent } from '../api/flowLogger'
import IndustryStatsCard from '../components/IndustryStatsCard'
import { DashboardOverview } from '../components/DashboardOverview'
import { teamApi } from '../api/teamApi'

// Streamlined 2026-08-31: Francis wants the recruiter portal to work alongside recruiters'
// existing ATS/CRM tooling rather than replace it, so anything that overlaps with tools
// they likely already have (CVs, Candidates, Screen, Interviews, Interview Packs, Pack
// History, Job Specs) is hidden here, not deleted — the pages/routes/negation-chain checks
// below are untouched, so restoring one is just adding its line back to this array.
// My Interviews hidden separately: it's a candidate-facing component (private/shared/public
// visibility, a Share button) that doesn't conceptually fit a recruiter's own portal.
const NAV_ITEMS = [
  { Icon: LayoutDashboard, label: 'Dashboard' },
  { Icon: Send,            label: 'Interview Preps' },
  { Icon: Gift,            label: 'Client Gifts' },
  { Icon: Wallet,          label: 'CV Insights' },
  { Icon: Bell,            label: 'Alerts' },
  { Icon: Users,           label: 'Team' },
  { Icon: Search,          label: 'Candidate Marketplace' },
  { Icon: BarChart2,       label: 'Analytics' },
  { Icon: Settings,        label: 'Settings' },
  { Icon: LifeBuoy,        label: 'Help' },
]

export default function Dashboard() {
  const { signOut, token, user } = useAuth()
  const [activeNav, setActiveNav] = useState('Dashboard')
  // Help Centre: which article to open on arrival (set by the "How does this work?" hints); cleared whenever the menu is used.
  const [helpArticle, setHelpArticle] = useState<string | null>(null)
  function openHelp(articleId: string) {
    logEvent('help_hint_click', { metadata: { article: articleId, from: activeNav, portal: 'recruiter' } })
    setHelpArticle(articleId)
    setActiveNav('Help')
  }
  const [packBuilderSpec, setPackBuilderSpec] = useState<string | null>(null)

  // The signed-in recruiter's own details (Francis, 2026-10-20). This page used to show a fixed name, role and company to everyone.
  const [company, setCompany] = useState<string | null>(null)
  useEffect(() => {
    if (!token) return
    let cancelled = false
    teamApi.info(token).then(i => { if (!cancelled) setCompany(i.organisationName || null) }).catch(() => { /* no company line is better than a wrong one */ })
    return () => { cancelled = true }
  }, [token])
  const fullName = user?.name?.trim() || user?.email || 'there'
  const initials = (user?.name ?? '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || (user?.email?.[0] ?? '?').toUpperCase()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
        {/* Logo — same "IM" mark as the candidate portal's sidebar (CandidateDashboard.tsx),
            not the old Explain ring mark, so the two portals read as one product. */}
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'default' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#34D399,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em' }}>IM</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.2 }}>
              Interview<span style={{ color: '#34D399' }}>Me</span><span style={{ color: '#4F8EF7' }}>.global</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 3 }}>
              Recruiter Portal
            </div>
          </div>
        </div>

        {/* Company badge: the recruiter's own organisation, shown only when the server tells us */}
        {company && <div style={{ padding: '14px 16px', margin: '12px 12px 0', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 10, userSelect: 'none', WebkitUserSelect: 'none' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 3 }}>Company</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{company}</div>
        </div>}

        {/* Nav — overflowY:auto so the logo header and user footer stay put and only this
            list scrolls once there are more items than fit; the aside itself is fixed to
            exactly viewport height (top:0, bottom:0), so without this anything past the
            fold was permanently unreachable, not just hidden until a resize. */}
        <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ Icon, label }) => (
            <button
              key={label}
              onClick={() => { setHelpArticle(null); setActiveNav(label); setPackBuilderSpec(null) }}
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
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{fullName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Recruiter</div>
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
              <button onClick={() => { setHelpArticle(null); setActiveNav('Interview Preps') }} style={{
                padding: '9px 18px', background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Send an Interview Prep
              </button>
            )}
          </div>
        </div>

        {/* ── ABOUT THIS PAGE: a short description of what the page is for, with a link to its help article where there is one (Francis, 2026-10-20).
             Pages without a description keep the older one-line "New to ...?" bar. ── */}
        {activeNav !== 'Help' && (() => {
          const a = RECRUITER_ARTICLES.find(x => x.navLabel === activeNav)
          const intro = PAGE_INTROS[activeNav]
          if (intro) return <PageIntro key={activeNav} label={activeNav} text={intro} article={a ? { id: a.id } : undefined} onOpen={openHelp} />
          if (activeNav === 'Dashboard') return null
          return a ? <HelpHint key={a.id} pageLabel={activeNav} articleId={a.id} onOpen={openHelp} /> : null
        })()}

        {/* ── SUB-PAGES ── */}
        {activeNav === 'Help' && <HelpCentre key={helpArticle ?? 'index'} initialArticleId={helpArticle} onNavigate={label => { setHelpArticle(null); setActiveNav(label) }} />}
        {activeNav === 'Interview Preps' && <InterviewPreps />}
        {activeNav === 'Client Gifts' && <ClientGifts />}
        {activeNav === 'Interview Packs' && <InterviewPacks />}
        {activeNav === 'Candidates' && <Candidates />}
        {activeNav === 'CV Insights' && <CvAnalysisHistory />}
        {activeNav === 'Candidate Marketplace' && <CandidateSearch />}
        {activeNav === 'Screen' && <ScreenCandidates />}
        {activeNav === 'Analytics' && <Analytics />}
        {activeNav === 'Job Specs' && !packBuilderSpec && <JobPositions onViewSpec={title => setPackBuilderSpec(title)} />}
        {activeNav === 'Job Specs' && packBuilderSpec && <PackBuilder specTitle={packBuilderSpec} onBack={() => setPackBuilderSpec(null)} />}
        {activeNav === 'Interviews' && <Interviews />}
        {activeNav === 'CVs' && <CVsPage />}
        {activeNav === 'Pack History' && <PackHistory />}
        {activeNav === 'My Interviews' && <InterviewHistory />}
        {activeNav === 'Alerts' && <Alerts />}
        {activeNav === 'Team' && <TeamPage />}
        {activeNav !== 'Dashboard' && activeNav !== 'Interview Preps' && activeNav !== 'Client Gifts' && activeNav !== 'Interview Packs' && activeNav !== 'Candidates' && activeNav !== 'CV Insights' && activeNav !== 'Candidate Marketplace' && activeNav !== 'Screen' && activeNav !== 'Analytics' && activeNav !== 'Job Specs' && activeNav !== 'Help' && activeNav !== 'Interviews' && activeNav !== 'CVs' && activeNav !== 'Pack History' && activeNav !== 'My Interviews' && activeNav !== 'Alerts' && activeNav !== 'Team' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-3)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
            <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>{activeNav}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Coming soon</div>
          </div>
        )}
        {activeNav === 'Dashboard' && <>

        <GettingStartedCard token={token} onNavigate={label => { setHelpArticle(null); setActiveNav(label) }} />

        <IndustryStatsCard />

        <DashboardOverview token={token} onNavigate={label => { setHelpArticle(null); setActiveNav(label) }} />

        </>}
      </main>
    </div>
  )
}
