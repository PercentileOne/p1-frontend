import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { introductionsApi, type Introduction, type ApiError } from '../api/introductionsApi'

const STATUS_STYLE: Record<Introduction['status'], { color: string; bg: string }> = {
  sent:     { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.05)' },
  viewed:   { color: '#4F8EF7', bg: 'rgba(79,142,247,0.1)' },
  accepted: { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  declined: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
}

export default function Introductions() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Introduction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      setRows(await introductionsApi.received(token))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load introductions.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Introductions</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, marginBottom: 24 }}>
        {rows.length} candidate{rows.length === 1 ? '' : 's'} introduced to you
      </p>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          No one's introduced you to a candidate yet. When a recruiter or candidate sends you a link to watch an interview, it'll show up here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => {
            const s = STATUS_STYLE[r.status]
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/watch/${r.id}`)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
                  padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {r.candidateName}{r.candidateRole && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> — {r.candidateRole}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                    From {r.senderName} · {r.senderType === 'recruiter' ? 'Recruiter introduction' : 'Candidate share'}
                    {r.proposedFeeGbp != null && ` · £${r.proposedFeeGbp} proposed fee`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  {r.overallScore != null && (
                    <div style={{ fontSize: 15, fontWeight: 800, color: r.overallScore >= 75 ? '#34D399' : r.overallScore >= 60 ? '#F59E0B' : '#EF4444' }}>
                      {r.overallScore}%
                    </div>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '4px 12px', borderRadius: 20, textTransform: 'capitalize' }}>
                    {r.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
