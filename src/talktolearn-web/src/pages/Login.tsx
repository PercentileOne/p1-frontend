import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Request failed')
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.12) 0%, #0A0F1C 70%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎙️</div>
          <h1 className="text-2xl font-extrabold">TalkToLearn</h1>
          <p className="text-white/40 text-sm mt-1">Learn by speaking. Master anything.</p>
        </div>

        <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
          {sent ? (
            <div className="text-center">
              <div className="text-3xl mb-3">📬</div>
              <p className="font-bold mb-1">Check your inbox</p>
              <p className="text-white/40 text-sm">
                We sent a magic link to <span className="text-white">{email}</span>.
                <br />In dev mode, the link is in the API console.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-[#4F8EF7] transition-colors mb-4"
              />
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg,#1E4DD8,#4F8EF7)', boxShadow: '0 4px 18px rgba(30,77,216,0.4)' }}>
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
