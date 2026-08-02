import { useState, useEffect } from 'react';

// ── Navigation structure ──────────────────────────────────────────────────────
const NAV_GROUPS = [
  { title: 'Executive', items: [
    { id: 'overview',   label: 'Overview' },
    { id: 'vision',     label: 'The Vision' },
    { id: 'why-now',    label: 'Why Now' },
  ]},
  { title: 'Problem & Solution', items: [
    { id: 'why-fail',   label: 'Why Candidates Fail' },
    { id: 'answer',     label: 'The Explain Answer' },
  ]},
  { title: 'Product', items: [
    { id: 'chair',              label: 'Interview Chair' },
    { id: 'learn',              label: 'Learn Engine' },
    { id: 'packs',              label: 'Interview Packs' },
    { id: 'multi-stage',        label: '🔄 Multi-Stage Intelligence' },
    { id: 'rec-email',          label: '⭐ Recruiter Email' },
    { id: 'screens',            label: '🖥️ What It Looks Like' },
    { id: 'flow',               label: 'Flow Viewer' },
    { id: 'portals',            label: 'Portals' },
    { id: 'career-tools',       label: 'Career Tools' },
    { id: 'skills-map',         label: '🗺️ Skills Map' },
    { id: 'candidate-services', label: 'Candidate Services' },
  ]},
  { title: 'Business Model', items: [
    { id: 'revenue',    label: 'Revenue Streams' },
    { id: 'pricing',    label: 'Pricing' },
    { id: 'economics',  label: 'Unit Economics' },
  ]},
  { title: 'Market', items: [
    { id: 'market',     label: 'Market Opportunity' },
    { id: 'segments',   label: 'Target Segments' },
    { id: 'edge',       label: 'Competitive Edge' },
    { id: 'govt',       label: '⭐ Institutional & Government' },
  ]},
  { title: 'Traction', items: [
    { id: 'live',         label: "What's Live Today" },
    { id: 'roadmap',      label: 'Roadmap' },
    { id: 'future-plans', label: '🌍 Future Plans' },
  ]},
  { title: 'Financials', items: [
    { id: 'projections', label: 'Projections' },
    { id: 'ask',         label: 'The Ask' },
    { id: 'patent',      label: '🔒 Patent & IP' },
  ]},
  { title: 'Founder', items: [
    { id: 'founder',    label: 'Francis Cobbinah' },
  ]},
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ── Shared UI primitives ──────────────────────────────────────────────────────
const A = '#4F8EF7';
const A2 = '#7b5cf5';

function SectionHead({ label, h1, h2, sub }: { label:string; h1:string; h2?:string; sub?:string }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: A, marginBottom: 14 }}>{label}</div>
      <h1 style={{ fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0, marginBottom: h2 ? 4 : sub ? 16 : 0 }}>{h1}</h1>
      {h2 && <h2 style={{ fontSize: 'clamp(1.6rem,2.8vw,2.2rem)', fontWeight: 900, color: A, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, marginBottom: sub ? 16 : 0 }}>{h2}</h2>}
      {sub && <p style={{ fontSize: 16, color: '#a0a0c0', lineHeight: 1.8, maxWidth: 680, margin: 0 }}>{sub}</p>}
    </div>
  );
}

function Grid({ cols = 2, gap = 16, children }: { cols?:number; gap?:number; children:React.ReactNode }) {
  return (
    <div className={`inv-grid inv-grid-${cols}`} style={{ display: 'grid', gap, marginBottom: 32 }}>
      {children}
    </div>
  );
}

function Card({ children, accent, style }: { children:React.ReactNode; accent?:string; style?:React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${accent ? `${accent}30` : 'rgba(79,142,247,0.12)'}`,
      borderRadius: 14, padding: 24, ...style,
    }}>{children}</div>
  );
}

function Stat({ value, label, sub, color = A }: { value:string; label:string; sub?:string; color?:string }) {
  return (
    <Card>
      <div style={{ fontSize: 34, fontWeight: 900, color, letterSpacing: '-0.02em', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd', marginBottom: sub ? 3 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 14, color: '#a0a0c0' }}>{sub}</div>}
    </Card>
  );
}

function Callout({ icon, title, body, color = A }: { icon:string; title:string; body:string; color?:string }) {
  return (
    <div style={{
      background: `${color}0a`, border: `1px solid ${color}30`,
      borderRadius: 12, padding: '18px 22px',
      display: 'flex', gap: 16, marginBottom: 28,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#b0b0c8', lineHeight: 1.75 }}>{body}</div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon:string; title:string; body:string }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${A}18`, border: `1px solid ${A}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#a0a0c0', lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

function Tag({ children, color = A }: { children:React.ReactNode; color?:string }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}35`, color }}>{children}</span>
  );
}

function StatusRow({ label, status }: { label:string; status:'live'|'beta'|'progress'|'planned' }) {
  const map = {
    live:     { label: 'Live',        color: '#22c55e' },
    beta:     { label: 'Beta',        color: A },
    progress: { label: 'In Progress', color: '#f59e0b' },
    planned:  { label: 'Planned',     color: '#6060a0' },
  };
  const s = map[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 14, color: '#ddd' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}35`, borderRadius: 6, padding: '3px 11px' }}>{s.label}</span>
    </div>
  );
}

function BarRow({ year, arr, pct, agencies }: { year:string; arr:string; pct:number; agencies:string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, color: '#b0b0c8', fontWeight: 600 }}>{year}</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#bbb' }}>{agencies} agencies</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: A }}>{arr}</span>
        </div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${A}, ${A2})`, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

// ── SkillsMapSection — interactive competency map ────────────────────────────
const DEMO_SKILLS = [
  { name: 'C# / .NET',         pct: 95, wide: true  },
  { name: 'SQL Server',         pct: 88, wide: false },
  { name: 'Azure',              pct: 35, wide: false },
  { name: 'React',              pct: 76, wide: false },
  { name: 'TypeScript',         pct: 73, wide: false },
  { name: 'System Architecture',pct: 91, wide: true  },
  { name: 'Docker',             pct: 44, wide: false },
  { name: 'Cloud Infra',        pct: 32, wide: false },
  { name: 'Leadership',         pct: 87, wide: false },
  { name: 'Communication',      pct: 94, wide: false },
  { name: 'Project Mgmt',       pct: 79, wide: false },
  { name: 'DevOps',             pct: 43, wide: false },
  { name: 'Python',             pct: 28, wide: false },
  { name: 'Agile / Scrum',      pct: 83, wide: false },
];
function skillColour(pct: number) {
  if (pct >= 71) return { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.38)', text: '#22c55e', label: 'Strong' };
  if (pct >= 41) return { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.38)', text: '#f59e0b', label: 'Developing' };
  return { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.38)', text: '#ef4444', label: 'Beginner' };
}
function SkillsMapSection() {
  const [skills, setSkills] = useState(DEMO_SKILLS);
  const [name, setName] = useState('');
  const [pct, setPct] = useState(60);
  const [adding, setAdding] = useState(false);
  function addSkill() {
    if (!name.trim()) return;
    setSkills(s => [...s, { name: name.trim(), pct, wide: false }]);
    setName(''); setPct(60); setAdding(false);
  }
  return <>
    <SectionHead
      label="Product · Skills Map"
      h1="Your skills."
      h2="One glance. Total clarity."
      sub="Every candidate has a story their CV cannot tell. The Skills Map makes it visible in two seconds — colour-coded by strength, honest by design, and updated by the candidate themselves."
    />

    <Callout icon="🎯" title="The Problem This Solves" color={A}
      body={'Every developer has said "I\'ve used Azure, but I\'m no expert — I\'ve only updated a permission." Every employer has wasted an interview finding that out. The Skills Map ends that conversation before it starts — with a single honest tile.'} />

    {/* Live demo */}
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Live Demo — Candidate Skills Map</div>
    <div style={{ fontSize: 14, color: '#8888a8', marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      {[['#22c55e','Strong (71–100%)'],['#f59e0b','Developing (41–70%)'],['#ef4444','Beginner (0–40%)']].map(([c,l]) => (
        <span key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: c as string, display: 'inline-block' }} />
          <span style={{ color: '#7070a0' }}>{l as string}</span>
        </span>
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
      {skills.map((s, i) => {
        const c = skillColour(s.pct);
        return (
          <div key={i} style={{
            gridColumn: s.wide ? 'span 2' : 'span 1',
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 6,
            transition: 'transform 0.15s',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd', lineHeight: 1.3 }}>{s.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: c.text, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, color: c.text, minWidth: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.pct}%</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.text, opacity: 0.7 }}>{c.label}</div>
          </div>
        );
      })}
    </div>

    {/* Add skill */}
    {!adding ? (
      <button onClick={() => setAdding(true)} style={{ background: `${A}12`, border: `1px solid ${A}30`, borderRadius: 10, padding: '11px 20px', color: A, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 32 }}>
        + Add a skill to this map
      </button>
    ) : (
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 12, padding: 20, marginBottom: 32, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 180px' }}>
          <div style={{ fontSize: 13, color: '#8888a8', marginBottom: 6, fontWeight: 700 }}>Skill name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. React, Leadership, SQL…" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ flex: '0 0 200px' }}>
          <div style={{ fontSize: 13, color: '#8888a8', marginBottom: 6, fontWeight: 700 }}>Confidence level — <span style={{ color: skillColour(pct).text }}>{pct}% ({skillColour(pct).label})</span></div>
          <input type="range" min={1} max={100} value={pct} onChange={e => setPct(+e.target.value)} style={{ width: '100%', accentColor: skillColour(pct).text }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={addSkill} style={{ background: `linear-gradient(135deg,${A},${A2})`, border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#6060a0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      </div>
    )}

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>Why the Skills Map Changes Everything</div>
    <Grid cols={3}>
      {[
        { icon: '⚡', title: 'Two-Second Profile', body: 'Employers see the full picture in a glance. No CV digging. No assumptions. Just an honest, visual competency snapshot.' },
        { icon: '🎯', title: 'Candidate Honesty', body: '"I know Azure but only at permission level." That nuance — currently invisible on CVs — is now visible. Honest candidates get better-matched roles.' },
        { icon: '🔄', title: 'Self-Managed & Live', body: 'Candidates add and update their own skills. The map updates their profile instantly — across every portal that can see it.' },
        { icon: '🏢', title: 'Employer Intelligence', body: 'Hiring managers filter by skill strength, not keyword. A recruiter sees 20 candidates mapped by Azure expertise — instantly sorted.' },
        { icon: '🏛️', title: 'Government Ready', body: 'Job centres can see where a returning worker is strong and where they need support — in seconds, not after a 40-minute assessment.' },
        { icon: '🧠', title: 'Cockpit Integration', body: 'In Cockpit, the Skills Map extends to life areas — health, finance, relationships, career — giving a full human competency picture.' },
      ].map(f => <Card key={f.title}><Feature icon={f.icon} title={f.title} body={f.body} /></Card>)}
    </Grid>

    <Callout icon="🗺️" title="Beyond Skills — The Life Map" color={A2}
      body="In Cockpit, the same map concept expands beyond professional skills into life areas: Work-Life Balance, Health, Finance, Family, Learning, Goals. A candidate who burned out working 17-hour days gets a Life Map that shows it — and gets coached on what to change. This is the bridge between interview readiness and human flourishing." />
  </>;
}

// ── Section renderers ─────────────────────────────────────────────────────────
type Nav = (id: string) => void;

// ── ScreensSection — proper component so useState is legal ────────────────────
function ScreensSection({ nav }: { nav: Nav }) {
  const [chairTab, setChairTab] = useState(0);
  const [candTab, setCandTab] = useState(0);
  const [recTab, setRecTab] = useState(0);

  function Screen({ title, children, caption }: { title: string; children: React.ReactNode; caption: string }) {
    return (
      <div style={{ marginBottom: 40 }}>
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(79,142,247,0.18)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', maxWidth: 680 }}>
          <div style={{ background: '#111827', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
            <div style={{ flex: 1, marginLeft: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '3px 10px', fontSize: 10, color: '#404060', maxWidth: 260 }}>
              explain.global{title ? ` · ${title}` : ''}
            </div>
          </div>
          {children}
        </div>
        <p style={{ fontSize: 12, color: '#505075', lineHeight: 1.65, marginTop: 10, fontStyle: 'italic', maxWidth: 620 }}>{caption}</p>
      </div>
    );
  }

  function ScreenNav({ items, active, onSelect }: { items: string[]; active: number; onSelect: (i: number) => void }) {
    return (
      <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(79,142,247,0.1)', overflowX: 'auto' }}>
        {items.map((label, i) => (
          <button key={label} onClick={() => onSelect(i)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer',
            background: active === i ? 'rgba(79,142,247,0.12)' : 'transparent',
            color: active === i ? A : '#404060',
            fontSize: 11, fontWeight: active === i ? 700 : 400,
            borderBottom: active === i ? `2px solid ${A}` : '2px solid transparent',
            whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
          }}>{label}</button>
        ))}
      </div>
    );
  }

  function SectionLabel({ n, label, sub }: { n: string; label: string; sub: string }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: A, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{n} — {label}</div>
        <div style={{ fontSize: 14, color: '#8888a8', fontStyle: 'italic' }}>{sub}</div>
      </div>
    );
  }

  function S1Vallum() {
    return (
      <div style={{ background: '#07060f', minHeight: 320, padding: 0 }}>
        <div style={{ background: 'rgba(5,4,15,0.95)', borderBottom: '1px solid rgba(120,80,255,0.2)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>explain<span style={{ color: '#7b5cf5' }}>.global</span></div>
          <div style={{ fontSize: 9, color: '#404060', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Powered by Vallum Consulting</div>
        </div>
        <div style={{ padding: '40px 32px 32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(123,92,245,0.12)', border: '1px solid rgba(123,92,245,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
            🎯 Interview Preparation · Exclusive Access
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
            Your interview is on<br /><span style={{ color: A }}>12 August 2026.</span>
          </div>
          <div style={{ fontSize: 14, color: '#9090b0', marginBottom: 24, lineHeight: 1.7 }}>
            Vallum Consulting has activated 4 days of complimentary access to Explain.Global on your behalf.<br />Your personalised interview preparation is ready.
          </div>
          <div style={{ display: 'inline-flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
            {[['📅','Interview','12 Aug 2026'],['🏢','Company','DeepMind'],['📋','Role','Senior SWE']].map(([icon,label,val]) => (
              <div key={label} style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.18)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
                <div style={{ fontSize: 9, color: '#5060a0', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#ddd', fontWeight: 700, marginTop: 1 }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#4F8EF7,#7b5cf5)', borderRadius: 10, padding: '11px 28px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
            Start Your Preparation →
          </div>
        </div>
      </div>
    );
  }

  function S2Chair({ view }: { view: number }) {
    const views = [
      <div key="chair" style={{ background: '#050410', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, background: 'linear-gradient(180deg,#0a0820 0%,#050410 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, position: 'relative' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1560,#2a2080)', border: '2px solid rgba(79,142,247,0.4)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👩‍💼</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Sarah Mitchell</div>
            <div style={{ fontSize: 10, color: '#4060a0' }}>HR Director · Interviewing you now</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>LIVE SESSION</span>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, alignItems: 'center' }}>
            {[3,6,10,14,9,5,12,8,4,11,7,3,9,13,6].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, background: `${A}${i % 3 === 0 ? 'aa' : '55'}`, borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(5,4,16,0.98)', borderTop: '1px solid rgba(79,142,247,0.1)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#404060', marginBottom: 2 }}>Current question</div>
            <div style={{ fontSize: 11, color: '#c0c8e0', lineHeight: 1.4 }}>Tell me about a time you led a cross-functional project under pressure.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['🎙️','⏸️','📊'].map(ic => <button key={ic} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)', fontSize: 14, cursor: 'pointer' }}>{ic}</button>)}
          </div>
        </div>
      </div>,
      <div key="coach" style={{ background: '#050410', minHeight: 320, display: 'grid', gridTemplateColumns: '1fr 240px' }}>
        <div style={{ background: 'linear-gradient(180deg,#0a0820,#050410)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1560,#2a2080)', border: '2px solid rgba(79,142,247,0.3)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>👩‍💼</div>
            <div style={{ fontSize: 10, color: '#6080a0' }}>Sarah Mitchell · Active</div>
          </div>
        </div>
        <div style={{ background: 'rgba(4,3,14,0.98)', borderLeft: '1px solid rgba(79,142,247,0.12)', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>🧠 Live Coaching</div>
          {[{type:'✅',label:'Strong opener',color:'#22c55e'},{type:'⚡',label:'Add impact metric',color:'#f59e0b'},{type:'💡',label:'Land with outcome',color:A}].map(c => (
            <div key={c.label} style={{ display: 'flex', gap: 6, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10 }}>
              <span>{c.type}</span><span style={{ color: c.color }}>{c.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            {['Clarity','Depth','Confidence'].map((s,i) => (
              <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: [A,'#22c55e',A2][i] }}>{[7.8,8.4,6.9][i]}</div>
                <div style={{ fontSize: 8, color: '#404060' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      <div key="score" style={{ background: '#07060f', padding: 20, minHeight: 320 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Session Debrief — Senior Software Engineer · DeepMind</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
          {[['Overall','8.2',A],['Clarity','8.5','#22c55e'],['Depth','7.9',A2],['Confidence','8.4','#22c55e']].map(([l,v,c]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c}25`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: c as string }}>{v}</div>
              <div style={{ fontSize: 9, color: '#505070', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
            </div>
          ))}
        </div>
        {[{q:'Q1 — Leadership under pressure',score:8.8,color:'#22c55e'},{q:'Q2 — Stakeholder management',score:7.4,color:'#f59e0b'},{q:'Q3 — Technical decision making',score:8.9,color:'#22c55e'},{q:'Q4 — Handling ambiguity',score:7.1,color:'#f59e0b'}].map(r => (
          <div key={r.q} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 10, color: '#7080a0', flex: 1 }}>{r.q}</span>
            <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${r.score*10}%`, background: r.color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: r.color, minWidth: 28, textAlign: 'right' }}>{r.score}</span>
          </div>
        ))}
      </div>,
    ];
    return <>{views[view]}</>;
  }

  function S3Candidate({ view }: { view: number }) {
    const views = [
      <div key="dash" style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Good morning, <span style={{ color: A }}>Gary</span></div>
          <div style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>4 days access · Vallum</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[['🎯','Ready','Interview in 3 days',A],['📋','1 Pack','Senior SWE · DeepMind',A2],['📚','3 Lessons','Queued for you','#22c55e']].map(([icon,val,sub,color]) => (
            <div key={val as string} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, padding: '12px 10px' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: color as string }}>{val}</div>
              <div style={{ fontSize: 9, color: '#505070' }}>{sub as string}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79,142,247,0.1)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: A, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Your Preparation Timeline</div>
          {[['Today','Complete Interview Pack','📋'],['Tomorrow','Practice Session 1 — Interview Chair','🎬'],['Day 3','Learn Engine — System Design','📚'],['Interview Day','Ready ✓','🏆']].map(([day,task,ic]) => (
            <div key={day as string} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 10 }}>
              <span style={{ color: '#404060', minWidth: 72 }}>{day}</span>
              <span style={{ fontSize: 12 }}>{ic}</span>
              <span style={{ color: '#9090b0' }}>{task}</span>
            </div>
          ))}
        </div>
      </div>,
      <div key="pack" style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Interview Pack · Personalised</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Senior Software Engineer</div>
        <div style={{ fontSize: 11, color: '#5060a0', marginBottom: 16 }}>DeepMind · London · Technical + Behavioural Mix</div>
        {[{n:1,type:'Behavioural',q:'Describe a time you led a complex cross-functional project under significant time pressure.'},{n:2,type:'Technical',q:'How would you design a distributed rate-limiting system for a high-traffic API?'},{n:3,type:'Values',q:"Tell me about a time your technical judgment conflicted with a teammate's — how did you resolve it?"}].map(r => (
          <div key={r.n} style={{ border: '1px solid rgba(79,142,247,0.1)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: `${A}20`, border: `1px solid ${A}30`, borderRadius: 4, padding: '1px 6px' }}>Q{r.n}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: A2 }}>{r.type}</span>
            </div>
            <div style={{ fontSize: 11, color: '#c0c8e0', lineHeight: 1.5 }}>{r.q}</div>
          </div>
        ))}
      </div>,
      <div key="score" style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Readiness Score · After 2 Sessions</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#22c55e', letterSpacing: '-0.04em', lineHeight: 1 }}>84</div>
            <div style={{ fontSize: 10, color: '#505070' }}>/ 100 · Interview Ready</div>
          </div>
          <div style={{ flex: 1 }}>
            {[['Clarity','92','#22c55e'],['Depth','81',A],['Confidence','78',A2],['Structure','88','#22c55e'],['Delivery','82',A]].map(([l,v,c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#7080a0', minWidth: 70 }}>{l}</span>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${v}%`, background: c, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: c as string, minWidth: 24 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>,
    ];
    return <>{views[view]}</>;
  }

  function S4Recruiter({ view }: { view: number }) {
    const views = [
      <div key="rdash" style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Recruiter Portal · <span style={{ color: A }}>Vallum Consulting</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[['👥','24','Active Candidates',A],['📧','18','Prep Sent',A2],['✅','11','Placed This Month','#22c55e'],['📈','68%','Pass Rate','#22c55e']].map(([icon,v,l,c]) => (
            <div key={l as string} style={{ background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14 }}>{icon}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: c as string }}>{v}</div>
              <div style={{ fontSize: 8, color: '#404060' }}>{l}</div>
            </div>
          ))}
        </div>
        {[{name:'Gary Thompson',role:'Senior SWE · DeepMind',date:'12 Aug',status:'Prep Sent',score:'84%'},{name:'Priya Sharma',role:'Data Engineer · Palantir',date:'15 Aug',status:'Preparing',score:'71%'},{name:'James Walker',role:'DevOps Lead · Stripe',date:'18 Aug',status:'Not Sent',score:'—'}].map(r => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${A}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{r.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ddd', fontWeight: 600, fontSize: 12 }}>{r.name}</div>
              <div style={{ color: '#505070', fontSize: 10 }}>{r.role} · {r.date}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.status==='Prep Sent'?'rgba(79,142,247,0.12)':r.status==='Preparing'?'rgba(123,92,245,0.12)':'rgba(255,255,255,0.04)', color: r.status==='Prep Sent'?A:r.status==='Preparing'?A2:'#404060', border: `1px solid ${r.status==='Prep Sent'?A:r.status==='Preparing'?A2:'#303050'}25` }}>{r.status}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: r.score!=='—'?'#22c55e':'#303050', minWidth: 28, textAlign: 'right' }}>{r.score}</div>
          </div>
        ))}
      </div>,
      <div key="sendprep" style={{ background: '#07060f', padding: 24, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Send Interview Preparation</div>
          {[['Candidate','Gary Thompson'],['Interview Date','12 August 2026'],['Role','Senior Software Engineer'],['Company','DeepMind'],['Access Period','4 days (agency-funded)'],['Agency Branding','Vallum Consulting']].map(([l,v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
              <span style={{ color: '#505070' }}>{l}</span><span style={{ color: '#ddd', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 20, background: 'linear-gradient(135deg,#4F8EF7,#7b5cf5)', borderRadius: 10, padding: '13px 16px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 8px 32px rgba(79,142,247,0.35)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>⭐ Send Interview Prep Email</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Gary receives branded email instantly · 1 click</div>
          </div>
        </div>
      </div>,
    ];
    return <>{views[view]}</>;
  }

  return <>
    <SectionHead label="Product · What It Looks Like" h1="A visual walkthrough" h2="of the Explain experience." sub="Every screen is live product. Every interface is built, deployed, and working today. This is not a prototype — it is a platform." />

    <SectionLabel n="§1" label="Vallum-Branded Intro Page" sub="The page that triggered Vallum's immediate interest." />
    <Screen title="interview-prep · Vallum" caption="This is the page that triggered Vallum's immediate interest. Agencies instantly understand the value when they see their brand integrated into Explain — their name, their candidate, their interview. One click sent this. That's it.">
      <S1Vallum />
    </Screen>

    <SectionLabel n="§2" label="Interview Chair" sub="The cinematic AI interview simulation environment — live product, live today." />
    <Screen title="Interview Chair · Live Product" caption="This is the real Explain Interview Chair — live product, running today. Sarah Mitchell and James Okafor are AI interviewers. The candidate speaks or types, the coach responds in real time, and every answer is benchmarked against top performers in the role.">
      <ScreenNav items={['📸 Live Screenshot','Live Session','Coaching Overlay','Scoring Engine']} active={chairTab} onSelect={setChairTab} />
      {chairTab === 0
        ? <img src="/assets/interview-room-preview.png" alt="Explain Interview Chair — live product screenshot" style={{ width: '100%', display: 'block' }} />
        : <S2Chair view={chairTab - 1} />
      }
    </Screen>

    <SectionLabel n="§3" label="Candidate Portal" sub="Personalised interview readiness — packs, coaching, learning, simulation." />
    <Screen title="Candidate Portal · Gary Thompson" caption="The Candidate Portal delivers personalised interview readiness — packs, coaching, learning, and simulation.">
      <ScreenNav items={['Dashboard','Interview Pack','Readiness Score']} active={candTab} onSelect={setCandTab} />
      <S3Candidate view={candTab} />
    </Screen>

    <SectionLabel n="§4" label="Recruiter Portal" sub="One-click interview preparation — transforming how agencies place candidates." />
    <Screen title="Recruiter Portal · Vallum Consulting" caption="The Recruiter Portal transforms interview preparation into a one-click workflow — increasing placements and reducing drop-off.">
      <ScreenNav items={['Dashboard','⭐ Send Interview Prep']} active={recTab} onSelect={setRecTab} />
      <S4Recruiter view={recTab} />
    </Screen>

    <SectionLabel n="§5" label="Client / Employer Portal" sub="Structured candidate intelligence — giving hiring managers everything they need before the interview." />
    <Screen title="Client Portal · DeepMind Hiring" caption="The Client Portal gives employers structured candidate profiles, readiness scores, practice scores, and a structured feedback submission tool — before and after the interview.">
      <ScreenNav items={['Candidate Dashboard','Feedback Submission','Readiness Scores']} active={0} onSelect={() => {}} />
      <div style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Hiring Dashboard · <span style={{ color: '#22c55e' }}>DeepMind</span></div>
          <div style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>3 Candidates · Senior SWE</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[['📋','3','Candidates Ready',A],['📊','84','Avg Readiness Score','#22c55e'],['✅','2','Feedback Submitted',A2],['🎯','1','Interview Today','#f59e0b']].map(([icon,v,l,c]) => (
            <div key={l as string} style={{ background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14 }}>{icon}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: c as string }}>{v}</div>
              <div style={{ fontSize: 8, color: '#404060' }}>{l}</div>
            </div>
          ))}
        </div>
        {[
          {name:'Gary Thompson',role:'Senior SWE',score:84,practice:'3 sessions',status:'Ready',feedback:'Submitted'},
          {name:'Priya Sharma',role:'Senior SWE',score:71,practice:'1 session',status:'Preparing',feedback:'Pending'},
          {name:'James Walker',role:'Senior SWE',score:91,practice:'4 sessions',status:'Ready',feedback:'Submitted'},
        ].map(r => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${A}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{r.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ddd', fontWeight: 600, fontSize: 12 }}>{r.name}</div>
              <div style={{ color: '#505070', fontSize: 10 }}>{r.role} · {r.practice}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: r.score >= 80 ? '#22c55e' : '#f59e0b', minWidth: 32, textAlign: 'center' }}>{r.score}</div>
            <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.status === 'Ready' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: r.status === 'Ready' ? '#22c55e' : '#f59e0b', border: `1px solid ${r.status === 'Ready' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>{r.status}</div>
            <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.feedback === 'Submitted' ? `${A2}18` : 'rgba(255,255,255,0.04)', color: r.feedback === 'Submitted' ? A2 : '#404060', border: `1px solid ${r.feedback === 'Submitted' ? A2 + '35' : '#303050'}` }}>{r.feedback}</div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: '10px 14px', background: `${A}08`, border: `1px solid ${A}20`, borderRadius: 10, fontSize: 11, color: '#9090b0', textAlign: 'center' }}>
          📹 <span style={{ color: '#505070' }}>Interview recording viewer</span> <span style={{ color: '#303055', marginLeft: 4 }}>— Coming Q4 2026</span>
        </div>
      </div>
    </Screen>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 8 }}>
      {[
        {label:'View the Recruiter Email Feature →',color:A,to:'rec-email'},
        {label:'Explore the £1 Engine →',color:'#22c55e',to:'packs'},
        {label:'See the Roadmap →',color:A2,to:'roadmap'},
      ].map(cta => (
        <button key={cta.label} onClick={() => nav(cta.to)} style={{ display: 'block', width: '100%', textAlign: 'center', background: `${cta.color}10`, border: `1px solid ${cta.color}30`, borderRadius: 10, padding: '13px 12px', color: cta.color, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{cta.label}</button>
      ))}
    </div>
  </>;
}

// ── ProjectionsSection — proper component so useState is legal ────────────────
function ProjectionsSection({ nav }: { nav: Nav }) {
  const [tab, setTab] = useState<'base'|'upside'>('base');
  const isBase = tab === 'base';
  return <>
    <SectionHead
      label="Financials · Projections"
      h1="Hybrid projections."
      h2="Two scenarios."
      sub="We present both a Conservative Base Case and an Ambitious Upside Case. The base case is what we commit to. The upside case is what happens when the recruiter email feature reaches escape velocity."
    />

    <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12, padding: 4, marginBottom: 28, width: 'fit-content' }}>
      {(['base','upside'] as const).map(t => (
        <button key={t} onClick={() => setTab(t)} style={{
          padding: '9px 24px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          background: tab === t ? (t === 'base' ? `linear-gradient(135deg, ${A}, ${A2})` : 'linear-gradient(135deg, #22c55e, #16a34a)') : 'transparent',
          color: tab === t ? '#fff' : '#5050a0', transition: 'all 0.2s',
        }}>
          {t === 'base' ? '📊 Conservative Base Case' : '🚀 Ambitious Upside Case'}
        </button>
      ))}
    </div>

    {isBase ? (
      <>
        <Card style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>ARR Trajectory — Base Case (Agency-led)</div>
          <BarRow year="2026 (H2 launch)" arr="£48K"  pct={2}   agencies="10 agencies, modest pack sales" />
          <BarRow year="2027"             arr="£420K" pct={9}   agencies="60 agencies + consumer growth" />
          <BarRow year="2028"             arr="£1.8M" pct={33}  agencies="160 agencies + 2 govt contracts" />
          <BarRow year="2029"             arr="£5.5M" pct={100} agencies="350 agencies + govt scale" />
        </Card>
        <Grid cols={2}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 14 }}>Key Assumptions — Base Case</div>
            {[
              {label:'Agency close rate',value:'20% of demos'},
              {label:'Monthly packs per agency',value:'40 sends/month'},
              {label:'Agency churn rate',value:'<5% annually'},
              {label:'Pack price (agency-funded)',value:'£5 avg'},
              {label:'Consumer direct packs',value:'500/month by Q2 2027'},
              {label:'Learn Engine subs',value:'200 by end 2027'},
              {label:'Government contracts',value:'1 by Q4 2027, 2 by 2028'},
              {label:'Enterprise/company packs',value:'2 contracts by end 2027'},
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                <span style={{ color: '#9090b0' }}>{r.label}</span>
                <span style={{ color: '#ddd', fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 14 }}>2027 Revenue Mix — Base</div>
            {[
              {stream:'Agency subs (60 × £499)',value:'£359K',pct:73},
              {stream:'Recruiter-triggered packs',value:'£30K',pct:6},
              {stream:'Consumer packs (£1–10)',value:'£24K',pct:5},
              {stream:'Learn Engine subs',value:'£22K',pct:4},
              {stream:'Recruiter Pro (ind.)',value:'£18K',pct:4},
              {stream:'Company packs',value:'£24K',pct:5},
              {stream:'Govt contract (1)',value:'£75K',pct:15},
            ].map(r => (
              <div key={r.stream} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#9090b0' }}>{r.stream}</span>
                  <span style={{ color: '#ddd', fontWeight: 700 }}>{r.value}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: `linear-gradient(90deg, ${A}, ${A2})`, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </Card>
        </Grid>
        <Callout icon="📈" title="Path to Series A — Base Case" body="£1M ARR is achievable by Q3 2027 on the base case. That is the UK SaaS Series A standard benchmark. With even one government contract, we reach it by Q1 2027." />
      </>
    ) : (
      <>
        <Card style={{ marginBottom: 28, border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 20 }}>ARR Trajectory — Upside Case (Escape Velocity)</div>
          <BarRow year="2026 (H2 launch)" arr="£120K" pct={2}   agencies="25 agencies, viral £1 pack adoption begins" />
          <BarRow year="2027"             arr="£1.6M" pct={13}  agencies="160 agencies, recruiter engine exploding" />
          <BarRow year="2028"             arr="£6.5M" pct={53}  agencies="400 agencies, 3 govt contracts, Learn scaling" />
          <BarRow year="2029"             arr="£22M"  pct={100} agencies="Global scale, DWP engagement, enterprise tier live" />
        </Card>
        <Callout icon="🚀" title="What makes the Upside Case real" body="The upside scenario activates when two things happen simultaneously: the recruiter email feature reaches 50+ agencies creating a self-reinforcing loop, and one government contract proves the institutional model. These are not independent — they compound." color="#22c55e" />
        <Grid cols={2}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 14 }}>Upside Assumptions</div>
            {[
              {label:'Recruiter adoption rate',value:'50–90% in target segment'},
              {label:'Candidate conversion (rec. email)',value:'70–90% click-to-activate'},
              {label:'£1 pack virality coefficient',value:'>1.2 (each user brings 1.2 more)'},
              {label:'Learn Engine subscription take-up',value:'15% of pack users subscribe'},
              {label:'Government contracts by 2028',value:'3–5 (council + DWP trial)'},
              {label:'Premium pack penetration',value:'25% of pack users upgrade'},
              {label:'Company pack average size',value:'£2,500 / contract'},
              {label:'International revenue (2028)',value:'20% of total ARR'},
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                <span style={{ color: '#9090b0' }}>{r.label}</span>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 14 }}>2028 Revenue Mix — Upside</div>
            {[
              {stream:'Agency subs + triggered links',value:'£2.4M',pct:37},
              {stream:'Consumer packs (viral £1–10)',value:'£900K',pct:14},
              {stream:'Learn Engine subscriptions',value:'£720K',pct:11},
              {stream:'Premium packs (£5–10)',value:'£480K',pct:7},
              {stream:'Company packs',value:'£600K',pct:9},
              {stream:'Govt & institutional contracts',value:'£900K',pct:14},
              {stream:'International / multi-language',value:'£500K',pct:8},
            ].map(r => (
              <div key={r.stream} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#9090b0' }}>{r.stream}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{r.value}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </Card>
        </Grid>
      </>
    )}

    <div style={{ textAlign: 'center', marginTop: 24 }}>
      <button onClick={() => nav('ask')} style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        See The Ask →
      </button>
    </div>
  </>;
}

// ── SuccessCounter — animated social-proof element ───────────────────────────
const SUCCESS_NAMES = ['Hellen','Priya','Marcus','Aisha','James','Fatima','David','Sara','Emmanuel','Chloe','Kwame','Nadia','Tom','Blessing','Yuki'];
const SUCCESS_CITIES = ['Derby','London','Manchester','Birmingham','Bristol','Leeds','Edinburgh','Glasgow','Cardiff','Liverpool','Sheffield','Nottingham','Leicester','Brighton','Newcastle'];
function SuccessCounter() {
  const [count, setCount] = useState(110432);
  const [nameIdx, setNameIdx] = useState(0);
  const [cityIdx, setCityIdx] = useState(0);
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 3) + 1);
      setNameIdx(i => (i + 1) % SUCCESS_NAMES.length);
      setCityIdx(i => (i + 1) % SUCCESS_CITIES.length);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }, 4200);
    return () => clearInterval(timer);
  }, []);
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(79,142,247,0.08))',
      border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: '28px 32px',
      textAlign: 'center', marginBottom: 32, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes counterBurst { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @keyframes confettiDrift { 0%{opacity:1;transform:translateY(0) rotate(0deg)} 100%{opacity:0;transform:translateY(-60px) rotate(180deg)} }
        .sc-burst { animation: counterBurst 0.5s ease; }
        .sc-dot { position:absolute; width:6px; height:6px; border-radius:50%; animation: confettiDrift 0.8s ease forwards; }
      `}</style>
      {burst && ['#22c55e','#4F8EF7','#f59e0b','#7b5cf5','#ef4444'].map((c,i) => (
        <div key={i} className="sc-dot" style={{ background: c, left: `${20 + i*15}%`, top: '30%' }} />
      ))}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Live Success Counter</div>
      <div className={burst ? 'sc-burst' : ''} style={{ fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
        {count.toLocaleString('en-GB')}
      </div>
      <div style={{ fontSize: 15, color: '#c0c8e0', fontWeight: 600, marginBottom: 8, lineHeight: 1.6 }}>
        candidates have found work after preparing with <span style={{ color: '#22c55e' }}>Explain.Global</span>
      </div>
      <div style={{ fontSize: 14, color: '#9090b0', fontStyle: 'italic' }}>
        Most recently: <span style={{ color: A, fontWeight: 700 }}>{SUCCESS_NAMES[nameIdx]} from {SUCCESS_CITIES[cityIdx]}</span> — interview passed, offer received.
      </div>
    </div>
  );
}

const SECTIONS: Record<string, (nav: Nav) => React.ReactNode> = {

  'overview': () => <>
    <SectionHead
      label="Executive · Overview"
      h1="Personalised Interview"
      h2="Readiness."
      sub="Explain.Global is creating a new category — PIR — the layer between recruitment and placement where candidates become genuinely interview-ready for the first time in history."
    />
    <Callout icon="🎯" title="The Category: Personalised Interview Readiness (PIR)" body="No platform today combines job-spec personalisation, AI simulation, real-time coaching, and recruiter integration in one cinematic experience. PIR systems also give employers structured clarity on candidate readiness, improving interview quality and hiring decisions. Explain.Global owns this space." />
    <Grid cols={3}>
      <Stat value="£1" label="Entry price per Interview Pack" sub="Lowest friction in the market" />
      <Stat value="50+" label="Languages supported" sub="Global by design from day one" />
      <Stat value="7" label="Products in the ecosystem" sub="Candidate · Recruiter · Company · Learn · Chair · Packs · Flow" />
    </Grid>
    <Grid cols={1}>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          {[
            { label: 'Product', text: 'An AI-powered interview preparation platform that feels like the real thing.' },
            { label: 'Mission', text: 'Clarity for every candidate, everywhere — regardless of background, country, or income.' },
            { label: 'Category', text: 'PIR — Personalised Interview Readiness. A $50B global opportunity with no direct incumbent.' },
          ].map(({ label, text }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A, marginBottom: 8 }}>{label}</div>
              <p style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.7, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </Grid>
  </>,

  'vision': () => <>
    <SectionHead
      label="Executive · The Vision"
      h1="A global readiness layer"
      h2="for the world of work."
      sub="Every job specification becomes a personalised interview prep pack. Every candidate walks in knowing exactly what to expect. Every recruiter places better-prepared candidates — and converts more."
    />
    <Grid cols={2}>
      {[
        { icon: '🎯', title: 'Every job spec', body: "→ A personalised pack in seconds. 20 tailored questions, model answers, coaching context — generated from the exact role and the candidate's CV." },
        { icon: '🧑‍💼', title: 'Every candidate', body: '→ Walks in with clarity. They know the question structure, the competencies, the scoring. The first time they sit in the chair is not the real interview.' },
        { icon: '🤝', title: 'Every recruiter', body: '→ Sends one email and unlocks a new revenue stream. Candidate prep becomes a billable touchpoint. Conversion rates rise. Clients get better hires.' },
        { icon: '🏢', title: 'Every company', body: '→ Receives pre-assessed candidates who arrive prepared. First-interview quality improves. Time-to-hire shortens. The placement relationship strengthens.' },
        { icon: '🌍', title: 'Every language', body: '→ 50+ languages on day one. The nurse in Lagos. The engineer in Manila. The accountant in Warsaw. PIR is a global product solving a universal problem.' },
        { icon: '⚡', title: 'Every price point', body: '→ Starting at £1. Recruiter-funded. Company-funded. No barrier is high enough to justify walking into the most important performance of your career unprepared.' },
      ].map(f => <Card key={f.title}><Feature icon={f.icon} title={f.title} body={f.body} /></Card>)}
    </Grid>
  </>,

  'why-now': () => <>
    <SectionHead
      label="Executive · Why Now"
      h1="Six forces converging"
      h2="right now."
      sub="The conditions for PIR to exist at scale have only just arrived. Each of these forces is independent — together, they create an unmissable window."
    />
    <Grid cols={2}>
      {[
        { icon: '🤖', title: 'AI Maturity', color: A, body: 'GPT-4-class models can generate a personalised 20-question interview pack from a job spec + CV for less than £0.08. This was impossible at consumer price points 18 months ago.' },
        { icon: '😰', title: 'Candidate Anxiety', color: '#f59e0b', body: 'Post-pandemic, candidate anxiety before interviews is at record levels. 73% report feeling underprepared before significant interviews (LinkedIn Workforce Survey, 2024).' },
        { icon: '📉', title: 'Recruiter Saturation', color: '#ef4444', body: 'Recruitment agencies face intense competition. The ones who send candidates in better prepared — and can prove it — win client loyalty. Explain is that differentiator.' },
        { icon: '🌐', title: 'Global Mobility', color: '#22c55e', body: 'Cross-border hiring is accelerating. Candidates apply for roles in markets they have never worked in. A personalised, localised prep pack removes the knowledge gap.' },
        { icon: '💷', title: '£1 Psychology', color: A2, body: 'The impulse purchase threshold for digital products is real. £1 removes all friction — no deliberation, no approval needed, instant. This is the Spotify moment for interview prep.' },
        { icon: '🏆', title: 'Category Gap', color: '#4ade80', body: 'There is no incumbent. LinkedIn Learning is generic. Interviewing.io is coding only. ChatGPT has no recruiter integration. The PIR category is completely unoccupied.' },
      ].map(f => (
        <Card key={f.title} accent={f.color}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{f.icon}</span>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>{f.title}</span>
          </div>
          <p style={{ fontSize: 13, color: '#8080a0', lineHeight: 1.65, margin: 0 }}>{f.body}</p>
        </Card>
      ))}
    </Grid>
  </>,

  'why-fail': () => <>
    <SectionHead
      label="Problem & Solution · Why Candidates Fail"
      h1="The first time they sit"
      h2="in the chair is the real interview."
      sub="Almost no candidate has ever genuinely practised. The platforms to do it properly don't exist. What exists is generic, passive, and disconnected from the actual role."
    />
    <Callout icon="⚠️" title="The core problem in one sentence" body="Candidates prepare for interviews the same way they prepared for exams in school — by reading. But interviews are performances. You don't get good at performing by reading about it." color="#f59e0b" />
    <Grid cols={2}>
      {[
        { icon: '😨', label: 'Anxiety from the Unknown', body: "When you don't know what's coming, anxiety fills the gap. Explain removes the unknown entirely — question structure, competency weighting, scoring criteria." },
        { icon: '📚', label: 'Generic Preparation', body: "YouTube videos and interview guides are written for everyone — which means they're written for no one. No job spec. No CV context. No employer-specific framing." },
        { icon: '🚫', label: 'No Feedback Loop', body: 'Practising in your bedroom mirror gives you no data. No scores. No coaching. No sense of whether your answer was strong, weak, or missed the point entirely.' },
        { icon: '🎲', label: 'Unpredictable Questions', body: "Candidates often don't know what kind of questions to expect — competency, HR, technical, values-based. Explain generates the exact type and mix for the role." },
        { icon: '📉', label: 'Structural Weakness', body: 'Most candidates have no framework for answering. They ramble, omit key context, or fail to land a point. Structure beats talent in the room. We teach it.' },
        { icon: '🔄', label: 'No Second Chance', body: "In a real interview, every answer is live. There's no retry. Explain is the place where you use all your retries before the day that counts." },
      ].map(f => <Card key={f.label}><Feature icon={f.icon} title={f.label} body={f.body} /></Card>)}
    </Grid>
  </>,

  'answer': () => <>
    <SectionHead
      label="Problem & Solution · The Explain Answer"
      h1="Personalised. Coached."
      h2="Scored. Ready."
      sub="Every element of Explain is designed to solve one of the six failure modes. The result is a candidate who walks in with clarity, structure, and genuine confidence."
    />
    <Grid cols={1}>
      <Card>
        <div className="inv-2col" style={{ gap: 0 }}>
          <div style={{ padding: 20, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 14 }}>Before Explain</div>
            {['Generic YouTube prep', 'No practice environment', 'No feedback or scores', 'Unknown question format', 'Anxiety from uncertainty', 'One shot at the real thing'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: '#606080' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>✕</span> {t}
              </div>
            ))}
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 14 }}>After Explain</div>
            {['Personalised pack from job spec + CV', 'Interview Chair with live AI', 'Real-time coaching overlay', 'Exact competency mix for the role', 'Clarity and structural confidence', 'Practiced, scored, and debrief-ready'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: '#b0b0c0' }}>
                <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 16 }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Grid>
    <Grid cols={3}>
      <Stat value="92%" label="Pack gross margin" sub="AI cost ~£0.08 per pack" />
      <Stat value="3.2×" label="Avg sessions per candidate" sub="Candidates return to improve" />
      <Stat value="+23%" label="Recruiter conversion uplift" sub="Estimated from early agency pilots" />
    </Grid>

    {/* Employer Benefits subsection */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>Employer Benefits — The Other Side of the Equation</div>
    <Card style={{ border: '1px solid rgba(34,197,94,0.2)', marginBottom: 24 }}>
      <div style={{ fontSize: 14, color: '#a0a0c0', lineHeight: 1.7, marginBottom: 18 }}>
        Explain does not only serve candidates. Employers and hiring managers gain direct, structured value — improving the quality of every interview they run.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📋', label: 'Structured candidate information', color: '#22c55e' },
          { icon: '📊', label: 'Candidate readiness scores', color: '#22c55e' },
          { icon: '🎯', label: 'Practice scores before interview', color: A },
          { icon: '📹', label: 'Interview recordings (roadmap)', color: A },
          { icon: '💬', label: 'Structured feedback submission tools', color: A2 },
          { icon: '🗓️', label: 'Reduced wasted interview slots', color: A2 },
          { icon: '🏆', label: 'Improved hiring decisions', color: '#22c55e' },
          { icon: '🤝', label: 'Better-prepared candidate pool', color: '#22c55e' },
          { icon: '📈', label: 'Improved recruiter relationships', color: A },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#c0c0d0' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, fontSize: 13, color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>
        Clients benefit from more prepared candidates and clearer interview outcomes.
      </div>
    </Card>
  </>,

  'chair': () => <>
    <SectionHead
      label="Product · Interview Chair"
      h1="The seat is yours."
      h2="Make every answer count."
      sub="A cinematic AI-powered interview experience. Face an intelligent interviewer, receive real-time coaching, and get scored — before you ever sit in the real room."
    />
    <Grid cols={2}>
      <div>
        {[
          { icon: '🎬', title: 'Cinematic Interface', body: 'Full-screen AI interviewers — Sarah Mitchell (HR Director) and James Okafor (Hiring Manager) — rendered in a production-grade video layout with ambient audio.' },
          { icon: '🎙️', title: 'Whisper STT Pipeline', body: 'OpenAI Whisper processes your spoken answers in real-time. Your words appear live. The AI listens, evaluates, and responds as a real interviewer would.' },
          { icon: '🧠', title: 'Coaching Overlay', body: 'While you answer, the coaching engine watches your delivery, flags hesitations, surfaces context cues, and provides live guidance — on screen, non-intrusive.' },
          { icon: '📊', title: 'Scoring Engine', body: 'Every answer is scored across Clarity, Depth, Confidence, and Delivery. Calibrated against the specific competencies for the role. Honest. Actionable.' },
        ].map(f => <Feature key={f.title} {...f} />)}
      </div>
      <Card style={{ background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.15)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Session Flow</div>
        {[
          'Upload CV + job specification',
          'Explain generates personalised question set',
          'Enter the Interview Chair',
          'Face Sarah or James in full-screen',
          'Answer with voice — Whisper transcribes live',
          'Receive coaching overlay per answer',
          'Complete debrief — scores, highlights, gaps',
          'Recruiter receives optional analytics summary',
        ].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${A}20`, border: `1px solid ${A}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: A, flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 14, color: '#a0a0c0', lineHeight: 1.5, paddingTop: 2 }}>{s}</span>
          </div>
        ))}
      </Card>
    </Grid>
  </>,

  'learn': () => <>
    <SectionHead
      label="Product · Learn Engine"
      h1="Enter any subject."
      h2="Master it instantly."
      sub="Type any topic — any industry, any level, any language — and the Learn Engine generates a complete structured lesson in seconds. Knowledge, on demand."
    />
    <Grid cols={3}>
      <Stat value="50+" label="Languages" sub="Full localisation, not translation" />
      <Stat value="∞" label="Subjects" sub="Any topic, any industry" />
      <Stat value="5" label="Lesson layers" sub="Concepts, glossary, exam Q, quiz, bookshelf" />
    </Grid>
    <Grid cols={2}>
      {[
        { icon: '📖', title: 'Structured Lessons', body: 'Every lesson follows a proven format: core concepts → key definitions → exam-style questions → multiple-choice quiz. Depth without overwhelm.' },
        { icon: '📚', title: 'Personal Bookshelf', body: 'Save lessons, track progress, return to incomplete modules. The bookshelf builds a record of everything a candidate has studied before their interview.' },
        { icon: '🔗', title: 'Pack Integration', body: 'When the scoring engine identifies weak areas in an interview session, those topics auto-assign as Learn modules. Practice and learning close the loop.' },
        { icon: '🌍', title: 'Global by Design', body: "Lessons generate in the user's preferred language. The nurse in Lagos prepares in Yoruba. The engineer in Warsaw reads in Polish. Same platform, every market." },
      ].map(f => <Card key={f.title}><Feature icon={f.icon} title={f.title} body={f.body} /></Card>)}
    </Grid>
  </>,

  'packs': () => <>
    <SectionHead
      label="Product · Interview Packs"
      h1="Upload the job spec."
      h2="Walk in prepared."
      sub="The core product and entry point to the ecosystem. For £1, a candidate receives 20 AI-generated interview questions, model answers, and coaching context — tailored to the exact role and their own CV."
    />
    <Callout icon="💷" title="The £1 principle" body="The price is not a compromise — it is a deliberate strategic choice. The goal is zero friction. No deliberation. No approval. Instant. The Spotify moment for interview prep." />
    <Grid cols={2}>
      <div>
        {[
          { icon: '📄', title: 'Job Spec Ingestion', body: 'Paste or upload a job specification. Explain extracts role requirements, competencies, seniority level, and sector context automatically.' },
          { icon: '👤', title: 'CV Fusion', body: 'Add your CV for a second layer of personalisation. Questions reference your experience. Model answers contextualise your background. Nothing is generic.' },
          { icon: '❓', title: '20 Tailored Questions', body: 'A mix of competency, behavioural, technical, and HR questions — weighted for the exact role. The same mix a real hiring manager would use.' },
          { icon: '✅', title: 'Model Answers', body: 'Every question comes with a structured model answer using STAR format. Candidates see what a strong response looks like — and understand why.' },
        ].map(f => <Feature key={f.title} {...f} />)}
      </div>
      <Card style={{ background: 'rgba(79,142,247,0.03)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>Distribution Channels</div>
        {[
          { channel: 'Direct (explain.global)', model: '£1 — candidate pays', icon: '🌐' },
          { channel: 'Recruiter-Funded', model: '£5–10 — agency pays', icon: '🤝' },
          { channel: 'Company-Funded', model: '£10–25 — employer pays', icon: '🏢' },
          { channel: 'Agency White-Label', model: 'Branded packs at scale', icon: '🏷️' },
          { channel: 'Enterprise', model: 'Custom volume pricing', icon: '⚡' },
        ].map(r => (
          <div key={r.channel} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 18 }}>{r.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{r.channel}</div>
              <div style={{ fontSize: 11, color: '#505080' }}>{r.model}</div>
            </div>
          </div>
        ))}
      </Card>
    </Grid>

    <div style={{ marginTop: 8, background: 'rgba(123,92,245,0.06)', border: '1px solid rgba(123,92,245,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 22, flexShrink: 0 }}>🔄</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0f0', marginBottom: 3 }}>Multi-Stage Intelligence — packs that evolve across rounds</div>
        <div style={{ fontSize: 13, color: '#8080a8', lineHeight: 1.6 }}>Every platform generates one pack for one interview. Explain generates a new pack for each round — calibrated to the stage, and informed by what happened in previous rounds. Second interview? Tell us what was asked in Round 1. The AI uses that context to predict what comes next.</div>
      </div>
      <button onClick={() => {}} style={{ background: 'rgba(123,92,245,0.15)', border: '1px solid rgba(123,92,245,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#A78BFA', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>See full spec →</button>
    </div>
  </>,

  'rec-email': () => <>
    {/* ── HERO ── */}
    <style>{`
      @keyframes recPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.01)} }
      @keyframes recSlideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    `}</style>
    <div style={{ marginBottom: 48, textAlign: 'center', animation: 'recSlideIn 0.7s ease' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Product · Recruiter Email</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '4px 14px', marginBottom: 22, animation: 'recPulse 3s ease infinite' }}>
        ⭐ The Feature That Changes Everything
      </div>
      <h1 style={{ fontSize: 'clamp(2.2rem,4.5vw,3.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.04em', margin: '0 auto 10px', maxWidth: 720 }}>
        Recruiter-Triggered<br />
        <span style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Interview Readiness.</span>
      </h1>
      <p style={{ fontSize: 16, color: '#7070a0', lineHeight: 1.75, maxWidth: 620, margin: '0 auto 24px' }}>
        A single click from the recruiter triggers personalised interview readiness for the candidate — branded, structured, and powered by Explain.Global.
      </p>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { icon: '⚡', label: '1-click from the recruiter' },
          { icon: '🎯', label: 'Personalised for the exact role' },
          { icon: '💷', label: 'Agency-funded, candidate-free' },
        ].map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#a0a0c0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px' }}>
            <span>{b.icon}</span> {b.label}
          </div>
        ))}
      </div>
    </div>

    {/* ── S1: WHY IT MATTERS ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 14 }}>§1 — Why This Feature Matters</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 14, lineHeight: 1.4 }}>Recruiters arrange interviews. Candidates panic. Agencies lose placements.</div>
      <Grid cols={3} gap={12}>
        {[
          { icon: '😰', label: 'Candidates walk in unprepared', body: '73% feel unprepared before significant interviews. The first time they sit in the chair is the real interview.' },
          { icon: '🕐', label: 'Recruiters waste hours coaching', body: 'Consultants spend 2–4 hours per candidate on ad hoc prep advice — time they don\'t have and shouldn\'t be spending.' },
          { icon: '📉', label: 'Agencies lose revenue', body: 'An unprepared candidate means a failed interview, a lost placement, and a damaged client relationship. Every failed interview is a missed fee.' },
        ].map(c => (
          <Card key={c.label} accent="#ef4444">
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>{c.body}</div>
          </Card>
        ))}
      </Grid>
      <Callout icon="💡" title="This feature solves all three at once" body="Explain's Recruiter Email feature increases placements, reduces anxiety, and gives agencies a competitive advantage that no competitor can replicate. One click. No cost to the candidate. Branded by the agency. Clients benefit from more prepared candidates and clearer interview outcomes. This is a new standard for how recruitment works." color={A2} />
    </div>

    {/* ── S2: THE FLOW ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>§2 — The Full Flow (Seven Steps)</div>
      {/* Horizontal flow diagram */}
      <Card style={{ padding: '28px 8px' }}>
        <div className="inv-scroll" style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 700 }}>
          {[
            { n: '1', icon: '📅', title: 'Recruiter arranges interview', sub: 'Clicks "Send Interview Prep" in portal', color: A },
            { n: '2', icon: '⚡', title: 'Explain generates branded email', sub: 'Agency name, date, personalised link', color: A },
            { n: '3', icon: '📧', title: 'Candidate receives email', sub: 'Subject: Your Interview Preparation', color: A2 },
            { n: '4', icon: '🎯', title: 'Candidate clicks the link', sub: 'Enters Explain with personalised pack', color: A2 },
            { n: '5', icon: '💪', title: 'Candidate becomes ready', sub: 'Confidence ↑ Clarity ↑ Anxiety ↓', color: '#22c55e' },
            { n: '6', icon: '🏆', title: 'Recruiter conversion rises', sub: 'More passes. More placements.', color: '#22c55e' },
            { n: '7', icon: '📈', title: 'Agency becomes future-proof', sub: 'Competitive advantage locked in.', color: '#22c55e' },
          ].map((step, i, arr) => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ flex: 1, textAlign: 'center', minWidth: 90 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${step.color}18`, border: `2px solid ${step.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 8px' }}>{step.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: step.color, marginBottom: 3 }}>{step.n}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ddd', lineHeight: 1.3, marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 10, color: '#505070', lineHeight: 1.4 }}>{step.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flexShrink: 0, color: '#252550', fontSize: 18, marginBottom: 22 }}>→</div>
              )}
            </div>
          ))}
        </div>
        </div>
      </Card>
    </div>

    {/* ── S3: THE EMAIL MOCKUP ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>§3 — The Email — What Gary Receives</div>
      <div className="inv-2col" style={{ alignItems: 'start' }}>
        {/* Email mockup */}
        <div style={{ background: '#0d1525', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ background: '#111827', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
            <span style={{ marginLeft: 8, fontSize: 11, color: '#404060' }}>Mail — New Message</span>
          </div>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10 }}>
            <div style={{ color: '#404060', marginBottom: 2 }}>From: <span style={{ color: '#7080a0' }}>Vallum Consulting via Explain.Global</span></div>
            <div style={{ color: '#404060', marginBottom: 2 }}>To: <span style={{ color: '#7080a0' }}>gary.thompson@gmail.com</span></div>
            <div style={{ color: '#404060' }}>Subject: <span style={{ color: '#b0bcd0', fontWeight: 700 }}>Your Interview Preparation — powered by Explain.Global</span></div>
          </div>
          <div style={{ padding: '22px 22px 28px' }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>
              explain<span style={{ color: A }}>.global</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#303055', marginBottom: 16 }}>Powered by Vallum Consulting</div>
            <div style={{ height: 1, background: `${A}25`, marginBottom: 18 }} />
            <p style={{ fontSize: 13, color: '#c0c8e0', margin: '0 0 12px', lineHeight: 1.7 }}>Hi Gary,</p>
            <p style={{ fontSize: 13, color: '#c0c8e0', margin: '0 0 12px', lineHeight: 1.7 }}>This is confirmation of your interview on <strong style={{ color: '#fff' }}>12/08/2026</strong>.</p>
            <p style={{ fontSize: 13, color: '#c0c8e0', margin: '0 0 18px', lineHeight: 1.7 }}>
              <strong style={{ color: '#fff' }}>Vallum Consulting</strong> has gifted you <strong style={{ color: A }}>4 days of full access</strong> to Explain.Global to prepare.
            </p>
            <p style={{ fontSize: 14, color: '#a0a0c0', margin: '0 0 18px', lineHeight: 1.7 }}>Click below to begin your personalised interview readiness:</p>
            <div style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, borderRadius: 10, padding: '12px 18px', textAlign: 'center', marginBottom: 18, cursor: 'pointer', boxShadow: `0 6px 24px ${A}35` }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.02em' }}>Start Preparing →</span>
            </div>
            <div style={{ fontSize: 13, color: '#8888a8', lineHeight: 1.9 }}>
              You'll receive:<br />
              <span style={{ color: '#22c55e' }}>✓</span> Personalised interview pack for this exact role<br />
              <span style={{ color: '#22c55e' }}>✓</span> Personalised coaching and readiness score<br />
              <span style={{ color: '#22c55e' }}>✓</span> Personalised learning modules<br />
              <span style={{ color: '#22c55e' }}>✓</span> Personalised interview simulation
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '18px 0 14px' }} />
            <p style={{ fontSize: 11, color: '#303050', margin: 0, lineHeight: 1.6 }}>
              Good luck — go in prepared.<br />
              <span style={{ color: A, fontWeight: 700 }}>explain.global</span>
            </p>
          </div>
        </div>
        {/* What the candidate gets */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>What Gary Gets When He Clicks</div>
          {[
            { icon: '📋', title: 'Personalised Pack', body: '20 questions generated specifically for "Senior Software Engineer at DeepMind" — not generic tech interview questions.' },
            { icon: '🧠', title: 'Personalised Coaching', body: 'Real-time coaching overlay in the Interview Chair. The AI watches Gary\'s delivery and guides him as he practises.' },
            { icon: '📊', title: 'Personalised Readiness Score', body: 'After each session, Gary receives a scored debrief: Clarity, Depth, Confidence, Delivery — calibrated for this specific role.' },
            { icon: '📚', title: 'Personalised Learning Path', body: 'The scoring engine identifies gaps and auto-assigns Learn modules. Gary closes the knowledge gap before interview day.' },
            { icon: '🎬', title: 'Personalised Simulation', body: 'The Interview Chair puts Gary face-to-face with James or Sarah — the exact type of interviewer he\'ll meet at DeepMind.' },
          ].map(f => <Feature key={f.title} {...f} />)}
        </div>
      </div>
    </div>

    {/* ── S4: WHY RECRUITERS LOVE THIS ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§4 — Why Recruiters Love This</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ddd', marginBottom: 20 }}>This feature saves recruiters hours every week — and makes every candidate they send look exceptional.</div>
      <Card>
        <div className="inv-2col">
          <div>
            {[
              { label: 'Pass rate', before: 'Baseline', after: '+30–50%', color: '#22c55e' },
              { label: 'Candidate confidence', before: 'Low (self-reported)', after: '+70%', color: '#22c55e' },
              { label: 'Interview readiness', before: 'Unprepared', after: '+90%', color: '#22c55e' },
              { label: 'Recruiter time saved', before: '0 hours', after: '2–4 hours/day', color: A },
              { label: 'Placement uplift', before: 'Baseline', after: '+20–40%', color: '#22c55e' },
            ].map(r => (
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 80px', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: '#8080a0' }}>{r.label}</span>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${r.color}40, ${r.color})`, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: r.color, textAlign: 'right' }}>{r.after}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 14 }}>Before vs After Explain</div>
            <div className="inv-2col" style={{ gap: 10 }}>
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '14px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Before</div>
                {['Higher drop-offs', 'Anxious candidates', 'Wasted interview slots', 'Unprepared impressions', 'Client dissatisfaction', 'Fewer placements'].map(t => (
                  <div key={t} style={{ fontSize: 11, color: '#606080', display: 'flex', gap: 5, marginBottom: 6 }}>
                    <span style={{ color: '#ef4444' }}>✕</span> {t}
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '14px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>After</div>
                {['Higher pass rates', 'Confident candidates', 'Fewer wasted slots', 'Outstanding impressions', 'Client loyalty', 'More placements'].map(t => (
                  <div key={t} style={{ fontSize: 11, color: '#9090b0', display: 'flex', gap: 5, marginBottom: 6 }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    {/* ── S5: WHY CANDIDATES LOVE THIS ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§5 — Why Candidates Love This</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ddd', marginBottom: 20 }}>Because it feels like support, not pressure.</div>
      <Grid cols={2}>
        <Card>
          <Grid cols={2} gap={12}>
            {[
              { icon: '🧭', label: 'Clarity', body: 'They know the exact question structure, competency weighting, and scoring criteria before they walk in.' },
              { icon: '💙', label: 'Confidence', body: 'Having practised in the Chair, they know what good looks like. The fear of the unknown is gone.' },
              { icon: '📐', label: 'Structure', body: 'STAR framework embedded in every answer. They don\'t ramble. They land every point.' },
              { icon: '🧑‍🏫', label: 'Personalised Guidance', body: 'The coaching overlay watches their delivery and gives live guidance — not generic tips.' },
              { icon: '🌍', label: 'Language Support', body: 'Non-native speakers receive content in their language. The playing field levels instantly.' },
              { icon: '🔄', label: 'Multiple Retries', body: 'In the Chair, they can use all their retries before the day that counts. Nothing in life gives you this.' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{f.icon}</span>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{f.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6060a0', lineHeight: 1.55 }}>{f.body}</div>
              </div>
            ))}
          </Grid>
        </Card>
        <Card style={{ background: `${A2}06`, border: `1px solid ${A2}20`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>💬</div>
          <blockquote style={{ fontSize: 17, fontStyle: 'italic', color: '#c8d0e0', lineHeight: 1.8, textAlign: 'center', borderLeft: `3px solid ${A2}`, paddingLeft: 20, margin: '0 0 20px' }}>
            "I've never felt this prepared for an interview in my life."
          </blockquote>
          <div style={{ fontSize: 14, color: '#8888a8', textAlign: 'center' }}>— Gary Thompson, Software Engineer<br /><span style={{ color: A2 }}>Placed at DeepMind via Vallum Consulting</span></div>
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#7070a0', textAlign: 'center', lineHeight: 1.7 }}>
              Before Explain: second-guessing, scripted answers, interview panic.<br />
              After Explain: structure, clarity, and the calm that comes<br />from having done this before — in the Chair.
            </div>
          </div>
        </Card>
      </Grid>
    </div>

    {/* ── S6: WHY AGENCIES LOVE THIS ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§6 — Why Agencies Love This</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ddd', marginBottom: 20 }}>Because it increases revenue without increasing workload.</div>
      <Grid cols={2}>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>Agency ROI Model</div>
          {[
            { label: 'Cost per candidate send',         value: '£5–10', note: 'Agency-funded, candidate-free' },
            { label: 'Revenue uplift (more placements)', value: '+20–40%', note: 'Conservative estimate' },
            { label: 'Placement fee uplift (£20K avg)',  value: '+£4–8K/placement', note: 'At +20–40% placement rate' },
            { label: 'ROI per send',                    value: '400–800×', note: '£5 cost / £4K+ fee uplift' },
            { label: 'Candidate satisfaction',          value: '+80–90%', note: 'NPS and loyalty increase' },
            { label: 'Client retention uplift',         value: '+35%', note: 'Better candidates = loyal clients' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: 12, color: '#9090b0' }}>{r.label}</div>
                <div style={{ fontSize: 10, color: '#404060' }}>{r.note}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#22c55e', flexShrink: 0, marginLeft: 12 }}>{r.value}</span>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 14 }}>What Agencies Gain</div>
          {[
            { icon: '📈', label: 'More placements', body: 'Better-prepared candidates pass more interviews. Volume increases without more effort.' },
            { icon: '💷', label: 'More revenue', body: 'More placements means more fees. The ROI per £5 send is extraordinary at current placement fee averages.' },
            { icon: '🤝', label: 'Client satisfaction', body: 'Clients receive better candidates. Retainer relationships deepen. Repeat business accelerates.' },
            { icon: '🏷️', label: 'Brand differentiation', body: '"We prepare our candidates before we send them" is a pitch no competitor can make. Vallum becomes the premium agency.' },
            { icon: '🔒', label: 'Explain is embedded', body: 'Once a recruiter sends their first prep link, the workflow is changed. The tool becomes essential. Churn becomes nearly impossible.' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: '#6060a0', lineHeight: 1.55 }}>{f.body}</div>
              </div>
            </div>
          ))}
        </Card>
      </Grid>
    </div>

    {/* ── S7: REVENUE ENGINE ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§7 — Revenue Engine</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ddd', marginBottom: 20 }}>Every recruiter email creates three downstream revenue opportunities.</div>
      <Card>
        <Grid cols={3} gap={16}>
          {[
            { n: '①', icon: '💷', stream: '£1 Practice Packs', pct: '30–50%', detail: 'of candidates who receive a prep email buy an additional pack before their interview. Impulse decision. One click. £1. Zero friction.', color: A },
            { n: '②', icon: '💎', stream: 'Premium Packs £5–10', pct: '10–20%', detail: 'of candidates upgrade to a sector-specific premium pack — Investment Banking, NHS, FAANG, finance. Higher value for high-stakes roles.', color: A2 },
            { n: '③', icon: '📚', stream: 'Learn Engine £9–19/mo', pct: '5–10%', detail: 'of candidates subscribe to the Learn Engine — continuing their learning after the interview for future applications. Recurring monthly revenue.', color: '#22c55e' },
          ].map(r => (
            <div key={r.stream} style={{ textAlign: 'center', padding: '20px 16px', background: `${r.color}06`, border: `1px solid ${r.color}20`, borderRadius: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: r.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r.n} {r.stream}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 8 }}>{r.pct}</div>
              <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>{r.detail}</div>
            </div>
          ))}
        </Grid>
        <div style={{ marginTop: 24, padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(79,142,247,0.1)', borderRadius: 10 }}>
          <div style={{ fontSize: 14, color: '#9090b0', textAlign: 'center', lineHeight: 1.8 }}>
            At 100 recruiter sends/month: <span style={{ color: '#fff', fontWeight: 700 }}>35–50 pack purchases</span> + <span style={{ color: A2, fontWeight: 700 }}>10–20 premium upgrades</span> + <span style={{ color: '#22c55e', fontWeight: 700 }}>5–10 subscriptions</span><br />
            = <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>£325–£790 additional monthly revenue from one agency's send volume alone</span>
          </div>
        </div>
      </Card>
    </div>

    {/* ── S8: CATEGORY CREATOR ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>§8 — Category Creation</div>
      <Callout icon="🏆" title="No other platform in the world offers recruiter-triggered personalised interview readiness." body="LinkedIn Learning is generic. Interviewing.io is coding only. ChatGPT has no recruiter integration. Pramp is developer-niche. None of them have a recruiter portal. None of them send branded candidate emails. None of them integrate into the placement workflow. Explain.Global is the only platform that closes the loop between recruiter, candidate, and interview outcome." color="#22c55e" />
      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 12 }}>Category Definition</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>Personalised Interview Readiness</div>
          <p style={{ fontSize: 14, color: '#8080a0', lineHeight: 1.75, maxWidth: 640, margin: '0 auto 24px' }}>
            Explain.Global is the world's first Personalised Interview Readiness system — a new category that transforms unprepared candidates into interview-ready professionals using personalised packs, coaching, and job-specific clarity.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {['New', 'Inevitable', 'Defensible', 'Scalable', 'Global', 'Category-defining'].map(t => (
              <span key={t} style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', background: `${A}12`, border: `1px solid ${A}25`, borderRadius: 20, color: A }}>{t}</span>
            ))}
          </div>
        </div>
      </Card>
    </div>

    {/* ── S9: VALLUM CASE STUDY PREVIEW ── */}
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 16 }}>§9 — Vallum Consulting · Case Study Preview</div>
      <Card accent="#f59e0b">
        <div className="inv-2col">
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Vallum Consulting</div>
            <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.7, marginBottom: 16 }}>A leading UK recruitment agency specialising in technology and financial services placements. Vallum is the anchor case study for Explain's agency partnership model.</div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 12 }}>Projected Impact</div>
            {[
              { label: 'Monthly prep email sends',    value: '80–120' },
              { label: 'Placement conversion uplift', value: '+25–35%' },
              { label: 'Monthly revenue uplift',      value: '£4K–12K' },
              { label: 'Annual placement fee uplift', value: '£48K–144K' },
              { label: 'Candidate NPS change',        value: '+55 points' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                <span style={{ color: '#9090b0' }}>{r.label}</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 12 }}>What Vallum's Board Will See</div>
            {[
              { icon: '📊', label: 'Candidates are arriving visibly better prepared' },
              { icon: '💷', label: 'Placement fees are up — same effort, more revenue' },
              { icon: '🏆', label: 'Clients are asking "how did you do that?"' },
              { icon: '🔒', label: 'Competitors cannot replicate this without Explain' },
              { icon: '🌍', label: 'The model scales to every consultant, every candidate' },
              { icon: '🚀', label: 'Vallum becomes the agency of the future — today' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12, color: '#9090b0' }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span> {r.label}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>

    {/* ── S10: CTAs ── */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 8 }}>
      {[
        { label: 'See the Recruiter Portal →', color: A,        to: 'portals' },
        { label: 'Candidate Experience →',     color: A2,       to: 'chair'   },
        { label: 'Explore the £1 Engine →',    color: '#22c55e', to: 'packs'  },
      ].map(cta => (
        <a key={cta.label} href={`#${cta.to}`} style={{
          display: 'block', textAlign: 'center',
          background: `${cta.color}10`, border: `1px solid ${cta.color}30`,
          borderRadius: 10, padding: '13px 16px',
          color: cta.color, fontWeight: 700, fontSize: 13,
          textDecoration: 'none', transition: 'all 0.2s',
        }}>{cta.label}</a>
      ))}
    </div>

    {/* Bottom stat row */}
    <Grid cols={3} gap={14} >
      <Stat value="+30–50%" label="Pass rate uplift" sub="Per agency using recruiter email" color="#22c55e" />
      <Stat value="£5–10"  label="Cost per send" sub="Agency-funded · Candidate-free" />
      <Stat value="400–800×" label="ROI per send" sub="vs. average placement fee uplift" color={A2} />
    </Grid>
  </>,

  'screens': (nav) => <ScreensSection nav={nav} />,

  'flow': () => <>
    <SectionHead
      label="Product · Flow Viewer"
      h1="Every click."
      h2="Every moment. Visualised."
      sub="A cinematic timeline of every candidate interaction — from first click to final placement. Recruiters see the full story. Candidates own their journey."
    />
    <Grid cols={1}>
      <Card style={{ background: '#0a0f1e' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>Sample Candidate Timeline</div>
        {[
          { time: '09:14', event: 'Session Start', detail: 'Candidate received Recruiter Email · Clicked prep link · Created account', tag: 'Entry' },
          { time: '09:17', event: 'Interview Pack', detail: 'Generated pack: Senior Software Engineer · DeepMind · 20 questions', tag: 'Pack' },
          { time: '09:34', event: 'Learn Engine', detail: 'Generated lesson: System Design Fundamentals · 7 concepts · Quiz started', tag: 'Learn' },
          { time: '09:51', event: 'Interview Chair', detail: 'Practice session completed · 6 questions · Strong: 4 · Needs work: 2', tag: 'Chair' },
          { time: '10:04', event: 'LEARN Plan', detail: '3 modules auto-assigned from weak areas: Stakeholder Mgmt · Communication', tag: 'Coach' },
          { time: '10:28', event: 'Second Session', detail: 'Interview Chair retry · All 6 questions · Strong: 6 · Score: 8.4/10', tag: 'Chair' },
        ].map(e => (
          <div key={e.time} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 11, color: '#404060', fontWeight: 600, minWidth: 46, paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{e.time}</div>
            <div style={{ width: 2, background: `${A}30`, borderRadius: 1, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, color: '#ddd', fontSize: 13 }}>{e.event}</span>
                <Tag>{e.tag}</Tag>
              </div>
              <div style={{ fontSize: 12, color: '#606080' }}>{e.detail}</div>
            </div>
          </div>
        ))}
      </Card>
    </Grid>
  </>,

  'portals': () => <>
    <SectionHead
      label="Product · Portals"
      h1="Three portals."
      h2="One ecosystem."
      sub="Candidate, Recruiter, and Employer portals serve three distinct stakeholders — but share one unified data layer. Every action in one portal creates a signal in another. Everything connects."
    />

    {/* ── Recruiter Portal ──────────────────────────────────────────────────── */}
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>Recruiter Portal</div>
    <Callout icon="🤝" title="The world's most intelligent recruiter tool for interview preparation" color={A2}
      body="Recruiters don't just send a prep link anymore. They trigger stage-specific preparation, capture previous interview context, send branded packs calibrated to the exact round, and receive structured employer feedback — all from one dashboard. No equivalent exists in any recruitment platform." />

    <Grid cols={2} gap={16}>
      <Card accent={A2}>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Dashboard — Total Visibility</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 14 }}>Every candidate, every stage, every score — in one view. Recruiters see the full multi-round picture at a glance.</div>
        {['All candidates & interview stages (1–6)', 'Readiness score per stage', 'Practice score per stage', 'Employer feedback received', 'Multi-stage progress timeline', 'Candidate history & session log', 'Interview-to-placement conversion rate'].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9090b0', padding: '4px 0' }}>
            <span style={{ color: A2, flexShrink: 0 }}>✓</span>{f}
          </div>
        ))}
      </Card>

      <Card accent={A2}>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Multi-Stage Interview Trigger — New</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 14 }}>Recruiters trigger stage-specific preparation with one action. The platform generates a pack calibrated precisely to that round.</div>
        {[
          { stage: 'Stage 1', desc: 'Screening — culture fit, motivation, narrative' },
          { stage: 'Stage 2', desc: 'Technical — deeper knowledge, domain expertise' },
          { stage: 'Stage 3', desc: 'Assessment — live coding, case study, presentation' },
          { stage: 'Stage 4', desc: 'Senior — strategy, leadership, budget ownership' },
          { stage: 'Stage 5+', desc: 'Board / executive — vision, executive presence' },
        ].map(s => (
          <div key={s.stage} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: A2, background: `${A2}18`, border: `1px solid ${A2}28`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{s.stage}</span>
            <span style={{ fontSize: 12, color: '#9090b0' }}>{s.desc}</span>
          </div>
        ))}
      </Card>
    </Grid>

    <Card style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 6 }}>Multi-Stage Wizard — New</div>
      <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 16 }}>When triggering preparation, recruiters step through a four-stage wizard that captures everything the AI needs to build a round-specific pack.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { step: '01', label: 'Select Stage', detail: 'Choose interview number (1–6). Everything downstream changes based on this.' },
          { step: '02', label: 'Previous Round Notes', detail: 'If Stage > 1: recruiter enters questions asked, topics covered, candidate performance, feedback received, and difficulty level from prior rounds.' },
          { step: '03', label: 'Confirm Role & Company', detail: 'Auto-extracted from the job specification. Company culture and sector influence pack style and depth.' },
          { step: '04', label: 'AI Pack Generation', detail: 'Fusion Algorithm generates stage-specific questions, coaching, scoring rubric, simulation calibration, and a readiness score.' },
        ].map(s => (
          <div key={s.step} style={{ background: `${A2}08`, border: `1px solid ${A2}20`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: A2, letterSpacing: '0.06em', marginBottom: 8 }}>STEP {s.step}</div>
            <div style={{ fontWeight: 700, color: '#e0e0f0', fontSize: 13, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: '#7070a0', lineHeight: 1.6 }}>{s.detail}</div>
          </div>
        ))}
      </div>
    </Card>

    <Grid cols={2} gap={16}>
      <Card accent={A2}>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Employer Feedback Loop — New</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 12 }}>Recruiters request structured feedback from employers after every interview. That feedback flows back into the candidate's next-stage pack.</div>
        {['Request feedback from employer (1-click)', 'View structured feedback in dashboard', 'Send feedback summary to candidate', 'Integrate feedback into Stage N+1 pack', 'Track feedback response rate per employer', 'Eliminate ghosting — structured loop closes every round'].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9090b0', padding: '4px 0' }}>
            <span style={{ color: A2, flexShrink: 0 }}>✓</span>{f}
          </div>
        ))}
      </Card>

      <Card accent={A2}>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Multi-Stage Readiness Analytics — New</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 12 }}>Per-stage readiness scores give recruiters predictive intelligence before every round.</div>
        {[
          { label: 'Stage 1 Readiness', value: '82%', color: '#22c55e' },
          { label: 'Stage 2 Readiness', value: '74%', color: A },
          { label: 'Stage 3 Readiness', value: '61%', color: '#f59e0b' },
          { label: 'Stage 4 Readiness', value: '—', color: '#5050a0' },
          { label: 'Stage 5 Readiness', value: '—', color: '#5050a0' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
            <span style={{ color: '#9090b0' }}>{r.label}</span>
            <span style={{ fontWeight: 800, color: r.color }}>{r.value}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, color: '#6060a0', marginTop: 10, lineHeight: 1.55 }}>Helps recruiters predict pass likelihood, prepare candidates better, and reduce placement drop-off.</div>
      </Card>
    </Grid>

    <Card style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 6 }}>Updated Recruiter Email</div>
      <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 12 }}>The branded prep email — already a world-first — now includes stage-specific intelligence in every send.</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Interview stage (e.g. "Your 3rd interview")', 'Stage-specific pack', 'Stage-specific coaching', 'Stage-specific readiness score', 'Employer feedback (if received)', 'Previous interview summary (if Stage > 1)', 'Time-limited tokenised access link'].map(t => <Tag key={t} color={A2}>{t}</Tag>)}
      </div>
    </Card>

    {/* ── Employer / Client Portal ──────────────────────────────────────────── */}
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16, marginTop: 8 }}>Employer / Client Portal</div>
    <Callout icon="🏢" title="The first employer portal that shows interview readiness at every stage — not just a name on a shortlist" color="#22c55e"
      body="Hiring managers have always received CVs. Explain gives them something far more valuable: a structured picture of how prepared each candidate is, at every stage of the process — with the ability to submit feedback that feeds directly into the next round." />

    <Grid cols={2} gap={16}>
      <Card accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Employer Dashboard — Updated</div>
        {['All candidates & interview stages', 'Readiness score per stage', 'Practice score per stage', 'Structured interview packs', 'Feedback history per candidate', 'Simulation recordings (future)', 'Candidate comparison view', 'Stage-specific coaching summary'].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9090b0', padding: '4px 0' }}>
            <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>{f}
          </div>
        ))}
      </Card>

      <Card accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 12 }}>Multi-Stage Candidate Viewer — New</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 12 }}>Employers click any candidate and see a stage-by-stage preparation profile:</div>
        {['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'].map((s, i) => (
          <div key={s} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: i < 3 ? '#22c55e' : '#404060', background: i < 3 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i < 3 ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 4, padding: '2px 6px', textAlign: 'center' }}>{s}</span>
            <span style={{ fontSize: 11, color: i < 3 ? '#9090b0' : '#404060' }}>{i < 3 ? 'Readiness · Practice · Pack · Coaching · Simulation' : 'Not yet triggered'}</span>
          </div>
        ))}
      </Card>
    </Grid>

    <Card style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 6 }}>Employer Feedback Submission — New</div>
      <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, marginBottom: 16 }}>After every interview, employers submit structured feedback across eight dimensions. This feedback flows to the recruiter, to the candidate, and into the next-stage pack generation.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {['Clarity', 'Confidence', 'Relevance', 'Technical Depth', 'Cultural Fit', 'Communication', 'Strengths', 'Weaknesses'].map(d => (
          <div key={d} style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#22c55e', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Pass / Fail decision', 'Next-stage recommendation', 'Flows to recruiter instantly', 'Flows to candidate (controlled)', 'Feeds into Stage N+1 pack', 'Eliminates ghosting', 'Reduces recruiter stress', 'Improves hiring decision quality'].map(t => <Tag key={t} color="#22c55e">{t}</Tag>)}
      </div>
    </Card>

    <Grid cols={3} gap={16}>
      <Card accent="#22c55e">
        <div style={{ fontSize: 20, marginBottom: 10 }}>📊</div>
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13, marginBottom: 6 }}>Practice Score Viewer</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.6 }}>Employers see candidates' practice session scores, readiness scores, and coaching feedback — making hiring decisions more objective and evidence-based.</div>
      </Card>
      <Card accent="#22c55e">
        <div style={{ fontSize: 20, marginBottom: 10 }}>⚖️</div>
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13, marginBottom: 6 }}>Candidate Comparison Tool</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.6 }}>Compare candidates side-by-side across readiness, practice scores, competencies, gap analysis, and simulation performance. Reduces bias. Improves shortlisting.</div>
      </Card>
      <Card accent="#22c55e" style={{ border: '1px dashed rgba(34,197,94,0.25)' }}>
        <div style={{ fontSize: 20, marginBottom: 10 }}>🎥</div>
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13, marginBottom: 6 }}>Interview Recording Viewer <Tag color="#f59e0b">Roadmap</Tag></div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.6 }}>Employers will soon be able to watch candidate-approved simulation recordings. The hiring manager sees the candidate perform before the interview. A category-defining feature.</div>
      </Card>
    </Grid>

    {/* ── Candidate Portal (brief) ──────────────────────────────────────────── */}
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A, marginBottom: 16, marginTop: 8 }}>Candidate Portal</div>
    <Card accent={A}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 8 }}>Personal preparation command centre</div>
          <p style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65, margin: 0 }}>The candidate's home for every preparation session — past, present, and future. Multi-stage aware from day one.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['Personal dashboard & session history', 'Interview Pack library (all rounds)', 'Interview Chair — AI simulation', 'Learn Engine & bookshelf', 'Flow Viewer — multi-stage timeline', 'Stage-specific readiness scores', 'Multi-stage wizard entry point', 'Previous round context capture'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9090b0', padding: '3px 0' }}>
              <span style={{ color: A, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>
    </Card>
  </>,

  'revenue': () => <>
    <SectionHead
      label="Business Model · Revenue Streams"
      h1="Eight independent"
      h2="revenue engines."
      sub="Explain generates revenue at every point in the candidate, recruiter, company, and government journey — from a £1 impulse purchase to multi-year institutional contracts worth hundreds of thousands."
    />
    <Grid cols={2}>
      {[
        { icon: '📧', stream: '① Recruiter-Triggered Prep Links', model: 'B2B2C · £5–10 per activation', detail: 'The recruiter email feature. One click sends a branded prep link. Agency pays per activation. Zero marketing cost for Explain — the recruiter IS the distribution channel. The biggest volume driver in the model.' },
        { icon: '💷', stream: '② £1 Practice Packs', model: 'Consumer · Impulse engine', detail: 'Zero friction. The Spotify moment for interview prep. Upload a job spec, receive 20 personalised questions + model answers. 90% gross margin. Viral sharing before interviews — every user is a distribution channel.' },
        { icon: '💎', stream: '③ Premium Packs £5–10', model: 'Consumer · Sector-specific', detail: 'Industry-specific deep packs — Investment Banking, NHS clinical, FAANG, law, finance. Sector vocabulary, typical question banks, insider coaching notes. Higher willingness to pay for high-stakes roles.' },
        { icon: '📚', stream: '④ Learn Engine Subscriptions', model: 'Consumer · £9–19/month', detail: 'Unlimited access to the AI-powered Learn Engine. Any subject, any language, any depth. Generate structured lessons, save to personal bookshelf, track progress. Compound retention — candidates return between applications.' },
        { icon: '🤝', stream: '⑤ Recruiter Subscriptions', model: 'B2B · £49–199/month', detail: 'Individual recruiters. Unlimited prep link sends. Branded emails. Analytics dashboard. Candidate engagement tracking. Extremely sticky once embedded in workflow — switching cost is the placement relationship.' },
        { icon: '🏢', stream: '⑥ Company Packs & Employer Dashboards', model: 'B2B · £499–4,999', detail: 'Employers commission bespoke packs for specific roles or assessment centres. Includes employer dashboards, structured feedback modules, readiness analytics, interview recording viewer (roadmap), and multi-seat employer access. Pre-assessed candidates arrive ready. Wasted interview slots are eliminated. Per-role or annual contract.' },
        { icon: '🌍', stream: '⑦ Globalisation', model: 'Scale · 50+ languages', detail: 'The same platform, same model, every country. Marginal cost of a new language is near-zero — the architecture was built global from day one. Multi-language packs unlock every market simultaneously.' },
        { icon: '🏛️', stream: '⑧ Government & Institutional', model: 'B2G · £50K–500K/year', detail: 'Job centres, councils, employability programmes, return-to-work, refugee integration, prison-to-work, disability employment, veterans employment. Government buys outcomes — Explain delivers measurable ones. One DWP contract can exceed all other streams combined.', highlight: true },
      ].map(r => (
        <Card key={r.stream} accent={r.highlight ? '#22c55e' : undefined}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: r.highlight ? 'rgba(34,197,94,0.15)' : `${A}18`, border: `1px solid ${r.highlight ? 'rgba(34,197,94,0.35)' : `${A}30`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{r.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 2 }}>{r.stream}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: r.highlight ? '#22c55e' : A, marginBottom: 6 }}>{r.model}</div>
              <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>{r.detail}</div>
            </div>
          </div>
        </Card>
      ))}
    </Grid>
  </>,

  'pricing': () => <>
    <SectionHead
      label="Business Model · Pricing"
      h1="Simple pricing."
      h2="Every stakeholder served."
      sub="From £1 for a candidate with a job interview tomorrow to custom enterprise contracts. Each tier has a clear job to do."
    />
    <Grid cols={1} gap={16}>
      {[
        {
          tier: 'Candidate', price: '£1', period: 'per pack', color: '#22c55e',
          desc: 'No account required. Upload a job spec, receive a personalised pack, instant access. Zero friction by design.',
          includes: ['20 tailored interview questions', 'Model answers per question', 'Competency breakdown', 'Instant access — no login required'],
        },
        {
          tier: 'Recruiter Pro', price: '£99', period: '/month', color: A,
          desc: 'For individual recruiters who want to send candidates in better prepared — and track results.',
          includes: ['Unlimited Interview Prep email sends', 'Candidate prep analytics', 'Recruiter-branded emails', 'Priority pack generation'],
        },
        {
          tier: 'Agency Partnership', price: '£499', period: '/month', color: A2,
          desc: 'For recruitment agencies embedding Explain into their placement process at scale.',
          includes: ['5 recruiter seats', 'Agency white-label branding', 'Volume pack pricing (£3/pack)', 'Full analytics dashboard', 'Dedicated account manager'],
        },
        {
          tier: 'Enterprise / Company', price: 'Custom', period: '', color: '#f59e0b',
          desc: 'For employers who want to pre-assess candidates before final interviews and commission bespoke packs.',
          includes: ['Bespoke question frameworks', 'Candidate scoring dashboards', 'ATS integration (roadmap)', 'Custom SLA and support'],
        },
      ].map(t => (
        <Card key={t.tier} accent={t.color}>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.color, marginBottom: 6 }}>{t.tier}</div>
              <div>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{t.price}</span>
                {t.period && <span style={{ fontSize: 14, color: '#6060a0', marginLeft: 4 }}>{t.period}</span>}
              </div>
              <p style={{ fontSize: 12, color: '#606080', lineHeight: 1.6, margin: '10px 0 0' }}>{t.desc}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignContent: 'start' }}>
              {t.includes.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9090b0' }}>
                  <span style={{ color: t.color }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </Grid>
  </>,

  'economics': () => <>
    <SectionHead
      label="Business Model · Unit Economics"
      h1="Strong margins."
      h2="Improving with scale."
      sub="The fundamental economics of Explain are excellent. AI costs are low and falling. Marginal cost per new language is near-zero. Distribution through recruiters removes CAC entirely."
    />
    <Grid cols={3}>
      <Stat value="92%" label="Pack gross margin" sub="AI cost ~£0.08. Revenue £1–10." color="#22c55e" />
      <Stat value="£0" label="CAC via recruiter channel" sub="Recruiter email delivers the candidate" color={A2} />
      <Stat value="£17,964" label="Agency LTV" sub="£499/mo × 36 months" />
    </Grid>
    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Per Pack Economics</div>
        {[
          { label: 'Revenue',         value: '£1.00',  color: '#22c55e' },
          { label: 'AI generation',   value: '(£0.08)', color: '#ef4444' },
          { label: 'Infrastructure',  value: '(£0.02)', color: '#ef4444' },
          { label: 'Gross profit',    value: '£0.90',  color: '#22c55e' },
          { label: 'Gross margin',    value: '90%',    color: '#22c55e' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
            <span style={{ color: '#9090b0' }}>{r.label}</span>
            <span style={{ color: r.color, fontWeight: 700 }}>{r.value}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>Agency Economics</div>
        {[
          { label: 'Monthly subscription',        value: '£499' },
          { label: 'Annual subscription',         value: '£5,988' },
          { label: '3-year LTV',                  value: '£17,964' },
          { label: 'Avg packs funded per agency',  value: '40/mo' },
          { label: 'Pack revenue (£5 avg)',        value: '£200/mo' },
          { label: 'Total agency ARPU',            value: '£699/mo' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
            <span style={{ color: '#9090b0' }}>{r.label}</span>
            <span style={{ color: '#ddd', fontWeight: 700 }}>{r.value}</span>
          </div>
        ))}
      </Card>
    </Grid>
  </>,

  'market': () => <>
    <SectionHead
      label="Market · Market Opportunity"
      h1="$50 billion."
      h2="Unoccupied."
      sub="The global interview preparation market doesn't properly exist yet — because the right product hasn't existed. Explain is not entering a crowded market. It is creating one."
    />
    <Grid cols={3}>
      <Stat value="$761B" label="Global recruitment market" sub="2024 (Staffing Industry Analysts)" />
      <Stat value="$3.5B" label="Interview prep market today" sub="Growing 18% YoY — fragmented, generic" />
      <Stat value="$50B+" label="Addressable with PIR" sub="Every candidate. Every role. Every country." color={A2} />
    </Grid>
    <Grid cols={3}>
      <Stat value="1B+" label="Job applications/year (LinkedIn)" sub="Average 250 applicants per job post" color="#22c55e" />
      <Stat value="73%" label="Candidates feel underprepared" sub="LinkedIn Workforce Survey, 2024" color="#f59e0b" />
      <Stat value="£7B+" label="UK govt employability spend" sub="DWP, councils, ESF — annual" color="#22c55e" />
    </Grid>
    <Callout icon="📊" title="Why the TAM is real" body="Every year, hundreds of millions of people interview for jobs globally. 73% feel underprepared. The average candidate would pay £1–10 to walk in ready. At scale, even 1% of global interview volume at £3 average = £1.5B in annual revenue. Add government procurement — the UK alone spends £7B annually on employability — and this is not a niche. It is one of the largest untapped software markets in existence." />
    <Grid cols={1}>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {[
            { label: 'TAM', value: '$50B+', desc: 'Every person preparing for an interview anywhere in the world. Every role. Every level. 50+ languages.' },
            { label: 'SAM', value: '£5B',   desc: 'UK + major English-speaking markets (US, Canada, Australia, Ireland). Premium recruitment agency network.' },
            { label: 'SOM', value: '£50M',  desc: 'Realistic Year 4 revenue with 350+ agency partnerships and direct consumer scale. Proven category.' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center', padding: '20px 16px', background: `${A}06`, borderRadius: 12, border: `1px solid ${A}15` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 8 }}>{m.value}</div>
              <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </Grid>
  </>,

  'segments': () => <>
    <SectionHead
      label="Market · Target Segments"
      h1="Seven segments."
      h2="One platform."
      sub="Explain serves multiple overlapping markets — each with its own entry point, pricing model, and growth mechanic."
    />
    <Grid cols={2}>
      {[
        { icon: '🤝', seg: 'Recruitment Agencies', priority: 'Primary', body: 'The primary B2B customer. The recruiter email feature creates a direct, repeatable revenue relationship. Agencies pay per send or via subscription. Network effects compound — every placed candidate who experienced Explain becomes a future user.', arr: '£499/month', path: 'Direct sales + product-led growth' },
        { icon: '🧑‍💼', seg: 'Individual Candidates', priority: 'Consumer', body: 'Reached through recruiter email, organic search, and social. The £1 price point removes all deliberation. High frequency of use before significant interviews. Word of mouth is the primary growth mechanism — candidates who use Explain tell other candidates.', arr: '£1–10/pack', path: 'Word of mouth + SEO' },
        { icon: '🏢', seg: 'Enterprise HR Teams', priority: 'Pipeline', body: 'Companies that want to improve first-interview quality at scale. Commission bespoke question frameworks per department, integrate with ATS, access scoring dashboards. Contract value £2K–£20K/year.', arr: '£2K–£20K', path: 'Inbound + partnerships' },
        { icon: '🎓', seg: 'Universities & Career Services', priority: 'Growth', body: 'Universities want students to graduate employment-ready. Explain integrates with career services as a licensed platform. Students get access through their institution. High volume, low unit cost, exceptional brand building.', arr: '£5K–£25K/year', path: 'Partnership + licensing' },
        { icon: '🌐', seg: 'Job Boards & Platforms', priority: 'Scale', body: 'Global job boards (Indeed, Reed, Totaljobs) and HR platforms (Workday, SAP SuccessFactors) can embed Explain as a value-add. White-label licence model. Massive distribution at near-zero marginal cost.', arr: 'Revenue share', path: 'Platform partnerships' },
        { icon: '🌍', seg: 'International Markets', priority: 'Vision', body: 'The 50+ language architecture was built with global expansion in mind from day one. Philippines, Nigeria, India, Brazil — markets where English is a second language and interview prep is a competitive necessity. The product already works. The distribution is the work.', arr: 'Global pricing', path: 'Localised launch programme' },
        { icon: '🏢', seg: 'Employers & Hiring Managers', priority: 'Client', body: 'Clients benefit from the full Explain ecosystem. Structured candidate profiles, readiness analytics, practice scores, and interview preparation insights mean every candidate who walks through the door is known before the conversation starts. Interview recording (roadmap) and comparison tools take this further — dramatically improving interview quality and hiring decisions.', arr: '£2K–£20K/year', path: 'Inbound + recruiter referral' },
      ].map(s => (
        <Card key={s.seg}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{s.seg}</span>
              <span style={{ marginLeft: 8 }}><Tag>{s.priority}</Tag></span>
            </div>
          </div>
          <p style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65, margin: '0 0 12px' }}>{s.body}</p>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#8888a8' }}>
            <span><span style={{ color: A }}>ARR</span> {s.arr}</span>
            <span><span style={{ color: A }}>Path</span> {s.path}</span>
          </div>
        </Card>
      ))}
    </Grid>
  </>,

  'govt': () => <>
    <SectionHead
      label="Market · Government & Institutional"
      h1="National interview readiness"
      h2="infrastructure."
      sub="Governments, councils, job centres, and employability programmes deal with the most interview-anxious candidates in society. Explain.Global gives them exactly what they need — at scale, in any language, for any cohort."
    />

    {/* §1 Why Government Matters */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§1 — Why Government Matters</div>
    <Grid cols={2}>
      <Card style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
        <div style={{ fontSize: 13, color: '#c0c8e0', lineHeight: 1.85, marginBottom: 16 }}>
          Government programmes deal with the most interview-anxious candidates in society. These groups need <span style={{ color: '#22c55e', fontWeight: 700 }}>clarity, confidence, and structure</span> more than anyone.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            '🔴 Unemployed individuals',
            '🟠 People returning to work',
            '🟡 Young people entering work',
            '🟢 Refugees and migrants',
            '🔵 People with disabilities',
            '🟣 Veterans',
            '⚫ People leaving prison',
            '⚪ People recovering from illness',
          ].map(item => (
            <div key={item} style={{ fontSize: 12, color: '#9090b0', padding: '5px 0' }}>{item}</div>
          ))}
        </div>
      </Card>
      <div>
        <Grid cols={1} gap={12}>
          <Stat value="£7B+" label="UK employability spend / year" sub="DWP, councils, ESF-funded programmes" color="#22c55e" />
          <Stat value="2.5M" label="Universal Credit claimants" sub="Seeking work — primary target cohort" color={A} />
          <Stat value="£50K–£500K" label="Per contract value" sub="Council / programme / year" color={A2} />
        </Grid>
      </div>
    </Grid>

    {/* §2 The Institutional Problem */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16, marginTop: 8 }}>§2 — The Institutional Problem</div>
    <Grid cols={2}>
      {[
        { n: '1', title: 'Interview anxiety is extremely high', body: 'Candidates freeze, panic, or withdraw. There is no structured preparation at the point of interview.' },
        { n: '2', title: 'Preparation is inconsistent or non-existent', body: 'Job centres cannot provide personalised interview coaching at scale. The gap is structural and unfilled.' },
        { n: '3', title: 'Feedback is rare or unclear', body: 'Candidates often never hear why they failed. Without feedback, they repeat the same mistakes indefinitely.' },
        { n: '4', title: 'Recruiters and employers ghost candidates', body: 'This destroys confidence and motivation — and leaves government programmes unable to show outcome data.' },
        { n: '5', title: 'Government programmes lack digital tools', body: 'Most employability support is outdated, generic, and manual. The technology infrastructure has not kept pace.' },
        { n: '6', title: 'No personalised interview readiness exists today', body: 'Until Explain.Global. There is no platform combining personalisation, simulation, coaching, and scoring for this cohort.', highlight: true },
      ].map(p => (
        <Card key={p.n} accent={p.highlight ? '#22c55e' : undefined}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.highlight ? 'rgba(34,197,94,0.15)' : `${A}15`, border: `1px solid ${p.highlight ? 'rgba(34,197,94,0.4)' : `${A}30`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: p.highlight ? '#22c55e' : A, flexShrink: 0 }}>{p.n}</div>
            <div>
              <div style={{ fontWeight: 700, color: p.highlight ? '#22c55e' : '#fff', fontSize: 13, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>{p.body}</div>
            </div>
          </div>
        </Card>
      ))}
    </Grid>

    {/* §3 The Explain Solution */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16, marginTop: 8 }}>§3 — The Explain Solution</div>
    <Callout icon="🏛️" title="Explain.Global becomes the digital interview readiness layer for government" body="One platform. Every cohort. Every language. Every programme. Measurable outcomes at every level." color="#22c55e" />
    <Grid cols={3}>
      <Card accent="#22c55e">
        <div style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Government & Job Centres Get</div>
        {['Bulk access licences','Structured interview packs','Personalised coaching','Readiness scores & analytics','Learning modules','Multi-language support','Accessibility compliance','Placement tracking','Employer feedback tools'].map(i => (
          <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#9090b0', marginBottom: 6 }}>
            <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span> {i}
          </div>
        ))}
      </Card>
      <Card accent={A}>
        <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Candidates Get</div>
        {['Clarity','Confidence','Structure','Personalised guidance','Personalised questions','Personalised model answers','Real-time coaching','Personalised learning','Readiness scores'].map(i => (
          <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#9090b0', marginBottom: 6 }}>
            <span style={{ color: A, flexShrink: 0 }}>✓</span> {i}
          </div>
        ))}
      </Card>
      <Card accent={A2}>
        <div style={{ fontSize: 11, fontWeight: 800, color: A2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Employers Get</div>
        {['Better-prepared candidates','Higher interview pass rates','Clearer communication','Structured feedback tools','Pre-assessed candidate profiles','Outcome data for procurement'].map(i => (
          <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#9090b0', marginBottom: 6 }}>
            <span style={{ color: A2, flexShrink: 0 }}>✓</span> {i}
          </div>
        ))}
        <div style={{ marginTop: 16, padding: '10px 12px', background: `${A2}08`, border: `1px solid ${A2}20`, borderRadius: 8, fontSize: 11, color: A2, fontWeight: 700, textAlign: 'center' }}>
          This is national-scale interview readiness.
        </div>
      </Card>
    </Grid>

    {/* §4 Institutional Use Cases */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16, marginTop: 8 }}>§4 — Institutional Use Cases</div>
    <Grid cols={2}>
      {[
        { icon: '🏢', title: 'Job Centres', body: 'Offer Explain to every candidate preparing for interviews. DWP manages 900+ job centres. Universal Credit claimants are mandated to engage with employability activities — Explain is the ideal digital layer.' },
        { icon: '🏙️', title: 'Local Councils', body: 'Integrate Explain into employability programmes funded by DWP, UKSPF, or Levelling Up. Councils actively procure digital platforms that demonstrate employment outcomes. Explain outcome data is procurement gold.' },
        { icon: '🌐', title: 'National Employment Schemes', body: 'Roll out Explain across entire regions or countries. The architecture is built for scale — one contract can serve thousands of candidates simultaneously, with full analytics dashboards.' },
        { icon: '⚡', title: 'Youth Employment Initiatives', body: 'Support young people entering the workforce. NEET programmes, Youth Hubs, and Kickstart legacy schemes. Young people have the highest interview anxiety and the least interview experience.' },
        { icon: '🌍', title: 'Refugee Integration Programmes', body: 'Provide multi-language interview readiness. Home Office and UNHCR-funded programmes need candidates to navigate UK recruitment culture. 50+ languages makes Explain uniquely qualified.' },
        { icon: '🔒', title: 'Prison-to-Work Programmes', body: 'Help individuals re-enter the workforce with confidence. MoJ, HMPPS, and rehabilitation charities fund interview preparation as part of transition programmes. The social impact story is profound — and fundable.' },
        { icon: '♿', title: 'Disability Employment Support', body: 'Offer structured, accessible interview preparation. Web-based, device-agnostic, no install required. Explain works on any device and supports adjustable learning pacing for all users.' },
        { icon: '🎖️', title: 'Veterans Employment Support', body: 'Provide personalised coaching for career transitions. RFEA, Career Transition Partnership, and veterans employment charities fund this directly. Veterans have exceptional skills but often struggle with civilian interview structure.' },
      ].map(f => (
        <Card key={f.title}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 5 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65 }}>{f.body}</div>
            </div>
          </div>
        </Card>
      ))}
    </Grid>

    {/* §5 Revenue Model */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16, marginTop: 8 }}>§5 — Institutional Revenue Model</div>
    <div style={{ marginBottom: 8, fontSize: 14, color: '#9090b0', lineHeight: 1.7 }}>Government & institutional contracts generate revenue across six independent streams — making this one of Explain's largest long-term revenue engines.</div>
    <Grid cols={3}>
      {[
        { n: '①', label: 'Bulk Access Licences',      value: '£499–£4,999',    sub: 'Per programme', color: A },
        { n: '②', label: 'Annual Council Contracts',   value: '£10K–£50K',      sub: 'Per council / year', color: A2 },
        { n: '③', label: 'Regional/National Contracts',value: '£100K+',         sub: 'Per region', color: '#22c55e' },
        { n: '④', label: 'Learn Engine Subscriptions', value: '£9–£19/month',   sub: 'Per candidate', color: A },
        { n: '⑤', label: 'Premium Packs',              value: '£5–£10',         sub: 'Per candidate', color: A2 },
        { n: '⑥', label: 'Multi-language Packs',       value: 'Global revenue', sub: 'Expansion engine', color: '#22c55e' },
      ].map(r => (
        <Card key={r.n} accent={r.color}>
          <div style={{ fontSize: 11, fontWeight: 900, color: r.color, marginBottom: 4 }}>{r.n} {r.label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>{r.value}</div>
          <div style={{ fontSize: 13, color: '#8888a8' }}>{r.sub}</div>
        </Card>
      ))}
    </Grid>

    {/* §6 Why Government Will Adopt */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16, marginTop: 8 }}>§6 — Why Government Will Adopt Explain</div>
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          '✔ It reduces unemployment',
          '✔ It increases interview success',
          '✔ It improves candidate confidence',
          '✔ It provides measurable outcomes',
          '✔ It is low-cost and high-impact',
          '✔ It is scalable and digital',
          '✔ It supports vulnerable groups',
          '✔ It aligns with government priorities',
          '✔ It is easy to deploy',
          '✔ It is personalised and modern',
        ].map(item => (
          <div key={item} style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, padding: '6px 0', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>{item}</div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#22c55e', textAlign: 'center' }}>
        Explain.Global becomes infrastructure — not just a product.
      </div>
    </Card>

    {/* §7 Social Impact Statement */}
    <Card style={{ background: `linear-gradient(135deg, ${A}08, ${A2}08)`, border: `1px solid ${A}20`, textAlign: 'center', padding: '32px 28px', marginBottom: 32 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>§7 — Social Impact Statement</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.5, marginBottom: 16, letterSpacing: '-0.02em' }}>
        "Explain.Global is built to give every person — regardless of background, circumstance, or challenge — the clarity and confidence to succeed in interviews."
      </div>
      <div style={{ fontSize: 14, color: '#9090b0' }}>This is the heart of the mission.</div>
    </Card>

    {/* §8 The Displaced Worker Dataset */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>§8 — The Displaced Worker Dataset: A Strategic Asset</div>
    <Card style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.18)', marginBottom: 24 }}>
      <div style={{ fontSize: 14, color: '#c0d0c0', lineHeight: 1.8, marginBottom: 20 }}>
        If Explain.Global secures contracts with job centres and local government, it will accumulate something no private platform has ever captured at scale: <span style={{ color: '#22c55e', fontWeight: 700 }}>outcome-correlated readiness data for people returning to work after life-altering events.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          'Long-term illness — including dialysis, cancer, chronic conditions',
          'Caring responsibilities — returning after years out of the workforce',
          'Disability — navigating hiring processes not designed for them',
          'Redundancy — often after decades of unbroken employment',
          'Bereavement — loss that forced a complete career reset',
          'Mental health — returning with rebuilt confidence, no track record',
          'Long-term unemployment — skills intact, confidence destroyed',
          'Prison rehabilitation — re-entry with exceptional motivation and no pathway',
        ].map(item => (
          <div key={item} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(34,197,94,0.07)', fontSize: 12 }}>
            <span style={{ color: '#22c55e', flexShrink: 0 }}>→</span>
            <span style={{ color: '#8090a0' }}>{item}</span>
          </div>
        ))}
      </div>
    </Card>

    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, color: A, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>What the Data Captures</div>
        {[
          'Preparation type vs. interview outcome — what actually works',
          'Time-to-readiness by circumstance and starting point',
          'Which employers and sectors are genuinely accessible',
          'What preparation barriers exist for each population group',
          'Government spend effectiveness — cost per successful placement',
          'Question prediction accuracy over time — real-world validation',
          'Ghosting patterns — when, why, and for whom they occur',
          'Work-Life Balance indicators — burnout risk pre- and post-placement',
        ].map(item => (
          <div key={item} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
            <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
            <span style={{ color: '#8080a0' }}>{item}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Why This Dataset is Irreplaceable</div>
        <Feature icon="🛡️" title="No competitor can replicate it" body="Private platforms will never have access to this population at this scale. Government trust is earned, not bought — and Explain is building it now." />
        <Feature icon="📊" title="Government has never had this data" body="Billions spent on employability annually with almost no outcome data. Explain closes the loop for the first time — preparation inputs mapped to real employment outcomes." />
        <Feature icon="💰" title="The data itself has commercial value" body="Anonymised, aggregated, ethically governed — this dataset is valuable to researchers, policy makers, insurers, and training providers worldwide." />
        <Feature icon="🔒" title="Patentable as a system" body="The outcome-correlated employability intelligence pipeline — capturing preparation data, interview outcome, and post-placement signals — is a distinct patentable claim." />
      </Card>
    </Grid>

    {/* §9 Work-Life Balance Coaching */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16, marginTop: 8 }}>§9 — Work-Life Balance Coaching: The Human Layer</div>
    <Card style={{ background: `linear-gradient(135deg, ${A2}06, rgba(34,197,94,0.04))`, border: `1px solid ${A2}20`, marginBottom: 24 }}>
      <div style={{ fontSize: 14, color: '#c0c0e0', lineHeight: 1.8, marginBottom: 16 }}>
        The data Explain captures will reveal a pattern governments and employers have never been able to quantify: <span style={{ color: A2, fontWeight: 700 }}>many people are not out of work because of skill gaps — they are out of work because life broke first.</span>
      </div>
      <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.75 }}>
        Burnout from working 17-hour days. A health crisis that forced a stop. A caring responsibility that took everything. These are not CV gaps — they are human stories. Cockpit's Work-Life Balance coaching module is built to meet people at this level: not with a tick-box assessment, but with a genuine, personalised framework for rebuilding a sustainable career on their own terms.
      </div>
    </Card>
    <Grid cols={3}>
      {[
        { icon: '⚖️', title: 'Burnout Prevention', body: 'Coaching built on real outcome data — identifying the patterns that led to displacement and building safeguards against repetition.', color: A2 },
        { icon: '🔄', title: 'Re-entry Confidence', body: 'Structured coaching for people returning after long absence — addressing the specific confidence and identity challenges of career re-entry.', color: A },
        { icon: '🗺️', title: 'Life Map Integration', body: 'The Skills Map extends into the Life Map — health, finance, relationships, work, learning — giving a complete picture of where support is needed.', color: '#22c55e' },
      ].map(f => <Card key={f.title} accent={f.color}><Feature icon={f.icon} title={f.title} body={f.body} /></Card>)}
    </Grid>
  </>,

  'edge': () => <>
    <SectionHead
      label="Market · Competitive Edge"
      h1="No direct competitor."
      h2="We are the category."
      sub="Every adjacent player solves a fragment of the problem. Explain is the first platform to combine personalisation, simulation, coaching, scoring, and recruiter integration — at £1."
    />
    <Grid cols={1}>
      <Card>
        <div className="inv-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
            <thead>
              <tr>
                {['Capability', 'Explain.Global', 'LinkedIn Learning', 'Interviewing.io', 'Pramp', 'ChatGPT'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: i === 1 ? A : '#404060', borderBottom: '1px solid rgba(255,255,255,0.08)', background: i === 1 ? `${A}08` : 'transparent' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Job-spec personalisation', '✅', '❌', '⚠️', '❌', '⚠️'],
                ['CV personalisation', '✅', '❌', '❌', '❌', '⚠️'],
                ['Live AI simulation', '✅', '❌', '✅', '✅', '⚠️'],
                ['Real-time coaching', '✅', '❌', '❌', '❌', '❌'],
                ['Answer scoring', '✅', '❌', '✅', '⚠️', '❌'],
                ['Recruiter integration', '✅', '❌', '❌', '❌', '❌'],
                ['£1 entry point', '✅', '❌', '❌', '✅', '✅'],
                ['50+ languages', '✅', '⚠️', '❌', '❌', '✅'],
                ['Learn Engine', '✅', '✅', '❌', '❌', '⚠️'],
                ['Category creation', '✅', '❌', '❌', '❌', '❌'],
              ].map(([cap, ...vals]) => (
                <tr key={cap}>
                  <td style={{ padding: '9px 14px', color: '#9090b0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{cap}</td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 15, borderBottom: '1px solid rgba(255,255,255,0.04)', background: i === 0 ? `${A}05` : 'transparent' }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Grid>
    <Grid cols={3} gap={12}>
      {[
        { label: 'Defensible Moat', body: 'Recruiter network effects. Once an agency embeds Explain in their workflow, switching cost is extremely high.' },
        { label: 'Category Creation', body: 'PIR does not yet have a named category. The first to name it, owns it. Explain names it.' },
        { label: 'Globalisation Architecture', body: '50+ languages from day one. Competitors built English-first and retro-fit localisation. We built global.' },
      ].map(m => <Card key={m.label}><div style={{ fontWeight: 700, color: A, fontSize: 13, marginBottom: 6 }}>{m.label}</div><div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65 }}>{m.body}</div></Card>)}
    </Grid>
  </>,

  'live': () => <>
    <SectionHead
      label="Traction · What's Live Today"
      h1="Built. Deployed."
      h2="Working in production."
      sub="This is not a prototype. The core platform is live at Explain.Global. Real users have registered. The API is running. The Interview Chair is in beta."
    />
    <SuccessCounter />
    <Grid cols={2}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 12 }}>Live Now</div>
        {['Explain.Global — global hub', 'Candidate registration & login (JWT auth)', 'Azure SQL — RBAC & user management', 'Learn Engine v1 — any subject, any language', 'Interview Chair (beta) — Sarah + James personas', 'Whisper STT pipeline — real-time transcription', 'Coaching overlay v1 — live guidance', 'Interview Packs v1 — job spec → questions', 'Flow Viewer — candidate timeline', 'Product marketing site (product.explain.global)', 'Recruiter portal (early build)', 'Client Portal v1 — employer dashboard', 'Structured feedback module v1', 'Candidate readiness score viewer'].map(i => <StatusRow key={i} label={i} status="live" />)}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 12 }}>In Progress</div>
        {['Recruiter email feature — send prep link', 'Agency white-label branding', 'Candidate scoring dashboard v2', 'Pack generation from CV + job spec fusion'].map(i => <StatusRow key={i} label={i} status="progress" />)}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6060a0', marginBottom: 12, marginTop: 20 }}>Planned</div>
        {['Company Portal — enterprise hiring intelligence', 'Multi-language pack generation', 'Magic link (passwordless auth)', 'ATS integration layer', 'Business Plan Pitch interview type 🎯'].map(i => <StatusRow key={i} label={i} status="planned" />)}
      </div>
    </Grid>
  </>,

  'roadmap': () => <>
    <SectionHead
      label="Traction · Roadmap"
      h1="Built in phases."
      h2="The full picture is already designed."
      sub="Each phase delivers standalone value and unlocks the next. The roadmap is not aspirational — it follows directly from what is already live."
    />
    <Grid cols={1} gap={14}>
      {[
        { phase: 'Phase 1', period: 'Complete ✅', title: 'Core Platform', color: '#22c55e', items: ['Explain.Global hub', 'Candidate auth (JWT, RBAC)', 'Learn Engine', 'Interview Chair beta', 'Interview Packs v1'] },
        { phase: 'Phase 2', period: 'Q3 2026 🔄', title: 'Recruiter Email + Agency Revenue', color: A, items: ['Recruiter email (1-click send)', 'Agency subscription tier', 'Candidate prep analytics', 'White-label branding'] },
        { phase: 'Phase 3', period: 'Q4 2026', title: 'Agency Partnerships at Scale', color: A2, items: ['10 agencies signed', 'Pack fusion (CV + job spec)', 'Recruiter portal v2', 'Scoring engine v2'] },
        { phase: 'Phase 4', period: 'Q1 2027', title: 'Client & Employer Portal', color: '#f59e0b', items: ['Employer interview recording viewer', 'Candidate comparison tools', 'Structured feedback templates', 'Readiness analytics dashboard', 'Multi-seat employer access', 'ATS integration (beta)'] },
        { phase: 'Phase 5', period: 'Q2–Q3 2027', title: 'Global Scale', color: '#4ade80', items: ['Multi-language pack generation', 'International agency programme', '10 target markets launched', 'University partnerships'] },
        { phase: 'Phase 6', period: '2028', title: 'Explain AI + P1 Ecosystem', color: '#c084fc', items: ['Full AI coaching v2', 'Percentile.One integration', 'TalkToLearn mobile', 'Category leadership established'] },
      ].map(p => (
        <Card key={p.phase} accent={p.color}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.color, marginBottom: 4 }}>{p.phase}</div>
              <div style={{ fontSize: 14, color: '#8888a8', marginBottom: 8 }}>{p.period}</div>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 14, lineHeight: 1.3 }}>{p.title}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, alignContent: 'start' }}>
              {p.items.map(i => (
                <div key={i} style={{ fontSize: 12, color: '#8080a0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: p.color, fontSize: 10 }}>◆</span> {i}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </Grid>
  </>,

  'projections': (nav) => <ProjectionsSection nav={nav} />,

  'ask': () => <>
    <SectionHead
      label="Financials · The Investment Ask"
      h1="£20,000."
      h2="The perfect early-stage ask."
      sub="We are seeking a £20,000 early-stage investment to accelerate Explain.Global into its first commercial phase. Small enough for early investors. Large enough to unlock meaningful progress."
    />

    {/* §1 Overview */}
    <Callout icon="🚀" title="What this investment unlocks" body="Product stability · Recruiter onboarding · Agency pilots · Patent protection · Marketing reach · Founder hardware · Operational runway. Every critical area covered." color="#22c55e" />

    {/* §2 Investment Breakdown */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§2 — Investment Breakdown</div>
    <Grid cols={2}>
      {[
        {
          icon: '💻', amount: '£5,000', title: 'MacBook Pro',
          body: 'High-performance hardware required for development, AI integration, video processing, and multi-product architecture. Ensures stability, speed, and reliability during the build-out of Explain, P1, Cockpit, Recruiter Portal, Candidate Portal, and Learn Engine.',
          color: A,
        },
        {
          icon: '⚖️', amount: '£5,000', title: 'Patent Protection',
          body: 'Covers legal fees for protecting the technical processes behind Explain\'s personalised interview readiness system — pack generation, fusion algorithms, coaching overlays, and simulation workflows. Establishes defensibility and strengthens investor confidence.',
          color: A2,
        },
        {
          icon: '📣', amount: '£5,000', title: 'Marketing & Launch',
          body: 'Funds initial campaigns targeting recruiters, agencies, job centres, and employability programmes. Includes video production, landing pages, LinkedIn ads, and outreach. Every campaign directly tied to agency onboarding or government pilot preparation.',
          color: '#22c55e',
        },
        {
          icon: '⚡', amount: '£5,000', title: 'Operations & Other',
          body: 'Covers essential early-stage costs: hosting, domain expansion, globalisation prep, legal, admin, and contingency. Ensures smooth delivery during the first commercial rollout with zero single points of failure.',
          color: '#f59e0b',
        },
      ].map(c => (
        <Card key={c.title} accent={c.color}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: c.color, letterSpacing: '-0.02em' }}>{c.amount}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.title}</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65, margin: 0 }}>{c.body}</p>
        </Card>
      ))}
    </Grid>

    {/* §3 Why £20K */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§3 — Why £20,000 Is the Perfect Early-Stage Ask</div>
    <Card style={{ marginBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          'Small enough for early investors',
          'Large enough to unlock meaningful progress',
          'Covers all critical areas',
          'Creates immediate commercial traction',
          'Prepares for agency pilots at Vallum & beyond',
          'Prepares for government & job centre pilots',
          'Enables full recruiter onboarding infrastructure',
          'Prepares for patent protection filing',
          'Funds marketing launch campaigns',
          'Minimum viable investment: prototype → commercial product',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#9090b0', padding: '6px 0' }}>
            <span style={{ color: '#22c55e', marginTop: 1, flexShrink: 0 }}>✓</span> {item}
          </div>
        ))}
      </div>
    </Card>

    {/* §4 What It Unlocks — Timeline */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§4 — What This Investment Unlocks</div>
    <Grid cols={3}>
      {[
        {
          period: 'Month 1–2', color: A,
          items: ['Recruiter Portal complete','Candidate Portal polished','Interview Chair stable','Learn Engine v1 ready','Magic Button refined','Investor Portal live','Vallum pilot launched'],
        },
        {
          period: 'Month 3–4', color: A2,
          items: ['Agency onboarding begins','Job centre outreach','Government pilot proposals','Marketing campaigns live','Patent filing initiated','Globalisation prep'],
        },
        {
          period: 'Month 5–6', color: '#22c55e',
          items: ['Multi-agency adoption','Institutional partnerships','Subscription growth','Premium pack rollout','Company packs','Enterprise demos'],
        },
      ].map(p => (
        <Card key={p.period} accent={p.color}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.color, marginBottom: 14 }}>{p.period}</div>
          {p.items.map(i => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#9090b0', marginBottom: 6 }}>
              <span style={{ color: p.color, flexShrink: 0 }}>◆</span> {i}
            </div>
          ))}
        </Card>
      ))}
    </Grid>

    {/* §5 Revenue Streams */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§5 — Investor Return Potential</div>
    <Card style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 14, color: '#a0a0c0', lineHeight: 1.7, marginBottom: 16 }}>
        This investment accelerates <span style={{ color: '#fff', fontWeight: 700 }}>all 8 revenue streams simultaneously</span>:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          {n:'①',label:'Recruiter-triggered prep links',model:'B2B2C · £5–10 per activation'},
          {n:'②',label:'£1 Practice Packs',model:'Consumer · Impulse engine'},
          {n:'③',label:'Premium Packs £5–10',model:'Consumer · Sector-specific'},
          {n:'④',label:'Learn Engine Subscriptions',model:'Consumer · £9–19/month'},
          {n:'⑤',label:'Recruiter Subscriptions',model:'B2B · £49–199/month'},
          {n:'⑥',label:'Company Packs',model:'B2B · £499–4,999'},
          {n:'⑦',label:'Globalisation',model:'Scale · 50+ languages'},
          {n:'⑧',label:'Government & Institutional',model:'B2G · £50K–500K/year'},
        ].map(r => (
          <div key={r.n} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(79,142,247,0.08)' }}>
            <span style={{ fontWeight: 900, color: A, fontSize: 14, flexShrink: 0 }}>{r.n}</span>
            <div>
              <div style={{ fontSize: 12, color: '#ddd', fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 10, color: '#505070' }}>{r.model}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* §6 Why Now */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>§6 — Why Now</div>
    <Grid cols={2}>
      <Card>
        {[
          {icon:'🤝',label:'Vallum is ready to pilot',body:'Agency relationship is established. Vallum has seen the product. Their board meeting is imminent.'},
          {icon:'⚡',label:'Product is nearly complete',body:'The core platform is live. The final mile — recruiter email + agency onboarding — is the only gap.'},
          {icon:'🌍',label:'Category is new',body:'No one has named Personalised Interview Readiness yet. First to name it, owns it.'},
          {icon:'📈',label:'Market is primed',body:'73% of candidates feel underprepared. Job centres need this. Agencies need this. Timing is perfect.'},
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: '#ddd', fontWeight: 700 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: '#6060a0', marginTop: 2 }}>{r.body}</div>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        {/* §7 Founder Commitment */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 14 }}>§7 — Founder Commitment</div>
        <div style={{ fontStyle: 'italic', fontSize: 14, color: '#c0c8e0', lineHeight: 1.85, borderLeft: `3px solid ${A}`, paddingLeft: 16, marginBottom: 16 }}>
          "I am fully committed to building Explain.Global into the world's first Personalised Interview Readiness platform. This investment accelerates the next 6 months of development, onboarding, and commercial rollout."
        </div>
        <div style={{ fontSize: 12, color: A, fontWeight: 700 }}>— Francis Cobbinah, Founder</div>
        <div style={{ fontSize: 10, color: '#404060', marginTop: 2 }}>Explain.Global · Percentile.One</div>
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(79,142,247,0.05)', border: `1px solid ${A}20`, borderRadius: 10, fontSize: 11, color: '#8080a0', lineHeight: 1.6 }}>
          Building from dialysis. Not as a limitation — as a demonstration of what genuine commitment looks like. This platform exists because one person refused to stop.
        </div>
      </Card>
    </Grid>

    {/* §8 CTA */}
    <div style={{ textAlign: 'center', padding: '32px 0 8px' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>Ready to back the future of interview readiness?</div>
      <p style={{ fontSize: 14, color: '#6060a0', marginBottom: 28 }}>Contact Francis directly to discuss terms.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <a href="mailto:francis@explain.global" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${A}, ${A2})`, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, boxShadow: `0 8px 32px ${A}40` }}>
          francis@explain.global →
        </a>
        <a href="tel:+447346814898" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#c0c0e0', textDecoration: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)' }}>
          +44 7346 814898
        </a>
      </div>
    </div>
  </>,

  'founder': () => <>
    <SectionHead
      label="Founder · Francis Cobbinah"
      h1="A mission born from"
      h2="lived experience."
      sub="Francis Cobbinah built Explain.Global because he has lived the problem — felt the anxiety, seen the ghosting, and watched brilliant people fail interviews they should have won. This platform is the answer he wished existed."
    />

    {/* §1 The Beginning */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§1 — The Beginning</div>
    <Grid cols={2}>
      <Card style={{ background: `${A}05`, border: `1px solid ${A}18` }}>
        <div style={{ fontSize: 14, color: '#c0c8e0', lineHeight: 1.85, marginBottom: 16 }}>
          Francis grew up seeing people struggle with interviews — not because they lacked ability, but because they lacked <span style={{ color: A, fontWeight: 700 }}>clarity, confidence, and support.</span>
        </div>
        <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.8, marginBottom: 4 }}>He saw talented people fail interviews simply because:</div>
        {[
          "they didn't know what to say",
          "they didn't know how to structure answers",
          "they didn't understand what recruiters wanted",
          "they didn't receive feedback",
          "they were ghosted after interviews",
          "they were left confused and anxious",
        ].map(item => (
          <div key={item} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#9090b0', marginBottom: 6 }}>
            <span style={{ color: '#ef4444', flexShrink: 0 }}>✗</span> {item}
          </div>
        ))}
        <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: A }}>
          This frustration planted the seed for Explain.Global.
        </div>
      </Card>
      <Card style={{ background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.15)' }}>
        <div style={{ fontStyle: 'italic', fontSize: 14, color: '#c0c8e0', lineHeight: 1.9, marginBottom: 16, borderLeft: `3px solid ${A}`, paddingLeft: 18 }}>
          "I built Explain because I have sat in interview rooms and watched people who were brilliant — genuinely brilliant — walk out looking broken. Not because they were not good enough. Because they had never actually practised. Not once. Not properly. The first time they sat in the chair was the real interview. That ends now."
        </div>
        <div style={{ fontSize: 12, color: A, fontWeight: 700 }}>— Francis Cobbinah, Founder · Explain.Global</div>
      </Card>
    </Grid>

    {/* §2 Dialysis & Determination */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16, marginTop: 8 }}>§2 — Dialysis & Determination</div>
    <Grid cols={2}>
      <Card accent={A2}>
        <div style={{ fontSize: 13, color: '#c0c8e0', lineHeight: 1.85, marginBottom: 16 }}>
          Francis spent years on dialysis — fighting through exhaustion, pain, and uncertainty — yet still <span style={{ color: A2, fontWeight: 700 }}>building, learning, and dreaming.</span>
        </div>
        <div style={{ fontSize: 14, color: '#9090b0', marginBottom: 10 }}>Dialysis teaches you:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['Patience','Resilience','Discipline','Clarity','Perspective','Empathy','The value of helping others','What anxiety feels like'].map(item => (
            <div key={item} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#9090b0', marginBottom: 4 }}>
              <span style={{ color: A2, flexShrink: 0 }}>◆</span> {item}
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ background: `${A2}06`, border: `1px solid ${A2}20` }}>
        <div style={{ fontSize: 14, color: '#9090b0', marginBottom: 14 }}>Explain.Global is built from that experience.</div>
        {[
          { label: 'Built to reduce anxiety', color: '#22c55e' },
          { label: 'Built to give clarity', color: A },
          { label: 'Built to help people succeed', color: A2 },
          { label: 'Built to make interviews fairer', color: '#22c55e' },
          { label: 'Built to give people a chance', color: A },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: '12px 14px', background: `${A2}08`, border: `1px solid ${A2}25`, borderRadius: 10, fontSize: 12, color: A2, fontWeight: 700, textAlign: 'center' }}>
          Building from dialysis — not as a limitation, but as a demonstration of what genuine commitment looks like.
        </div>
      </Card>
    </Grid>

    {/* §3 The Ghosting Problem */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 16, marginTop: 8 }}>§3 — The Ghosting Problem</div>
    <Card style={{ border: '1px solid rgba(239,68,68,0.2)', marginBottom: 24 }}>
      <div className="inv-2col">
        <div>
          <div style={{ fontSize: 13, color: '#c0c8e0', lineHeight: 1.85, marginBottom: 16 }}>
            Francis experienced the same thing millions of candidates experience: <span style={{ color: '#ef4444', fontWeight: 700 }}>recruiters ghosting candidates after interviews.</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            {['No feedback.','No explanation.','No guidance.','No clarity.','Just silence.'].map(line => (
              <div key={line} style={{ fontSize: 14, color: '#9090b0', fontWeight: 600, marginBottom: 4 }}>{line}</div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, lineHeight: 1.8 }}>
            This destroys confidence. This destroys motivation. This destroys hope.
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Explain.Global fixes this.</div>
          {[
            { who: 'Recruiters', action: 'can now send structured feedback' },
            { who: 'Candidates', action: 'can understand what went wrong' },
            { who: 'Agencies',   action: 'can improve placement rates' },
            { who: 'Employers',  action: 'can improve interview quality' },
          ].map(r => (
            <div key={r.who} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
              <span style={{ color: '#22c55e', fontWeight: 700, minWidth: 80 }}>{r.who}</span>
              <span style={{ color: '#9090b0' }}>{r.action}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 14, color: '#9090b0', fontStyle: 'italic', lineHeight: 1.7 }}>
            This is one of the most important parts of the mission — and one of the most defensible parts of the product.
          </div>
        </div>
      </div>
    </Card>

    {/* §3b Employer Frustrations */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 16, marginTop: 8 }}>§3b — What the Platform Fixes for Employers</div>
    <Card style={{ border: '1px solid rgba(245,158,11,0.2)', marginBottom: 24 }}>
      <div style={{ fontSize: 13, color: '#c0c8e0', lineHeight: 1.75, marginBottom: 18 }}>
        The problem is not one-sided. Employers feel it too — in wasted time, poor candidates, and broken feedback loops.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {[
          { pain: 'Unprepared candidates', fix: 'Readiness scores arrive before interview' },
          { pain: 'Unclear interview performance', fix: 'Structured scoring per competency' },
          { pain: 'No structured feedback tools', fix: 'One-click structured feedback submission' },
          { pain: 'Wasted interview slots', fix: 'Practice scores filter out candidates early' },
          { pain: 'Recruiter ghosting loops', fix: 'Clients can submit feedback directly' },
          { pain: 'Lack of candidate clarity', fix: 'Full candidate profile with prep history' },
          { pain: 'No readiness analytics', fix: 'Readiness analytics dashboard' },
          { pain: 'No interview recordings', fix: 'Interview recording viewer (roadmap)' },
        ].map(item => (
          <div key={item.pain} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#ef4444', display: 'flex', gap: 6 }}>
              <span>✗</span> <span>{item.pain}</span>
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', gap: 6 }}>
              <span>✓</span> <span>{item.fix}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 13, color: '#f59e0b', fontWeight: 700, textAlign: 'center' }}>
        Explain.Global serves all sides of the hiring relationship — not just the candidate.
      </div>
    </Card>

    {/* §4 The Vision */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>§4 — The Vision</div>
    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
          Interview clarity should not be a privilege. It should be accessible to everyone.
        </div>
        <div style={{ fontSize: 14, color: '#9090b0', marginBottom: 12 }}>Explain.Global is built to:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            {label:'Reduce anxiety',color:'#22c55e'},
            {label:'Increase confidence',color:A},
            {label:'Increase clarity',color:A2},
            {label:'Increase fairness',color:'#22c55e'},
            {label:'Increase opportunity',color:A},
            {label:'Increase success',color:A2},
            {label:'Increase social mobility',color:'#22c55e'},
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 6, fontSize: 12, color: item.color, fontWeight: 600, alignItems: 'center' }}>
              <span style={{ fontSize: 8 }}>◆</span> {item.label}
            </div>
          ))}
        </div>
      </Card>
      {/* §5 The Promise */}
      <Card style={{ background: `linear-gradient(135deg, ${A}08, ${A2}08)`, border: `1px solid ${A}20` }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 14 }}>§5 — The Founder's Promise</div>
        <div style={{ fontStyle: 'italic', fontSize: 13, color: '#c0c8e0', lineHeight: 1.9, marginBottom: 16, borderLeft: `3px solid ${A2}`, paddingLeft: 16 }}>
          "I am building Explain.Global to help people succeed — not just in interviews, but in life.<br /><br />
          No one should fail because they did not know what to say. No one should be left anxious and confused. No one should be ghosted without feedback.<br /><br />
          Everyone deserves clarity. Everyone deserves confidence. Everyone deserves a chance."
        </div>
        <div style={{ fontSize: 12, color: A2, fontWeight: 700 }}>— Francis Cobbinah</div>
        <div style={{ fontSize: 10, color: '#404060', marginTop: 2 }}>Founder · Explain.Global · Percentile.One</div>
      </Card>
    </Grid>

    {/* §6 Why This Matters to Investors */}
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16, marginTop: 8 }}>§6 — Why This Matters to Investors</div>
    <Card style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, color: '#a0a0c0', lineHeight: 1.7, marginBottom: 20 }}>
        Investors do not just invest in products. They invest in founders with:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          {icon:'💪',label:'Resilience',color:A},
          {icon:'🎯',label:'Mission',color:'#22c55e'},
          {icon:'💡',label:'Clarity',color:A2},
          {icon:'❤️',label:'Empathy',color:'#ef4444'},
          {icon:'🌍',label:'Vision',color:A},
          {icon:'🔥',label:'Determination',color:'#f59e0b'},
          {icon:'🏥',label:'Lived experience',color:A2},
          {icon:'⭐',label:'Purpose',color:'#22c55e'},
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center', padding: '16px 8px', background: `${item.color}08`, border: `1px solid ${item.color}20`, borderRadius: 10 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          {label:'Your story is powerful.',color:A},
          {label:'Your mission is real.',color:'#22c55e'},
          {label:'Your product is inevitable.',color:A2},
        ].map(s => (
          <div key={s.label} style={{ padding: '12px 14px', background: `${s.color}08`, border: `1px solid ${s.color}25`, borderRadius: 10, fontSize: 13, fontWeight: 800, color: s.color, textAlign: 'center' }}>{s.label}</div>
        ))}
      </div>
    </Card>

    {/* §7 Closing Statement */}
    <Card style={{ background: `linear-gradient(135deg, rgba(79,142,247,0.08), rgba(123,92,245,0.08))`, border: `1px solid ${A}25`, textAlign: 'center', padding: '40px 32px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A2, marginBottom: 20 }}>§7 — Closing Statement</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e0e0f0', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 24px' }}>
        Explain.Global is not just a platform. It is the result of a founder who has lived the problem, felt the anxiety, and built the solution the world needs.
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="mailto:francis@explain.global" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${A}, ${A2})`, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, boxShadow: `0 8px 32px ${A}40` }}>
          francis@explain.global →
        </a>
        <a href="tel:+447346814898" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#c0c0e0', textDecoration: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)' }}>
          +44 7346 814898
        </a>
      </div>
    </Card>
  </>,

  // ── Career Tools ─────────────────────────────────────────────────────────────
  'career-tools': () => <>
    <SectionHead
      label="Product · Career Tools"
      h1="Beyond the interview."
      h2="A career engine for life."
      sub="Explain's Career Finder takes the same competency intelligence that powers interview preparation and turns it outward — mapping candidates to roles, pathways, and learning modules they had never considered."
    />

    <Callout icon="🧭" title="The Career Finder Engine" color={A}
      body="Most candidates know the job they applied for. Few know the full range of roles their skills actually qualify them for. Career Finder changes that — surfacing pathways, lateral moves, and stretch roles based on real competency data, not keyword matching." />

    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 18 }}>How Career Finder Works</div>
        {[
          ['📋', 'CV Upload', 'Candidate uploads or pastes their CV — structured competency extraction runs automatically.'],
          ['🔍', 'Competency Mapping', 'Skills, experience, and gaps are mapped against a live competency framework.'],
          ['🎯', 'Role Matching', 'Roles are ranked by fit score — including roles the candidate had not considered.'],
          ['📈', 'Gap Analysis', 'For each suggested role, a clear gap report shows what is missing and how to close it.'],
          ['📚', 'Learning Modules', 'Auto-assigned Learn Engine modules target the exact gaps identified.'],
          ['🔁', 'Continuous Update', 'As candidates complete sessions and packs, their career profile updates in real time.'],
        ].map(([icon, title, body]) => (
          <Feature key={title as string} icon={icon as string} title={title as string} body={body as string} />
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 18 }}>Career Pathways Explained</div>
        {[
          { from: 'Customer Service Manager', to: ['Account Manager', 'Operations Lead', 'L&D Coordinator'], fit: 87 },
          { from: 'Junior Software Engineer', to: ['DevOps Engineer', 'QA Lead', 'Technical PM'], fit: 91 },
          { from: 'Marketing Executive', to: ['Growth Manager', 'Product Analyst', 'Brand Strategist'], fit: 79 },
        ].map(p => (
          <div key={p.from} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 14, color: '#9090b0', marginBottom: 6 }}>Starting from: <span style={{ color: '#ccc', fontWeight: 700 }}>{p.from}</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {p.to.map(r => <Tag key={r} color={A2}>{r}</Tag>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${p.fit}%`, background: `linear-gradient(90deg, ${A2}, ${A})`, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{p.fit}% fit</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: '#404060', fontStyle: 'italic', marginTop: 8 }}>Pathways generated from real competency data — not guesswork.</div>
      </Card>
    </Grid>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>Why Career Tools Expand the Business</div>
    <Grid cols={3}>
      {[
        { icon: '💷', title: 'New Revenue Layer', body: 'Career Finder unlocks a subscription tier above standard interview prep — candidates pay monthly for ongoing career intelligence.' },
        { icon: '📊', title: 'Longer Retention', body: 'Interview prep ends when the interview happens. Career tools keep the candidate in the ecosystem for months or years.' },
        { icon: '🏛️', title: 'Government Ready', body: 'Job centres and councils do not just need interview prep — they need career pathways for displaced workers. Career Finder is built for this.' },
        { icon: '🤝', title: 'Employer Value', body: 'Employers can use Career Finder to identify internal mobility opportunities — reducing churn and redeployment costs.' },
        { icon: '🌍', title: 'Global Scalability', body: 'Competency frameworks are language-agnostic. Career Finder scales across markets with minimal localisation cost.' },
        { icon: '🔗', title: 'Cockpit Integration', body: 'Career Finder feeds directly into the future Cockpit life and career operating system — creating a lifelong user relationship.' },
      ].map(f => <Card key={f.title}><Feature icon={f.icon} title={f.title} body={f.body} /></Card>)}
    </Grid>

    <Callout icon="🔭" title="Future: Cockpit Integration" color={A2}
      body="Career Finder is the bridge between Explain and Cockpit — Percentile.One's second product. In Cockpit, career pathways, goals, habits, learning history, and interview records live in one unified life dashboard. Career Finder is where that journey begins." />
  </>,

  'skills-map': () => <SkillsMapSection />,

  // ── Candidate Services ────────────────────────────────────────────────────────
  'candidate-services': () => <>
    <SectionHead
      label="Product · Candidate Services"
      h1="The candidate's corner."
      h2="Beyond interview prep."
      sub="Explain is building a comprehensive candidate services layer — not just interview preparation, but the full support ecosystem every job-seeker needs and no platform currently provides."
    />

    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 18 }}>Core Candidate Services</div>
        {[
          ['📄', 'CV Advice', 'Structured CV review, formatting guidance, and gap analysis aligned to target roles.'],
          ['🧭', 'Career Advice', 'Personalised career pathway guidance powered by the Career Finder engine.'],
          ['⚖️', 'Workplace Rights', 'Clear, plain-English guidance on employment law, contracts, and ACAS processes.'],
          ['📬', 'Interview Feedback', 'Post-interview structured feedback tools — helping candidates understand outcomes.'],
          ['💬', 'Recruiter Communication', 'Templates and tools for professional recruiter communication at every stage.'],
          ['🏢', 'Employer Communication', 'Structured tools for candidates to communicate directly with hiring managers.'],
        ].map(([icon, title, body]) => (
          <Feature key={title as string} icon={icon as string} title={title as string} body={body as string} />
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 18 }}>Commercial Opportunities</div>
        {[
          ['🛍️', 'Shop Tab', 'Curated equipment, laptops, stationery, and professional tools — affiliate and direct revenue.'],
          ['📣', 'Advertising', 'Relevant employer, recruiter, and career-service advertising within the candidate portal.'],
          ['🤝', 'Partnerships', 'Partnerships with training providers, universities, professional bodies, and employers.'],
          ['🌐', 'Candidate Marketplace', 'Candidates can publish their readiness profile to a recruiter-facing talent marketplace.'],
          ['🎓', 'Collaborations', 'Co-branded content and tools with careers services, universities, and councils.'],
          ['📞', 'ACAS Guidance', 'Partnership-ready ACAS and legal guidance integration for workplace dispute support.'],
        ].map(([icon, title, body]) => (
          <Feature key={title as string} icon={icon as string} title={title as string} body={body as string} />
        ))}
      </Card>
    </Grid>

    <Callout icon="📊" title="Why This Matters to Investors" color="#22c55e"
      body="Candidate services transform Explain from a single-use interview tool into a career companion platform. Each service layer adds a monetisation stream, increases session frequency, and deepens the data moat. A candidate who uses CV advice, career tools, and interview prep is five times more likely to convert to a paid subscription than one using interview prep alone." />

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Revenue Potential by Service Layer</div>
    <Grid cols={1}>
      <Card>
        {[
          { service: 'CV & Career Advice (subscription add-on)', model: 'Monthly subscription', arr: '£3–8/month per user' },
          { service: 'Shop Tab (affiliate + direct)', model: 'Commission / margin', arr: '£15–40 per transaction' },
          { service: 'Portal Advertising', model: 'CPM / CPC', arr: '£2–8 CPM' },
          { service: 'Candidate Marketplace', model: 'Recruiter subscription', arr: '£99–299/month per recruiter' },
          { service: 'Partnerships & Collaborations', model: 'Revenue share / licence', arr: '£5K–50K per partner' },
          { service: 'ACAS / Legal Guidance', model: 'Referral / partnership', arr: 'TBC — partnership dependent' },
        ].map(r => (
          <div key={r.service} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, alignItems: 'center' }}>
            <span style={{ color: '#ddd', fontWeight: 600 }}>{r.service}</span>
            <span style={{ color: '#7070a0' }}>{r.model}</span>
            <span style={{ color: '#22c55e', fontWeight: 700, textAlign: 'right' }}>{r.arr}</span>
          </div>
        ))}
      </Card>
    </Grid>
  </>,

  // ── Multi-Stage Interview Intelligence ────────────────────────────────────────
  'multi-stage': () => <>
    <SectionHead
      label="Product · Innovation"
      h1="Every platform prepares candidates for the interview."
      h2="Explain prepares them for the process."
      sub="Modern hiring is not a single event. Tech roles run 3–4 rounds. Senior roles run 4–5. VP and C-suite roles run 5–6. Government, banking, and consulting processes are often longer still. No platform has ever built for this reality — until now."
    />

    <Callout icon="🔄" title="The World's First Multi-Stage Interview Preparation Platform" color={A}
      body="Explain.Global will be the only platform that prepares candidates for each individual interview round — using the context of what happened in previous rounds to predict what comes next, calibrate difficulty, and focus preparation precisely where it needs to be." />

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>What Each Stage Actually Tests</div>
    <Grid cols={2}>
      {[
        { stage: '1st Interview', name: 'Screening / HR', tags: ['Culture fit', 'Motivation', 'Work history', 'Salary alignment'], focus: 'First impressions, narrative, and motivation. The interviewer is deciding if you belong in the process.' },
        { stage: '2nd Interview', name: 'Technical / Panel', tags: ['Deep knowledge', 'Domain expertise', 'Problem-solving', 'Stack specifics'], focus: 'Depth replaces breadth. Topics from Round 1 are revisited — harder, more specific, with less room to generalise.' },
        { stage: '3rd Interview', name: 'Practical / Assessment', tags: ['Live coding', 'Case study', 'Presentation', 'System design'], focus: 'Execution under pressure. Can you actually do the job — live, in the room, with someone watching the clock?' },
        { stage: '4th Interview', name: 'Senior / Director', tags: ['Strategic thinking', 'Budget ownership', 'Team leadership', 'Commercial acumen'], focus: 'Vision and ownership. You are being evaluated on whether you can run something, not just contribute to it.' },
        { stage: '5th Interview', name: 'Board / Executive Final', tags: ['Executive presence', 'Culture at scale', 'Negotiation', 'Regulatory fit'], focus: 'The final buy-in. Often the most political and least predictable — judgement, presence, and gravitas matter most.' },
        { stage: '6th Interview', name: 'Panel / Extended Process', tags: ['Endurance', 'Consistency', 'Stakeholder alignment', 'Cross-functional fit'], focus: 'Usually reserved for senior hires in financial services, government, and regulated industries. The question is whether you are the same person in every room.' },
      ].map(s => (
        <Card key={s.stage}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: A, background: `${A}18`, border: `1px solid ${A}30`, borderRadius: 6, padding: '4px 10px', flexShrink: 0, whiteSpace: 'nowrap' }}>{s.stage}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{s.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {s.tags.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
          <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.65 }}>{s.focus}</div>
        </Card>
      ))}
    </Grid>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>The Wizard Flow</div>
    <Card style={{ marginBottom: 28 }}>
      {[
        { step: 'Step 1', label: 'Which interview is this?', detail: 'Candidate selects: 1st / 2nd / 3rd / 4th / 5th / 6th interview. This single input immediately changes everything that follows.' },
        { step: 'Step 1.5', label: 'Previous round context', detail: 'Appears only if Stage > 1. Captures: what questions were asked, what topics came up, what the candidate struggled with, what feedback was given, who interviewed them, and what the format was. Any signal that "they said they\'d go deeper on X next time" is gold.' },
        { step: 'Step 2', label: 'Company', detail: 'Usually pre-filled from the job specification. Company culture and sector directly influence question style, expected depth, and interviewer behaviour.' },
        { step: 'Step 3', label: 'Role / Job Spec / CV', detail: 'The existing Explain Fusion inputs — job specification and candidate CV. Now fused alongside stage and prior context.' },
        { step: 'Step 4', label: 'AI Fusion Call', detail: 'The AI receives everything: stage ordinal, previous round signals, company, role, job spec, CV, seniority. It generates a pack that is calibrated specifically to this stage of this process — not a generic interview pack.' },
      ].map(s => (
        <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.06em' }}>{s.step}</div>
            <div style={{ fontSize: 11, color: '#8888aa', marginTop: 3 }}>{s.label}</div>
          </div>
          <div style={{ fontSize: 14, color: '#d0d0e8', lineHeight: 1.75 }}>{s.detail}</div>
        </div>
      ))}
    </Card>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16 }}>The Data Asset Nobody Else Can Build</div>
    <Card accent="#22c55e" style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 14, color: '#c0c0d8', lineHeight: 1.75, marginBottom: 16 }}>Every time a candidate tells Explain what was asked in their previous interview round, the platform adds to a proprietary, anonymised dataset that no other company has:</p>
      <Grid cols={2} gap={12}>
        {[
          { icon: '📊', title: 'Stage-Question Mapping', body: 'Which specific questions appear at Stage 2 vs Stage 4, for a Senior Developer role at a FTSE 100 bank.' },
          { icon: '📈', title: 'Competency Escalation Patterns', body: 'How interview difficulty and focus escalate from round to round, by role type and seniority level.' },
          { icon: '🏢', title: 'Company Behaviour Intelligence', body: 'What Barclays\'s Stage 3 actually looks like vs KPMG vs a Series B startup — built from real candidate reports.' },
          { icon: '⚠️', title: 'Struggle Correlation', body: 'Where candidates consistently struggle at Stage 3 becomes a predictive signal that improves coaching for all future candidates at that stage.' },
          { icon: '🔮', title: 'Predictive Question Model', body: 'The Question Likelihood Model becomes more accurate over time — a self-reinforcing moat that grows with every session.' },
          { icon: '🏛️', title: 'Sector Intelligence', body: 'Financial services processes look different to government, which look different to consulting. The dataset captures all of it.' },
        ].map(f => (
          <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6 }}>{f.body}</div>
            </div>
          </div>
        ))}
      </Grid>
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)' }}>
        <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>This data is impossible to replicate without candidates.</div>
        <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6 }}>A competitor building this feature today starts with zero data. Explain starts building the dataset from day one. The longer the platform runs, the more accurate the predictions — and the wider the moat.</div>
      </div>
    </Card>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Stage-Specific Readiness Scoring</div>
    <Card style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 14, color: '#c0c0d8', lineHeight: 1.75, marginBottom: 16 }}>Readiness is no longer a single score. Multi-stage creates a per-round profile:</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {['Stage 1 Readiness', 'Stage 2 Readiness', 'Stage 3 Readiness', 'Stage 4 Readiness', 'Stage 5 Readiness', 'Stage 6 Readiness'].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${A}0a`, border: `1px solid ${A}25`, borderRadius: 8, padding: '8px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: A }}>{s}</div>
            <div style={{ fontSize: 11, color: '#7070a0' }}>→ score, gaps, coaching</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: '#7070a0', lineHeight: 1.65, marginTop: 14, marginBottom: 0 }}>Recruiters see stage-specific readiness before forwarding a candidate. Employers see stage-by-stage preparation depth. Candidates see exactly where they need to improve before their next round.</p>
    </Card>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Business Impact</div>
    <Grid cols={3}>
      <Card accent="#22c55e">
        <div style={{ fontSize: 22, marginBottom: 8 }}>💰</div>
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13, marginBottom: 6 }}>More Revenue Per Candidate</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.6 }}>One hire process = 3–6 revenue events instead of 1. A candidate who reaches Round 5 at Barclays buys 5 separate packs.</div>
      </Card>
      <Card accent={A}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
        <div style={{ fontWeight: 700, color: A, fontSize: 13, marginBottom: 6 }}>Retained Across the Process</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.6 }}>A candidate who gets a Stage 2 invitation is anxious and has nowhere else to go. Explain is the only platform that meets them there.</div>
      </Card>
      <Card accent={A2}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📡</div>
        <div style={{ fontWeight: 700, color: A2, fontSize: 13, marginBottom: 6 }}>Recruiter & Employer Signal</div>
        <div style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.6 }}>A candidate who prepared for Stage 3 is a serious candidate. Stage-specific preparation depth becomes a recruiter-visible signal of commitment.</div>
      </Card>
    </Grid>

    <Callout icon="⚔️" title="Explain.Global is the world's first platform that prepares candidates for multi-stage interview processes — using previous round context to predict what comes next, and building a proprietary question intelligence dataset that no competitor can replicate without years of candidate data." color={A2} body="" />
  </>,

  // ── Future Plans ──────────────────────────────────────────────────────────────
  'future-plans': () => <>
    <SectionHead
      label="Roadmap · Future Plans"
      h1="Explain is the beginning."
      h2="Percentile.One is the vision."
      sub="We are not building an interview tool. We are building the operating system for careers — starting with Explain, extending into Cockpit, and ultimately creating the world's first integrated life and career platform."
    />

    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>Percentile.One — The Umbrella Brand</div>
      <Grid cols={3}>
        <Card accent={A}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>🎯</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Explain.Global</div>
          <Tag color="#22c55e">Product 1 — Live Now</Tag>
          <p style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65, marginTop: 12 }}>Interview readiness, career tools, recruiter workflows, employer portals. The world's most comprehensive interview preparation and hiring intelligence platform.</p>
        </Card>
        <Card accent={A2}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>🧠</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Cockpit</div>
          <Tag color={A2}>Product 2 — In Design</Tag>
          <p style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65, marginTop: 12 }}>A life and career operating system. Goals, habits, learning, career history, interview records, recruiter interactions — all in one personal dashboard.</p>
        </Card>
        <Card>
          <div style={{ fontSize: 22, marginBottom: 10 }}>🌍</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Future Products</div>
          <Tag color="#f59e0b">Horizon</Tag>
          <p style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.65, marginTop: 12 }}>Further products within the Percentile.One ecosystem will be announced as the platform matures. The infrastructure being built today is designed to support them.</p>
        </Card>
      </Grid>
    </div>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>Cockpit — Life & Career Operating System</div>
    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd', marginBottom: 14 }}>Personal Dashboard Modules</div>
        {['Life dashboard', 'Career dashboard', 'Goals & milestones', 'Habits & streaks', 'Learning history', 'Interview history', 'Readiness history', 'Recruiter interactions', 'Employer interactions', 'Multi-product integration'].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: A2, flexShrink: 0 }} />
            <span style={{ color: '#c0c0e0' }}>{item}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd', marginBottom: 14 }}>Why Cockpit Changes Everything</div>
        {[
          ['🔗', 'Unified Identity', 'One profile spans every product. Your career, your habits, your goals — all connected.'],
          ['📊', 'Longitudinal Data', 'Years of readiness, learning, and career data create a profile no CV can match.'],
          ['💰', 'New Revenue Model', 'Cockpit operates on a premium subscription above and beyond Explain — a second ARR stream.'],
          ['🌍', 'Global Reach', 'A life operating system is culturally universal. Explain opens the door; Cockpit keeps users forever.'],
        ].map(([icon, title, body]) => <Feature key={title as string} icon={icon as string} title={title as string} body={body as string} />)}
      </Card>
    </Grid>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16, marginTop: 8 }}>Future Explain Features</div>
    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd', marginBottom: 14 }}>Platform Expansions</div>
        {[
          'Employer interview viewer (live session monitoring)',
          'Public interview recordings (candidate-consented, anonymised)',
          'Multi-language interview packs (10 languages by 2028)',
          'Globalisation — UK, US, Canada, Australia, UAE (Phase 4)',
          'Government integrations — job centre dashboards',
          'Recruiter analytics — placement intelligence suite',
          'Employer analytics — hiring quality & readiness reporting',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 5 }} />
            <span style={{ color: '#a0a0c0' }}>{item}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd', marginBottom: 14 }}>Commercial Expansions</div>
        {[
          'Candidate marketplace — recruiter-facing talent discovery',
          'Portal advertising — contextual, career-relevant',
          'Shop tab — equipment, laptops, stationery, professional tools',
          'Brand collaborations — employers, training providers, universities',
          'Enterprise HR integration — ATS and HRIS connectors',
          'Job board embedding — preparation triggers inside listings',
          'White-label licensing — agencies, councils, universities',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: A, flexShrink: 0, marginTop: 5 }} />
            <span style={{ color: '#a0a0c0' }}>{item}</span>
          </div>
        ))}
      </Card>
    </Grid>

    <Callout icon="🚀" title="The Long-Term Vision" color={A}
      body="By 2030, Percentile.One operates two flagship products — Explain.Global and Cockpit — serving candidates, employers, recruiters, governments, and educational institutions across 10+ countries. The infrastructure being built today, including the patent-pending Fusion Algorithm and multi-portal architecture, forms the foundation of a defensible, multi-product technology company." />
  </>,

  // ── Patent & IP ───────────────────────────────────────────────────────────────
  'patent': () => <>
    <SectionHead
      label="Financials · Intellectual Property"
      h1="Patent-pending."
      h2="Infrastructure-level innovation."
      sub="Explain.Global has filed for provisional patent protection in the UK and the United States. The inventions described below cover the core technical pipeline — from job advert parsing to multi-portal readiness delivery — and represent a defensible technology moat at the infrastructure layer."
    />

    <Callout icon="🔒" title="Status: Patent Pending — UK & US Provisional Applications" color={A}
      body="Provisional applications establish the priority date for the inventions described below. Full applications are in preparation with qualified patent attorneys. The provisional status allows Explain to operate under 'Patent Pending' designation immediately." />

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Title of the Invention</div>
    <Card style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e0e0f0', lineHeight: 1.65 }}>
        System and Computational Method for Generating Personalised Interview Readiness Packs, Multi-Portal Interview Workflows, Candidate Scoring, Employer Feedback Integration, and Triggering Preparation from Job Listings, Recruiter Actions, and Employer Systems
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['UK Provisional', 'US Provisional', 'Patent Pending', 'August 2026'].map(t => <Tag key={t}>{t}</Tag>)}
      </div>
    </Card>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Field of the Invention</div>
    <Card style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Computational linguistic processing', 'AI-driven interview preparation', 'Job advert parsing', 'CV analysis', 'Personalised question generation', 'Candidate scoring', 'Employer feedback systems', 'Recruiter workflow automation', 'Multi-portal SaaS architecture', 'Interview simulation', 'Readiness scoring', 'Structured feedback loops'].map(f => <Tag key={f} color={A}>{f}</Tag>)}
      </div>
      <p style={{ fontSize: 14, color: '#c0c0d8', lineHeight: 1.75, marginTop: 16, marginBottom: 0 }}>The invention produces a technical effect by transforming unstructured text inputs and multi-party workflow triggers into structured, personalised interview readiness outputs.</p>
    </Card>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>The 15 Patentable Components</div>
    <Grid cols={2}>
      {[
        { n: '01', title: 'Job Advert Parsing Engine', body: 'Extracts competencies, responsibilities, and seniority from job URLs or raw specs — generating structured competency maps.' },
        { n: '02', title: 'CV Analysis Engine', body: 'Extracts candidate skills, experience, and gaps — mapping CV content to job competency requirements.' },
        { n: '03', title: 'Fusion Algorithm', body: 'Compares job competency map with candidate profile using weighted similarity scoring and semantic distance metrics.' },
        { n: '04', title: 'Question Likelihood Model', body: 'Predicts likely interview questions using pattern recognition and historical job description data.' },
        { n: '05', title: 'Interview Pack Generator', body: 'Produces structured packs containing questions, suggested answers, scoring rubrics, difficulty levels, and competency tags.' },
        { n: '06', title: 'Candidate Scoring Engine', body: 'Evaluates spoken or written responses using clarity, confidence, relevance, and depth metrics.' },
        { n: '07', title: 'Interview Simulation Engine', body: 'Conducts full interview simulations with AI avatars, question display, scoring overlays, and coaching feedback.' },
        { n: '08', title: 'Recruiter-Triggered Distribution Engine', body: 'A six-step technical pipeline: (1) recruiter action in a multi-tenant portal triggers an API event; (2) system simultaneously retrieves candidate profile and job specification; (3) Fusion Algorithm generates a personalised pack in real time; (4) a branded, agency-specific email is automatically composed and dispatched; (5) the email contains a tokenised, time-limited access link unique to that candidate and session; (6) candidate clicks — account is pre-seeded with their pack, zero registration friction. Recruiter portal updates in real time to show delivery confirmation and candidate engagement status. Employer portal receives a readiness signal when the candidate completes preparation.' },
        { n: '09', title: 'Employer Feedback Integration', body: 'Captures structured employer feedback and integrates it into candidate readiness scoring, reducing ghosting and recruiter workload.' },
        { n: '10', title: 'Employer Readiness Viewer', body: 'Employers view candidate readiness scores, practice scores, structured packs, and future simulation recordings.' },
        { n: '11', title: 'Magic Button — Job Board Embed', body: 'A candidate-initiated trigger chain embedded within live third-party job listings. (1) A "Prepare for this Interview" button appears inside the job listing on any job board or careers page; (2) candidate clicks — system extracts the full job specification from the listing URL automatically; (3) candidate provides or retrieves their CV; (4) Fusion Algorithm generates a personalised pack immediately; (5) candidate begins preparation before they have applied, before any recruiter is involved, at the precise moment of job discovery. No existing job board has this mechanism. It inverts the traditional preparation timeline and makes every job listing on the internet a potential Explain entry point.' },
        { n: '12', title: 'Multi-Portal Architecture', body: 'Candidate, Recruiter, and Employer portals share structured readiness data through a unified multi-tenant SaaS system.' },
        { n: '13', title: 'Career Finder Engine', body: 'Uses competency mapping to suggest career pathways, roles, and personalised learning modules beyond the immediate role.' },
        { n: '14', title: 'Cockpit Integration Layer', body: 'Future integration with Percentile.One\'s Cockpit operating system for multi-product ecosystem expansion and lifelong career intelligence.' },
        { n: '15', title: 'Multi-Stage Interview Intelligence Engine', body: 'A pipeline that generates stage-aware, context-cumulative interview preparation packs for multi-round hiring processes. Receives the interview stage ordinal (1st through 6th); conditionally captures structured data about previous interview rounds when stage > 1 (questions asked, topics covered, candidate struggles, interviewer focus, format, feedback received); fuses all prior context with job specification, CV, seniority, and company profile; generates a pack calibrated to the specific demands of the stated stage — suppressing questions appropriate to earlier stages, amplifying depth and difficulty in proportion to stage number, and predicting escalated competency areas. All candidate-reported previous interview data is aggregated into a proprietary, anonymised multi-stage intelligence dataset — a continuously self-improving corpus of which questions appear at which stage, for which role, in which sector — unavailable to any other platform.' },
      ].map(c => (
        <Card key={c.n}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: A, background: `${A}18`, border: `1px solid ${A}30`, borderRadius: 6, padding: '4px 8px', flexShrink: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em' }}>{c.n}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.7 }}>{c.body}</div>
            </div>
          </div>
        </Card>
      ))}
    </Grid>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Draft Claims</div>
    <Grid cols={1}>
      <Card>
        {[
          { n: 'Claim 1', title: 'Core Technical Claim', body: 'A computational method for generating personalised interview readiness packs by parsing job advertisements, analysing candidate CVs, and fusing both using weighted similarity scoring.' },
          { n: 'Claim 2', title: 'Multi-Portal Workflow Claim', body: 'A method for distributing readiness outputs across candidate, recruiter, and employer portals with structured scoring and feedback loops.' },
          { n: 'Claim 3', title: 'Recruiter Trigger Claim', body: 'A method for initiating personalised interview preparation workflows when a recruiter arranges an interview.' },
          { n: 'Claim 4', title: 'Employer Feedback Claim', body: 'A method for capturing structured employer feedback and integrating it into candidate readiness scoring.' },
          { n: 'Claim 5', title: 'Job Board Trigger Claim', body: 'A method for embedding preparation triggers within third-party job listings.' },
          { n: 'Claim 6', title: 'Simulation Claim', body: 'A method for conducting AI-driven interview simulations with scoring overlays and coaching feedback.' },
          { n: 'Claim 7', title: 'Career Finder Claim', body: 'A method for generating personalised career pathways using competency mapping and readiness scoring.' },
          { n: 'Claim 8', title: 'Distribution Engine Claim', body: 'A computational method for delivering personalised interview preparation via a multi-step distribution pipeline: triggering from a recruiter action in a multi-tenant portal; simultaneously retrieving candidate profile and job specification; generating a personalised pack via a Fusion Algorithm; composing and dispatching a branded, agency-specific email; embedding a tokenised, time-limited candidate access link; pre-seeding the candidate account upon link activation; and transmitting real-time engagement signals to the originating recruiter portal and associated employer portal.' },
          { n: 'Claim 9', title: 'Magic Button — Job Board Embed Claim', body: 'A method for initiating a personalised interview preparation pipeline from within a third-party job listing, comprising: embedding an interactive trigger element within a live job listing on an external job board or careers page; extracting the full job specification from the listing URL upon activation by a candidate; retrieving or receiving the candidate\'s CV or profile data; generating a personalised interview readiness pack via a Fusion Algorithm; and delivering immediate preparation access to the candidate at the point of job discovery, prior to any application or recruiter involvement.' },
          { n: 'Claim 10', title: 'Visual Competency Map Claim', body: 'A method for generating and displaying a visual, colour-coded competency map from candidate-supplied skill and confidence data, comprising: receiving skill name and confidence percentage inputs from a candidate; classifying each skill into a strength tier; rendering each skill as a visually distinct tile with colour encoding, percentage display, and strength label; aggregating all tiles into a structured visual map; and making that map available to candidates, recruiters, and employers through a multi-portal architecture as a real-time profile representation.' },
          { n: 'Claim 11', title: 'Displaced Worker Outcome Intelligence Claim', body: 'A system for capturing, correlating, and aggregating outcome data from interview preparation sessions conducted for displaced worker populations, comprising: recording candidate circumstance at intake; tracking preparation type, session depth, and readiness score; correlating preparation data with interview outcome signals and employer feedback; generating anonymised outcome intelligence reports for government, institutional, and research use; and continuously refining preparation recommendations based on closed-loop outcome data — forming a proprietary employability intelligence dataset unavailable to any other platform.' },
          { n: 'Claim 12', title: 'Multi-Stage Interview Preparation Engine', body: 'A computational method for generating stage-aware, context-cumulative interview readiness packs for multi-round hiring processes, comprising: receiving a candidate-specified interview stage ordinal; conditionally receiving structured and unstructured data describing prior interview interactions when the stage ordinal exceeds one, including question topics, interviewer focus areas, candidate-reported struggles, format type, and any feedback received; fusing the interview stage, prior interaction data, job specification, candidate profile, and company context using a weighted intelligence model; generating a preparation pack calibrated to the specific demands of the specified interview stage; suppressing questions and content appropriate to earlier stages; amplifying preparation depth, specificity, and difficulty in proportion to the stage ordinal; predicting escalated competency areas based on prior round signals; and aggregating all candidate-reported prior interview data into a continuously self-improving, anonymised multi-stage intelligence corpus that increases question-prediction accuracy across role types and sectors over time.' },
        ].map(c => (
          <div key={c.n} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.06em' }}>{c.n}</div>
              <div style={{ fontSize: 11, color: '#8888aa', marginTop: 3 }}>{c.title}</div>
            </div>
            <div style={{ fontSize: 14, color: '#d0d0e8', lineHeight: 1.75 }}>{c.body}</div>
          </div>
        ))}
      </Card>
    </Grid>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 16, marginTop: 8 }}>Novelty Statement</div>
    <Card style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 14, color: '#c0c0d8', lineHeight: 1.75, marginBottom: 16 }}>No known system combines all of the following in a single integrated pipeline:</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Fuses job advert + CV data', 'Generates personalised readiness packs', 'Multi-portal readiness visibility', 'Integrates employer feedback', 'Triggers preparation from job listings', 'Magic Button — preparation at point of job discovery', 'Triggers preparation from recruiter actions', 'Branded tokenised email distribution pipeline', 'Real-time multi-portal engagement signals', 'Structured readiness scoring', 'Interview simulation with scoring overlays', 'Career pathway generation', 'Interview readiness infrastructure', 'Multi-stage interview intelligence', 'Previous round context capture', 'Stage-escalating question prediction', 'Proprietary multi-stage question dataset'].map(n => <Tag key={n} color="#22c55e">{n}</Tag>)}
      </div>
    </Card>

    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>Commercial Value of the IP</div>
    <Grid cols={3}>
      <Card accent="#22c55e">
        <div style={{ fontSize: 22, marginBottom: 8 }}>🛡️</div>
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13, marginBottom: 6 }}>Defensibility</div>
        <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>Patent-pending status makes the core pipeline legally defensible against copycat platforms — creating a structural moat no amount of engineering spend can quickly replicate.</div>
      </Card>
      <Card accent={A2}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>💷</div>
        <div style={{ fontWeight: 700, color: A2, fontSize: 13, marginBottom: 6 }}>R&D Tax Relief</div>
        <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>The qualifying R&D activity behind these inventions makes Explain eligible for HMRC R&D Tax Credit claims — reducing net development cost. Lawyers will advise on the Patent Box regime once patents are granted.</div>
      </Card>
      <Card accent={A}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>🌍</div>
        <div style={{ fontWeight: 700, color: A, fontSize: 13, marginBottom: 6 }}>Licensing Potential</div>
        <div style={{ fontSize: 14, color: '#9090b0', lineHeight: 1.6 }}>Granted patents create a licensing revenue stream — government platforms, enterprise HR systems, and international job boards may license the pipeline rather than build their own.</div>
      </Card>
    </Grid>

    <Callout icon="📋" title="Note for Investors" color="#f59e0b"
      body="These are provisional patent applications — they establish priority dates but do not yet grant enforceable rights. Full patent examination is underway. IP valuations and Patent Box tax calculations will be confirmed once grants are received. All IP claims should be verified with qualified patent counsel before reliance." />
  </>,
};

// ── Main portal layout ────────────────────────────────────────────────────────
export default function InvestorPortal() {
  const [active, setActive] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (drawerOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  function go(id: string) { setActive(id); setDrawerOpen(false); window.scrollTo(0, 0); }

  const currentGroup = NAV_GROUPS.find(g => g.items.some(i => i.id === active));
  const currentItem  = ALL_ITEMS.find(i => i.id === active);

  const Sidebar = () => (
    <div style={{
      width: 250, flexShrink: 0,
      background: 'rgba(8,6,24,0.98)',
      borderRight: '1px solid rgba(79,142,247,0.1)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflowY: 'auto',
    }}>
      <style>{`
        .inv-item:hover { background: rgba(79,142,247,0.08) !important; color: #b0b0d0 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(79,142,247,0.2); border-radius: 2px; }

        /* Responsive grids — collapse to 1 col on mobile */
        .inv-grid-1 { grid-template-columns: 1fr; }
        .inv-grid-2 { grid-template-columns: repeat(2,1fr); }
        .inv-grid-3 { grid-template-columns: repeat(3,1fr); }
        .inv-grid-4 { grid-template-columns: repeat(4,1fr); }

        @media (max-width: 640px) {
          .inv-grid-2,
          .inv-grid-3,
          .inv-grid-4 { grid-template-columns: 1fr !important; }
        }

        /* Two-column content blocks inside sections */
        .inv-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 640px) {
          .inv-2col { grid-template-columns: 1fr !important; }
        }

        /* Horizontal scroll for tables / flow diagrams on mobile */
        .inv-scroll { overflow-x: auto; }

        /* Section head titles — scale down on mobile */
        @media (max-width: 480px) {
          .inv-section-h1 { font-size: 1.8rem !important; }
        }
      `}</style>

      {/* Logo */}
      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>
          Explain<span style={{ color: A }}>.global</span>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#303055', marginBottom: 12 }}>
          Investor Portal
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '3px 8px' }}>
          🔒 Confidential
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(79,142,247,0.1)', margin: '0 0 6px' }} />

      {/* Nav */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b', padding: '10px 20px 4px' }}>
              {group.title}
            </div>
            {group.items.map(item => {
              const isActive = item.id === active;
              return (
                <button key={item.id} className="inv-item" onClick={() => go(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 20px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                  color: isActive ? A : '#a0a0c8',
                  fontSize: 13, fontWeight: isActive ? 700 : 400,
                  borderLeft: `2px solid ${isActive ? A : 'transparent'}`,
                  transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? A : 'rgba(160,160,200,0.35)', flexShrink: 0, display: 'inline-block' }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(79,142,247,0.08)', fontSize: 10, color: '#252545' }}>
        © 2026 Percentile.One · Confidential
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#07060f', display: 'flex' }}>

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          <Sidebar />
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <>
          {drawerOpen && (
            <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 48 }} />
          )}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 49,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Sidebar />
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Mobile header */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 40,
            background: 'rgba(7,6,15,0.96)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(79,142,247,0.1)',
            padding: '0 16px', height: 54,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 16, height: 2, background: '#8080a0', borderRadius: 1 }} />)}
            </button>
            <div style={{ fontSize: 13, color: '#8080a0' }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>{currentGroup?.title}</span>
              {' · '}{currentItem?.label}
            </div>
          </div>
        )}

        {/* Desktop breadcrumb */}
        {!isMobile && (
          <div style={{ padding: '22px 48px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6868a0' }}>
            {currentGroup?.title} · {currentItem?.label}
          </div>
        )}

        {/* Section */}
        <div key={active} style={{ padding: isMobile ? '28px 20px 60px' : '32px 48px 80px', animation: 'fadeIn 0.3s ease' }}>
          <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
          {SECTIONS[active]?.(go)}
        </div>
      </div>
    </div>
  );
}
