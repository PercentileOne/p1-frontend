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
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap, marginBottom: 32 }}>{children}</div>;
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
        { icon: '🎯', title: 'Every job spec', body: '→ A personalised pack in seconds. 20 tailored questions, model answers, coaching context — generated from the exact role and the candidate's CV.' },
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
        { icon: '😨', label: 'Anxiety from the Unknown', body: 'When you don't know what's coming, anxiety fills the gap. Explain removes the unknown entirely — question structure, competency weighting, scoring criteria.' },
        { icon: '📚', label: 'Generic Preparation', body: 'YouTube videos and interview guides are written for everyone — which means they're written for no one. No job spec. No CV context. No employer-specific framing.' },
        { icon: '🚫', label: 'No Feedback Loop', body: 'Practising in your bedroom mirror gives you no data. No scores. No coaching. No sense of whether your answer was strong, weak, or missed the point entirely.' },
        { icon: '🎲', label: 'Unpredictable Questions', body: 'Candidates often don't know what kind of questions to expect — competency, HR, technical, values-based. Explain generates the exact type and mix for the role.' },
        { icon: '📉', label: 'Structural Weakness', body: 'Most candidates have no framework for answering. They ramble, omit key context, or fail to land a point. Structure beats talent in the room. We teach it.' },
        { icon: '🔄', label: 'No Second Chance', body: 'In a real interview, every answer is live. There's no retry. Explain is the place where you use all your retries before the day that counts.' },
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
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
        { icon: '🌍', title: 'Global by Design', body: 'Lessons generate in the user's preferred language. The nurse in Lagos prepares in Yoruba. The engineer in Warsaw reads in Polish. Same platform, every market.' },
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
    <SectionHead
      label="Product · Recruiter Email"
      h1="One click."
      h2="The candidate arrives prepared."
      sub="The recruiter arranges the interview, opens the Recruiter Portal, clicks one button — and the candidate receives a branded email with their interview details and complimentary access to the full Explain platform."
    />

    {/* The Flow */}
    <Card style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A, marginBottom: 24 }}>The Flow — Seven Steps to a Better Placement</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { n: '1', icon: '📅', label: 'Recruiter arranges the interview' },
          { n: '2', icon: '🖥️', label: 'Opens Recruiter Portal' },
          { n: '3', icon: '⭐', label: 'Clicks "Send Interview Prep"' },
          { n: '4', icon: '📧', label: 'Branded email sent instantly' },
        ].map(s => (
          <div key={s.n} style={{ textAlign: 'center', padding: '16px 12px', background: `${A}08`, border: `1px solid ${A}20`, borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: A, marginBottom: 4 }}>{s.n}</div>
            <div style={{ fontSize: 11, color: '#8080a0', lineHeight: 1.5 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { n: '5', icon: '🎯', label: 'Candidate enters Explain.global', sub: '4 days access, paid by agency' },
          { n: '6', icon: '💪', label: 'Candidate practises & prepares', sub: 'Chair, Packs, Learn Engine' },
          { n: '7', icon: '🏆', label: 'Better interview. Better placement.', sub: 'Agency revenue increases' },
        ].map(s => (
          <div key={s.n} style={{ textAlign: 'center', padding: '16px 12px', background: `${A2}08`, border: `1px solid ${A2}25`, borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: A2, marginBottom: 4 }}>{s.n}</div>
            <div style={{ fontSize: 11, color: '#9090b0', lineHeight: 1.5, fontWeight: 600 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 10, color: '#505070', marginTop: 3 }}>{s.sub}</div>}
          </div>
        ))}
      </div>
    </Card>

    {/* The Mock Email */}
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: A, marginBottom: 16 }}>The Email — What Gary Receives</div>
      <div style={{ background: '#0d1525', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 16, overflow: 'hidden', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        {/* Email header bar */}
        <div style={{ background: '#111827', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', opacity: 0.7 }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', opacity: 0.7 }} />
          <span style={{ marginLeft: 8, fontSize: 11, color: '#404060' }}>New Message</span>
        </div>
        {/* Email meta */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11 }}>
          <div style={{ color: '#505070', marginBottom: 3 }}>From: <span style={{ color: '#8090b0' }}>Vallum Consulting | Powered by Explain.global &lt;no-reply@explain.global&gt;</span></div>
          <div style={{ color: '#505070', marginBottom: 3 }}>To: <span style={{ color: '#8090b0' }}>gary.thompson@gmail.com</span></div>
          <div style={{ color: '#505070' }}>Subject: <span style={{ color: '#c0c8e0', fontWeight: 600 }}>Your Interview Preparation — Senior Software Engineer at DeepMind</span></div>
        </div>
        {/* Email body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 4 }}>
            explain<span style={{ color: A }}>.global</span>
            <span style={{ marginLeft: 12, fontSize: 10, fontWeight: 600, color: '#505070', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Powered by Vallum Consulting</span>
          </div>
          <div style={{ height: 1, background: 'rgba(79,142,247,0.2)', margin: '14px 0' }} />

          <p style={{ fontSize: 14, color: '#c0c8e0', lineHeight: 1.7, margin: '0 0 16px' }}>Hi Gary,</p>
          <p style={{ fontSize: 14, color: '#c0c8e0', lineHeight: 1.7, margin: '0 0 20px' }}>
            Congratulations on securing your interview! Here are your confirmed details:
          </p>

          <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            {[
              { icon: '📅', label: 'Interview Date', value: '12 August 2026' },
              { icon: '🏢', label: 'Company',        value: 'DeepMind' },
              { icon: '📋', label: 'Role',           value: 'Senior Software Engineer' },
              { icon: '👤', label: 'Your Consultant', value: 'Sarah Mitchell · Vallum Consulting' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13 }}>
                <span>{r.icon}</span>
                <span style={{ color: '#6070a0', minWidth: 120 }}>{r.label}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.7, margin: '0 0 20px' }}>
            <strong style={{ color: '#c0c8e0' }}>Vallum Consulting</strong> has activated <strong style={{ color: A }}>4 days of complimentary access</strong> to Explain.global on your behalf — the AI-powered interview preparation platform trusted by top candidates worldwide.
          </p>

          <div style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, borderRadius: 10, padding: '13px 20px', textAlign: 'center', marginBottom: 20, cursor: 'pointer' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.02em' }}>Prepare for Your Interview →</span>
          </div>

          <div style={{ fontSize: 12, color: '#505070', lineHeight: 1.8 }}>
            Your 4 days of free access includes:<br />
            <span style={{ color: '#22c55e' }}>✓</span> Personalised Interview Pack for this exact role &nbsp;
            <span style={{ color: '#22c55e' }}>✓</span> AI Interview Chair with real-time coaching &nbsp;
            <span style={{ color: '#22c55e' }}>✓</span> Learn Engine — master any concept instantly &nbsp;
            <span style={{ color: '#22c55e' }}>✓</span> Full session recording and debrief
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />
          <p style={{ fontSize: 12, color: '#404060', margin: 0, lineHeight: 1.6 }}>
            Go in prepared. Go in confident.<br />
            <span style={{ color: '#505080' }}>Powered by </span>
            <span style={{ color: A, fontWeight: 700 }}>explain.global</span>
          </p>
        </div>
      </div>
    </div>

    {/* Why this changes everything */}
    <Callout icon="⭐" title="Why this changes everything" body="For the first time, a recruiter can send a candidate into an interview genuinely prepared — with one click, at no cost to the candidate, branded by the agency. This is a new revenue-generating touchpoint that didn't exist before. The agency pays £5–10 for access. The candidate arrives 40% better prepared. The conversion rate rises. The client relationship strengthens. Explain becomes embedded in the recruiter workflow — making it extremely sticky." color={A2} />

    <Grid cols={3}>
      <Stat value="+23%" label="Estimated conversion uplift" sub="More placed candidates per agency" color="#22c55e" />
      <Stat value="£5–10" label="Per send, agency-funded" sub="Vs. £0 for the candidate" />
      <Stat value="×4" label="Engagement multiplier" sub="Candidates who prep use 4 more features" color={A2} />
    </Grid>
  </>,

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
          desc: 'The candidate's personal preparation command centre.',
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
