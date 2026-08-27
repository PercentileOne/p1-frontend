import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { introductionsApi, type Introduction, type ApiError } from '../api/introductionsApi'

// Deliberately public — no RequireAuth wrapper. Anyone with the link can watch and see the
// score/message for free; acting on it (accept/decline) needs a real employer account, same
// "watch free, act requires an account" split used everywhere else in this loop.
export default function Watch() {
  const { id } = useParams<{ id: string }>()
  const { token, isLoading: authLoading } = useAuth()
  const [intro, setIntro] = useState<Introduction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)
  const [responded, setResponded] = useState<'accepted' | 'declined' | null>(null)

  useEffect(() => {
    if (!id) return
    introductionsApi.watch(id)
      .then(setIntro)
      .catch(err => setError((err as ApiError).error ?? 'This link isn\'t valid.'))
      .finally(() => setLoading(false))
  }, [id])

  async function respond(status: 'accepted' | 'declined') {
    if (!id || !token) return
    setResponding(true)
    try {
      const updated = await introductionsApi.respond(token, id, status)
      setIntro(updated)
      setResponded(status)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to respond.')
    } finally {
      setResponding(false)
    }
  }

  if (loading || authLoading) {
    return <Shell><p style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading…</p></Shell>
  }

  if (error || !intro) {
    return <Shell><p style={{ color: '#EF4444', fontSize: 14 }}>{error || 'Introduction not found.'}</p></Shell>
  }

  return (
    <Shell>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: 12 }}>
        {intro.senderName} thinks you should meet
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        {intro.candidateName}
      </h1>
      {intro.candidateRole && (
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' }}>{intro.candidateRole}</p>
      )}

      {intro.overallScore != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 6, marginBottom: 20,
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12, padding: '10px 18px',
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#34D399' }}>{intro.overallScore}%</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>overall interview score</span>
        </div>
      )}

      {intro.message && (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 24px', borderLeft: '2px solid rgba(52,211,153,0.4)', paddingLeft: 14 }}>
          "{intro.message}"
        </p>
      )}

      {intro.playbackUrl ? (
        <a href={intro.playbackUrl} target="_blank" rel="noreferrer" style={{
          display: 'inline-block', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff',
          fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: 10,
          marginBottom: 28,
        }}>
          Watch the interview →
        </a>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 28 }}>No recording attached to this introduction.</p>
      )}

      {intro.proposedFeeGbp != null && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
          Proposed introduction fee: <strong style={{ color: 'var(--text-2)' }}>£{intro.proposedFeeGbp}</strong>
        </p>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
        {responded || intro.status === 'accepted' || intro.status === 'declined' ? (
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            You {(responded ?? intro.status) === 'accepted' ? 'accepted' : 'declined'} this introduction.
          </p>
        ) : token ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => respond('accepted')} disabled={responding} style={{ ...btnStyle, background: '#34D399', color: '#06210f', border: 'none' }}>
              Accept introduction
            </button>
            <button onClick={() => respond('declined')} disabled={responding} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              Decline
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
              Sign in to your employer account to accept or decline this introduction.
            </p>
            <a href={`/login?next=/watch/${id}`} style={{ ...btnStyle, display: 'inline-block', background: '#34D399', color: '#06210f', textDecoration: 'none' }}>
              Sign in
            </a>
          </div>
        )}
      </div>
    </Shell>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '11px 22px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'linear-gradient(135deg,#060a12 0%,#080d1a 50%,#0a0f1e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        padding: '40px 36px',
      }}>
        {children}
      </div>
    </div>
  )
}
