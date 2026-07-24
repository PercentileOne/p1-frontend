import type { ClientSession } from '../../utils/clientSession';

interface Props { session: ClientSession }

export default function ClientOverview({ session }: Props) {
  const { meta, cvCtx, jobCtx, questions } = session;
  const roleQs = questions.filter(q => q.source !== 'HR');
  const hrQs = questions.filter(q => q.source === 'HR');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Interview structure */}
      <Section title="Interview Structure">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <StatCard label="Role questions" value={String(roleQs.length)} sub="Competency & role-specific" color="var(--blue)" />
          <StatCard label="Culture & fit" value={String(hrQs.length)} sub="Behavioural / HR" color="#a78bfa" />
          <StatCard label="Total questions" value={String(questions.length)} sub="Recommended order" color="#34D399" />
          {cvCtx.yearsOfExperience && (
            <StatCard label="Years experience" value={String(cvCtx.yearsOfExperience)} sub={cvCtx.seniority} color="#F59E0B" />
          )}
        </div>
      </Section>

      {/* Recommended structure */}
      <Section title="Recommended Interview Flow">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <FlowStep n={1} label="Welcome & introductions" duration="2 min" desc="Put the candidate at ease. Briefly explain the format." />
          <FlowStep n={2} label={`Role-specific questions (${roleQs.length})`} duration={`${roleQs.length * 4}–${roleQs.length * 6} min`} desc="Probe competencies directly relevant to the role and company. Use follow-up probes when answers are vague." />
          <FlowStep n={3} label={`Culture & fit questions (${hrQs.length})`} duration={`${hrQs.length * 3}–${hrQs.length * 5} min`} desc="Assess values alignment, motivation, and team fit." />
          <FlowStep n={4} label="Candidate questions" duration="5–10 min" desc="Let them ask questions — their questions reveal as much as their answers." />
          <FlowStep n={5} label="Close & next steps" duration="2 min" desc="Explain the process and timeline. Thank them for their time." />
        </div>
      </Section>

      {/* Key strengths to probe */}
      {cvCtx.skills.length > 0 && (
        <Section title="Skills to Probe">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {cvCtx.skills.slice(0, 12).map(s => (
              <span key={s} style={{
                fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px',
                background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
                color: 'var(--text-2)',
              }}>{s}</span>
            ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '12px', lineHeight: 1.6 }}>
            These are skills the candidate has claimed. Use the questions tab to probe each one with evidence-based questions.
          </p>
        </Section>
      )}

      {/* Recruiter notes */}
      {meta.recruiterNotes && (
        <Section title="Recruiter Notes">
          <div style={{
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px', padding: '16px',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
              {meta.recruiterNotes}
            </p>
          </div>
        </Section>
      )}

      {/* Quick tips */}
      <Section title="Interview Tips">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { tip: 'Ask for specific examples', detail: 'Vague answers like "I always do X" are a red flag. Push for "Tell me about a time when…"' },
            { tip: 'Use silence', detail: 'After they finish, wait 3 seconds before moving on. Candidates often add their most honest insight in that pause.' },
            { tip: 'Score as you go', detail: 'Note a 1–5 score mentally after each answer while it\'s fresh. Don\'t rely on memory at the end.' },
            { tip: 'Use the follow-up probes', detail: 'The follow-up questions in the Questions tab are designed to surface depth that the opening question won\'t reach.' },
          ].map(({ tip, detail }) => (
            <div key={tip} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ color: '#34D399', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{tip}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Role context */}
      {(jobCtx.responsibilities.length > 0 || jobCtx.behaviouralThemes.length > 0) && (
        <Section title="Role Context">
          {jobCtx.responsibilities.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Key Responsibilities
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {jobCtx.responsibilities.map((r, i) => (
                  <li key={i} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {jobCtx.behaviouralThemes.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Behavioural Themes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {jobCtx.behaviouralThemes.map(t => (
                  <span key={t} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ fontSize: '28px', fontWeight: 800, color, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{sub}</div>
    </div>
  );
}

function FlowStep({ n, label, duration, desc }: { n: number; label: string; duration: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-3)', flexShrink: 0 }}>
        {n}
      </div>
      <div style={{ flex: 1, paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{duration}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}
