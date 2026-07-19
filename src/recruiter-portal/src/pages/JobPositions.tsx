import { useState } from 'react'
import { X, ChevronUp, ChevronDown, Archive } from 'lucide-react'

const JOBS = [
  { id: 1,  title: 'Senior .NET Developer',  client: 'Barclays Tech',   salary: '£75k–£90k',  type: 'Permanent', status: 'Active',   candidates: 4, interviews: 2, deadline: '1 Aug',  recruiter: 'Mike Afolabi',  color: '#34D399', received: '2026-07-14' },
  { id: 2,  title: 'UX Designer',            client: 'Studio Digital',  salary: '£55k–£65k',  type: 'Permanent', status: 'Active',   candidates: 3, interviews: 1, deadline: '28 Jul', recruiter: 'Mike Afolabi',  color: '#34D399', received: '2026-07-12' },
  { id: 3,  title: 'DevOps Engineer',        client: 'CloudBase Ltd',   salary: '£70k–£85k',  type: 'Contract',  status: 'Active',   candidates: 2, interviews: 1, deadline: '25 Jul', recruiter: 'Sarah Collins', color: '#F59E0B', received: '2026-07-10' },
  { id: 4,  title: 'Product Manager',        client: 'FinTech Corp',    salary: '£80k–£95k',  type: 'Permanent', status: 'Active',   candidates: 3, interviews: 1, deadline: '4 Aug',  recruiter: 'Mike Afolabi',  color: '#34D399', received: '2026-07-09' },
  { id: 5,  title: 'Data Analyst',           client: 'DataHouse UK',    salary: '£45k–£55k',  type: 'Permanent', status: 'On Hold',  candidates: 1, interviews: 0, deadline: 'TBC',    recruiter: 'Sarah Collins', color: '#F59E0B', received: '2026-07-07' },
  { id: 6,  title: 'Business Analyst',       client: 'Capita Group',    salary: '£55k–£65k',  type: 'Contract',  status: 'Active',   candidates: 2, interviews: 1, deadline: '22 Jul', recruiter: 'Mike Afolabi',  color: '#34D399', received: '2026-07-05' },
  { id: 7,  title: 'Cloud Architect',        client: 'AWS Partner',     salary: '£95k–£120k', type: 'Permanent', status: 'Active',   candidates: 1, interviews: 1, deadline: '10 Aug', recruiter: 'Mike Afolabi',  color: '#34D399', received: '2026-07-03' },
  { id: 8,  title: 'Head of Engineering',    client: 'TBC',             salary: '£130k+',     type: 'Permanent', status: 'Draft',    candidates: 0, interviews: 0, deadline: 'TBC',    recruiter: 'Mike Afolabi',  color: '#64748b', received: '2026-07-01' },
  { id: 9,  title: 'Scrum Master',           client: 'Agile Works',     salary: '£50k–£60k',  type: 'Permanent', status: 'Active',   candidates: 1, interviews: 0, deadline: '30 Jul', recruiter: 'Sarah Collins', color: '#F59E0B', received: '2026-06-28' },
  { id: 10, title: 'Frontend Engineer',      client: 'Media Group',     salary: '£60k–£75k',  type: 'Contract',  status: 'Filled',   candidates: 5, interviews: 3, deadline: 'Filled', recruiter: 'Mike Afolabi',  color: '#A78BFA', received: '2026-06-20' },
]

const STATUS_OPTS = ['All', 'Active', 'On Hold', 'Draft', 'Filled']
const PAGE_SIZE = 7

type SortKey = 'received' | 'title' | 'client' | 'candidates' | 'deadline'

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function JobPositions() {
  const [filter, setFilter]       = useState('All')
  const [search, setSearch]       = useState('')
  const [sortKey, setSortKey]     = useState<SortKey>('received')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [page, setPage]           = useState(1)
  const [archived, setArchived]   = useState<number[]>([])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const filtered = JOBS
    .filter(j => !archived.includes(j.id))
    .filter(j => {
      const matchStatus = filter === 'All' || j.status === filter
      const q = search.toLowerCase()
      const matchSearch = !q || j.title.toLowerCase().includes(q) || j.client.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (sortKey === 'candidates') { av = a.candidates; bv = b.candidates }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const active = JOBS.filter(j => j.status === 'Active' && !archived.includes(j.id)).length
  const totalCandidates = JOBS.filter(j => !archived.includes(j.id)).reduce((a, j) => a + j.candidates, 0)

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
      : <ChevronDown size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
    whiteSpace: 'nowrap', userSelect: 'none',
  }
  const sortableTh = (label: string, key: SortKey) => (
    <th key={key} style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort(key)}>
      {label}<SortIcon k={key} />
    </th>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Job Specs</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{active} active roles · {totalCandidates} candidates in pipeline</p>
        </div>
        <button style={{ padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Upload Job Spec</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search title or client…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1) }} style={{
              padding: '8px 14px', borderRadius: 20, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: filter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
              borderColor: filter === s ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              color: filter === s ? '#4F8EF7' : 'var(--text-3)', transition: 'all 0.15s',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {sortableTh('Received', 'received')}
              {sortableTh('Position', 'title')}
              {sortableTh('Client', 'client')}
              <th style={thStyle}>Salary</th>
              <th style={thStyle}>Type</th>
              {sortableTh('Deadline', 'deadline')}
              {sortableTh('Candidates', 'candidates')}
              <th style={thStyle}>Recruiter</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {visible.map((j, i) => (
              <tr key={j.id}
                style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
              >
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(j.received)}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{j.title}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{j.client}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{j.salary}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: j.type === 'Contract' ? '#F59E0B' : '#4F8EF7', background: j.type === 'Contract' ? 'rgba(245,158,11,0.1)' : 'rgba(79,142,247,0.1)', padding: '3px 8px', borderRadius: 20 }}>{j.type}</span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{j.deadline}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{j.candidates} candidates</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{j.interviews} interviews</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{j.recruiter}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: j.color, background: `${j.color}18`, padding: '4px 10px', borderRadius: 20 }}>{j.status}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</button>
                    <button
                      title="Archive"
                      onClick={e => { e.stopPropagation(); setArchived(a => [...a, j.id]) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, opacity: 0.6 }}
                    >
                      <Archive size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No specs match your filter.</div>}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}
              >← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                  background: n === page ? 'rgba(79,142,247,0.15)' : 'transparent',
                  borderColor: n === page ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                  color: n === page ? '#4F8EF7' : 'var(--text-3)',
                }}>{n}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === totalPages ? 0.4 : 1 }}
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
