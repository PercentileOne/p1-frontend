import type { ClientSession } from '../../utils/clientSession';

interface Props { session: ClientSession }

export default function ClientProfile({ session }: Props) {
  const { cvCtx, meta } = session;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Summary */}
      <Section title="Candidate Summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {cvCtx.seniority && <InfoCard label="Seniority" value={cvCtx.seniority} />}
          {cvCtx.yearsOfExperience != null && <InfoCard label="Years of experience" value={`${cvCtx.yearsOfExperience} years`} />}
          {meta.currentRole && <InfoCard label="Current role" value={meta.currentRole} />}
          {meta.currentCompany && <InfoCard label="Current employer" value={meta.currentCompany} />}
        </div>
      </Section>

      {/* Experience */}
      {(cvCtx.experience?.length ?? 0) > 0 && (
        <Section title="Work Experience">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cvCtx.experience!.map((exp, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '16px' }}>🏢</span>
                </div>
                <div style={{ flex: 1, paddingBottom: '16px', borderBottom: i < cvCtx.experience!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{exp.role}</div>
                  <div style={{ fontSize: '13px', color: 'var(--blue)', marginBottom: '4px' }}>{exp.company}</div>
                  {exp.period && <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{exp.period}</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {cvCtx.skills.length > 0 && (
        <Section title="Skills">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {cvCtx.skills.map(s => (
              <span key={s} style={{
                fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px',
                background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.18)',
                color: 'var(--text-2)',
              }}>{s}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Qualifications */}
      {cvCtx.education.length > 0 && (
        <Section title="Education & Qualifications">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cvCtx.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <span style={{ color: '#a78bfa', fontSize: '13px', flexShrink: 0 }}>🎓</span>
                <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{e}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Achievements */}
      {cvCtx.achievements.length > 0 && (
        <Section title="Achievements & Highlights">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cvCtx.achievements.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 14px', background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: '8px' }}>
                <span style={{ color: '#34D399', flexShrink: 0, marginTop: '1px' }}>★</span>
                <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55 }}>{a}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CV source badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cvCtx._source === 'ai' ? '#34D399' : '#F59E0B' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {cvCtx._source === 'ai' ? 'CV parsed with AI — high accuracy' : 'CV parsed with heuristic engine — review for accuracy'}
        </span>
      </div>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
