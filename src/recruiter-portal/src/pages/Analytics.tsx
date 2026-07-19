const PASS_RATES = [
  { role: '.NET Developer', rate: 82, count: 11, color: '#4F8EF7' },
  { role: 'UX Designer',    rate: 91, count: 7,  color: '#A78BFA' },
  { role: 'Cloud Architect',rate: 85, count: 5,  color: '#34D399' },
  { role: 'Business Analyst',rate: 77,count: 9,  color: '#4F8EF7' },
  { role: 'DevOps Engineer', rate: 74, count: 8, color: '#F59E0B' },
  { role: 'Product Manager', rate: 67, count: 6, color: '#F59E0B' },
  { role: 'Scrum Master',    rate: 63, count: 4, color: '#EF4444' },
  { role: 'Data Analyst',    rate: 58, count: 7, color: '#EF4444' },
]

const MONTHLY = [
  { month: 'Feb', packs: 14, interviews: 9,  booked: 7  },
  { month: 'Mar', packs: 18, interviews: 13, booked: 10 },
  { month: 'Apr', packs: 22, interviews: 17, booked: 13 },
  { month: 'May', packs: 29, interviews: 21, booked: 17 },
  { month: 'Jun', packs: 35, interviews: 26, booked: 22 },
  { month: 'Jul', packs: 47, interviews: 38, booked: 29 },
]

const SUMMARY = [
  { label: 'Total Packs Sent',    value: '47',  change: '+34%',  up: true,  color: '#4F8EF7' },
  { label: 'Avg. Score',          value: '74%', change: '+6pts', up: true,  color: '#34D399' },
  { label: 'Conversion Rate',     value: '76%', change: '+8%',   up: true,  color: '#A78BFA' },
  { label: 'Avg. Time to Book',   value: '2.4d',change: '-0.6d', up: true,  color: '#F59E0B' },
]

export default function Analytics() {
  const maxPacks = Math.max(...MONTHLY.map(m => m.packs))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Performance overview · July 2026</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {SUMMARY.map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.up ? '↑' : '↓'} {s.change} vs last month</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Bar chart */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Monthly Activity</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[['#4F8EF7','Packs'],['#A78BFA','Sent'],['#34D399','Booked']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160 }}>
            {MONTHLY.map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%' }}>
                  {[
                    { v: m.packs,      c: '#4F8EF7', o: 0.7 },
                    { v: m.interviews, c: '#A78BFA', o: 0.7 },
                    { v: m.booked,     c: '#34D399', o: 0.7 },
                  ].map((b, i) => (
                    <div key={i} style={{ flex: 1, background: b.c, opacity: b.o, borderRadius: '3px 3px 0 0', height: `${(b.v / maxPacks) * 100}%`, transition: 'height 0.3s ease' }} />
                  ))}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pass rates */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>Pass Rate by Role</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PASS_RATES.map(r => (
              <div key={r.role}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.role}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: r.color }}>{r.rate}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.rate}%`, background: r.color, borderRadius: 3, opacity: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recruiter leaderboard */}
      <div style={{ marginTop: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Recruiter Performance · This Month</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { name: 'Mike Afolabi',   packs: 31, booked: 21, rate: 68, rank: 1 },
            { name: 'Sarah Collins',  packs: 16, booked: 8,  rate: 50, rank: 2 },
            { name: 'Tom Briggs',     packs: 0,  booked: 0,  rate: 0,  rank: 3 },
          ].map(r => (
            <div key={r.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.rank === 1 ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>#{r.rank}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{r.packs} packs · {r.booked} booked · {r.rate}% rate</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
