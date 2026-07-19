import { useState } from 'react'
import { X } from 'lucide-react'

const JOBS = [
  { id: 1, title: 'Senior .NET Developer',    client: 'Barclays Tech',    salary: '£75k–£90k',  type: 'Permanent',  status: 'Active',   candidates: 4,  interviews: 2, deadline: '1 Aug',  recruiter: 'Mike Afolabi',  color: '#34D399' },
  { id: 2, title: 'UX Designer',              client: 'Studio Digital',   salary: '£55k–£65k',  type: 'Permanent',  status: 'Active',   candidates: 3,  interviews: 1, deadline: '28 Jul', recruiter: 'Mike Afolabi',  color: '#34D399' },
  { id: 3, title: 'DevOps Engineer',          client: 'CloudBase Ltd',    salary: '£70k–£85k',  type: 'Contract',   status: 'Active',   candidates: 2,  interviews: 1, deadline: '25 Jul', recruiter: 'Sarah Collins', color: '#F59E0B' },
  { id: 4, title: 'Product Manager',          client: 'FinTech Corp',     salary: '£80k–£95k',  type: 'Permanent',  status: 'Active',   candidates: 3,  interviews: 1, deadline: '4 Aug',  recruiter: 'Mike Afolabi',  color: '#34D399' },
  { id: 5, title: 'Data Analyst',             client: 'DataHouse UK',     salary: '£45k–£55k',  type: 'Permanent',  status: 'On Hold',  candidates: 1,  interviews: 0, deadline: 'TBC',    recruiter: 'Sarah Collins', color: '#F59E0B' },
  { id: 6, title: 'Business Analyst',         client: 'Capita Group',     salary: '£55k–£65k',  type: 'Contract',   status: 'Active',   candidates: 2,  interviews: 1, deadline: '22 Jul', recruiter: 'Mike Afolabi',  color: '#34D399' },
  { id: 7, title: 'Cloud Architect',          client: 'AWS Partner',      salary: '£95k–£120k', type: 'Permanent',  status: 'Active',   candidates: 1,  interviews: 1, deadline: '10 Aug', recruiter: 'Mike Afolabi',  color: '#34D399' },
  { id: 8, title: 'Head of Engineering',      client: 'TBC',              salary: '£130k+',     type: 'Permanent',  status: 'Draft',    candidates: 0,  interviews: 0, deadline: 'TBC',    recruiter: 'Mike Afolabi',  color: '#64748b' },
  { id: 9, title: 'Scrum Master',             client: 'Agile Works',      salary: '£50k–£60k',  type: 'Permanent',  status: 'Active',   candidates: 1,  interviews: 0, deadline: '30 Jul', recruiter: 'Sarah Collins', color: '#F59E0B' },
  { id:10, title: 'Frontend Engineer',        client: 'Media Group',      salary: '£60k–£75k',  type: 'Contract',   status: 'Filled',   candidates: 5,  interviews: 3, deadline: 'Filled', recruiter: 'Mike Afolabi',  color: '#A78BFA' },
]

const STATUS_OPTS = ['All', 'Active', 'On Hold', 'Draft', 'Filled']

export default function JobPositions() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const visible = JOBS.filter(j => {
    const matchStatus = filter === 'All' || j.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.client.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const active = JOBS.filter(j => j.status === 'Active').length
  const totalCandidates = JOBS.reduce((a, j) => a + j.candidates, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Job Positions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{active} active roles · {totalCandidates} candidates in pipeline</p>
        </div>
        <button style={{ padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Position</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or client…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
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
              {['Position', 'Client', 'Salary', 'Type', 'Deadline', 'Candidates', 'Recruiter', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((j, i) => (
              <tr key={j.id}
                style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
              >
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
                  <button style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No positions match your filter.</div>}
      </div>
    </div>
  )
}
