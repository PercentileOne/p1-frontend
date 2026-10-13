import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCw, Tags } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { subjectsApi } from '../api/subjectsApi'
import type { ApiError, SubjectsReply } from '../api/subjectsApi'

// "What subjects and roles do people interview for?" (Francis, 2026-10-12). Finished, scored free demos (with a date filter) and full interviews (a running total per job title,
// so no date filter) are shown side by side. The category is a rough guide from the words in the subject.
// The owner's own test runs are counted like anyone's, and demos that were started but not finished are not in here.

const RANGES: { label: string; days: number }[] = [
  { label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }, { label: 'All time', days: 0 },
]

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }
const h3: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }
const th: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)' }
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text-2)', padding: '8px', borderBottom: '1px solid var(--border)' }

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ ...card, flex: '1 1 160px', minWidth: 150 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function Subjects() {
  const { token } = useAuth()
  const [days, setDays] = useState<number>(0)
  const [data, setData] = useState<SubjectsReply | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try { setData(await subjectsApi.get(token, days)) }
    catch (e) { setError((e as ApiError).error ?? 'Failed to load the subjects.') }
    finally { setLoading(false) }
  }, [token, days])
  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.subjects ?? []).filter(s => (!category || s.category === category) && (!q || s.subject.toLowerCase().includes(q)))
  }, [data, search, category])

  function exportCsv() {
    const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [['Subject', 'Category', 'Demos finished', 'Average demo score', 'Last demo', 'Full interviews', 'Last full interview', 'Total'].map(esc).join(',')]
    for (const s of rows) lines.push([s.subject, s.category, s.demos, s.avgDemoScore, s.lastDemoAt ?? '', s.fullInterviews, s.lastFullAt ?? '', s.total].map(esc).join(','))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'interview-subjects.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const maxCat = Math.max(1, ...(data?.categories ?? []).map(c => c.total))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}><Tags size={20} /> Subjects</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 680, lineHeight: 1.55 }}>
            What people choose to be interviewed on. Free demos that were finished and scored (filter by date) sit beside full interviews (a running total per job title, so the date filter
            doesn&rsquo;t apply to those). Categories are a rough guide from the words used. Your own test runs are counted too.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setDays(r.days)} style={{
              background: days === r.days ? 'rgba(79,142,247,0.15)' : 'var(--bg3)', border: `1px solid ${days === r.days ? 'var(--blue)' : 'var(--border)'}`,
              color: days === r.days ? 'var(--blue)' : 'var(--text-2)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>{r.label}</button>
          ))}
          <button onClick={() => void load()} title="Refresh" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex' }}><RefreshCw size={14} /></button>
        </div>
      </div>

      {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading && !data && <div style={{ display: 'flex', gap: 8, color: 'var(--text-3)', fontSize: 13 }}><Loader2 size={16} className="admin-spin" /> Loading…</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <Tile label="Different subjects" value={data.totals.distinctSubjects} />
            <Tile label="Demos finished" value={data.totals.demosCompleted} sub={days ? `last ${days} days` : 'all time'} />
            <Tile label="Full interviews" value={data.totals.fullInterviews} sub="all time, per job title" />
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={h3}>By kind of role (rough guide)</div>
            {data.categories.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Nothing recorded for this period.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.categories.map(c => (
                  <button key={c.category} onClick={() => setCategory(category === c.category ? '' : c.category)}
                    style={{ display: 'grid', gridTemplateColumns: '170px 1fr 150px', gap: 12, alignItems: 'center', background: category === c.category ? 'rgba(79,142,247,0.08)' : 'transparent', border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.category}</span>
                    <span style={{ height: 10, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${(c.total / maxCat) * 100}%`, background: 'linear-gradient(90deg,#34D399,#4F8EF7)', borderRadius: 99 }} />
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.total} ({c.demos} demo · {c.fullInterviews} full) · {c.subjects} subjects</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>Click a kind of role to filter the list below.</div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ ...h3, marginBottom: 0 }}>All subjects ({rows.length})</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects…" type="text"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 220 }} />
              {category && <button onClick={() => setCategory('')} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid var(--blue)', color: 'var(--blue)', borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{category} ✕</button>}
              <button onClick={exportCsv} disabled={rows.length === 0} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={13} /> Export CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr><th style={th}>Subject</th><th style={th}>Kind</th><th style={th}>Demos</th><th style={th}>Avg score</th><th style={th}>Last demo</th><th style={th}>Full</th><th style={th}>Last full</th><th style={th}>Total</th></tr>
                </thead>
                <tbody>
                  {rows.map(s => (
                    <tr key={s.subject}>
                      <td style={{ ...td, color: 'var(--text)', fontWeight: 700 }}>{s.subject}</td>
                      <td style={td}>{s.category}</td>
                      <td style={td}>{s.demos || '—'}</td>
                      <td style={td}>{s.avgDemoScore !== null ? Math.round(s.avgDemoScore) : '—'}</td>
                      <td style={td}>{day(s.lastDemoAt)}</td>
                      <td style={td}>{s.fullInterviews || '—'}</td>
                      <td style={td}>{day(s.lastFullAt)}</td>
                      <td style={{ ...td, color: 'var(--text)', fontWeight: 800 }}>{s.total}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: 24 }}>No subjects match.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
