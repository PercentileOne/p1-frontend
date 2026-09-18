import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import type { CvAnalysisResult, CvRoleMatch, SavedRoleMatch } from '../api/cvAnalysisApi';

const ACCENT = '#34D399';

function levelColor(level: number) {
  if (level >= 7) return '#34D399';
  if (level >= 4) return '#F59E0B';
  return '#EF4444';
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

// Normalized shape both the live-view CvRoleMatch (full Career object) and the persisted
// SavedRoleMatch (small snapshot) can be mapped into — keeps this view free of any dependency
// on the live Career type, since a saved/shared record never has one.
export interface CvRoleRow {
  key: string;
  careerTitle: string;
  salaryUkStarting: number;
  salaryUkExpert: number;
}

export function toRoleRows(matches: CvRoleMatch[]): CvRoleRow[] {
  return matches
    .filter((m): m is CvRoleMatch & { career: NonNullable<CvRoleMatch['career']> } => m.career !== null)
    .map(m => ({ key: m.title, careerTitle: m.career.title, salaryUkStarting: m.career.salary.uk.starting, salaryUkExpert: m.career.salary.uk.expert }));
}

export function savedToRoleRows(matches: SavedRoleMatch[]): CvRoleRow[] {
  return matches.map(m => ({ key: m.title, careerTitle: m.careerTitle, salaryUkStarting: m.salaryUkStarting, salaryUkExpert: m.salaryUkExpert }));
}

interface Props {
  result: CvAnalysisResult;
  roleRows: CvRoleRow[];
  rolesLoaded: boolean;
}

// Extracted from CvAnalysisModal.tsx (Francis, 2026-09-18) — skills chart through narrative
// lists, everything the 'results' step renders once an analysis exists. Reused by both the live
// analysis flow (CvAnalysisModal) and the public shared-view page (SharedCvAnalysisPage), so a
// recruiter's colleague sees exactly the same breakdown without duplicating this JSX.
export function CvAnalysisResultsView({ result, roleRows, rolesLoaded }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Skills bar chart */}
      <section>
        <SectionHeading icon={<TrendingUp size={13} />}>Skills Breakdown</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.skills.map(s => (
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

      {/* Roles table */}
      <section>
        <SectionHeading icon={<Sparkles size={13} />}>Roles This Candidate Is Suited For</SectionHeading>
        {!rolesLoaded ? (
          <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0' }}>Matching against real roles…</div>
        ) : roleRows.length === 0 ? (
          <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0', lineHeight: 1.6 }}>
            This candidate's background is senior or specialised enough that we couldn't find a close match in our current roles database — that's a gap in our database coverage, not a reflection on the CV. The skills and strengths analysis above is still accurate.
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            {roleRows.map((r, i) => (
              <div key={r.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', fontSize: 13,
                borderBottom: i < roleRows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>{r.careerTitle}</span>
                <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtK(r.salaryUkStarting)} – {fmtK(r.salaryUkExpert)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Strengths / weaknesses / inconsistencies */}
      <NarrativeList title="Strengths" items={result.strengths} color="#34D399" />
      <NarrativeList title="Weaknesses" items={result.weaknesses} color="#F59E0B" />
      {result.inconsistencies.length > 0 && (
        <NarrativeList title="Inconsistencies Worth Addressing" items={result.inconsistencies} color="#EF4444" />
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
