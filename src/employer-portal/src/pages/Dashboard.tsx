import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
        Welcome, {user?.name ?? user?.email}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, maxWidth: 480, lineHeight: 1.6 }}>
        You're signed in to the employer side of InterviewMe. The candidate marketplace, recruiter
        introductions, and direct applications inbox are being built next — this is the real,
        working account this all gets attached to.
      </p>
    </div>
  )
}
