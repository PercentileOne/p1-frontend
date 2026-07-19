import { useState } from 'react'

const DAYS = ['Mon 21', 'Tue 22', 'Wed 23', 'Thu 24', 'Fri 25']

const APPOINTMENTS = [
  { id: 1, candidate: 'James Okafor',    initials: 'JO', role: 'Senior .NET Developer',  day: 'Mon 21', time: '10:00am', duration: '45 min', interviewer: 'Mike Afolabi',  type: 'Technical',    status: 'Confirmed',  color: '#34D399' },
  { id: 2, candidate: 'Priya Sharma',    initials: 'PS', role: 'Business Analyst',        day: 'Wed 23', time: '11:00am', duration: '60 min', interviewer: 'Mike Afolabi',  type: 'Competency',   status: 'Confirmed',  color: '#34D399' },
  { id: 3, candidate: 'Claire Thompson', initials: 'CT', role: 'UX Designer',             day: 'Tue 22', time: '2:30pm',  duration: '45 min', interviewer: 'Sarah Collins', type: 'Portfolio',    status: 'Confirmed',  color: '#34D399' },
  { id: 4, candidate: 'Leon Mbeki',      initials: 'LM', role: 'Cloud Architect',         day: 'Thu 24', time: '9:00am',  duration: '60 min', interviewer: 'Mike Afolabi',  type: 'Technical',    status: 'Pending',    color: '#F59E0B' },
  { id: 5, candidate: 'Sarah Mitchell',  initials: 'SM', role: 'Product Manager',         day: 'Thu 24', time: '3:00pm',  duration: '45 min', interviewer: 'Sarah Collins', type: 'Competency',   status: 'Pending',    color: '#F59E0B' },
  { id: 6, candidate: 'Raj Patel',       initials: 'RP', role: 'DevOps Engineer',         day: 'Fri 25', time: '10:30am', duration: '45 min', interviewer: 'Mike Afolabi',  type: 'Technical',    status: 'Awaiting',   color: '#A78BFA' },
]

const TYPE_COLORS: Record<string, string> = {
  Technical: '#4F8EF7', Competency: '#A78BFA', Portfolio: '#34D399',
}

export default function Appointments() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const filtered = selectedDay ? APPOINTMENTS.filter(a => a.day === selectedDay) : APPOINTMENTS

  const byDay = DAYS.reduce<Record<string, typeof APPOINTMENTS>>((acc, d) => {
    acc[d] = APPOINTMENTS.filter(a => a.day === d)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Appointments</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Week of 21–25 July 2026 · {APPOINTMENTS.length} interviews scheduled</p>
        </div>
        <button style={{ padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Book Interview</button>
      </div>

      {/* Day strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setSelectedDay(null)} style={{
          padding: '10px 18px', borderRadius: 10, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: !selectedDay ? 'rgba(79,142,247,0.15)' : 'transparent',
          borderColor: !selectedDay ? 'rgba(79,142,247,0.5)' : 'var(--border)',
          color: !selectedDay ? '#4F8EF7' : 'var(--text-3)',
        }}>All week</button>
        {DAYS.map(d => {
          const count = byDay[d]?.length ?? 0
          const active = selectedDay === d
          return (
            <button key={d} onClick={() => setSelectedDay(active ? null : d)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
              background: active ? 'rgba(79,142,247,0.15)' : count > 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
              borderColor: active ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              color: active ? '#4F8EF7' : count > 0 ? 'var(--text)' : 'var(--text-3)',
            }}>
              <div>{d}</div>
              {count > 0 && <div style={{ fontSize: 10, marginTop: 2, color: active ? '#4F8EF7' : '#34D399' }}>{count} interview{count > 1 ? 's' : ''}</div>}
            </button>
          )
        })}
      </div>

      {/* Appointment cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No interviews scheduled for this day.</div>}
        {filtered.map(a => (
          <div key={a.id} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px',
            display: 'flex', alignItems: 'center', gap: 18,
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          }}>
            {/* Time block */}
            <div style={{ width: 70, flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>{a.time}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{a.duration}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{a.day}</div>
            </div>

            {/* Divider */}
            <div style={{ width: 3, height: 52, borderRadius: 2, background: `linear-gradient(180deg,${a.color},${a.color}44)`, flexShrink: 0 }} />

            {/* Candidate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{a.initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.candidate}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{a.role}</div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>Type</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLORS[a.type] ?? '#4F8EF7', background: `${TYPE_COLORS[a.type] ?? '#4F8EF7'}18`, padding: '4px 10px', borderRadius: 20 }}>{a.type}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>Interviewer</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{a.interviewer}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>Status</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: a.color, background: `${a.color}18`, padding: '4px 10px', borderRadius: 20 }}>{a.status}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button style={{ padding: '8px 14px', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#4F8EF7', cursor: 'pointer', fontFamily: 'inherit' }}>View Pack</button>
              <button style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}>Reschedule</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
