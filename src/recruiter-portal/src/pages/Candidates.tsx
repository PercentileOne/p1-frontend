import { useState } from 'react'
import { X } from 'lucide-react'

const CANDIDATES = [
  { id: 1, name: 'James Okafor',    initials: 'JO', role: 'Senior .NET Developer',  score: 82, status: 'Interview Booked', color: '#34D399', location: 'London',     available: 'Immediate',    packs: 2, lastContact: '18 Jul' },
  { id: 2, name: 'Sarah Mitchell',  initials: 'SM', role: 'Product Manager',         score: 71, status: 'Confirmed',        color: '#4F8EF7', location: 'Manchester',  available: '2 weeks',      packs: 1, lastContact: '17 Jul' },
  { id: 3, name: 'Raj Patel',       initials: 'RP', role: 'DevOps Engineer',         score: 68, status: 'In Progress',      color: '#F59E0B', location: 'Birmingham',  available: '1 month',      packs: 1, lastContact: '17 Jul' },
  { id: 4, name: 'Claire Thompson', initials: 'CT', role: 'UX Designer',             score: 91, status: 'Interview Booked', color: '#34D399', location: 'London',     available: 'Immediate',    packs: 3, lastContact: '16 Jul' },
  { id: 5, name: 'Daniel Osei',     initials: 'DO', role: 'Data Analyst',            score: 58, status: 'Needs Review',     color: '#EF4444', location: 'Leeds',       available: '2 weeks',      packs: 1, lastContact: '15 Jul' },
  { id: 6, name: 'Priya Sharma',    initials: 'PS', role: 'Business Analyst',        score: 77, status: 'Confirmed',        color: '#4F8EF7', location: 'London',     available: 'Immediate',    packs: 2, lastContact: '14 Jul' },
  { id: 7, name: 'Leon Mbeki',      initials: 'LM', role: 'Cloud Architect',         score: 85, status: 'Interview Booked', color: '#34D399', location: 'Bristol',     available: '1 month',      packs: 1, lastContact: '13 Jul' },
  { id: 8, name: 'Hannah Green',    initials: 'HG', role: 'Scrum Master',            score: 63, status: 'In Progress',      color: '#F59E0B', location: 'Edinburgh',   available: '2 weeks',      packs: 1, lastContact: '12 Jul' },
  { id: 9, name: 'Marcus Reid',     initials: 'MR', role: 'Frontend Engineer',       score: 79, status: 'New',              color: '#A78BFA', location: 'London',     available: 'Immediate',    packs: 0, lastContact: '19 Jul' },
  { id:10, name: 'Fatima Al-Sayed', initials: 'FA', role: 'Data Engineer',           score: 88, status: 'New',              color: '#A78BFA', location: 'Remote',      available: 'Immediate',    packs: 0, lastContact: '19 Jul' },
]

const STATUS_OPTS = ['All', 'New', 'In Progress', 'Confirmed', 'Interview Booked', 'Needs Review']

export default function Candidates() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const visible = CANDIDATES.filter(c => {
    const matchStatus = filter === 'All' || c.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Candidates</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{CANDIDATES.length} candidates · {CANDIDATES.filter(c => c.status === 'Interview Booked').length} interviews booked</p>
        </div>
        <button style={{ padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Candidate</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, role, or location…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
        {visible.map(c => (
          <div key={c.id} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px',
            cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,142,247,0.35)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(79,142,247,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.role}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.color, background: `${c.color}18`, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>{c.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <Stat label="Score" value={c.score != null ? `${c.score}%` : '—'} accent={c.score != null ? (c.score >= 75 ? '#34D399' : c.score >= 60 ? '#F59E0B' : '#EF4444') : 'var(--text-3)'} />
              <Stat label="Location" value={c.location} />
              <Stat label="Available" value={c.available} />
              <Stat label="Packs Sent" value={c.packs.toString()} />
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Last contact: {c.lastContact}</span>
              <button style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>View profile →</button>
            </div>
          </div>
        ))}
      </div>
      {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No candidates match your search.</div>}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent ?? 'var(--text-2)' }}>{value}</div>
    </div>
  )
}
