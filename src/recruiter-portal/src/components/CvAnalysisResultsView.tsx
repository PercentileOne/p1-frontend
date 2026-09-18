import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';
import type { CvAnalysisResult, CvRoleMatch, SavedRoleMatch } from '../api/cvAnalysisApi';
import { generateHotTopics } from '../api/aiScoring';

const ACCENT = '#34D399';

function levelColor(level: number) {
  if (level >= 7) return '#34D399';
  if (level >= 4) return '#F59E0B';
  return '#EF4444';
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

// Grounds the hot-topic bar in the candidate's OWN detected skills rather than an arbitrary
// colour — green if a matching skill is already strong (level >= 7), amber if there's some
// exposure, red if the topic isn't reflected in their CV at all (a genuine gap worth probing at
// interview). Copy-trimmed from the candidate portal's own topicColor(), same substring matching.
function topicColor(topic: string, skills: CvAnalysisResult['skills']): string {
  const norm = topic.toLowerCase();
  const match = skills.find(s => {
    const sName = s.name.toLowerCase();
    return sName.includes(norm) || norm.includes(sName);
  });
  if (!match) return '#EF4444';
  return match.level >= 7 ? '#34D399' : '#F59E0B';
}

// Third-person version of the candidate portal's buildHotTopicGapSentence() — Amina should
// mention this in the recruiter portal too (Francis, 2026-09-18: "it's our whole advertising
// angle for the portal" — the Learn cross-sell is a selling point recruiters should see/hear,
// not just candidates). Client-side string assembly, no extra AI call.
export function buildHotTopicGapSentence(hotTopics: string[], role: string, skills: CvAnalysisResult['skills']): string {
  const gaps = hotTopics.filter(t => topicColor(t, skills) === '#EF4444');
  if (gaps.length === 0) return '';
  const list = gaps.length === 1 ? gaps[0] : `${gaps.slice(0, -1).join(', ')} and ${gaps[gaps.length - 1]}`;
  const plural = gaps.length > 1;
  return ` One more thing — ${list} ${plural ? 'are' : 'is'} very much in demand for ${role} roles right now, and ${plural ? "they're" : "it's"} not reflected in this candidate's CV. Worth asking about at interview — and if they want to brush up, we've got a course waiting for them on our Learn platform.`;
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
  // Fires once hot topics are fetched for the top role, so the parent (modal / shared page) can
  // fold buildHotTopicGapSentence() into whatever narrativeScript it hands the voice overlay.
  onHotTopics?: (topics: string[], role: string) => void;
}

// Extracted from CvAnalysisModal.tsx (Francis, 2026-09-18) — skills chart through narrative
// lists, everything the 'results' step renders once an analysis exists. Reused by both the live
// analysis flow (CvAnalysisModal) and the public shared-view page (SharedCvAnalysisPage), so a
// recruiter's colleague sees exactly the same breakdown without duplicating this JSX.
export function CvAnalysisResultsView({ result, roleRows, rolesLoaded, onHotTopics }: Props) {
  const [hotTopics, setHotTopics] = useState<string[]>([]);
  const [hotTopicsRole, setHotTopicsRole] = useState('');

  // "What's Hot for [top role]" — keyed off the highest-salary match, same as the candidate
  // portal's own version. Fires on every results view (live, saved-record replay, and the public
  // shared page) rather than caching with the saved record — deliberate, since Francis wants this
  // visible everywhere a recruiter or their colleague looks at an analysis.
  useEffect(() => {
    if (!rolesLoaded || roleRows.length === 0) return;
    const topRole = roleRows[0].careerTitle;
    if (topRole === hotTopicsRole) return;
    setHotTopicsRole(topRole);
    generateHotTopics(topRole).then(topics => {
      setHotTopics(topics);
      onHotTopics?.(topics, topRole);
    }).catch(() => setHotTopics([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoaded, roleRows]);

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

      {/* What's Hot for the top suggested role — a screening insight for the recruiter AND the
          product's own Learn cross-sell, informational here (no deep-link target for a recruiter
          to click through to, unlike the candidate portal's "Study on Learn" button). */}
      {hotTopics.length > 0 && (
        <section>
          <SectionHeading icon={<Flame size={13} />}>What's Hot for {hotTopicsRole}</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hotTopics.map(topic => (
              <div key={topic} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: topicColor(topic, result.skills), flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{topic}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#8080b0', marginTop: 8, lineHeight: 1.5 }}>
            Courses for any gaps here are available on our Learn platform.
          </div>
        </section>
      )}

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
