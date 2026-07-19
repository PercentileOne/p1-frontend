import { useState } from 'react'
import { X } from 'lucide-react'

const PACKS = [
  { id: 1, candidate: 'James Okafor',    initials: 'JO', role: 'Senior .NET Developer',  sent: '18 Jul', score: 82,   status: 'Interview Booked', color: '#34D399', recruiter: 'Mike Afolabi',    opens: 4, company: 'Barclays Tech' },
  { id: 2, candidate: 'Sarah Mitchell',  initials: 'SM', role: 'Product Manager',         sent: '17 Jul', score: 71,   status: 'Confirmed',        color: '#4F8EF7', recruiter: 'Mike Afolabi',    opens: 2, company: 'FinTech Corp' },
  { id: 3, candidate: 'Raj Patel',       initials: 'RP', role: 'DevOps Engineer',         sent: '17 Jul', score: 68,   status: 'Sent',             color: '#F59E0B', recruiter: 'Sarah Collins',   opens: 1, company: 'CloudBase Ltd' },
  { id: 4, candidate: 'Claire Thompson', initials: 'CT', role: 'UX Designer',             sent: '16 Jul', score: 91,   status: 'Interview Booked', color: '#34D399', recruiter: 'Mike Afolabi',    opens: 6, company: 'Studio Digital' },
  { id: 5, candidate: 'Daniel Osei',     initials: 'DO', role: 'Data Analyst',            sent: '15 Jul', score: null, status: 'No Interview',     color: '#EF4444', recruiter: 'Sarah Collins',   opens: 0, company: 'DataHouse UK' },
  { id: 6, candidate: 'Priya Sharma',    initials: 'PS', role: 'Business Analyst',        sent: '14 Jul', score: 77,   status: 'Confirmed',        color: '#4F8EF7', recruiter: 'Mike Afolabi',    opens: 3, company: 'Capita Group' },
  { id: 7, candidate: 'Leon Mbeki',      initials: 'LM', role: 'Cloud Architect',         sent: '13 Jul', score: 85,   status: 'Interview Booked', color: '#34D399', recruiter: 'Mike Afolabi',    opens: 5, company: 'AWS Partner' },
  { id: 8, candidate: 'Hannah Green',    initials: 'HG', role: 'Scrum Master',            sent: '12 Jul', score: 63,   status: 'Sent',             color: '#F59E0B', recruiter: 'Sarah Collins',   opens: 1, company: 'Agile Works' },
]

const STATUS_OPTIONS = ['All', 'Interview Booked', 'Confirmed', 'Sent', 'No Interview']

export default function InterviewPacks() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const visible = PACKS.filter(p => {
    const matchStatus = filter === 'All' || p.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || p.candidate.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Interview Packs</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{PACKS.length} packs total · {PACKS.filter(p => p.status === 'Interview Booked').length} interviews booked</p>
        </div>
        <button style={{
          padding: '10px 20px', background: 'var(--blue)', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Generate New Pack</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search candidate or role…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '8px 14px', borderRadius: 20, border: '1px solid',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: filter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
              borderColor: filter === s ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              color: filter === s ? '#4F8EF7' : 'var(--text-3)',
              transition: 'all 0.15s',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Candidate', 'Role', 'Company', 'Sent', 'Score', 'Opens', 'Recruiter', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => (
              <tr key={p.id}
                style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{p.initials}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.candidate}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{p.role}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{p.company}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{p.sent}</td>
                <td style={{ padding: '14px 16px' }}>
                  {p.score != null
                    ? <span style={{ fontSize: 13, fontWeight: 800, color: p.score >= 75 ? '#34D399' : p.score >= 60 ? '#F59E0B' : '#EF4444' }}>{p.score}%</span>
                    : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{p.opens} {p.opens === 1 ? 'open' : 'opens'}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{p.recruiter}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: `${p.color}18`, padding: '4px 10px', borderRadius: 20 }}>{p.status}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No packs match your filter.</div>
        )}
      </div>
    </div>
  )
}
