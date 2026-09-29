import { useEffect, useState } from 'react'

// Industry stats card (Francis, 2026-09-29) — reads the shared, admin-curated
// /api/platform-stats endpoint (same source as the candidate portal and marketing site) filtered
// to this portal's audience, so a figure is edited once and updated everywhere. Every stat shows
// its source; renders nothing if the fetch fails rather than an empty box.

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global'

interface Stat { id: string; label: string; value: string; sourceLabel?: string | null; sourceUrl?: string | null }

export default function IndustryStatsCard() {
  const [stats, setStats] = useState<Stat[]>([])
  const [i, setI] = useState(0)

  useEffect(() => {
    fetch(`${BASE}/api/platform-stats?audience=employer`)
      .then(r => (r.ok ? r.json() : { stats: [] }))
      .then((d: { stats?: Stat[] }) => setStats(d.stats ?? []))
      .catch(() => setStats([]))
  }, [])

  useEffect(() => {
    if (stats.length < 2) return
    const t = setInterval(() => setI(n => (n + 1) % stats.length), 9000)
    return () => clearInterval(t)
  }, [stats.length])

  if (!stats.length) return null
  const s = stats[i % stats.length]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '16px 20px', marginBottom: 24,
    }}>
      <div style={{ fontSize: 30, fontWeight: 900, color: '#A78BFA', letterSpacing: '-0.02em', flexShrink: 0 }}>{s.value}</div>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>Industry insight</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{s.label}</div>
        {s.sourceLabel && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {s.sourceUrl
              ? <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)' }}>{s.sourceLabel}</a>
              : s.sourceLabel}
          </div>
        )}
      </div>
      {stats.length > 1 && (
        <div style={{ display: 'flex', gap: 5 }}>
          {stats.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Show insight ${n + 1}`}
              style={{ width: 7, height: 7, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer',
                background: n === i % stats.length ? '#A78BFA' : 'var(--border)' }} />
          ))}
        </div>
      )}
    </div>
  )
}
