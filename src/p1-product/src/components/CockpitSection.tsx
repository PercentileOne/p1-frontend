import { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

export default function CockpitSection() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const isMobile = useIsMobile()

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      setDate(now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  const skills = [
    { name: 'Leadership',       pct: 82, col: '#6366F1' },
    { name: 'Communication',    pct: 75, col: '#10B981' },
    { name: 'Product Strategy', pct: 68, col: '#F59E0B' },
    { name: 'Technical',        pct: 91, col: '#EF4444' },
  ]

  const activityLevels = [0,1,2,3,4,3,2, 1,2,3,4,3,4,2, 0,1,3,4,2,3,1, 2,3,4,3,4,4,2, 1,2,3,4,3,2,1]
  const cellColors = ['rgba(255,255,255,.04)','rgba(99,102,241,.25)','rgba(99,102,241,.5)','rgba(99,102,241,.75)','#6366F1']

  return (
    <section id="cockpit" style={{ background: 'var(--bg-dark)', padding: isMobile ? '64px 0' : '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)' }}>The Cockpit</div>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: '#F1F5F9', margin: '12px 0 14px' }}>Everything that matters. One place.</h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>Your personal command centre — habits, goals, skills, rankings, and daily focus, all in a single premium dashboard.</p>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,.07)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.7)' }}>
          {/* Bar */}
          <div style={{ background: '#0D1320', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#EF4444','#F59E0B','#10B981'].map(c => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
              </div>
              {!isMobile && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#334155' }}>P1 Cockpit — Personal Dashboard</span>}
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <span style={{ fontSize: 10, color: '#334155' }}>{date}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{time}</span>
            </div>
          </div>

          {/* Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr 200px', minHeight: isMobile ? 'auto' : 360 }}>
            {/* Left sidebar — desktop only */}
            {!isMobile && (
              <div style={{ background: '#0D1320', borderRight: '1px solid rgba(255,255,255,.05)', padding: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[['⊞','Dashboard',true],['🪞','Identity'],['🎯','Goals'],['🔁','Habits'],['⚡','Skills']].map(([icon,label,active]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 7, fontSize: 13, color: active ? '#A5B4FC' : '#475569', fontWeight: active ? 700 : 500, background: active ? 'rgba(99,102,241,.12)' : 'transparent' }}>
                    {icon} {label}
                  </div>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,.04)', margin: '7px 0' }} />
                {[['📖','My Story'],['🏆','Rankings'],['⚙️','Settings']].map(([icon,label]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 7, fontSize: 13, color: '#475569' }}>{icon} {label}</div>
                ))}
              </div>
            )}

            {/* Main */}
            <div style={{ padding: isMobile ? 16 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: '#E2E8F0' }}>
                Good afternoon, <span style={{ color: 'var(--accent)' }}>Francis</span> — 4 habits completed today.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 9 }}>
                {[{l:'Habit Streak',v:'47',c:'#F59E0B',d:'↑ 3 this week'},{l:'Active Goals',v:'8',c:'#F1F5F9',d:'3 on track'},{l:'Skills Mapped',v:'24',c:'#6366F1',d:'↑ 2 this month'},{l:'Percentile',v:'Top 12%',c:'#10B981',d:'↑ 6 places'}].map(k => (
                  <div key={k.l} style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: isMobile ? 10 : 13 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#475569', marginBottom: 5 }}>{k.l}</div>
                    <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: k.c, lineHeight: 1 }}>{k.v}</div>
                    <div style={{ fontSize: 9, color: '#10B981', marginTop: 4, fontWeight: 600 }}>{k.d}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 9 }}>
                <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: 13 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#334155', marginBottom: 11 }}>Skill Progress</div>
                  {skills.map(sk => (
                    <div key={sk.name} style={{ marginBottom: 7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{sk.name}</span>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{sk.pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${sk.pct}%`, background: sk.col, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: 13 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#334155', marginBottom: 5 }}>Activity — Last 5 Weeks</div>
                  <div style={{ fontSize: 8, color: '#334155', fontWeight: 600, marginBottom: 5 }}>Mon → Sun</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                    {activityLevels.map((l, i) => (
                      <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: cellColors[l] }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel — desktop only */}
            {!isMobile && (
              <div style={{ background: '#0D1320', borderLeft: '1px solid rgba(255,255,255,.05)', padding: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#334155', marginBottom: 2 }}>Today's Focus</div>
                {[{name:'TalkToLearn MVP',sub:'Wire up scoring endpoint',pct:78,col:'var(--accent)'},{name:'Investor Prep',sub:'Practice pitch answers',pct:45,col:'var(--success)'}].map(t => (
                  <div key={t.name} style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,.05)', borderRadius: 8, padding: 10, marginBottom: 7 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', marginBottom: 3 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{t.sub}</div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden', marginTop: 7 }}>
                      <div style={{ height: '100%', width: `${t.pct}%`, background: t.col, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,.04)', margin: '2px 0' }} />
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#334155', marginBottom: 4 }}>Upcoming</div>
                {[{d:'Tomorrow',l:'Investor meeting',c:'#6366F1'},{d:'Friday',l:'App beta review',c:'#64748B'},{d:'Next week',l:'Press outreach',c:'#64748B'}].map(u => (
                  <div key={u.l} style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
                    <span style={{ color: u.c, fontWeight: 700 }}>{u.d}</span> — {u.l}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
