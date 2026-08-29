import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Search, Loader2, X, Flag, AlertTriangle, CheckCircle2, XCircle, RotateCcw, ChevronUp, ChevronDown, Clock, Plus, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { FormField, inputStyle, buttonStyle } from './Organisations'
import {
  careersAgentApi, careersAdminApi, missingCareersApi,
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
  const [viewMode, setViewMode] = useState<'recent' | 'category' | 'search'>('recent')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AdminCareer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastUpdated')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<AdminCareer | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRecent = useCallback(() => {
    setActiveCategory(null)
    setSearch('')
    setViewMode('recent')
    setLoading(true)
    setError('')
    careersAgentApi.getRecent(50)
      .then(setRows)
      .catch(() => setError('Failed to load recent careers.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    careersAgentApi.getCategories().then(setCategories).catch(() => setCategories([]))
    loadRecent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCategory = useCallback((category: string) => {
    setActiveCategory(category)
    setSearch('')
    setViewMode('category')
    setLoading(true)
    setError('')
    careersAgentApi.getByCategory(category, 200)
      .then(setRows)
      .catch(() => setError('Failed to load careers for this category.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length === 0) { loadRecent(); return }
    setActiveCategory(null)
    setViewMode('search')
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
          <button
            onClick={loadRecent}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: '1px solid', borderColor: viewMode === 'recent' ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              background: viewMode === 'recent' ? 'rgba(79,142,247,0.15)' : 'transparent',
              color: viewMode === 'recent' ? 'var(--blue)' : 'var(--text-2)',
            }}
          >
            <Clock size={12} /> Recent
          </button>
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
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto',
            background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Career
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
          {viewMode === 'recent' && `Most recently added or updated, newest first — ${rows.length} shown.`}
          {viewMode === 'category' && `${rows.length} in ${activeCategory}.`}
          {viewMode === 'search' && `${rows.length} result${rows.length === 1 ? '' : 's'} for "${search}".`}
        </p>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          {viewMode === 'search' ? `No careers match "${search}".` : 'No careers found.'}
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
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{formatLastUpdated(c.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <CareerDetailDrawer career={selected} onClose={() => setSelected(null)} />}
      {showCreate && (
        <CreateCareerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadRecent() }}
        />
      )}
    </div>
  )
}

// "Category" label with an inline "Suggest" link — classifies the typed title against
// the categories already in use, shared by CreateCareerModal and ResolveReportModal.
function CategoryLabel({ title, onSuggest }: { title: string; onSuggest: (category: string, subcategory: string) => void }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleSuggest() {
    if (!token || !title.trim() || loading) return
    setLoading(true)
    try {
      const { category, subcategory } = await careersAdminApi.suggestCategory(token, title.trim())
      onSuggest(category, subcategory)
    } catch {
      // best-effort — admin can still type it in manually
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span>Category</span>
      <button
        type="button"
        onClick={handleSuggest}
        disabled={!title.trim() || loading}
        style={{
          background: 'transparent', border: 'none', cursor: title.trim() ? 'pointer' : 'default',
          color: title.trim() ? 'var(--blue)' : 'var(--text-3)', fontSize: 11, fontWeight: 700,
          textTransform: 'none', letterSpacing: 'normal', padding: 0, fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 4, opacity: loading ? 0.6 : 1,
        }}
        title={title.trim() ? 'Suggest a category based on the title' : 'Enter a title first'}
      >
        {loading ? <Loader2 size={11} className="admin-spin" /> : <Sparkles size={11} />}
        Suggest
      </button>
    </>
  )
}

function CreateCareerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { token } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mouseDownOnBackdropRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!title.trim()) { setError('Title is required.'); return }
    if (!category.trim()) { setError('Category is required.'); return }
    setSaving(true)
    setError('')
    try {
      await careersAdminApi.addCareer(token, { title: title.trim(), category: category.trim(), subcategory: subcategory.trim() || undefined })
      onCreated()
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to add career.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>New Career</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Generates a full profile via AI — salary, demand, lifestyle, pathway — same as the automated discovery sweep, just for one title right now.</p>
        </div>

        <FormField label="Title">
          <input type="text" autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. DevOps Lead" />
        </FormField>
        <FormField label={<CategoryLabel title={title} onSuggest={(c, s) => { setCategory(c); setSubcategory(s) }} />}>
          <input type="text" autoComplete="off" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} placeholder="e.g. Technology" />
        </FormField>
        <FormField label="Subcategory (optional)">
          <input type="text" autoComplete="off" value={subcategory} onChange={e => setSubcategory(e.target.value)} style={inputStyle} placeholder="e.g. Infrastructure" />
        </FormField>

        {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Generating…' : 'Create career'}
          </button>
        </div>
      </form>
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
          <FieldRow label="lastUpdated" value={formatLastUpdated(c.lastUpdated)} />
          <FieldRow label="salaryLastUpdated" value={formatLastUpdated(c.salaryLastUpdated)} />
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
  const [resolving, setResolving] = useState<MissingCareerReport | null>(null)

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
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      {r.title}
                      {!r.plausible && (
                        <span
                          title={r.aiNote || 'Flagged by AI as an unlikely job title.'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '2px 6px', cursor: 'help',
                          }}
                        >
                          <AlertTriangle size={11} /> AI flagged
                        </span>
                      )}
                    </span>
                  </td>
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
                        <IconButton title="Resolve — adds it as a real career" onClick={() => setResolving(r)} disabled={busyId === r.id} color="var(--green)">
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

      {resolving && (
        <ResolveReportModal
          report={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => { setResolving(null); load() }}
        />
      )}
    </div>
  )
}

function ResolveReportModal({ report, onClose, onResolved }: { report: MissingCareerReport; onClose: () => void; onResolved: () => void }) {
  const { token } = useAuth()
  const [title, setTitle] = useState(report.title)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mouseDownOnBackdropRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!title.trim()) { setError('Title is required.'); return }
    if (!category.trim()) { setError('Category is required.'); return }
    setSaving(true)
    setError('')
    try {
      await careersAdminApi.addCareer(token, { title: title.trim(), category: category.trim(), subcategory: subcategory.trim() || undefined })
      await missingCareersApi.updateStatus(token, report.id, 'resolved')
      onResolved()
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to add career.')
      setSaving(false)
    }
  }

  async function handleMarkResolvedOnly() {
    if (!token) return
    setSaving(true)
    setError('')
    try {
      await missingCareersApi.updateStatus(token, report.id, 'resolved')
      onResolved()
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to update report.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Resolve "{report.title}"</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Generates a full career profile via AI and adds it to the database — this is what actually makes it searchable on the intake screen. Reported {report.reportCount} time{report.reportCount === 1 ? '' : 's'}.</p>
        </div>

        <FormField label="Title">
          <input type="text" autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label={<CategoryLabel title={title} onSuggest={(c, s) => { setCategory(c); setSubcategory(s) }} />}>
          <input type="text" autoComplete="off" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} placeholder="e.g. Technology" />
        </FormField>
        <FormField label="Subcategory (optional)">
          <input type="text" autoComplete="off" value={subcategory} onChange={e => setSubcategory(e.target.value)} style={inputStyle} placeholder="e.g. Infrastructure" />
        </FormField>

        {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Working…' : 'Add career & resolve'}
          </button>
        </div>
        <button
          type="button"
          onClick={handleMarkResolvedOnly}
          disabled={saving}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0, alignSelf: 'center' }}
        >
          It's already covered — just mark resolved without adding
        </button>
      </form>
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

// Older docs only ever got a bare "yyyy-MM-dd" (no time was captured at write time) —
// showing a fabricated midnight for those would be misleading, so time only renders when
// the raw value actually carries one (contains 'T', i.e. a full ISO-8601 timestamp).
function formatLastUpdated(raw: string): string {
  if (!raw) return '—'
  const hasTime = raw.includes('T')
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return hasTime
    ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
