import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Search, Loader2, X, Flag, CheckCircle2, XCircle, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  careersAgentApi, missingCareersApi,
  type AdminCareer, type CategoryCount, type MissingCareerReport, type ApiError,
} from '../api/careersApi'

type Tab = 'browse' | 'reports'
type SortKey = 'title' | 'lastUpdated' | 'confidence'
type SortDir = 'asc' | 'desc'

export default function Careers() {
  const [tab, setTab] = useState<Tab>('browse')
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Careers</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Browse the careers database, and triage titles candidates asked for that we don't have yet.</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <TabButton label="Browse" active={tab === 'browse'} onClick={() => setTab('browse')} />
        <TabButton
          label="Missing Reports"
          badge={pendingCount != null && pendingCount > 0 ? pendingCount : undefined}
          active={tab === 'reports'}
          onClick={() => setTab('reports')}
        />
      </div>

      {tab === 'browse' ? <BrowsePanel /> : <ReportsPanel onPendingCountChange={setPendingCount} />}
    </div>
  )
}

function TabButton({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '10px 14px', border: 'none', borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
        marginBottom: -1, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 13, fontWeight: 700, color: active ? 'var(--text)' : 'var(--text-3)',
      }}
    >
      {label}
      {badge !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 800, color: '#fff', background: '#EF4444',
          borderRadius: 999, padding: '1px 7px', minWidth: 18, textAlign: 'center',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Browse ──────────────────────────────────────────────────────────────────

function BrowsePanel() {
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AdminCareer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastUpdated')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<AdminCareer | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    careersAgentApi.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const loadCategory = useCallback((category: string) => {
    setActiveCategory(category)
    setSearch('')
    setLoading(true)
    setError('')
    careersAgentApi.getByCategory(category, 200)
      .then(setRows)
      .catch(() => setError('Failed to load careers for this category.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSearchChange(value: string) {
    setSearch(value)
    setActiveCategory(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) { setRows([]); return }
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      setError('')
      careersAgentApi.search(value.trim(), 60)
        .then(setRows)
        .catch(() => setError('Search failed.'))
        .finally(() => setLoading(false))
    }, 250)
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortKey(key); setSortDir(key === 'lastUpdated' ? 'desc' : 'asc') }
  }

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'title': return a.title.localeCompare(b.title) * dir
        case 'lastUpdated': return a.lastUpdated.localeCompare(b.lastUpdated) * dir
        case 'confidence': return (a.confidence - b.confidence) * dir
      }
    })
  }, [rows, sortKey, sortDir])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', width: 320,
        }}>
          <Search size={15} color="var(--text-3)" />
          <input
            type="text"
            autoComplete="off"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search all careers…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', caretColor: 'var(--blue)' }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>or by category:</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button
              key={c.category}
              onClick={() => loadCategory(c.category)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid', borderColor: activeCategory === c.category ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                background: activeCategory === c.category ? 'rgba(79,142,247,0.15)' : 'transparent',
                color: activeCategory === c.category ? 'var(--blue)' : 'var(--text-2)',
              }}
            >
              {c.category} <span style={{ opacity: 0.6 }}>({c.count})</span>
            </button>
          ))}
        </div>
      </div>

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
          {activeCategory || search ? 'No careers found.' : 'Pick a category or search to browse careers.'}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <SortHeader label="Title" sortKeyName="title" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Subcategory</th>
                <SortHeader label="Confidence" sortKeyName="confidence" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortHeader label="Last Updated" sortKeyName="lastUpdated" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{c.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{c.category}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{c.subcategory}</td>
                  <td style={{ padding: '12px 16px', color: c.confidence < 0.8 ? '#F59E0B' : 'var(--text-2)' }}>{c.confidence.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{c.lastUpdated || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <CareerDetailDrawer career={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-3)',
}

function SortHeader({ label, sortKeyName, sortKey, sortDir, onClick }: {
  label: string; sortKeyName: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: (k: SortKey) => void
}) {
  const active = sortKey === sortKeyName
  return (
    <th onClick={() => onClick(sortKeyName)} style={{ ...thStyle, color: active ? 'var(--blue)' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  )
}

function CareerDetailDrawer({ career: c, onClose }: { career: AdminCareer; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{c.title}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{c.category} · {c.subcategory}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <Section title="System fields (hidden from candidates)">
          <FieldRow label="id" value={c.id} mono />
          <FieldRow label="source" value={c.source} />
          <FieldRow label="confidence" value={c.confidence.toFixed(2)} />
          <FieldRow label="lastUpdated" value={c.lastUpdated || '—'} />
          <FieldRow label="salaryLastUpdated" value={c.salaryLastUpdated || '—'} />
          <FieldRow label="soc_uk" value={c.soc_uk ?? '—'} />
          <FieldRow label="onet_us" value={c.onet_us ?? '—'} />
        </Section>

        {c.aliases.length > 0 && <Section title="Aliases"><ChipList items={c.aliases} /></Section>}
        {c.tags.length > 0 && <Section title="Tags"><ChipList items={c.tags} /></Section>}

        {c.salary && (
          <Section title="Salary">
            <FieldRow label="UK" value={`£${c.salary.uk.starting.toLocaleString()} – £${c.salary.uk.expert.toLocaleString()}`} />
            <FieldRow label="US" value={`$${c.salary.us.starting.toLocaleString()} – $${c.salary.us.expert.toLocaleString()}`} />
          </Section>
        )}

        {c.contractRate && (
          <Section title="Contract day rate">
            <FieldRow label="UK" value={`£${c.contractRate.uk.junior} – £${c.contractRate.uk.expert} /day`} />
            <FieldRow label="US" value={`$${c.contractRate.us.junior} – $${c.contractRate.us.expert} /day`} />
          </Section>
        )}

        {c.demand && (
          <Section title="Demand">
            <FieldRow label="UK / US" value={`${c.demand.uk} / ${c.demand.us}`} />
            <FieldRow label="Automation risk" value={String(c.demand.automationRisk)} />
            <FieldRow label="Future score" value={String(c.demand.futureScore)} />
            <FieldRow label="Trend" value={c.demand.trend} />
          </Section>
        )}

        {c.lifestyle && (
          <Section title="Lifestyle">
            <FieldRow label="Environment" value={c.lifestyle.environment} />
            <FieldRow label="Typical hours" value={c.lifestyle.typicalHours} />
            <FieldRow label="Stress / Energy / Remote" value={`${c.lifestyle.stress} / ${c.lifestyle.energy} / ${c.lifestyle.remoteScore}`} />
          </Section>
        )}

        {c.identity?.summary && (
          <Section title="Identity">
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{c.identity.summary}</p>
          </Section>
        )}

        {c.pathway && (
          <Section title="Pathway">
            <FieldRow label="Junior → Expert" value={`${c.pathway.timeToJunior} → ${c.pathway.timeToMid} → ${c.pathway.timeToSenior} → ${c.pathway.timeToExpert}`} />
            {c.pathway.skills.length > 0 && <ChipList items={c.pathway.skills} />}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
      {children}
    </div>
  )
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontFamily: mono ? 'ui-monospace, monospace' : 'inherit', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map(i => (
        <span key={i} style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }}>{i}</span>
      ))}
    </div>
  )
}

// ── Missing Reports ─────────────────────────────────────────────────────────

const STATUS_FILTERS = ['pending', 'resolved', 'dismissed', 'all'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

function ReportsPanel({ onPendingCountChange }: { onPendingCountChange: (n: number) => void }) {
  const { token } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rows, setRows] = useState<MissingCareerReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await missingCareersApi.list(token, statusFilter === 'all' ? undefined : statusFilter)
      setRows(data)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => { load() }, [load])

  // Pending count for the tab badge is tracked independently of the current filter
  useEffect(() => {
    if (!token) return
    missingCareersApi.list(token, 'pending').then(data => onPendingCountChange(data.length)).catch(() => {})
  }, [token, rows, onPendingCountChange])

  async function setStatus(id: string, status: 'pending' | 'resolved' | 'dismissed') {
    if (!token) return
    setBusyId(id)
    try {
      await missingCareersApi.updateStatus(token, id, status)
      await load()
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to update report.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              border: '1px solid', borderColor: statusFilter === s ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              background: statusFilter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
              color: statusFilter === s ? 'var(--blue)' : 'var(--text-2)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '48px 0' }}>
          <Flag size={22} strokeWidth={1.5} />
          No {statusFilter === 'all' ? '' : statusFilter} reports.
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Reports</th>
                <th style={thStyle}>First seen</th>
                <th style={thStyle}>Last seen</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{r.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{r.source}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 700 }}>{r.reportCount}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{formatDate(r.firstReportedAt)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{formatDate(r.lastReportedAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusPill status={r.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {r.status !== 'resolved' && (
                        <IconButton title="Mark resolved" onClick={() => setStatus(r.id, 'resolved')} disabled={busyId === r.id} color="var(--green)">
                          <CheckCircle2 size={15} />
                        </IconButton>
                      )}
                      {r.status !== 'dismissed' && (
                        <IconButton title="Dismiss" onClick={() => setStatus(r.id, 'dismissed')} disabled={busyId === r.id} color="var(--text-3)">
                          <XCircle size={15} />
                        </IconButton>
                      )}
                      {r.status !== 'pending' && (
                        <IconButton title="Reopen" onClick={() => setStatus(r.id, 'pending')} disabled={busyId === r.id} color="#F59E0B">
                          <RotateCcw size={15} />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: MissingCareerReport['status'] }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    pending: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    resolved: { fg: 'var(--green)', bg: 'rgba(52,211,153,0.1)' },
    dismissed: { fg: 'var(--text-3)', bg: 'rgba(255,255,255,0.05)' },
  }
  const c = colors[status]
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, textTransform: 'capitalize', color: c.fg, background: c.bg }}>
      {status}
    </span>
  )
}

function IconButton({ children, onClick, disabled, title, color }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string; color: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg3)',
        color, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
