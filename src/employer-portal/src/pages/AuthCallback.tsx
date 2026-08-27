// Receives the cross-domain handoff from the shared login (its role dropdown
// redirects "Employer" accounts here with ?token=...). The token is validated
// against the shared backend — via AuthContext.signIn, which checks
// CAN_VIEW_EMPLOYER_PORTAL — before being trusted, not just decoded and
// accepted at face value.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { setError('Missing sign-in token.'); return; }

    signIn(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err: Error) => setError(err.message || 'Sign-in failed.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'linear-gradient(135deg,#060a12 0%,#080d1a 50%,#0a0f1e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24,
    }}>
      {error ? (
        <div>
          <div style={{ color: '#F87171', marginBottom: 12 }}>{error}</div>
          <a href="/login" style={{ color: '#4F8EF7' }}>Back to sign in</a>
        </div>
      ) : (
        'Signing you in…'
      )}
    </div>
  )
}
