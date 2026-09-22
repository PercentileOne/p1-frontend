import { useCallback, useEffect, useState } from 'react'
import { Users, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { teamApi, type TeamInfo, type TeamPost, type ApiError } from '../api/teamApi'

// "Team" page (Francis, 2026-09-22) — "in my last role we used Teams for exactly that": a shared feed anyone at the agency can
// post to, plus the seat roster so an org admin sees "8 of 10 seats used" building before calling Francis for more seats.
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function TeamPage() {
  const { user, token } = useAuth()
  const [info, setInfo] = useState<TeamInfo | null>(null)
  const [posts, setPosts] = useState<TeamPost[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [i, p] = await Promise.all([teamApi.info(token), teamApi.posts(token)])
      setInfo(i)
      setPosts(p)
    } catch (err) {
      setError((err as ApiError).error ?? 'Could not load your team.')
    } finally {
      setLoading(false)
    }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function submitPost() {
    if (!token || !draft.trim() || posting) return
    setPosting(true)
    setError('')
    try {
      const created = await teamApi.post(token, draft.trim())
      setPosts(prev => [created, ...prev])
      setDraft('')
    } catch (err) {
      setError((err as ApiError).error ?? 'Could not post that — try again.')
    } finally {
      setPosting(false)
    }
  }

  async function remove(id: string) {
    if (!token) return
    setPosts(prev => prev.filter(p => p.id !== id))
    try { await teamApi.remove(token, id) } catch { void load() }   // put it back on failure by reloading from the server
  }

  if (loading && !info) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', padding: '40px 0' }}>
      <span style={{ fontSize: 20, animation: 'teamSpin 1.1s linear infinite', display: 'inline-block' }}>⟳</span>
      <style>{'@keyframes teamSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      Loading your team…
    </div>
  }

  if (!info) {
    return <div style={{ ...card, color: 'var(--text-2)', fontSize: 14 }}>{error || "You're not set up as a member of an organisation yet — ask whoever set up your account."}</div>
  }

  const seatPct = info.seatCount > 0 ? Math.min(100, Math.round((info.seatsUsed / info.seatCount) * 100)) : 0
  const seatColor = info.seatsUsed >= info.seatCount ? '#F59E0B' : '#34D399'
  // The org's own admin role (from OrganisationMembers), not the platform account role — a recruiter's JWT role is "Recruiter"
  // either way, so it can't tell us whether THIS person is the agency's team admin. The backend re-checks this independently
  // on delete regardless of what this shows, so getting it wrong here is a UX nit, not a security hole.
  const isOrgAdmin = info.members.find(m => m.email === user?.email)?.role === 'admin'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', margin: 0 }}>Team</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>A shared board for {info.organisationName} — post updates for the whole team to see.</p>
      </div>

      {error && <div style={{ fontSize: 12.5, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}

      {/* Seat roster */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            <Users size={15} /> {info.seatsUsed} of {info.seatCount} seat{info.seatCount === 1 ? '' : 's'} used
          </div>
          {info.seatsUsed >= info.seatCount && (
            <span style={{ fontSize: 11.5, color: '#F59E0B', fontWeight: 700 }}>All seats in use — ask Francis for more</span>
          )}
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${seatPct}%`, height: '100%', background: seatColor, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {info.members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-2)', flexShrink: 0 }}>
                  {(m.name || m.email)[0]?.toUpperCase()}
                </div>
                <span style={{ color: 'var(--text)', fontWeight: 600, overflowWrap: 'anywhere' }}>{m.name || m.email}</span>
                {m.role === 'admin' && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 99, padding: '2px 8px' }}>ADMIN</span>}
              </div>
              <span style={{ color: 'var(--text-3)', fontSize: 12, overflowWrap: 'anywhere' }}>{m.email}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Post box */}
      <div style={{ ...card, marginBottom: 16 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={`Share something with the team, ${(user?.name || '').split(' ')[0] || 'there'}…`}
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13.5, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={() => void submitPost()} disabled={!draft.trim() || posting} style={{ ...btn, opacity: !draft.trim() || posting ? 0.5 : 1 }}>
            <Send size={13} /> {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {posts.length === 0
        ? <div style={{ ...card, textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5, padding: '30px 18px' }}>Nothing posted yet — be the first to share something with the team.</div>
        : <div style={{ display: 'grid', gap: 10 }}>
            {posts.map(p => {
              const mine = p.authorEmail === user?.email
              return (
                <div key={p.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{p.authorName}</span>
                      {p.authorRole === 'admin' && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 99, padding: '2px 8px' }}>ADMIN</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{timeAgo(p.createdAt)}</span>
                      {(mine || isOrgAdmin) && (
                        <button onClick={() => void remove(p.id)} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.text}</div>
                </div>
              )
            })}
          </div>}
    </div>
  )
}
