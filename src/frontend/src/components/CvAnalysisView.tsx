import { motion } from 'framer-motion';
import { Flame, Sparkles, TrendingUp } from 'lucide-react';
import type { SharedCvView } from '../api/cvAnalysisApi';

// The body of a shared CV analysis: skills, the roles that fit with their pay, what is hot, and (only for a recruiter's full share) the narrative lists. Shared by the public share page
// and the CV Analysis tab on a profile, so both show exactly the same thing. For a candidate's or anonymous share the server has already removed everything but the positives.

const ACCENT = '#34D399';

function levelColor(level: number) {
  if (level >= 7) return '#34D399';
  if (level >= 4) return '#F59E0B';
  return '#EF4444';
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

export function CvAnalysisView({ view }: { view: SharedCvView }) {
  const { analysis, roleMatches } = view;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <SectionHeading icon={<TrendingUp size={13} />}>Skills Breakdown</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {analysis.skills.map(s => (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#c0bcd0', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: '#8080b0' }}>{s.yearsNote ?? ''}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${s.level * 10}%` }} transition={{ duration: 0.6 }}
                  style={{ height: '100%', background: levelColor(s.level), borderRadius: 4 }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading icon={<Sparkles size={13} />}>Roles Worth Applying For</SectionHeading>
        {roleMatches.length === 0 ? (
          <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0' }}>No close real-role matches were found for this CV.</div>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            {roleMatches.map((m, i) => (
              <div key={m.title} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', fontSize: 13,
                borderBottom: i < roleMatches.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>{m.careerTitle}</span>
                <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtK(m.salaryUkStarting)} – {fmtK(m.salaryUkExpert)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {view.hotTopics && view.hotTopics.topics.length > 0 && (
        <section aria-label="What's hot">
          <SectionHeading icon={<Flame size={13} />}>What's Hot for {view.hotTopics.role}</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {view.hotTopics.topics.map(t => (
              <div key={t.name} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</div>
                {t.reason && <div style={{ fontSize: 12, color: '#8080b0', lineHeight: 1.5, marginTop: 2 }}>{t.reason}</div>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#8080b0', marginTop: 8 }}>Courses for any gaps here are available on our Learn platform.</div>
        </section>
      )}

      <NarrativeList title="Strengths" items={analysis.strengths} color="#34D399" />
      <NarrativeList title="Weaknesses" items={analysis.weaknesses} color="#F59E0B" />
      {analysis.inconsistencies.length > 0 && (
        <NarrativeList title="Inconsistencies Worth Addressing" items={analysis.inconsistencies} color="#EF4444" />
      )}
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8080b0', marginBottom: 12 }}>
      {icon} {children}
    </div>
  );
}

function NarrativeList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />}>{title}</SectionHeading>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: '#e0dcff', lineHeight: 1.6 }}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
