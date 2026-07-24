import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Session {
  userId: string
  email: string
  name: string
  role: string
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setSession(data))
      .catch(() => navigate('/login'))
  }, [navigate])

  const logout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    navigate('/login')
  }

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white/40">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen p-8"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.08) 0%, #0A0F1C 70%)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎙️</span>
            <span className="font-extrabold text-lg">TalkToLearn</span>
          </div>
          <button onClick={logout}
            className="text-sm text-white/40 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-lg">
            Log out
          </button>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Welcome back</p>
          <h1 className="text-2xl font-extrabold">{session.name} 👋</h1>
          <p className="text-white/40 text-sm mt-1">{session.email}</p>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
          <p className="text-white/40 text-sm">Dashboard coming soon — talks, lessons, scores.</p>
        </div>
      </div>
    </div>
  )
}
