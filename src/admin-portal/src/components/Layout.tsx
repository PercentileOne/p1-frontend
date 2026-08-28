import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, GraduationCap, Briefcase, UserSquare2, Compass, LogOut } from 'lucide-react'
import { ChairLogo } from './LogoMark'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/organisations', Icon: Building2, label: 'Organisations' },
  { to: '/recruiters', Icon: UserSquare2, label: 'Recruiters' },
  { to: '/candidates', Icon: GraduationCap, label: 'Candidates' },
  { to: '/employers', Icon: Briefcase, label: 'Employers' },
  { to: '/careers', Icon: Compass, label: 'Careers' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', background: 'var(--bg)' }}>
      <aside style={{
        width: 232, flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 28 }}>
          <ChairLogo size={32} showText={false} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Admin Portal</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>InterviewMe</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                color: isActive ? 'var(--blue)' : 'var(--text-2)',
                background: isActive ? 'var(--blue-dim)' : 'transparent',
              })}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', padding: '0 8px', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--text-3)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
