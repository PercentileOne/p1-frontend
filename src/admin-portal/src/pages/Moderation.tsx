import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldAlert, Trash2, XCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { moderationApi, type ReportedComment, type RepeatOffender, type ApiError } from '../api/moderationApi'

export default function Moderation() {
  const { token } = useAuth()
  const [comments, setComments] = useState<ReportedComment[]>([])
  const [offenders, setOffenders] = useState<RepeatOffender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await moderationApi.listReported(token)
      setComments(data.comments)
      setOffenders(data.repeatOffenders)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load reported comments.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function resolve(c: ReportedComment, action: 'delete' | 'dismiss') {
    if (!token) return
    setBusyId(c.id)
    try {
      await moderationApi.resolve(token, c.id, c.profileUserId, action)
      await load()
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to update comment.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Moderation</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Comments reported on candidate profiles. Delete removes it; Dismiss clears the report and keeps it visible.</p>
      </div>

      {offenders.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {offenders.map(o => (
            <span
              key={o.authorUserId}
              title="Reported comments from this author, across all profiles"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '5px 10px',
              }}
            >
              <AlertTriangle size={11} /> {o.authorName} — {o.reportedCommentCount} reported
            </span>
          ))}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : comments.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '48px 0' }}>
          <ShieldAlert size={22} strokeWidth={1.5} />
          Nothing reported right now.
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Author</th>
                <th style={thStyle}>Comment</th>
                <th style={thStyle}>Profile</th>
                <th style={thStyle}>Reports</th>
                <th style={thStyle}>Last reported</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.authorName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)', maxWidth: 360 }}>{c.text}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 11 }}>{c.profileUserId}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 700 }}>{c.reportCount}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{formatDate(c.lastReportedAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <IconButton title="Delete comment" onClick={() => resolve(c, 'delete')} disabled={busyId === c.id} color="#EF4444">
                        <Trash2 size={15} />
                      </IconButton>
                      <IconButton title="Dismiss report — keeps the comment visible" onClick={() => resolve(c, 'dismiss')} disabled={busyId === c.id} color="var(--text-3)">
                        <XCircle size={15} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-3)',
}

function IconButton({ children, onClick, disabled, title, color }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string; color: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg3)',
        color, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
