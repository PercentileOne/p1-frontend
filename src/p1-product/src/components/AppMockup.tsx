import { useEffect, useRef, useState } from 'react'
import { quotes } from '../data/quotes'

const NAV_TABS = ['Jobs','Focus','Planning','Shop','Contacts','Messages','Feed','Walls','Stories','Awards','Profile','Interests','Me']

const YT_VIDEOS = [
  { tag: 'Leadership', title: 'How Great Leaders Inspire Action',             ch: 'Simon Sinek · TED', dur: '18 min', bg: 'linear-gradient(135deg,#1E3A5F,#0F2040)' },
  { tag: 'Growth',     title: 'The Power of Vulnerability',                   ch: 'Brené Brown · TED', dur: '20 min', bg: 'linear-gradient(135deg,#1A3A2A,#0F2518)' },
  { tag: 'Mindset',   title: 'Inside the Mind of a Master Procrastinator',   ch: 'Tim Urban · TED',   dur: '14 min', bg: 'linear-gradient(135deg,#2A1A3A,#1A0F28)' },
]

function WisdomCard({ quoteIdx }: { quoteIdx: number }) {
  const [current, setCurrent] = useState(quoteIdx)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setCurrent(quoteIdx)
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 420)
    return () => clearTimeout(t)
  }, [quoteIdx])

  const q = quotes[current % quotes.length]
  return (
    <div style={{
      borderRadius: 8, padding: 9, border: `1px solid ${q.col}22`,
      background: q.bg, opacity: visible ? 1 : 0, transition: 'opacity .4s', fontSize: 10,
    }}>
      <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: q.col, marginBottom: 5 }}>{q.cat}</div>
      <div style={{ fontSize: 9, color: '#94A3B8', lineHeight: 1.5, marginBottom: 4 }}>"{q.text}"</div>
      <div style={{ fontSize: 8, color: '#475569' }}>— {q.author}</div>
    </div>
  )
}

export default function AppMockup() {
  const [steps, setSteps] = useState(7420)
  const [p1Score, setP1Score] = useState(72)
  const [chatBadge, setChatBadge] = useState(3)
  const [showToast, setShowToast] = useState(false)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [wIdx, setWIdx] = useState([0, 1, 2])
  const scoreFlash = useRef(false)

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      setDate(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  // Step counter
  useEffect(() => {
    const id = setInterval(() => setSteps(s => s + Math.floor(Math.random() * 4) + 1), 2200)
    return () => clearInterval(id)
  }, [])

  // P1 score tick
  useEffect(() => {
    const t1 = setTimeout(() => setP1Score(s => s + 1), 8000)
    const t2 = setTimeout(() => setP1Score(s => s + 1), 26000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Chat badge + toast
  useEffect(() => {
    const t = setTimeout(() => {
      setChatBadge(4)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 4000)
    }, 6000)
    return () => clearTimeout(t)
  }, [])

  // Independent wisdom card timers
  useEffect(() => {
    const t0 = setInterval(() => setWIdx(w => [w[0] + 3, w[1], w[2]]), 7000)
    const t1 = setInterval(() => setWIdx(w => [w[0], w[1] + 3, w[2]]), 11000)
    const t2 = setInterval(() => setWIdx(w => [w[0], w[1], w[2] + 3]), 9000)
    return () => { clearInterval(t0); clearInterval(t1); clearInterval(t2) }
  }, [])

  const stepsLeft = Math.max(0, 10000 - steps)
  const stepPct = Math.min(100, (steps / 10000) * 100)

  const s: Record<string, React.CSSProperties> = {
    root: { background: '#0B1021', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(99,102,241,.15), 0 32px 80px rgba(0,0,0,.7)', fontSize: 10, lineHeight: '1.4', userSelect: 'none', position: 'relative' },
    bar: { background: '#070E1C', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid rgba(255,255,255,.05)' },
    tabs: { display: 'flex', gap: 10, overflow: 'hidden', flex: 1 },
    tab: { fontSize: 8.5, color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
    badge: { background: '#6366F1', borderRadius: 100, padding: '3px 10px', fontSize: 9, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 },
    body: { display: 'grid', gridTemplateColumns: '130px 1fr 140px', height: 450 },
    sidebar: { background: '#070E1C', borderRight: '1px solid rgba(255,255,255,.04)', padding: 10, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', scrollbarWidth: 'none' as const },
    main: { background: '#0D1320', padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' as const },
    right: { background: '#070E1C', borderLeft: '1px solid rgba(255,255,255,.04)', padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'none' as const },
    navSection: { fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#1E3050', padding: '6px 6px 3px', marginTop: 4 },
    navItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 6px', borderRadius: 6, fontSize: 9, color: '#475569', fontWeight: 500 },
    navItemActive: { background: 'rgba(99,102,241,.12)', color: '#A5B4FC', fontWeight: 700 },
    sectionLabel: { fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#334155', marginBottom: 6 },
    ovGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 },
    ovCard: { background: '#131929', border: '1px solid rgba(255,255,255,.04)', borderRadius: 8, padding: 8 },
    ovLabel: { fontSize: 7, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' as const, color: '#334155', marginBottom: 5 },
    wisdomGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 },
    statCard: { background: '#131929', border: '1px solid rgba(255,255,255,.04)', borderRadius: 7, padding: '7px 6px' },
  }

  return (
    <div style={s.root}>

      {/* Toast */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: '#1A2235', border: '1px solid rgba(99,102,241,.3)', borderRadius: 8,
        padding: '7px 10px', fontSize: 8, color: '#94A3B8', maxWidth: 130, zIndex: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,.5)',
        opacity: showToast ? 1 : 0, transform: showToast ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity .4s, transform .4s', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: '#CBD5E1', marginBottom: 2 }}>💬 New message</div>
        Investor replied to your update
      </div>

      {/* Title bar */}
      <div style={s.bar}>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {['#EF4444','#F59E0B','#10B981'].map(c => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
        </div>
        <div style={s.tabs}>
          {NAV_TABS.map(t => <span key={t} style={s.tab}>{t}</span>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={s.badge}>P1 <span>{p1Score}</span></div>
          <span style={{ fontSize: 10, color: '#334155' }}>⚙</span>
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>

        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, background: '#6366F1', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2"/><path d="M6 3.5v2.5l1.5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8' }}>Percentile.One</span>
          </div>

          <div style={s.navSection}>Navigation</div>
          {[['🏠','Home',true],['📅','Today',false],['💬','Chat',false,chatBadge],['🎯','Goals',false],['🔁','Cycle',false],['🔭','Vision',false],['📚','Learning',false]].map(([icon,label,active,badge]) => (
            <div key={label as string} style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
              <span>{icon} {label}</span>
              {badge && <span style={{ background: 'rgba(99,102,241,.3)', color: '#A5B4FC', borderRadius: 100, padding: '1px 5px', fontSize: 8, fontWeight: 800 }}>{badge}</span>}
            </div>
          ))}

          <div style={s.navSection}>Your Walls</div>
          {[['Founders\' Wall',true],['AI Builders UK',false]].map(([name,on]) => (
            <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', fontSize: 9, color: '#334155' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? '#10B981' : '#1E3050', flexShrink: 0, display: 'inline-block' }} />
              {name}
            </div>
          ))}

          <div style={s.navSection}>Life Areas</div>
          {['❤️ Health & Vitality','👥 Friends & Family','💰 Wealth','🎮 Fun & Relaxation','✨ Spirituality'].map(a => (
            <div key={a} style={{ fontSize: 8, color: '#1E3050', padding: '3px 6px' }}>{a}</div>
          ))}
        </div>

        {/* Main */}
        <div style={s.main}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#E2E8F0', letterSpacing: '-0.3px' }}>Good morning, Francis.</div>
            <div style={{ fontSize: 9, color: '#334155', marginTop: 2 }}>{date}</div>
          </div>

          {/* Life Overview */}
          <div>
            <div style={s.sectionLabel}>MY LIFE OVERVIEW</div>
            <div style={s.ovGrid}>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>TOP 3 TASKS</div>
                <div style={{ fontSize: 14, marginBottom: 2 }}>⚡</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#E2E8F0', lineHeight: 1 }}>2 left.</div>
                <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>Finish strong.</div>
                <div style={{ fontSize: 8, color: '#334155', marginTop: 3 }}>Start with investor update.</div>
              </div>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>THIS WEEK</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 30, margin: '4px 0' }}>
                  {[{h:30,active:false},{h:55,active:false},{h:45,active:false},{h:80,active:true},{h:15,dim:true},{h:8,dim:true},{h:5,dim:true}].map((b,i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
                      <div style={{ width: '100%', height: `${b.h}%`, borderRadius: 2, background: b.active ? '#6366F1' : b.dim ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.45)', minHeight: 3 }} />
                      <div style={{ fontSize: 7, color: b.active ? '#6366F1' : '#334155', fontWeight: 600 }}>
                        {['M','T','W','T','F','S','S'][i]}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 8, color: '#334155' }}>3 events this week</div>
              </div>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>MEAL PLAN</div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', marginBottom: 3 }} />
                <div style={{ fontSize: 7, fontWeight: 800, color: '#F59E0B', letterSpacing: 1, marginBottom: 3 }}>LUNCH</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.3 }}>Grilled Chicken Salad</div>
                <div style={{ fontSize: 8, color: '#334155', marginTop: 3 }}>High protein · ~520 kcal</div>
              </div>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>EXERCISE</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#10B981', lineHeight: 1 }}>
                  {steps.toLocaleString()}<span style={{ fontSize: 9, color: '#334155', fontWeight: 500 }}> / 10,000</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden', margin: '5px 0 3px' }}>
                  <div style={{ height: '100%', width: `${stepPct}%`, background: 'linear-gradient(90deg,#10B981,#34D399)', borderRadius: 2, transition: 'width .8s ease' }} />
                </div>
                <div style={{ fontSize: 8, color: '#334155' }}>{stepsLeft.toLocaleString()} steps to go</div>
              </div>
            </div>
          </div>

          {/* Wisdom Wall */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={s.sectionLabel}>WISDOM WALL</span>
              <span style={{ fontSize: 8, color: '#475569', textDecoration: 'underline' }}>Library</span>
            </div>
            <div style={s.wisdomGrid}>
              {wIdx.map((qi, i) => <WisdomCard key={i} quoteIdx={qi} />)}
            </div>
          </div>

          {/* Activity */}
          <div>
            <div style={s.sectionLabel}>P1 ACTIVITY — THIS WEEK</div>
            <div style={s.statsGrid}>
              {[
                { v: '12',     vc: '#10B981', l: 'Tasks Done',       s: 'this week' },
                { v: '9 days', vc: '#6366F1', l: 'Habit Streak',     s: 'current' },
                { v: '6.5 h',  vc: '#F59E0B', l: 'Deep Work',        s: 'this week' },
                { v: steps.toLocaleString(), vc: '#E2E8F0', l: 'Steps', s: 'today' },
                { v: '1.2 L',  vc: '#38BDF8', l: 'Water Intake',     s: 'of 2.5 L' },
                { v: '7.2 h',  vc: '#E2E8F0', l: 'Sleep Avg',        s: 'last 7 nights' },
                { v: '5 / 8',  vc: '#6366F1', l: 'Goals Progressed', s: 'active goals' },
                { v: '8',      vc: '#10B981', l: 'Health Metrics',   s: 'updated today' },
              ].map(({ v, vc, l, s: sub }) => (
                <div key={l} style={s.statCard}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: vc, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  <div style={{ fontSize: 7, color: '#475569', marginTop: 3, lineHeight: 1.3 }}>{l}</div>
                  <div style={{ fontSize: 7, color: '#1E3050', lineHeight: 1.2 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={s.right}>
          {/* Profile */}
          <div style={{ background: '#0D1320', border: '1px solid rgba(255,255,255,.04)', borderRadius: 8, padding: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 7 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>FC</div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#CBD5E1', lineHeight: 1.2 }}>Francis Cobbinah</div>
                <div style={{ fontSize: 8, color: '#6366F1', marginTop: 1 }}>Founder · Percentile.One</div>
                <div style={{ fontSize: 7, color: '#334155', marginTop: 1 }}>Colchester, UK</div>
              </div>
            </div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#1E3050', marginBottom: 3 }}>Working On</div>
            {['· P1 Cockpit v1 UI','· MVP demo build','· Investor update'].map(i => (
              <div key={i} style={{ fontSize: 8, color: '#334155', padding: '1px 0' }}>{i}</div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginTop: 6, borderTop: '1px solid rgba(255,255,255,.04)', paddingTop: 6 }}>
              {[{v:p1Score,l:'P1 Score'},{v:147,l:'Tasks'},{v:21,l:'Pics'}].map(({v,l}) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#E2E8F0', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  <div style={{ fontSize: 6, color: '#334155', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* YouTube */}
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#334155', marginBottom: 6 }}>YouTube For You</div>
            {YT_VIDEOS.map(v => (
              <div key={v.title} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 7 }}>
                <div style={{ width: 46, height: 30, borderRadius: 5, flexShrink: 0, position: 'relative', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,.7)' }}>▶</span>
                  <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 6, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.6)', padding: '1px 3px', borderRadius: 2 }}>{v.tag}</span>
                  <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 6, color: '#fff', background: 'rgba(0,0,0,.75)', padding: '1px 3px', borderRadius: 2 }}>{v.dur}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: '#64748B', lineHeight: 1.4, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{v.title}</div>
                  <div style={{ fontSize: 7, color: '#334155', marginTop: 2 }}>{v.ch}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Smart Picks */}
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#334155', marginBottom: 5 }}>Smart Picks</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[{l:'Amazon Deals',bg:'rgba(99,102,241,.15)',col:'#A5B4FC'},{l:'Gadgets',bg:'rgba(16,185,129,.12)',col:'#6EE7B7'},{l:'Books',bg:'rgba(245,158,11,.12)',col:'#FCD34D'}].map(p => (
                <span key={p.l} style={{ fontSize: 7, fontWeight: 700, padding: '3px 6px', borderRadius: 4, background: p.bg, color: p.col }}>{p.l}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
