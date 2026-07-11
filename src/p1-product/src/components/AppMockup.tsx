import { useEffect, useRef, useState } from 'react'
import { quotes } from '../data/quotes'
import type { Quote } from '../data/quotes'

// Partition quotes into 3 non-overlapping sets so each WisdomCard cycles
// through a completely different pool — they can never show the same quote.
const WISDOM_SETS: [Quote[], Quote[], Quote[]] = [
  quotes.filter((_, i) => i % 3 === 0),
  quotes.filter((_, i) => i % 3 === 1),
  quotes.filter((_, i) => i % 3 === 2),
]

const NAV_TABS = ['Jobs','Focus','Planning','Shop','Contacts','Messages','Feed','Walls','Stories','Awards','Profile','Interests','Me']

// ─── Data for animated cards ────────────────────────────────────────────────

const TASK_SLIDES = [
  { icon: '⚡', big: '2 left.', sub: 'Finish strong.', detail: 'Start with investor update.' },
  { icon: '✅', big: 'All done!', sub: 'Outstanding day.', detail: 'Review tomorrow\'s goals.' },
  { icon: '🎯', big: '1 urgent', sub: 'Due by 5 pm.', detail: 'Reply to James re: funding.' },
  { icon: '📋', big: '4 ahead', sub: 'Stay focused.', detail: 'Block 2 h deep work now.' },
]

const WEEK_SLIDES = [
  { bars: [{h:30,a:false,d:false},{h:55,a:false,d:false},{h:45,a:false,d:false},{h:80,a:true,d:false},{h:15,a:false,d:true},{h:8,a:false,d:true},{h:5,a:false,d:true}], label: '3 events this week' },
  { bars: [{h:60,a:false,d:false},{h:40,a:false,d:false},{h:70,a:false,d:false},{h:50,a:true,d:false},{h:20,a:false,d:true},{h:10,a:false,d:true},{h:5,a:false,d:true}], label: '5 events this week' },
  { bars: [{h:80,a:false,d:false},{h:60,a:false,d:false},{h:90,a:false,d:false},{h:70,a:true,d:false},{h:30,a:false,d:true},{h:15,a:false,d:true},{h:8,a:false,d:true}], label: '7 events this week' },
  { bars: [{h:20,a:false,d:false},{h:35,a:false,d:false},{h:55,a:false,d:false},{h:65,a:true,d:false},{h:10,a:false,d:true},{h:5,a:false,d:true},{h:3,a:false,d:true}], label: '2 events this week' },
]

const MEAL_SLIDES = [
  { dot: '#F59E0B', time: 'LUNCH',   meal: 'Grilled Chicken Salad',  meta: 'High protein · ~520 kcal' },
  { dot: '#10B981', time: 'DINNER',  meal: 'Salmon & Roasted Veg',   meta: 'Omega-3 rich · ~610 kcal' },
  { dot: '#6366F1', time: 'MORNING', meal: 'Oat Porridge & Berries', meta: 'Slow-release · ~380 kcal' },
  { dot: '#F43F5E', time: 'SNACK',   meal: 'Greek Yoghurt & Nuts',   meta: 'Protein boost · ~210 kcal' },
]

const EXERCISE_SLIDES = [
  { accent: '#10B981', metric: '7,420', unit: '/ 10,000 steps',   bar: 74, note: '2,580 steps to go' },
  { accent: '#6366F1', metric: '32 min', unit: 'strength training', bar: 80, note: 'Personal best this week' },
  { accent: '#38BDF8', metric: '1.2 L',  unit: '/ 2.5 L water',    bar: 48, note: '1.3 L remaining today' },
  { accent: '#F59E0B', metric: '7.2 h',  unit: 'sleep last night',  bar: 90, note: 'Above your 7 h goal' },
]

// ─── Self-contained animated card components ─────────────────────────────────
// Each card owns its own state + timer.
// Pattern: key={idx} on the content div — when idx changes React remounts the
// element and the CSS @keyframes animation fires from scratch. No opacity state,
// no setTimeout race conditions, works reliably in all React versions.

function TaskCard() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % TASK_SLIDES.length), 8000)
    return () => clearInterval(id)
  }, [])
  const s = TASK_SLIDES[idx]
  return (
    <div key={idx} style={{ animation: 'p1FadeIn .6s ease both' }}>
      <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#E2E8F0', lineHeight: 1 }}>{s.big}</div>
      <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{s.sub}</div>
      <div style={{ fontSize: 8, color: '#334155', marginTop: 3 }}>{s.detail}</div>
    </div>
  )
}

function WeekCard() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % WEEK_SLIDES.length), 13000)
    return () => clearInterval(id)
  }, [])
  const w = WEEK_SLIDES[idx]
  return (
    <div key={idx} style={{ animation: 'p1FadeIn .6s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 30, margin: '4px 0' }}>
        {w.bars.map((b, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
            <div style={{ width: '100%', height: `${b.h}%`, borderRadius: 2, minHeight: 3,
              background: b.a ? '#6366F1' : b.d ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.45)' }} />
            <div style={{ fontSize: 7, color: b.a ? '#6366F1' : '#334155', fontWeight: 600 }}>
              {['M','T','W','T','F','S','S'][i]}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 8, color: '#334155' }}>{w.label}</div>
    </div>
  )
}

function MealCard() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % MEAL_SLIDES.length), 11000)
    return () => clearInterval(id)
  }, [])
  const m = MEAL_SLIDES[idx]
  return (
    <div key={idx} style={{ animation: 'p1FadeIn .6s ease both' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, marginBottom: 3 }} />
      <div style={{ fontSize: 7, fontWeight: 800, color: m.dot, letterSpacing: 1, marginBottom: 3 }}>{m.time}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.3 }}>{m.meal}</div>
      <div style={{ fontSize: 8, color: '#334155', marginTop: 3 }}>{m.meta}</div>
    </div>
  )
}

function ExerciseCard() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % EXERCISE_SLIDES.length), 6000)
    return () => clearInterval(id)
  }, [])
  const e = EXERCISE_SLIDES[idx]
  return (
    <div key={idx} style={{ animation: 'p1FadeIn .6s ease both' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: e.accent, lineHeight: 1 }}>{e.metric}</div>
      <div style={{ fontSize: 8, color: '#64748B', marginTop: 1 }}>{e.unit}</div>
      <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden', margin: '5px 0 3px' }}>
        <div style={{ height: '100%', width: `${e.bar}%`, background: `linear-gradient(90deg,${e.accent},${e.accent}99)`, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 8, color: '#334155' }}>{e.note}</div>
    </div>
  )
}

// WisdomCard: outer shell is STATIC (card stays in place, background transitions
// smoothly). Only the inner content remounts via key={idx} and fades in.
// Each card receives its own isolated quoteList so they can never show the same quote.
function WisdomCard({ quoteList, intervalMs }: { quoteList: Quote[]; intervalMs: number }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % quoteList.length), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, quoteList.length])
  const q = quoteList[idx]
  return (
    <div style={{
      borderRadius: 8, padding: 9, fontSize: 10,
      border: `1px solid ${q.col}22`, background: q.bg,
      transition: 'background .6s, border-color .6s',
    }}>
      <div key={idx} style={{ animation: 'p1FadeIn .6s ease both' }}>
        <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: q.col, marginBottom: 5 }}>{q.cat}</div>
        <div style={{ fontSize: 9, color: '#94A3B8', lineHeight: 1.5, marginBottom: 4 }}>"{q.text}"</div>
        <div style={{ fontSize: 8, color: '#475569' }}>— {q.author}</div>
      </div>
    </div>
  )
}

// Real YouTube thumbnail URLs (public CDN — no auth required)
const YT_VIDEOS = [
  { tag: 'Leadership', title: 'How Great Leaders Inspire Action',           ch: 'Simon Sinek · TED', chSub: '63M views', dur: '18:04', accent: '#3B82F6', thumb: 'https://i.ytimg.com/vi/qp0HIF3SfI4/mqdefault.jpg' },
  { tag: 'Growth',     title: 'The Power of Vulnerability',                 ch: 'Brené Brown · TED', chSub: '21M views', dur: '20:19', accent: '#10B981', thumb: 'https://i.ytimg.com/vi/iCvmsMzlF7o/mqdefault.jpg' },
  { tag: 'Mindset',   title: 'Inside the Mind of a Master Procrastinator', ch: 'Tim Urban · TED',   chSub: '8.3M views', dur: '14:03', accent: '#8B5CF6', thumb: 'https://i.ytimg.com/vi/arj7oStGLkU/mqdefault.jpg' },
]

export default function AppMockup() {
  const [steps, setSteps] = useState(7420)
  const [p1Score, setP1Score] = useState(72)
  const [chatBadge, setChatBadge] = useState(3)
  const [showToast, setShowToast] = useState(false)
  const [, setTime] = useState('')
  const [date, setDate] = useState('')
  const [lifeTab, setLifeTab] = useState<'life'|'work'>('life')
  const scoreFlash = useRef<boolean>(false); void scoreFlash

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
    navSection: { fontSize: 7.5, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#475569', padding: '6px 6px 3px', marginTop: 4 },
    navItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 6px', borderRadius: 6, fontSize: 9, color: '#64748B', fontWeight: 500 },
    navItemActive: { background: 'rgba(99,102,241,.15)', color: '#A5B4FC', fontWeight: 700 },
    sectionLabel: { fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#64748B', marginBottom: 6 },
    ovGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 },
    ovCard: { background: '#131929', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: 8 },
    ovLabel: { fontSize: 7, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 5 },
    wisdomGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 },
    statCard: { background: '#131929', border: '1px solid rgba(255,255,255,.04)', borderRadius: 7, padding: '7px 6px' },
  }

  const LIFE_NAV  = [['🏠','Home',true],['📅','Today',false],['💬','Chat',false,chatBadge],['🎯','Goals',false],['🔁','Cycle',false],['🔭','Vision',false],['📚','Learning',false]] as const
  const WORK_NAV  = [['💼','Projects',true],['📊','Pipeline',false],['📬','Inbox',false,2],['🤝','Clients',false],['💰','Revenue',false],['📈','Analytics',false],['⚡','Actions',false]] as const

  return (
    <div style={s.root}>
      <style>{`@keyframes p1FadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}`}</style>

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
          {(lifeTab === 'life' ? LIFE_NAV : WORK_NAV).map(([icon, label, active, badge]) => (
            <div key={label as string} style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
              <span>{icon} {label}</span>
              {badge && <span style={{ background: 'rgba(99,102,241,.3)', color: '#A5B4FC', borderRadius: 100, padding: '1px 5px', fontSize: 8, fontWeight: 800 }}>{badge}</span>}
            </div>
          ))}

          {lifeTab === 'life' && <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...s.navSection }}>
              <span>Your Walls</span>
              <span style={{ color: '#6366F1', fontWeight: 700, letterSpacing: 0, textTransform: 'none', fontSize: 8 }}>Explore</span>
            </div>
            {[['🚀','Founders\' Wall','#10B981'],['🤖','AI Builders UK','#6366F1']].map(([icon,name,dot]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', fontSize: 9, color: '#94A3B8' }}>
                <span>{icon} {name}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
              </div>
            ))}
          </>}

          {lifeTab === 'work' && <>
            <div style={s.navSection}>Workspaces</div>
            {[['🚀','P1 Product','#6366F1'],['🎙️','TalkToLearn','#334155']].map(([icon,name,dot]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', fontSize: 9, color: '#94A3B8' }}>
                <span>{icon} {name}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
              </div>
            ))}
          </>}

          {/* My Life / My Work tabs — matches cockpit position: after Walls, before Life Areas */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.05)', borderRadius: 20, padding: 2, gap: 2, margin: '6px 0' }}>
            {(['life','work'] as const).map(tab => (
              <button key={tab} onClick={() => setLifeTab(tab)} style={{
                flex: 1, fontSize: 8, fontWeight: 700, padding: '5px 0', borderRadius: 18, border: 'none', cursor: 'pointer',
                background: lifeTab === tab ? '#4F46E5' : 'transparent',
                color: lifeTab === tab ? '#fff' : '#475569',
                transition: 'background .2s, color .2s',
              }}>
                {tab === 'life' ? 'My Life' : 'My Work'}
              </button>
            ))}
          </div>

          <div style={s.navSection}>Life Areas</div>
          {lifeTab === 'life'
            ? [['❤️','Health & Vitality','#6366F1'],['👥','Friends & Family',null],['💰','Wealth','#F59E0B'],['😊','Fun & Relaxation',null],['✨','Spirituality & Meaning',null]].map(([icon,name,dot]) => (
              <div key={name as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', fontSize: 8.5, color: '#94A3B8', fontWeight: 500 }}>
                <span>{icon} {name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot as string, display: 'inline-block' }} />}
                  <span style={{ color: '#334155', fontSize: 8 }}>›</span>
                </span>
              </div>
            ))
            : [['🚀','Product','#6366F1'],['💡','Strategy',null],['🤝','Partnerships','#F59E0B'],['📣','Marketing',null]].map(([icon,name,dot]) => (
              <div key={name as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', fontSize: 8.5, color: '#94A3B8', fontWeight: 500 }}>
                <span>{icon} {name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot as string, display: 'inline-block' }} />}
                  <span style={{ color: '#334155', fontSize: 8 }}>›</span>
                </span>
              </div>
            ))
          }
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
                <TaskCard />
              </div>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>THIS WEEK</div>
                <WeekCard />
              </div>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>MEAL PLAN</div>
                <MealCard />
              </div>
              <div style={s.ovCard}>
                <div style={s.ovLabel}>EXERCISE</div>
                <ExerciseCard />
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
              <WisdomCard quoteList={WISDOM_SETS[0]} intervalMs={7000} />
              <WisdomCard quoteList={WISDOM_SETS[1]} intervalMs={11000} />
              <WisdomCard quoteList={WISDOM_SETS[2]} intervalMs={9000} />
            </div>
          </div>

          {/* Activity */}
          <div>
            <div style={s.sectionLabel}>P1 ACTIVITY — THIS WEEK</div>
            <div style={s.statsGrid}>
              {[
                { v: '12',                      vc: '#10B981', l: 'Tasks Done',       s: 'this week' },
                { v: '9 days',                  vc: '#6366F1', l: 'Habit Streak',     s: 'current' },
                { v: '6.5 h',                   vc: '#F59E0B', l: 'Deep Work',        s: 'this week' },
                { v: steps.toLocaleString(),    vc: '#E2E8F0', l: 'Steps',            s: 'today' },
                { v: '1.2 L',                   vc: '#38BDF8', l: 'Water Intake',     s: 'of 2.5 L' },
                { v: '7.2 h',                   vc: '#E2E8F0', l: 'Sleep Avg',        s: 'last 7 nights' },
                { v: '5 / 8',                   vc: '#6366F1', l: 'Goals Progressed', s: 'active goals' },
                { v: '8',                       vc: '#10B981', l: 'Health Metrics',   s: 'updated today' },
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
              {/* Photo avatar — swap src for real photo URL when available */}
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(99,102,241,.4)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#312E81,#4F46E5,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* silhouette */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="7" r="4" fill="rgba(255,255,255,.6)" />
                    <path d="M2 18c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
              </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
              {/* YouTube wordmark */}
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
                <rect width="12" height="10" rx="2" fill="#FF0000"/>
                <polygon points="5,3 9,5 5,7" fill="white"/>
                <text x="14" y="8" fontSize="7.5" fontWeight="700" fill="#CBD5E1" fontFamily="sans-serif">For You</text>
              </svg>
            </div>
            {YT_VIDEOS.map(v => (
              <div key={v.title} style={{ marginBottom: 9 }}>
                {/* Thumbnail — full width, 16:9 */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#0F172A', marginBottom: 5 }}>
                  <img src={v.thumb} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* YouTube play button */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.5)' }}>
                      <svg width="7" height="8" viewBox="0 0 7 8" fill="white"><polygon points="1,0 7,4 1,8"/></svg>
                    </div>
                  </div>
                  {/* Duration badge */}
                  <span style={{ position: 'absolute', bottom: 3, right: 3, fontSize: 6, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.8)', padding: '1px 4px', borderRadius: 3 }}>{v.dur}</span>
                  {/* Category tag */}
                  <span style={{ position: 'absolute', top: 3, left: 3, fontSize: 6, fontWeight: 800, letterSpacing: '0.5px', color: '#fff', background: `${v.accent}cc`, padding: '1px 4px', borderRadius: 3 }}>{v.tag.toUpperCase()}</span>
                </div>
                {/* Meta */}
                <div style={{ fontSize: 8, color: '#CBD5E1', fontWeight: 600, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{v.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 7, color: '#475569', fontWeight: 500 }}>{v.ch}</span>
                  <span style={{ fontSize: 7, color: '#334155' }}>{v.chSub}</span>
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
