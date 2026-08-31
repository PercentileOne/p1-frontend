import { useEffect, useState } from 'react'
import { X, Search as SearchIcon, ArrowLeft, MapPin, Briefcase, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { candidateSearchApi, type CandidateSearchResult, type ApiError } from '../api/candidateSearchApi'
import { profileApi, type PublicProfile } from '../api/profileApi'

// Short hand-picked list rather than full ISO-3166 — this candidate base is concentrated
// in a handful of countries today; "Other" catches everyone else without a huge dropdown.
const COUNTRIES = [
  'United Kingdom', 'United States', 'Ireland', 'Canada', 'Australia', 'New Zealand',
  'Germany', 'France', 'Netherlands', 'Spain', 'Portugal', 'Italy', 'Poland',
  'India', 'South Africa', 'UAE', 'Nigeria', 'Ghana', 'Other',
]

const RADIUS_OPTIONS = [
  { value: '', label: 'Exact area' },
  { value: '5', label: 'Within 5 miles' },
  { value: '10', label: 'Within 10 miles' },
  { value: '20', label: 'Within 20 miles' },
  { value: '50', label: 'Within 50 miles' },
  { value: '100', label: 'Within 100 miles' },
]

function scoreColor(s: number) {
  if (s >= 80) return '#34D399'
  if (s >= 70) return '#60A5FA'
  if (s >= 50) return '#F59E0B'
  return '#EF4444'
}

const selectStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }
const fieldLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6, display: 'block' }

export default function CandidateSearch() {
  const { token } = useAuth()
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [role, setRole] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [remote, setRemote] = useState('')
  const [minScore, setMinScore] = useState('')
  const [country, setCountry] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('')
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
      const res = await candidateSearchApi.search(token, {
        q: q.trim() || undefined,
        location: location.trim() || undefined,
        role: role.trim() || undefined,
        employmentType: employmentType || undefined,
        remote: remote || undefined,
        country: country || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        radiusMiles: location.trim() && radiusMiles ? Number(radiusMiles) : undefined,
        size: 30,
      })
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
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Candidate Marketplace</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Search candidates who've opted in to being discoverable. Not everyone who's interviewed will show up here — only those who've turned this on.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#34D399', color: '#06210f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}
        >
          <SearchIcon size={14} /> Search
        </button>
      </div>

      <button
        onClick={() => setShowAdvanced(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#34D399', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', marginBottom: 16 }}
      >
        Advanced filters
        <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence initial={false}>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
              <div>
                <label style={fieldLabelStyle}>Role</label>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Engineer" style={selectStyle} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Employment type</label>
                <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="either">Either</option>
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Remote</label>
                <select value={remote} onChange={e => setRemote(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                  <option value="any">Candidate's own "Any"</option>
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Scored above</label>
                <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(e.target.value)} placeholder="e.g. 80" style={selectStyle} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Country</label>
                <select value={country} onChange={e => setCountry(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Radius</label>
                <select
                  value={radiusMiles}
                  onChange={e => setRadiusMiles(e.target.value)}
                  disabled={!location.trim()}
                  style={{ ...selectStyle, cursor: location.trim() ? 'pointer' : 'not-allowed', opacity: location.trim() ? 1 : 0.5 }}
                >
                  {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -12, marginBottom: 20 }}>Keywords = the search box above. Radius needs a location entered first.</p>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div style={{ background: '#0c1220', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>
              <div style={{ flex: '2 1 220px', minWidth: 0 }}>Candidate</div>
              <div style={{ flex: '2 1 180px', minWidth: 0 }}>Role</div>
              <div style={{ flex: '1 1 130px', minWidth: 0 }}>Location</div>
              <div style={{ width: 70, flexShrink: 0 }}>Score</div>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>Preferences</div>
              <div style={{ flex: '2 1 180px', minWidth: 0 }}>Interests</div>
            </div>
            {results.map((c, i) => (
              <motion.div
                key={c.userId}
                onClick={() => setSelectedId(c.userId)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent' }}
                whileHover={{ background: 'rgba(52,211,153,0.08)' }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ flex: '2 1 220px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#34D399,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {c.avatar ? <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.name)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                </div>
                <div style={{ flex: '2 1 180px', minWidth: 0, fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.jobTitle || c.jobRole || '—'}{c.company ? ` · ${c.company}` : ''}
                </div>
                <div style={{ flex: '1 1 130px', minWidth: 0, fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.location ? <><MapPin size={10} style={{ marginRight: 4, verticalAlign: -1 }} />{c.location}</> : '—'}
                </div>
                <div style={{ width: 70, flexShrink: 0 }}>
                  {c.bestScore !== null ? (
                    <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(c.bestScore), fontVariantNumeric: 'tabular-nums' }}>{c.bestScore}%</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Not yet</span>
                  )}
                </div>
                <div style={{ flex: '1 1 150px', minWidth: 0, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.remotePreference && <span style={{ fontSize: 10, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.12)', padding: '2px 7px', borderRadius: 20, textTransform: 'capitalize' }}>{c.remotePreference}</span>}
                  {c.employmentTypePreference && <span style={{ fontSize: 10, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.12)', padding: '2px 7px', borderRadius: 20, textTransform: 'capitalize' }}>{c.employmentTypePreference}</span>}
                </div>
                <div style={{ flex: '2 1 180px', minWidth: 0, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.interests.slice(0, 3).map(i => (
                    <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.12)', padding: '2px 8px', borderRadius: 20 }}>{i}</span>
                  ))}
                  {c.interests.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+{c.interests.length - 3}</span>}
                </div>
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
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#34D399,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {profile.avatar ? <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(profile.name)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{profile.name}</div>
                  {profile.bestScore != null && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(profile.bestScore), fontVariantNumeric: 'tabular-nums' }}>{profile.bestScore}%</span>
                  )}
                </div>
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
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.12)', padding: '4px 10px', borderRadius: 20 }}>{i}</span>
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
