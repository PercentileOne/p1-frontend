import { useEffect, useState } from 'react'
import { X, Search as SearchIcon, ArrowLeft, MapPin, Briefcase } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { candidateSearchApi, type CandidateSearchResult, type ApiError } from '../api/candidateSearchApi'
import { profileApi, type PublicProfile } from '../api/profileApi'

export default function CandidateSearch() {
  const { token } = useAuth()
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState<CandidateSearchResult[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function runSearch() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await candidateSearchApi.search(token, { q: q.trim() || undefined, location: location.trim() || undefined, size: 30 })
      setResults(res.rows)
      setTotal(res.total)
    } catch (err) {
      setError((err as ApiError).error ?? 'Search failed.')
    } finally {
      setLoading(false)
    }
  }

  if (selectedId) {
    return <CandidateDetail userId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Find Candidates</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Search candidates who've opted in to being discoverable. Not everyone who's interviewed will show up here — only those who've turned this on.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0, position: 'relative' }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
            placeholder="Search name, role, company, or interests…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
          />
          {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}><X size={14} /></button>}
        </div>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
          placeholder="Location…"
          style={{ width: 180, boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={runSearch}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}
        >
          <SearchIcon size={14} /> Search
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {results === null ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          <SearchIcon size={22} strokeWidth={1.5} style={{ marginBottom: 10 }} />
          <div>Search by name, role, company, interests, or location to get started.</div>
        </div>
      ) : results.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No opted-in candidates match that search.</div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{total} candidate{total !== 1 ? 's' : ''} found</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {results.map(c => (
              <motion.div
                key={c.userId}
                onClick={() => setSelectedId(c.userId)}
                style={{ background: '#0c1220', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer' }}
                whileHover={{ y: -4, borderColor: 'rgba(79,142,247,0.6)', background: '#0f1a2e', boxShadow: '0 8px 32px rgba(79,142,247,0.15)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {c.avatar ? <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.jobTitle || c.jobRole || 'No job title set'}{c.company ? ` · ${c.company}` : ''}</div>
                  </div>
                </div>
                {c.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>
                    <MapPin size={11} /> {c.location}
                  </div>
                )}
                {c.interests.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
                    {c.interests.slice(0, 4).map(i => (
                      <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA', background: 'rgba(167,139,250,0.12)', padding: '3px 8px', borderRadius: 20 }}>{i}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CandidateDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { token } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    profileApi.getPublicProfile(token, userId)
      .then(setProfile)
      .catch(err => setError((err as ApiError).error ?? 'Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [token, userId])

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to results
      </button>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>{error}</div>
      ) : profile ? (
        <div style={{ background: '#0c1220', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', maxWidth: 640 }}>
          {profile.banner && <div style={{ width: '100%', height: 140, overflow: 'hidden' }}><img src={profile.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {profile.avatar ? <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(profile.name)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{profile.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  <Briefcase size={11} /> {profile.jobTitle || profile.jobRole || 'No job title set'}{profile.company ? ` at ${profile.company}` : ''}
                </div>
                {profile.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    <MapPin size={11} /> {profile.location}
                  </div>
                )}
              </div>
            </div>
            {profile.bio && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>{profile.bio}</p>}
            {profile.interests.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.interests.map(i => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', background: 'rgba(167,139,250,0.12)', padding: '4px 10px', borderRadius: 20 }}>{i}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
