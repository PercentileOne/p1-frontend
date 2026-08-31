import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { alertsApi, type Alert, type AlertMatch } from '../api/alertsApi'
import { interviewPrepsApi, type InterviewPrep } from '../api/interviewPrepsApi'

function scoreColor(s: number) {
  if (s >= 80) return '#34D399'
  if (s >= 70) return '#60A5FA'
  if (s >= 50) return '#F59E0B'
  return '#EF4444'
}

// Last 6 calendar months ending this month, computed from today rather than hardcoded —
// each entry keyed by a real Date so counts below can group real records into it correctly.
function lastSixMonths(): { key: string; label: string; date: Date }[] {
  const months: { key: string; label: string; date: Date }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-GB', { month: 'short' }), date: d })
  }
  return months
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function isLastMonth(iso: string): boolean {
  const d = new Date(iso), now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return d.getFullYear() === last.getFullYear() && d.getMonth() === last.getMonth()
}

function deltaLabel(current: number, previous: number): { text: string; up: boolean } {
  if (previous === 0) return current > 0 ? { text: `+${current} vs last month`, up: true } : { text: 'No change vs last month', up: true }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { text: `${pct >= 0 ? '+' : ''}${pct}% vs last month`, up: pct >= 0 }
}

export default function Analytics() {
  const { token } = useAuth()
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [matches, setMatches] = useState<AlertMatch[] | null>(null)
  const [preps, setPreps] = useState<InterviewPrep[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setError('')
    Promise.all([alertsApi.list(token), alertsApi.matches(token), interviewPrepsApi.list(token)])
      .then(([a, m, p]) => { setAlerts(a); setMatches(m); setPreps(p) })
      .catch(() => setError('Failed to load analytics data.'))
  }, [token])

  const loading = alerts === null || matches === null || preps === null

  if (error) {
    return <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>{error}</div>
  }
  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
  }

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const prepsThisMonth = preps.filter(p => isThisMonth(p.createdAt)).length
  const prepsLastMonth = preps.filter(p => isLastMonth(p.createdAt)).length
  const activeAlerts = alerts.filter(a => a.status === 'active').length
  const matchesThisMonth = matches.filter(m => isThisMonth(m.matchedAt)).length
  const matchesLastMonth = matches.filter(m => isLastMonth(m.matchedAt)).length
  const avgScore = matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length) : null

  const prepsDelta = deltaLabel(prepsThisMonth, prepsLastMonth)
  const matchesDelta = deltaLabel(matchesThisMonth, matchesLastMonth)

  const SUMMARY = [
    { label: 'Total Preps Sent', value: String(preps.length), change: prepsDelta.text, up: prepsDelta.up, color: '#4F8EF7' },
    { label: 'Active Alerts', value: String(activeAlerts), change: `${alerts.length} total`, up: true, color: '#A78BFA' },
    { label: 'Total Matches', value: String(matches.length), change: matchesDelta.text, up: matchesDelta.up, color: '#34D399' },
    { label: 'Avg. Match Score', value: avgScore !== null ? `${avgScore}%` : '—', change: avgScore !== null ? 'across all matches' : 'no matches yet', up: true, color: avgScore !== null ? scoreColor(avgScore) : '#F59E0B' },
  ]

  const months = lastSixMonths()
  const monthly = months.map(m => ({
    label: m.label,
    prepsSent: preps.filter(p => monthKey(p.createdAt) === m.key).length,
    matched: matches.filter(mt => monthKey(mt.matchedAt) === m.key).length,
  }))
  const maxMonthly = Math.max(1, ...monthly.map(m => Math.max(m.prepsSent, m.matched)))

  const roleCounts = new Map<string, number>()
  for (const m of matches) roleCounts.set(m.role, (roleCounts.get(m.role) ?? 0) + 1)
  const roleColors = ['#4F8EF7', '#A78BFA', '#34D399', '#F59E0B', '#EF4444']
  const matchesByRole = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([role, count], i) => ({ role, count, color: roleColors[i % roleColors.length] }))
  const maxRoleCount = Math.max(1, ...matchesByRole.map(r => r.count))

  const recentMatches = [...matches].sort((a, b) => b.matchedAt.localeCompare(a.matchedAt)).slice(0, 5)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Performance overview · {monthLabel}</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {SUMMARY.map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Bar chart */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Monthly Activity</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[['#4F8EF7', 'Preps Sent'], ['#34D399', 'Matched']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {preps.length === 0 && matches.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No activity yet — send a prep or set up an alert to see it here.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160 }}>
              {monthly.map(m => (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%' }}>
                    {[
                      { v: m.prepsSent, c: '#4F8EF7' },
                      { v: m.matched, c: '#34D399' },
                    ].map((b, i) => (
                      <div key={i} style={{ flex: 1, background: b.c, opacity: 0.7, borderRadius: '3px 3px 0 0', height: `${(b.v / maxMonthly) * 100}%`, minHeight: b.v > 0 ? 3 : 0, transition: 'height 0.3s ease' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matches by role */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Matches by Role</div>
          {matchesByRole.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No candidate matches yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {matchesByRole.map(r => (
                <div key={r.role}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.role}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: r.color }}>{r.count}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(r.count / maxRoleCount) * 100}%`, background: r.color, borderRadius: 3, opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent matches */}
      <div style={{ marginTop: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Recent Matches</div>
        {recentMatches.length === 0 ? (
          <div style={{ padding: '10px 0', color: 'var(--text-3)', fontSize: 12 }}>No candidate matches yet — they'll show up here as soon as one of your alerts fires.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentMatches.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{m.candidateName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{m.role} · {new Date(m.matchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(m.overallScore), fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{m.overallScore}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
