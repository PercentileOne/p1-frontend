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
    { id: 'chair',      label: 'Interview Chair' },
    { id: 'learn',      label: 'Learn Engine' },
    { id: 'packs',      label: 'Interview Packs' },
    { id: 'rec-email',  label: '⭐ Recruiter Email' },
    { id: 'screens',    label: '🖥️ What It Looks Like' },
    { id: 'flow',       label: 'Flow Viewer' },
    { id: 'portals',    label: 'Portals' },
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
    { id: 'live',       label: "What's Live Today" },
    { id: 'roadmap',    label: 'Roadmap' },
  ]},
  { title: 'Financials', items: [
    { id: 'projections', label: 'Projections' },
    { id: 'ask',         label: 'The Ask' },
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
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: A, marginBottom: 14 }}>{label}</div>
      <h1 style={{ fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0, marginBottom: h2 ? 4 : sub ? 16 : 0 }}>{h1}</h1>
      {h2 && <h2 style={{ fontSize: 'clamp(1.6rem,2.8vw,2.2rem)', fontWeight: 900, color: A, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, marginBottom: sub ? 16 : 0 }}>{h2}</h2>}
      {sub && <p style={{ fontSize: 15, color: '#7070a0', lineHeight: 1.75, maxWidth: 680, margin: 0 }}>{sub}</p>}
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
      {sub && <div style={{ fontSize: 11, color: '#505080' }}>{sub}</div>}
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
        <div style={{ fontWeight: 700, color: '#fff', marginBottom: 5, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#8080a0', lineHeight: 1.65 }}>{body}</div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon:string; title:string; body:string }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${A}18`, border: `1px solid ${A}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#7070a0', lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );
}

function Tag({ children, color = A }: { children:React.ReactNode; color?:string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}35`, color }}>{children}</span>
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
      <span style={{ fontSize: 13, color: '#ccc' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}35`, borderRadius: 6, padding: '2px 10px' }}>{s.label}</span>
    </div>
  );
}

function BarRow({ year, arr, pct, agencies }: { year:string; arr:string; pct:number; agencies:string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#9090b0', fontWeight: 600 }}>{year}</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#aaa' }}>{agencies} agencies</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: A }}>{arr}</span>
        </div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${A}, ${A2})`, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────
type Nav = (id: string) => void;

const SECTIONS: Record<string, (nav: Nav) => React.ReactNode> = {

  'overview': () => <>
    <SectionHead
      label="Executive · Overview"
      h1="Personalised Interview"
      h2="Readiness."
      sub="Explain.Global is creating a new category — PIR — the layer between recruitment and placement where candidates become genuinely interview-ready for the first time in history."
    />
    <Callout icon="🎯" title="The Category: Personalised Interview Readiness (PIR)" body="No platform today combines job-spec personalisation, AI simulation, real-time coaching, and recruiter integration in one cinematic experience. Explain.Global owns this space." />
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
            <span style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.5, paddingTop: 2 }}>{s}</span>
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
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9090b0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px' }}>
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
            <div style={{ fontSize: 12, color: '#7070a0', lineHeight: 1.6 }}>{c.body}</div>
          </Card>
        ))}
      </Grid>
      <Callout icon="💡" title="This feature solves all three at once" body="Explain's Recruiter Email feature increases placements, reduces anxiety, and gives agencies a competitive advantage that no competitor can replicate. One click. No cost to the candidate. Branded by the agency. This is a new standard for how recruitment works." color={A2} />
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
            <div style={{ color: '#404060', marginBottom: 2 }}>From: <span style={{ color: '#7080a0' }}>Vallum Consulting via Explain.global</span></div>
            <div style={{ color: '#404060', marginBottom: 2 }}>To: <span style={{ color: '#7080a0' }}>gary.thompson@gmail.com</span></div>
            <div style={{ color: '#404060' }}>Subject: <span style={{ color: '#b0bcd0', fontWeight: 700 }}>Your Interview Preparation — Powered by Explain.Global</span></div>
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
            <p style={{ fontSize: 13, color: '#9090b0', margin: '0 0 18px', lineHeight: 1.7 }}>Click below to begin your personalised interview readiness:</p>
            <div style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, borderRadius: 10, padding: '12px 18px', textAlign: 'center', marginBottom: 18, cursor: 'pointer', boxShadow: `0 6px 24px ${A}35` }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.02em' }}>Start Preparing →</span>
            </div>
            <div style={{ fontSize: 11, color: '#505070', lineHeight: 1.9 }}>
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
          <div style={{ fontSize: 12, color: '#505070', textAlign: 'center' }}>— Gary Thompson, Software Engineer<br /><span style={{ color: A2 }}>Placed at DeepMind via Vallum Consulting</span></div>
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
              <div style={{ fontSize: 12, color: '#6060a0', lineHeight: 1.6 }}>{r.detail}</div>
            </div>
          ))}
        </Grid>
        <div style={{ marginTop: 24, padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(79,142,247,0.1)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#7070a0', textAlign: 'center', lineHeight: 1.8 }}>
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
            <div style={{ fontSize: 13, color: '#7070a0', lineHeight: 1.7, marginBottom: 16 }}>A leading UK recruitment agency specialising in technology and financial services placements. Vallum is the anchor case study for Explain's agency partnership model.</div>
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

  'screens': (nav) => {
    // Shared chrome frame wrapper
    function Screen({ title, children, caption, wide }: { title: string; children: React.ReactNode; caption: string; wide?: boolean }) {
      return (
        <div style={{ marginBottom: 40 }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(79,142,247,0.18)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', maxWidth: wide ? '100%' : 680 }}>
            {/* Chrome bar */}
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

    // ── Screen 1: Vallum Intro ──
    function S1Vallum() {
      return (
        <div style={{ background: '#07060f', minHeight: 320, padding: 0 }}>
          {/* Vallum-branded nav */}
          <div style={{ background: 'rgba(5,4,15,0.95)', borderBottom: '1px solid rgba(120,80,255,0.2)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>explain<span style={{ color: '#7b5cf5' }}>.global</span></div>
            <div style={{ fontSize: 9, color: '#404060', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Powered by Vallum Consulting</div>
          </div>
          {/* Hero */}
          <div style={{ padding: '40px 32px 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(123,92,245,0.12)', border: '1px solid rgba(123,92,245,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
              🎯 Interview Preparation · Exclusive Access
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
              Your interview is on<br /><span style={{ color: A }}>12 August 2026.</span>
            </div>
            <div style={{ fontSize: 12, color: '#7070a0', marginBottom: 24, lineHeight: 1.7 }}>
              Vallum Consulting has activated 4 days of complimentary access to Explain.Global on your behalf.<br />Your personalised interview preparation is ready.
            </div>
            <div style={{ display: 'inline-flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
              {[['📅','Interview', '12 Aug 2026'], ['🏢','Company','DeepMind'], ['📋','Role','Senior SWE']].map(([icon, label, val]) => (
                <div key={label} style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.18)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
                  <div style={{ fontSize: 9, color: '#5060a0', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#ddd', fontWeight: 700, marginTop: 1 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#4F8EF7,#7b5cf5)', borderRadius: 10, padding: '11px 28px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', letterSpacing: '0.02em' }}>
              Start Your Preparation →
            </div>
            <div style={{ marginTop: 18, fontSize: 10, color: '#303050' }}>
              Powered by <span style={{ color: A, fontWeight: 700 }}>explain.global</span> · Personalised Interview Readiness
            </div>
          </div>
        </div>
      );
    }

    // ── Screen 2: Interview Chair ──
    function S2Chair({ view }: { view: number }) {
      const views = [
        // 0: Main chair
        <div key="chair" style={{ background: '#050410', minHeight: 320, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: 'linear-gradient(180deg,#0a0820 0%,#050410 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, position: 'relative' }}>
            {/* AI interviewer avatar */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1560,#2a2080)', border: '2px solid rgba(79,142,247,0.4)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👩‍💼</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Sarah Mitchell</div>
              <div style={{ fontSize: 10, color: '#4060a0' }}>HR Director · Interviewing you now</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>LIVE SESSION</span>
              </div>
            </div>
            {/* Waveform */}
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, alignItems: 'center' }}>
              {[3,6,10,14,9,5,12,8,4,11,7,3,9,13,6].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: `${A}${i % 3 === 0 ? 'aa' : '55'}`, borderRadius: 2 }} />
              ))}
            </div>
          </div>
          {/* Bottom bar */}
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
        // 1: Coaching overlay
        <div key="coach" style={{ background: '#050410', minHeight: 320, display: 'grid', gridTemplateColumns: '1fr 240px' }}>
          <div style={{ background: 'linear-gradient(180deg,#0a0820,#050410)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1560,#2a2080)', border: '2px solid rgba(79,142,247,0.3)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>👩‍💼</div>
              <div style={{ fontSize: 10, color: '#6080a0' }}>Sarah Mitchell · Active</div>
            </div>
          </div>
          {/* Coaching panel */}
          <div style={{ background: 'rgba(4,3,14,0.98)', borderLeft: '1px solid rgba(79,142,247,0.12)', padding: 14, overflow: 'hidden' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>🧠 Live Coaching</div>
            {[
              { type: '✅', label: 'Strong opener', color: '#22c55e' },
              { type: '⚡', label: 'Add impact metric', color: '#f59e0b' },
              { type: '💡', label: 'Land with outcome', color: A },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', gap: 6, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10 }}>
                <span>{c.type}</span>
                <span style={{ color: c.color }}>{c.label}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 9, fontWeight: 800, color: '#404060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your Answer</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 8, fontSize: 10, color: '#8090b0', lineHeight: 1.6 }}>
              "In Q3 2024, I led a team of six across eng and product to deliver our payments integration..."
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              {['Clarity','Depth','Confidence'].map((s, i) => (
                <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: [A, '#22c55e', A2][i] }}>{[7.8, 8.4, 6.9][i]}</div>
                  <div style={{ fontSize: 8, color: '#404060' }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        // 2: Scoring engine
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
          {[
            { q: 'Q1 — Leadership under pressure', score: 8.8, color: '#22c55e' },
            { q: 'Q2 — Stakeholder management', score: 7.4, color: '#f59e0b' },
            { q: 'Q3 — Technical decision making', score: 8.9, color: '#22c55e' },
            { q: 'Q4 — Handling ambiguity', score: 7.1, color: '#f59e0b' },
          ].map(r => (
            <div key={r.q} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 10, color: '#7080a0', flex: 1 }}>{r.q}</span>
              <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.score * 10}%`, background: r.color, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: r.color, minWidth: 28, textAlign: 'right' }}>{r.score}</span>
            </div>
          ))}
        </div>,
      ];
      return <>{views[view]}</>;
    }

    // ── Screen 3: Candidate Portal ──
    function S3Candidate({ view }: { view: number }) {
      const views = [
        // 0: Dashboard
        <div key="dash" style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Good morning, <span style={{ color: A }}>Gary</span></div>
            <div style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>4 days access · Vallum</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[['🎯','Ready','Interview in 3 days',[A]],['📋','1 Pack','Senior SWE · DeepMind',[A2]],['📚','3 Lessons','Queued for you',['#22c55e']]].map(([icon, val, sub, [color]]) => (
              <div key={val as string} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, padding: '12px 10px' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: color }}>{val}</div>
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
        // 1: Practice Pack
        <div key="pack" style={{ background: '#07060f', padding: 18, minHeight: 300 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Interview Pack · Personalised</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Senior Software Engineer</div>
          <div style={{ fontSize: 11, color: '#5060a0', marginBottom: 16 }}>DeepMind · London · Technical + Behavioural Mix</div>
          {[
            { n: 1, type: 'Behavioural', q: 'Describe a time you led a complex cross-functional project under significant time pressure.' },
            { n: 2, type: 'Technical',   q: 'How would you design a distributed rate-limiting system for a high-traffic API?' },
            { n: 3, type: 'Values',      q: "Tell me about a time your technical judgment conflicted with a teammate's — how did you resolve it?" },
          ].map(r => (
            <div key={r.n} style={{ border: '1px solid rgba(79,142,247,0.1)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: `${A}20`, border: `1px solid ${A}30`, borderRadius: 4, padding: '1px 6px' }}>Q{r.n}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: A2 }}>{r.type}</span>
              </div>
              <div style={{ fontSize: 11, color: '#c0c8e0', lineHeight: 1.5 }}>{r.q}</div>
            </div>
          ))}
          <div style={{ fontSize: 9, color: '#303050', marginTop: 8 }}>20 questions total · Model answers included · STAR format</div>
        </div>,
        // 2: Readiness Score
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
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#9090b0', lineHeight: 1.6 }}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>You are interview-ready.</span> Your score places you in the top 15% of candidates for this role type. Focus areas: Confidence under follow-up questioning.
          </div>
        </div>,
      ];
      return <>{views[view]}</>;
    }

    // ── Screen 4: Recruiter Portal ──
    function S4Recruiter({ view }: { view: number }) {
      const views = [
        // 0: Dashboard
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
          {[
            { name: 'Gary Thompson', role: 'Senior SWE · DeepMind', date: '12 Aug', status: 'Prep Sent', score: '84%' },
            { name: 'Priya Sharma', role: 'Data Engineer · Palantir', date: '15 Aug', status: 'Preparing', score: '71%' },
            { name: 'James Walker', role: 'DevOps Lead · Stripe', date: '18 Aug', status: 'Not Sent', score: '—' },
          ].map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${A}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{r.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ddd', fontWeight: 600, fontSize: 12 }}>{r.name}</div>
                <div style={{ color: '#505070', fontSize: 10 }}>{r.role} · {r.date}</div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.status === 'Prep Sent' ? 'rgba(79,142,247,0.12)' : r.status === 'Preparing' ? 'rgba(123,92,245,0.12)' : 'rgba(255,255,255,0.04)', color: r.status === 'Prep Sent' ? A : r.status === 'Preparing' ? A2 : '#404060', border: `1px solid ${r.status === 'Prep Sent' ? A : r.status === 'Preparing' ? A2 : '#303050'}25` }}>{r.status}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: r.score !== '—' ? '#22c55e' : '#303050', minWidth: 28, textAlign: 'right' }}>{r.score}</div>
            </div>
          ))}
        </div>,
        // 1: Send Interview Prep (the magic button)
        <div key="sendprep" style={{ background: '#07060f', padding: 24, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Send Interview Preparation</div>
            {[['Candidate','Gary Thompson'],['Interview Date','12 August 2026'],['Role','Senior Software Engineer'],['Company','DeepMind'],['Access Period','4 days (agency-funded)'],['Agency Branding','Vallum Consulting']].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                <span style={{ color: '#505070' }}>{l}</span>
                <span style={{ color: '#ddd', fontWeight: 600 }}>{v}</span>
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

    // ── Screen 5: Client Portal ──
    function S5Client() {
      return (
        <div style={{ background: '#07060f', padding: 18, minHeight: 280 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Company Portal · DeepMind</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Upcoming Interviews · Senior Software Engineer</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[['12 Shortlisted',A],['8 Preparing',A2],['4 Interview-Ready','#22c55e']].map(([v,c]) => (
              <div key={v as string} style={{ background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
          {[
            { name: 'Gary Thompson', readiness: 84, status: 'Ready', agency: 'Vallum' },
            { name: 'Priya Sharma', readiness: 71, status: 'Preparing', agency: 'Vallum' },
            { name: 'Marcus Cole', readiness: 91, status: 'Ready', agency: 'Harrington Starr' },
          ].map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${A}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{r.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ddd', fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 9, color: '#404060' }}>via {r.agency}</div>
              </div>
              <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.readiness}%`, background: r.readiness >= 80 ? '#22c55e' : A, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: r.readiness >= 80 ? '#22c55e' : A, minWidth: 28 }}>{r.readiness}%</span>
              <span style={{ fontSize: 9, color: r.status === 'Ready' ? '#22c55e' : A2 }}>{r.status}</span>
            </div>
          ))}
        </div>
      );
    }

    // ── Screen 6: Magic Button ──
    function S6Magic() {
      return (
        <div style={{ background: '#07060f', padding: 24, minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: A2, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Magic Button · Instant Pack Generation</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79,142,247,0.1)', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'left', fontSize: 11, color: '#7080a0', lineHeight: 1.6 }}>
              <div style={{ fontSize: 9, color: '#404060', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Pasted Job Specification</div>
              Senior Software Engineer — DeepMind, London. We are looking for a technically exceptional engineer with experience in distributed systems, machine learning infrastructure, and cross-functional leadership. The ideal candidate will have 5+ years...
            </div>
            <div style={{ background: `linear-gradient(135deg,${A2},${A})`, borderRadius: 14, padding: '16px 20px', cursor: 'pointer', boxShadow: `0 12px 48px ${A2}40`, marginBottom: 20 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>Generate Interview Pack</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>20 personalised questions · Model answers · Coaching context</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, fontSize: 9, color: '#303050' }}>
              <span style={{ color: '#22c55e' }}>✓</span> Ready in under 10 seconds &nbsp;·&nbsp; <span style={{ color: '#22c55e' }}>✓</span> 90% gross margin
            </div>
          </div>
        </div>
      );
    }

    // ── Screen 7: Learn Engine ──
    function S7Learn() {
      return (
        <div style={{ background: '#07060f', padding: 18, minHeight: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Learn Engine · Lesson</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 2 }}>Distributed Systems Design</div>
            </div>
            <div style={{ fontSize: 9, background: `${A}15`, border: `1px solid ${A}30`, color: A, borderRadius: 20, padding: '3px 10px', fontWeight: 700 }}>🌍 EN</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
            {['Concepts','Glossary','Exam Qs','Quiz','Bookshelf'].map((t, i) => (
              <button key={t} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${i === 0 ? A : 'rgba(255,255,255,0.08)'}`, background: i === 0 ? `${A}15` : 'transparent', color: i === 0 ? A : '#404060', fontSize: 9, fontWeight: i === 0 ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t}</button>
            ))}
          </div>
          {[
            { title: 'CAP Theorem', body: 'Every distributed system must choose two of three properties: Consistency, Availability, Partition Tolerance. In practice, partition tolerance is mandatory — so the real choice is between CP and AP systems.' },
            { title: 'Eventual Consistency', body: 'A consistency model where updates propagate to all nodes eventually but may not be immediately visible. Common in high-availability systems like DynamoDB and Cassandra.' },
          ].map(c => (
            <div key={c.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(79,142,247,0.08)', borderRadius: 10, padding: '11px 14px', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: '#ddd', fontSize: 12, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 10, color: '#7080a0', lineHeight: 1.6 }}>{c.body}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', cursor: 'pointer', fontSize: 10, color: A, fontWeight: 700 }}>Take Quiz →</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', cursor: 'pointer', fontSize: 10, color: '#505070' }}>📚 Save</div>
          </div>
        </div>
      );
    }

    // ── Screen 8: Global Hub ──
    function S8Global() {
      return (
        <div style={{ background: '#07060f', padding: 18, minHeight: 280 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Explain.Global · Language Selection</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Choose your language to begin</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
            {[['🇬🇧','English',true],['🇫🇷','Français',false],['🇩🇪','Deutsch',false],['🇪🇸','Español',false],['🇵🇱','Polski',false],['🇮🇳','Hindi',false],['🇧🇷','Português',false],['🇸🇦','العربية',false],['🇯🇵','日本語',false],['🇰🇷','한국어',false]].map(([flag, lang, active]) => (
              <div key={lang as string} style={{ background: active ? `${A}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? A : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, padding: '8px 4px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 16 }}>{flag}</div>
                <div style={{ fontSize: 8, color: active ? A : '#404060', fontWeight: active ? 700 : 400, marginTop: 2, lineHeight: 1.2 }}>{lang}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(79,142,247,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: 10, color: '#7080a0', lineHeight: 1.7 }}>
            <span style={{ color: A, fontWeight: 700 }}>50+ languages available.</span> Interview packs, Learn Engine lessons, and coaching overlay available in your chosen language. The same personalised experience, everywhere in the world.
          </div>
        </div>
      );
    }

    // ── Tab-stateful wrappers ──
    const [chairTab, setChairTab] = (useState as typeof useState<number>)(0);
    const [candTab, setCandTab] = (useState as typeof useState<number>)(0);
    const [recTab, setRecTab] = (useState as typeof useState<number>)(0);

    const SectionLabel = ({ n, label, sub }: { n: string; label: string; sub: string }) => (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: A, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
          {n} — {label}
        </div>
        <div style={{ fontSize: 12, color: '#505070', fontStyle: 'italic' }}>{sub}</div>
      </div>
    );

    return <>
      <SectionHead
        label="Product · What It Looks Like"
        h1="A visual walkthrough"
        h2="of the Explain experience."
        sub="Every screen is live product. Every interface is built, deployed, and working today. This is not a prototype — it is a platform."
      />

      {/* §1 Vallum Intro */}
      <SectionLabel n="§1" label="Vallum-Branded Intro Page" sub="The page that triggered Vallum's immediate interest." />
      <Screen title="interview-prep · Vallum" caption="This is the page that triggered Vallum's immediate interest. Agencies instantly understand the value when they see their brand integrated into Explain — their name, their candidate, their interview. One click sent this. That's it.">
        <S1Vallum />
      </Screen>

      {/* §2 Interview Chair */}
      <SectionLabel n="§2" label="Interview Chair" sub="The cinematic AI interview simulation environment." />
      <Screen title="Interview Chair · DeepMind" caption="The Interview Chair is Explain's cinematic interview simulation environment — personalised, structured, and powered by AI coaching. Candidates face Sarah or James in full-screen, answer with voice, and receive real-time coaching on every response.">
        <ScreenNav items={['Live Session','Coaching Overlay','Scoring Engine']} active={chairTab} onSelect={setChairTab} />
        <S2Chair view={chairTab} />
      </Screen>

      {/* §3 Candidate Portal */}
      <SectionLabel n="§3" label="Candidate Portal" sub="Personalised interview readiness — packs, coaching, learning, simulation." />
      <Screen title="Candidate Portal · Gary Thompson" caption="The Candidate Portal delivers personalised interview readiness — packs, coaching, learning, and simulation. From the moment a candidate receives the recruiter email, everything they need is here, in one place, structured for their specific interview.">
        <ScreenNav items={['Dashboard','Interview Pack','Readiness Score']} active={candTab} onSelect={setCandTab} />
        <S3Candidate view={candTab} />
      </Screen>

      {/* §4 Recruiter Portal */}
      <SectionLabel n="§4" label="Recruiter Portal" sub="One-click interview preparation — transforming how agencies place candidates." />
      <Screen title="Recruiter Portal · Vallum Consulting" caption="The Recruiter Portal transforms interview preparation into a one-click workflow — increasing placements and reducing drop-off. Recruiters see every candidate's readiness score, send prep with one click, and track engagement before the interview day.">
        <ScreenNav items={['Dashboard','⭐ Send Interview Prep']} active={recTab} onSelect={setRecTab} />
        <S4Recruiter view={recTab} />
      </Screen>

      {/* §5 Client Portal */}
      <SectionLabel n="§5" label="Client Portal (Company View)" sub="Enterprise hiring intelligence — pre-assessed candidates, structured packs, readiness analytics." />
      <Screen title="Client Portal · DeepMind" caption="The Client Portal gives companies structured interview packs, readiness analytics, and personalised preparation for every candidate — before they even walk in the room. Hiring managers see who is interview-ready and who needs more time.">
        <S5Client />
      </Screen>

      {/* §6 Magic Button */}
      <SectionLabel n="§6" label="Magic Button" sub="Job spec in. Personalised pack out. Under 10 seconds." />
      <Screen title="Magic Button · Pack Generation" caption="The Magic Button converts job specifications into personalised interview packs — instantly. Paste the job spec, press the button, receive 20 tailored questions with model answers and coaching context. 90% gross margin. The single highest-value action in the product.">
        <S6Magic />
      </Screen>

      {/* §7 Learn Engine */}
      <SectionLabel n="§7" label="Learn Engine" sub="Structured, personalised learning — any subject, any language." />
      <Screen title="Learn Engine · Lesson" caption="The Learn Engine delivers structured, personalised learning — preparing candidates for long-term success. Generate a lesson on any topic in any language. Concepts, glossary, exam questions, quiz, bookshelf. The scoring engine auto-assigns lessons based on weak areas identified in the Interview Chair.">
        <S7Learn />
      </Screen>

      {/* §8 Global Hub */}
      <SectionLabel n="§8" label="Global Hub" sub="Multi-language, multi-country interview readiness — built global from day one." />
      <Screen title="explain.global · Language Hub" caption="The Global Hub powers multi-language, multi-country interview readiness — enabling global scale. 50+ languages available at launch. The architecture was built global from the first line of code. Adding a new language costs near-zero. The same experience, everywhere.">
        <S8Global />
      </Screen>

      {/* §9 CTAs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 8 }}>
        {[
          { label: 'View the Recruiter Email Feature →', color: A,         to: 'rec-email' },
          { label: 'Explore the £1 Engine →',           color: '#22c55e',  to: 'packs'    },
          { label: 'See the Roadmap →',                 color: A2,         to: 'roadmap'  },
        ].map(cta => (
          <button key={cta.label} onClick={() => nav(cta.to)} style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: `${cta.color}10`, border: `1px solid ${cta.color}30`,
            borderRadius: 10, padding: '13px 12px',
            color: cta.color, fontWeight: 700, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{cta.label}</button>
        ))}
      </div>
    </>;
  },

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
      sub="Candidate, Recruiter, and Company portals each serve a different stakeholder — but share one unified data layer. Everything connects."
    />
    <Grid cols={1} gap={20}>
      {[
        {
          icon: '🎯', title: 'Candidate Portal', color: A,
          desc: "The candidate's personal preparation command centre.",
          features: ['Personal dashboard', 'Interview Pack library', 'Interview Chair access', 'Learn Engine & bookshelf', 'Flow Viewer — personal timeline', 'Session recordings & debriefs'],
        },
        {
          icon: '🤝', title: 'Recruiter Portal', color: A2,
          desc: 'Conversion intelligence for recruitment consultants.',
          features: ['Candidate management', 'Send Interview Prep email (1-click)', 'Candidate prep analytics', 'Interview Pack builder', 'Agency branding controls', 'Placement pipeline tracker'],
        },
        {
          icon: '🏢', title: 'Company Portal', color: '#22c55e',
          desc: 'Enterprise hiring intelligence for HR teams and hiring managers.',
          features: ['Pre-assessed candidate profiles', 'Interview Pack commissioning', 'Scoring & insight dashboards', 'Custom question frameworks', 'Integration with ATS (roadmap)', 'Coming Q4 2026'],
        },
      ].map(p => (
        <Card key={p.title} accent={p.color}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{p.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 6 }}>{p.title}</div>
              <p style={{ fontSize: 13, color: '#7070a0', lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {p.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9090b0' }}>
                  <span style={{ color: p.color }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </Grid>
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
        { icon: '🏢', stream: '⑥ Company Packs', model: 'B2B · £499–4,999', detail: 'Employers commission bespoke packs for specific roles or internal assessment centres. Pre-assessed candidates. Custom scoring frameworks. Integration with hiring manager review flow. Per-role or annual contract.' },
        { icon: '🌍', stream: '⑦ Globalisation', model: 'Scale · 50+ languages', detail: 'The same platform, same model, every country. Marginal cost of a new language is near-zero — the architecture was built global from day one. Multi-language packs unlock every market simultaneously.' },
        { icon: '🏛️', stream: '⑧ Government & Institutional', model: 'B2G · £50K–500K/year', detail: 'Job centres, councils, employability programmes, return-to-work, refugee integration, prison-to-work, disability employment, veterans employment. Government buys outcomes — Explain delivers measurable ones. One DWP contract can exceed all other streams combined.', highlight: true },
      ].map(r => (
        <Card key={r.stream} accent={r.highlight ? '#22c55e' : undefined}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: r.highlight ? 'rgba(34,197,94,0.15)' : `${A}18`, border: `1px solid ${r.highlight ? 'rgba(34,197,94,0.35)' : `${A}30`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{r.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 2 }}>{r.stream}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: r.highlight ? '#22c55e' : A, marginBottom: 6 }}>{r.model}</div>
              <div style={{ fontSize: 12, color: '#7070a0', lineHeight: 1.6 }}>{r.detail}</div>
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
              <div style={{ fontSize: 12, color: '#6060a0', lineHeight: 1.6 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </Grid>
  </>,

  'segments': () => <>
    <SectionHead
      label="Market · Target Segments"
      h1="Six segments."
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
      ].map(s => (
        <Card key={s.seg}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{s.seg}</span>
              <span style={{ marginLeft: 8 }}><Tag>{s.priority}</Tag></span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#7070a0', lineHeight: 1.65, margin: '0 0 12px' }}>{s.body}</p>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#505070' }}>
            <span><span style={{ color: A }}>ARR</span> {s.arr}</span>
            <span><span style={{ color: A }}>Path</span> {s.path}</span>
          </div>
        </Card>
      ))}
    </Grid>
  </>,

  'govt': () => <>
    <SectionHead
      label="Market · Institutional & Government"
      h1="The silent giant."
      h2="Government employability."
      sub="Governments worldwide spend billions annually preparing unemployed citizens for work. Explain is the modern platform they've been waiting for — and the contracts are larger than any individual recruiter."
    />
    <Callout icon="🏛️" title="Why government is a major revenue engine" body="A single local authority employability contract can be worth £50K–£500K annually. Councils, job centres, and return-to-work programmes are actively seeking technology platforms. Explain's mission — preparing people for the interview — is exactly what these programmes fund." color="#22c55e" />
    <Grid cols={3}>
      <Stat value="£7B+" label="UK employability spend / year" sub="DWP, councils, ESF-funded programmes" color="#22c55e" />
      <Stat value="2.5M" label="UC claimants seeking work" sub="Primary target group for Job Centre rollout" />
      <Stat value="£50K–£500K" label="Contract value range" sub="Per council / programme per year" color={A2} />
    </Grid>
    <Grid cols={2}>
      {[
        { icon: '🏢', title: 'Job Centres & DWP', body: 'Department for Work and Pensions manages 900+ job centres. Universal Credit claimants are mandated to engage with employability activities. Explain is the ideal digital platform for this cohort — low cost, high impact, measurable outcomes.' },
        { icon: '🏙️', title: 'Local Councils', body: 'Every local authority runs employability programmes funded by the DWP, UKSPF, or Levelling Up. Councils actively procure digital platforms that demonstrate employment outcomes. Explain\'s outcome data (interview success rates) is procurement gold.' },
        { icon: '🎓', title: 'Return-to-Work Programmes', body: 'Parents returning after parental leave. Long-term sick returning after illness. Carers re-entering the workforce. These cohorts are chronically underprepared for modern interviews — and fully funded by government to get support.' },
        { icon: '⚡', title: 'Youth Employment', body: 'NEET (Not in Education, Employment or Training) programmes, Kickstart legacy schemes, Youth Hubs. Young people have the highest interview anxiety and the least interview experience. Explain changes this completely.' },
        { icon: '🌍', title: 'Refugee Integration', body: 'Home Office and UNHCR-funded integration programmes need candidates to navigate UK recruitment culture. Language support + cultural context + interview practice = Explain\'s exact product for this cohort.' },
        { icon: '⚖️', title: 'Prison-to-Work & Veterans', body: 'MoJ, HMPPS, and veterans employment charities (RFEA, Career Transition Partnership) fund interview preparation as part of rehabilitation and transition programmes. The social impact story here is profound — and fundable.' },
      ].map(f => <Card key={f.title}><Feature icon={f.icon} title={f.title} body={f.body} /></Card>)}
    </Grid>
    <Card style={{ marginTop: 8 }}>
      <div className="inv-2col">
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 14 }}>Revenue Model — Government</div>
          {[
            { label: 'Per-user licence (council)',     value: '£8–15/user/month' },
            { label: 'Annual programme contract',      value: '£50K–£500K' },
            { label: 'DWP national rollout potential', value: '£5M–£50M' },
            { label: 'Outcome-based payment model',    value: 'Available on request' },
            { label: 'White-label (DWP branding)',     value: 'Available' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
              <span style={{ color: '#9090b0' }}>{r.label}</span>
              <span style={{ color: '#ddd', fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 14 }}>Why Explain Wins Government Procurement</div>
          {[
            { icon: '📊', label: 'Measurable outcomes', body: 'Interview scores, session completion, confidence ratings — the data councils need for ERDF/UKSPF reporting.' },
            { icon: '🌍', label: '50+ languages', body: 'Refugee programmes need multilingual platforms. Explain is built global from day one — no one else is.' },
            { icon: '💷', label: 'Cost-effective', body: 'At £8–15 per user per month, Explain is cheaper than any alternative — including the cost of reprocessing a failed job placement.' },
            { icon: '📱', label: 'Accessible', body: 'Web + mobile. No install required. Works on any device. Essential for cohorts without dedicated hardware.' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: '#6060a0' }}>{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
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
      ].map(m => <Card key={m.label}><div style={{ fontWeight: 700, color: A, fontSize: 13, marginBottom: 6 }}>{m.label}</div><div style={{ fontSize: 12, color: '#7070a0', lineHeight: 1.65 }}>{m.body}</div></Card>)}
    </Grid>
  </>,

  'live': () => <>
    <SectionHead
      label="Traction · What's Live Today"
      h1="Built. Deployed."
      h2="Working in production."
      sub="This is not a prototype. The core platform is live at explain.global. Real users have registered. The API is running. The Interview Chair is in beta."
    />
    <Grid cols={2}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 12 }}>Live Now</div>
        {['explain.global — global hub', 'Candidate registration & login (JWT auth)', 'Azure SQL — RBAC & user management', 'Learn Engine v1 — any subject, any language', 'Interview Chair (beta) — Sarah + James personas', 'Whisper STT pipeline — real-time transcription', 'Coaching overlay v1 — live guidance', 'Interview Packs v1 — job spec → questions', 'Flow Viewer — candidate timeline', 'Product marketing site (product.explain.global)', 'Recruiter portal (early build)'].map(i => <StatusRow key={i} label={i} status="live" />)}
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
        { phase: 'Phase 1', period: 'Complete ✅', title: 'Core Platform', color: '#22c55e', items: ['explain.global hub', 'Candidate auth (JWT, RBAC)', 'Learn Engine', 'Interview Chair beta', 'Interview Packs v1'] },
        { phase: 'Phase 2', period: 'Q3 2026 🔄', title: 'Recruiter Email + Agency Revenue', color: A, items: ['Recruiter email (1-click send)', 'Agency subscription tier', 'Candidate prep analytics', 'White-label branding'] },
        { phase: 'Phase 3', period: 'Q4 2026', title: 'Agency Partnerships at Scale', color: A2, items: ['10 agencies signed', 'Pack fusion (CV + job spec)', 'Recruiter portal v2', 'Scoring engine v2'] },
        { phase: 'Phase 4', period: 'Q1 2027', title: 'Company Portal', color: '#f59e0b', items: ['Company/employer portal', 'Pre-assessed candidate profiles', 'Custom question frameworks', 'ATS integration (beta)'] },
        { phase: 'Phase 5', period: 'Q2–Q3 2027', title: 'Global Scale', color: '#4ade80', items: ['Multi-language pack generation', 'International agency programme', '10 target markets launched', 'University partnerships'] },
        { phase: 'Phase 6', period: '2028', title: 'Explain AI + P1 Ecosystem', color: '#c084fc', items: ['Full AI coaching v2', 'Percentile.One integration', 'TalkToLearn mobile', 'Category leadership established'] },
      ].map(p => (
        <Card key={p.phase} accent={p.color}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.color, marginBottom: 4 }}>{p.phase}</div>
              <div style={{ fontSize: 12, color: '#505070', marginBottom: 8 }}>{p.period}</div>
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

  'projections': (nav) => {
    const [tab, setTab] = (useState as typeof useState<'base'|'upside'>)('base');
    const isBase = tab === 'base';
    return <>
      <SectionHead
        label="Financials · Projections"
        h1="Hybrid projections."
        h2="Two scenarios."
        sub="We present both a Conservative Base Case and an Ambitious Upside Case. The base case is what we commit to. The upside case is what happens when the recruiter email feature reaches escape velocity."
      />

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12, padding: 4, marginBottom: 28, width: 'fit-content' }}>
        {(['base', 'upside'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 24px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: tab === t ? (t === 'base' ? `linear-gradient(135deg, ${A}, ${A2})` : 'linear-gradient(135deg, #22c55e, #16a34a)') : 'transparent',
            color: tab === t ? '#fff' : '#5050a0',
            transition: 'all 0.2s',
          }}>
            {t === 'base' ? '📊 Conservative Base Case' : '🚀 Ambitious Upside Case'}
          </button>
        ))}
      </div>

      {isBase ? (
        <>
          <Card style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 20 }}>ARR Trajectory — Base Case (Agency-led)</div>
            <BarRow year="2026 (H2 launch)" arr="£48K"   pct={2}   agencies="10 agencies, modest pack sales" />
            <BarRow year="2027"             arr="£420K"  pct={9}   agencies="60 agencies + consumer growth" />
            <BarRow year="2028"             arr="£1.8M"  pct={33}  agencies="160 agencies + 2 govt contracts" />
            <BarRow year="2029"             arr="£5.5M"  pct={100} agencies="350 agencies + govt scale" />
          </Card>
          <Grid cols={2}>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 14 }}>Key Assumptions — Base Case</div>
              {[
                { label: 'Agency close rate',          value: '20% of demos' },
                { label: 'Monthly packs per agency',   value: '40 sends/month' },
                { label: 'Agency churn rate',          value: '<5% annually' },
                { label: 'Pack price (agency-funded)', value: '£5 avg' },
                { label: 'Consumer direct packs',      value: '500/month by Q2 2027' },
                { label: 'Learn Engine subs',          value: '200 by end 2027' },
                { label: 'Government contracts',       value: '1 by Q4 2027, 2 by 2028' },
                { label: 'Enterprise/company packs',   value: '2 contracts by end 2027' },
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
                { stream: 'Agency subs (60 × £499)',       value: '£359K', pct: 73 },
                { stream: 'Recruiter-triggered packs',      value: '£30K',  pct: 6  },
                { stream: 'Consumer packs (£1–10)',         value: '£24K',  pct: 5  },
                { stream: 'Learn Engine subs',              value: '£22K',  pct: 4  },
                { stream: 'Recruiter Pro (ind.)',           value: '£18K',  pct: 4  },
                { stream: 'Company packs',                  value: '£24K',  pct: 5  },
                { stream: 'Govt contract (1)',              value: '£75K',  pct: 15 },
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
            <BarRow year="2026 (H2 launch)" arr="£120K"   pct={2}   agencies="25 agencies, viral £1 pack adoption begins" />
            <BarRow year="2027"             arr="£1.6M"   pct={13}  agencies="160 agencies, recruiter engine exploding" />
            <BarRow year="2028"             arr="£6.5M"   pct={53}  agencies="400 agencies, 3 govt contracts, Learn scaling" />
            <BarRow year="2029"             arr="£22M"    pct={100} agencies="Global scale, DWP engagement, enterprise tier live" />
          </Card>
          <Callout icon="🚀" title="What makes the Upside Case real" body="The upside scenario activates when two things happen simultaneously: the recruiter email feature reaches 50+ agencies creating a self-reinforcing loop (each send brings a new candidate who becomes a direct user), and one government contract proves the institutional model, triggering a procurement pipeline. These are not independent — they compound." color="#22c55e" />
          <Grid cols={2}>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 14 }}>Upside Assumptions</div>
              {[
                { label: 'Recruiter adoption rate',          value: '50–90% in target segment' },
                { label: 'Candidate conversion (rec. email)', value: '70–90% click-to-activate' },
                { label: '£1 pack virality coefficient',     value: '>1.2 (each user brings 1.2 more)' },
                { label: 'Learn Engine subscription take-up', value: '15% of pack users subscribe' },
                { label: 'Government contracts by 2028',     value: '3–5 (council + DWP trial)' },
                { label: 'Premium pack penetration',         value: '25% of pack users upgrade' },
                { label: 'Company pack average size',        value: '£2,500 / contract' },
                { label: 'International revenue (2028)',      value: '20% of total ARR' },
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
                { stream: 'Agency subs + triggered links',    value: '£2.4M', pct: 37 },
                { stream: 'Consumer packs (viral £1–10)',     value: '£900K', pct: 14 },
                { stream: 'Learn Engine subscriptions',       value: '£720K', pct: 11 },
                { stream: 'Premium packs (£5–10)',            value: '£480K', pct: 7  },
                { stream: 'Company packs',                    value: '£600K', pct: 9  },
                { stream: 'Govt & institutional contracts',   value: '£900K', pct: 14 },
                { stream: 'International / multi-language',   value: '£500K', pct: 8  },
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
  },

  'ask': () => <>
    <SectionHead
      label="Financials · The Ask"
      h1="£500K seed round."
      h2="18 months to Series A."
      sub="We are raising £500,000 to complete the product, sign the first 20 agencies, and reach £1M ARR — the Series A threshold."
    />
    <Callout icon="🚀" title="What this investment unlocks" body="The core platform is built and live. The recruiter email feature — the primary revenue driver — is in development. This round funds the final product mile, the first agency sales push, and the infrastructure to scale to 60+ agencies by end of 2027." color="#22c55e" />
    <Grid cols={3}>
      <Stat value="£300K" label="Product & Engineering" sub="60% — complete recruiter email, company portal, scoring v2, multi-language" color="#22c55e" />
      <Stat value="£125K" label="Sales & Partnerships" sub="25% — first 20 agencies, account management, agency marketing" />
      <Stat value="£75K"  label="Operations & Infrastructure" sub="15% — Azure scale, legal, compliance, team" color={A2} />
    </Grid>
    <Grid cols={2}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>18-Month Milestones</div>
        {[
          { q: 'Q3 2026', milestone: 'Recruiter email feature live · First 5 agencies signed' },
          { q: 'Q4 2026', milestone: '10 agencies live · £48K ARR run rate · Company portal beta' },
          { q: 'Q1 2027', milestone: '25 agencies · Pack fusion complete · Multi-language v1' },
          { q: 'Q2 2027', milestone: '50 agencies · First enterprise contract · £600K ARR run rate' },
          { q: 'Q3 2027', milestone: '£1M ARR · Series A ready · 80+ agencies' },
        ].map(m => (
          <div key={m.q} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: A, minWidth: 60 }}>{m.q}</span>
            <span style={{ fontSize: 12, color: '#9090b0', lineHeight: 1.5 }}>{m.milestone}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A2, marginBottom: 16 }}>What Investors Receive</div>
        {[
          { icon: '📈', label: 'Equity stake',               detail: 'Negotiable — term sheet on request' },
          { icon: '🏆', label: 'Category creation upside',   detail: 'First mover in a $50B+ uncontested market' },
          { icon: '👁️', label: 'Board observer rights',       detail: 'Quarterly board access and reporting' },
          { icon: '📊', label: 'Monthly investor updates',   detail: 'MRR, ARR, agency count, product status' },
          { icon: '⚡', label: 'Series A first right',       detail: 'Pro-rata on future rounds' },
          { icon: '🌍', label: 'Global platform exposure',   detail: '50+ language architecture, 7-product ecosystem' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 16 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: '#505070' }}>{r.detail}</div>
            </div>
          </div>
        ))}
      </Card>
    </Grid>
    <div style={{ textAlign: 'center', padding: '32px 0 8px' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>Ready to invest in the future of interview readiness?</div>
      <p style={{ fontSize: 14, color: '#6060a0', marginBottom: 24 }}>Contact Francis directly to discuss terms.</p>
      <a href="mailto:francis@percentile.one" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${A}, ${A2})`, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, boxShadow: `0 8px 32px ${A}40` }}>
        francis@percentile.one →
      </a>
    </div>
  </>,

  'founder': () => <>
    <SectionHead
      label="Founder · Francis Cobbinah"
      h1="Built by someone who"
      h2="lived the problem."
      sub="Francis Cobbinah is the founder of Percentile.One and Explain.Global. He built Explain because he has sat in interview rooms, watched brilliant people fail, and decided to do something about it."
    />
    <Grid cols={1}>
      <Card style={{ background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.15)' }}>
        <div style={{ fontStyle: 'italic', fontSize: 15, color: '#c0c8e0', lineHeight: 1.85, marginBottom: 20, borderLeft: `3px solid ${A}`, paddingLeft: 20 }}>
          "I built Explain because I've sat in interview rooms and watched people who were brilliant — genuinely brilliant — walk out looking broken. Not because they weren't good enough. Because they'd never actually practised. Not once. Not properly. The first time they sat in the chair was the real interview. That ends now."
        </div>
        <div style={{ fontSize: 13, color: '#4F8EF7', fontWeight: 700 }}>— Francis Cobbinah, Founder · Explain.Global · Percentile.One</div>
      </Card>
    </Grid>
    <Grid cols={2}>
      <div>
        {[
          { icon: '🏗️', title: '7 Products Built', body: 'Explain.Global, Candidate Portal, Recruiter Portal, Learn Engine, Interview Chair, TalkToLearn, Percentile.One — all interconnected, all live or in development.' },
          { icon: '💪', title: 'Built Through Adversity', body: 'Francis builds from dialysis. Not as a limitation — as a demonstration of what genuine commitment looks like. This platform exists because one person refused to stop.' },
          { icon: '🌍', title: 'Global Ambition', body: 'The nurse in Lagos. The engineer in Manila. The accountant in Warsaw. Explain was designed globally from the first line of code. Every architectural decision serves this mission.' },
          { icon: '🎯', title: 'Category Vision', body: 'Francis identified PIR — Personalised Interview Readiness — as an unclaimed $50B category before building a single line of product. The thesis drove the architecture. Not the other way around.' },
        ].map(f => <Feature key={f.title} {...f} />)}
      </div>
      <div>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>The Percentile.One Ecosystem</div>
          {[
            { name: 'Explain.Global',      desc: 'Personalised Interview Readiness hub', status: 'Live' },
            { name: 'Candidate Portal',    desc: 'Personal prep command centre',         status: 'Live' },
            { name: 'Recruiter Portal',    desc: 'Placement intelligence',              status: 'Beta' },
            { name: 'Learn Engine',        desc: 'AI-structured lessons, 50+ languages', status: 'Live' },
            { name: 'Interview Chair',     desc: 'Cinematic AI interview simulation',   status: 'Beta' },
            { name: 'Interview Packs',     desc: 'Personalised prep bundles, from £1',  status: 'Live' },
            { name: 'TalkToLearn',         desc: 'Mobile learning companion',           status: 'Dev' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#505070' }}>{p.desc}</div>
              </div>
              <Tag color={p.status === 'Live' ? '#22c55e' : p.status === 'Beta' ? A : '#f59e0b'}>{p.status}</Tag>
            </div>
          ))}
        </Card>
      </div>
    </Grid>
    <div style={{ marginTop: 32, padding: '24px 28px', background: 'rgba(79,142,247,0.06)', border: `1px solid ${A}25`, borderRadius: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: '#9090b0', marginBottom: 4 }}>To speak with Francis directly:</div>
      <a href="mailto:francis@percentile.one" style={{ fontSize: 16, fontWeight: 800, color: A, textDecoration: 'none' }}>francis@percentile.one</a>
      <span style={{ color: '#404060', margin: '0 12px' }}>·</span>
      <a href="tel:+447346814898" style={{ fontSize: 16, fontWeight: 800, color: A, textDecoration: 'none' }}>+44 7346 814898</a>
    </div>
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
          explain<span style={{ color: A }}>.global</span>
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
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#353560', padding: '10px 20px 4px' }}>
              {group.title}
            </div>
            {group.items.map(item => {
              const isActive = item.id === active;
              return (
                <button key={item.id} className="inv-item" onClick={() => go(item.id)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 20px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                  color: isActive ? A : '#606090',
                  fontSize: 12.5, fontWeight: isActive ? 700 : 400,
                  borderLeft: `2px solid ${isActive ? A : 'transparent'}`,
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
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
          <div style={{ padding: '22px 48px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#353560' }}>
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
