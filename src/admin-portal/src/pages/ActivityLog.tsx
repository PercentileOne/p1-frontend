import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Loader2, ChevronUp, ChevronDown, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { eventsApi, type SystemEvent, type ApiError } from '../api/eventsApi'
import { Pagination } from '../components/Pagination'
import { MarketingFunnel } from '../components/MarketingFunnel'
import { describeDevice, describeLocation, describeCityAndCountry, describeCityGuess, ageOf } from '../lib/eventFormat'

// Same sortBy values the backend's SortableFields whitelist accepts (Features/Events/Admin/
// Endpoint.cs) — Location sorts by country, not the combined "city, country" display string,
// since Cosmos can only ORDER BY one indexed property at a time.
type SortKey = 'createdAt' | 'email' | 'eventType' | 'page' | 'portal' | 'country'
type SortDir = 'asc' | 'desc'

// Same visual conventions as UserList.tsx (search pill, table, pager) — but SERVER-side
// filtering/pagination, not client-side over one fetched batch, since event volume won't fit
// in one request the way a user list does. Only searches the hot 10-day Cosmos window — see
// Features/Events/Admin/Endpoint.cs's own top comment on why deep historical search over the
// permanent archive is a deliberate v2 problem, not solved here. pageSize is user-adjustable
// (Pagination component) rather than a fixed constant — changing it re-fetches from page 1.
// 'marketing' added 2026-09-18 (Francis) — track.js (src/viewme/public) already posts
// page_view events with portal: 'marketing' for the static homepage/login-gate/etc., but this
// dropdown never had an option for it, so those events were only ever reachable via "All
// portals" mixed in with everything else, not filterable on their own.
const PORTALS = ['', 'candidate', 'recruiter', 'employer', 'admin', 'marketing'] as const

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', caretColor: 'var(--blue)',
}
const selectStyle: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
}

const dangerBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
  color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
  borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit',
}

// Module-level (not just inside ActivityLog itself) so EventDetailModal can reuse it too.
function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActivityLog() {
  const { token } = useAuth()
  const [rows, setRows] = useState<SystemEvent[]>([])
  const [total, setTotal] = useState(0)
  // A single free-text box across every displayed column (User/Event/Page/Portal/Location) —
  // replaces the old email-only search per Francis's request 2026-09-16 ("instead of searching
  // by email/full email, I'd like that to be an ANY search field"). Backend does the OR'ing
  // (Features/Events/Admin/Endpoint.cs's `q` param); this is just the box + its debounce-free
  // page-1 reset, same as every other filter here.
  const [q, setQ] = useState('')
  const [eventType, setEventType] = useState('')
  const [portal, setPortal] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Click a row to see everything the table doesn't have room for — full page path, IP,
  // user agent, session/user id, raw metadata. Francis, 2026-09-16, right after using the
  // Page column's hover tooltip to chase down a truncated /interview-summary/<guid> link.
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null)

  // Deleting (Francis, 2026-09-20): tick rows, or delete everything matching the current search. Always confirmed.
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { kind: 'selected' | 'matching' | 'one'; count: number; one?: SystemEvent }>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await eventsApi.list(token, {
        q: q.trim() || undefined,
        eventType: eventType.trim() || undefined,
        portal: portal || undefined,
        // Date-only <input type="date"> values are widened to cover the whole day in local time
        // — `from` at 00:00:00 and `to` at 23:59:59.999 — so picking the same day for both ends
        // is an inclusive single-day filter, not a zero-width instant that matches nothing.
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        sortBy: sortKey, sortDir,
        page, size: pageSize,
      })
      setRows(res.rows)
      setTotal(res.total)
      setTicked(new Set())
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load activity.')
    } finally {
      setLoading(false)
    }
  }, [token, q, eventType, portal, from, to, sortKey, sortDir, page, pageSize])

  // Same toggle contract as UserList.tsx's own sortable columns: click an inactive column to
  // sort ascending by it, click the active one again to flip direction. Re-fetches from page 1
  // since this is server-side pagination — a stale later page after a sort change would be
  // showing the wrong slice entirely, not just a wrong order.
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  useEffect(() => { load() }, [load])

  const currentFilter = () => ({
    q: q.trim() || undefined,
    eventType: eventType.trim() || undefined,
    portal: portal || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  })

  async function runDelete() {
    if (!token || !confirm) return
    setDeleting(true); setError(''); setNotice('')
    try {
      let deleted = 0
      if (confirm.kind === 'one' && confirm.one) {
        deleted = (await eventsApi.deleteSelected(token, [{ id: confirm.one.id, sessionId: confirm.one.sessionId }])).deleted
        setSelectedEvent(null)
      } else if (confirm.kind === 'selected') {
        const items = rows.filter(r => ticked.has(r.id)).map(r => ({ id: r.id, sessionId: r.sessionId }))
        deleted = (await eventsApi.deleteSelected(token, items)).deleted
      } else {
        deleted = (await eventsApi.deleteMatching(token, currentFilter(), confirm.count)).deleted
      }
      setNotice(`Deleted ${deleted.toLocaleString()} event${deleted === 1 ? '' : 's'}.`)
      setConfirm(null)
      setPage(1)
      await load()
    } catch (err) {
      setError((err as ApiError).error ?? 'Delete failed.')
      setConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const toggleTick = (id: string) => setTicked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allTicked = rows.length > 0 && rows.every(r => ticked.has(r.id))
  const anyFilter = !!(q.trim() || eventType.trim() || portal || from || to)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Activity Log</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {total.toLocaleString()} event{total === 1 ? '' : 's'} in the last 10 days — real-time, not delayed like Google Analytics.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px', cursor: loading ? 'default' : 'pointer', flexShrink: 0,
          }}
        >
          <RefreshCw size={13} className={loading ? 'admin-spin' : ''} /> Refresh
        </button>
      </div>

      <MarketingFunnel onBrowse={t => { setPortal('marketing'); setEventType(t); setQ(''); setPage(1) }} />

      {notice && (
        <div style={{ fontSize: 12, color: '#34D399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {notice}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', flex: '1 1 240px', minWidth: 0,
        }}>
          <Search size={15} color="var(--text-3)" />
          <input
            type="text" autoComplete="off" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Search anything… e.g. Anony, United States, webhook"
            style={inputStyle}
          />
        </div>
        <input
          type="text" autoComplete="off" value={eventType}
          onChange={e => { setEventType(e.target.value); setPage(1) }}
          placeholder="Event type…"
          style={{ ...selectStyle, flex: '1 1 160px', minWidth: 0 }}
        />
        <select value={portal} onChange={e => { setPortal(e.target.value); setPage(1) }} style={selectStyle}>
          {PORTALS.map(p => <option key={p} value={p}>{p ? p[0].toUpperCase() + p.slice(1) : 'All portals'}</option>)}
        </select>
        <input
          type="date" value={from} max={to || undefined}
          onChange={e => { setFrom(e.target.value); setPage(1) }}
          style={{ ...selectStyle, colorScheme: 'dark' }}
          title="From date"
        />
        <input
          type="date" value={to} min={from || undefined}
          onChange={e => { setTo(e.target.value); setPage(1) }}
          style={{ ...selectStyle, colorScheme: 'dark' }}
          title="To date"
        />
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo(''); setPage(1) }}
            style={{ ...selectStyle, color: 'var(--text-3)', cursor: 'pointer' }}
          >
            Clear dates
          </button>
        )}
      </div>

      {!loading && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-3)' }}>
          {ticked.size > 0 && (
            <>
              <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{ticked.size} selected</span>
              <button onClick={() => setConfirm({ kind: 'selected', count: ticked.size })} style={dangerBtn}><Trash2 size={13} /> Delete selected</button>
              <button onClick={() => setTicked(new Set())} style={{ ...selectStyle, cursor: 'pointer' }}>Clear selection</button>
            </>
          )}
          <button
            onClick={() => setConfirm({ kind: 'matching', count: total })}
            style={{ ...dangerBtn, marginLeft: ticked.size > 0 ? 'auto' : 0, background: 'transparent' }}
            title="Deletes every event that matches the current search and dates — you will be asked to confirm the count"
          >
            <Trash2 size={13} /> {anyFilter ? `Delete all ${total.toLocaleString()} matching this search…` : `Delete ALL ${total.toLocaleString()} events…`}
          </button>
        </div>
      )}

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
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No events match these filters.</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Fixed column shares + wrapping text: the table always fits the screen, so there is no horizontal scrollbar (which sat at
              the bottom of a 100-row table and jumped when clicked). */}
          <div>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: 36, padding: '10px 0 10px 16px' }}>
                    <input
                      type="checkbox" checked={allTicked} aria-label="Select all on this page"
                      onChange={() => setTicked(allTicked ? new Set() : new Set(rows.map(r => r.id)))}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <SortableHeader label="When" sortKeyName="createdAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Signed in as" sortKeyName="email" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Event" sortKeyName="eventType" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Page" sortKeyName="page" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Portal" sortKeyName="portal" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Location" sortKeyName="country" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Device</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Session</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEvent(e)}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(79,142,247,0.08)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 0 12px 16px', width: 36 }} onClick={ev => ev.stopPropagation()}>
                      <input type="checkbox" checked={ticked.has(e.id)} onChange={() => toggleTick(e.id)} aria-label="Select this event" style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', overflowWrap: 'anywhere' }}>{fmt(e.createdAt)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', overflowWrap: 'anywhere' }}>{e.email ?? <span style={{ color: 'var(--text-3)' }}>Anonymous</span>}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{e.eventType}</td>
                    <td
                      title={e.page ?? undefined}
                      style={{ padding: '12px 16px', color: 'var(--text-3)', overflowWrap: 'anywhere', cursor: e.page ? 'help' : 'default' }}
                    >
                      {e.page ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', textTransform: 'capitalize', overflowWrap: 'anywhere' }}>{e.portal ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', overflowWrap: 'anywhere' }}>
                      {describeCityAndCountry(e)}
                    </td>
                    <td title={e.userAgent ?? undefined} style={{ padding: '12px 16px', color: 'var(--text-3)', overflowWrap: 'anywhere' }}>{describeDevice(e.userAgent)}</td>
                    <td title={e.sessionId} style={{ padding: '12px 16px', color: 'var(--text-3)', overflowWrap: 'anywhere', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{e.sessionId.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page} totalPages={totalPages} onPageChange={setPage}
            pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }}
            rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, total)} total={total}
          />
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
        Approximate locations by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-3)' }}>Geoapify</a> — an IP-based guess, often wrong on mobile data.
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => setConfirm({ kind: 'one', count: 1, one: selectedEvent })}
        />
      )}

      {confirm && (
        <ConfirmDeleteDialog
          count={confirm.count}
          kind={confirm.kind}
          filterSummary={confirm.kind === 'matching' ? describeFilter({ q, eventType, portal, from, to }) : ''}
          busy={deleting}
          onCancel={() => setConfirm(null)}
          onConfirm={runDelete}
        />
      )}
    </div>
  )
}

// ── Row detail modal — everything the table's fixed columns don't have room for ─────────────
function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: '0 0 120px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', paddingTop: 2 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', wordBreak: 'break-word', fontFamily: mono ? 'ui-monospace, monospace' : 'inherit' }}>
        {value}
      </div>
    </div>
  )
}

function EventDetailModal({ event, onClose, onDelete }: { event: SystemEvent; onClose: () => void; onDelete: () => void }) {
  const mouseDownOnBackdropRef = useRef(false)
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
      onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{event.eventType}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{fmt(event.createdAt)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        <DetailRow label="User" value={event.email ?? <span style={{ color: 'var(--text-3)' }}>Anonymous</span>} />
        <DetailRow label="Role" value={event.role ?? '—'} />
        <DetailRow label="Portal" value={event.portal ?? '—'} />
        <DetailRow label="Page" value={event.page ?? '—'} mono />
        <DetailRow label="Country" value={describeLocation(event)} />
        <DetailRow label="City guess" value={<span style={{ color: 'var(--text-3)' }}>{describeCityGuess(event)}</span>} />
        <DetailRow label="IP address" value={event.ipAddress ?? '—'} mono />
        <DetailRow label="Device" value={describeDevice(event.userAgent)} />
        <DetailRow label="User agent" value={event.userAgent ?? '—'} />
        {event.email && <DetailRow label="Sign-in issued" value={event.tokenIssuedAt ? `${ageOf(event.tokenIssuedAt)} (${fmt(event.tokenIssuedAt)})` : 'Not recorded for this event'} />}
        <DetailRow label="Session ID" value={event.sessionId} mono />
        <DetailRow label="User ID" value={event.userId ?? '—'} mono />
        <DetailRow label="Event ID" value={event.id} mono />
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <DetailRow
            label="Metadata"
            mono
            value={<pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(event.metadata, null, 2)}</pre>}
          />
        )}
        <div style={{ marginTop: 18 }}>
          <button onClick={onDelete} style={dangerBtn}><Trash2 size={13} /> Delete this event</button>
        </div>
      </div>
    </div>
  )
}

function describeFilter(f: { q: string; eventType: string; portal: string; from: string; to: string }): string {
  const parts = [
    f.q.trim() && `search "${f.q.trim()}"`,
    f.eventType.trim() && `event type "${f.eventType.trim()}"`,
    f.portal && `portal ${f.portal}`,
    f.from && `from ${f.from}`,
    f.to && `to ${f.to}`,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'no filters — this is EVERY event in the log'
}

// Always shows the exact number about to be removed; a bulk delete also has to be typed out, so it can't be a stray click.
function ConfirmDeleteDialog({ count, kind, filterSummary, busy, onCancel, onConfirm }: {
  count: number; kind: 'selected' | 'matching' | 'one'; filterSummary: string; busy: boolean; onCancel: () => void; onConfirm: () => void
}) {
  const [typed, setTyped] = useState('')
  const needsTyping = kind === 'matching' && count > 1
  const ok = !needsTyping || typed.trim().toUpperCase() === 'DELETE'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
          Delete {count.toLocaleString()} event{count === 1 ? '' : 's'}?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
          {kind === 'matching' ? <>This removes every event matching: <strong>{filterSummary}</strong>.</> : 'This removes the selected event(s) from the Activity Log.'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 14 }}>
          It can't be undone from here. A permanent archive copy may still exist in cold storage, and the deletion itself is recorded in the log.
        </p>
        {needsTyping && (
          <input
            autoFocus value={typed} onChange={e => setTyped(e.target.value)} placeholder='Type DELETE to confirm'
            style={{ ...selectStyle, width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
          />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={busy} style={{ ...selectStyle, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={onConfirm} disabled={!ok || busy}
            style={{ ...dangerBtn, background: ok ? '#EF4444' : 'rgba(239,68,68,0.15)', color: ok ? '#fff' : '#EF4444', cursor: ok && !busy ? 'pointer' : 'default' }}
          >
            {busy ? 'Deleting…' : `Delete ${count.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// Same look/click-to-toggle contract as UserList.tsx's own SortableHeader — copied rather than
// shared since that one owns its sort state internally and this page's lives in ActivityLog
// itself (server-side sort/paging here vs. UserList's client-side, per this file's own top
// comment on why).
function SortableHeader({ label, sortKeyName, sortKey, sortDir, onToggle }: {
  label: string; sortKeyName: SortKey; sortKey: SortKey; sortDir: SortDir; onToggle: (key: SortKey) => void
}) {
  const active = sortKey === sortKeyName
  return (
    <th
      onClick={() => onToggle(sortKeyName)}
      style={{
        textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: active ? 'var(--blue)' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  )
}
