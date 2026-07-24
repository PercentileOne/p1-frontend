import { useState } from 'react';
import { generateFollowUps, type ClientSession } from '../../utils/clientSession';

interface Props { session: ClientSession }

export default function ClientQuestions({ session }: Props) {
  const { questions, jobCtx } = session;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'role' | 'hr'>('all');

  const roleQs = questions.filter(q => q.source !== 'HR');
  const hrQs = questions.filter(q => q.source === 'HR');
  const visible = filter === 'role' ? roleQs : filter === 'hr' ? hrQs : questions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header + filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            Interview Questions
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            Generated for {jobCtx.title}{jobCtx.company ? ` at ${jobCtx.company}` : ''} based on this candidate's CV.
            Each question includes recommended follow-up probes.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'role', 'hr'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--blue)' : 'var(--bg2)',
              border: `1px solid ${filter === f ? 'var(--blue)' : 'var(--border)'}`,
              borderRadius: '7px', padding: '5px 12px', fontSize: '12px', fontWeight: 600,
              color: filter === f ? '#fff' : 'var(--text-3)', cursor: 'pointer',
            }}>
              {f === 'all' ? `All (${questions.length})` : f === 'role' ? `Role (${roleQs.length})` : `Culture fit (${hrQs.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Section headers */}
      {filter === 'all' && roleQs.length > 0 && (
        <>
          <SectionLabel text="Role & Competency Questions" color="var(--blue)" sub="James asks these — probe the candidate's role-specific knowledge and experience" />
          {roleQs.map((q, i) => (
            <QuestionCard
              key={q.questionId}
              q={q}
              n={i + 1}
              expanded={expanded === q.questionId}
              onToggle={() => setExpanded(expanded === q.questionId ? null : q.questionId)}
            />
          ))}
          {hrQs.length > 0 && (
            <>
              <SectionLabel text="Culture & Fit Questions" color="#a78bfa" sub="Sarah asks these — assess values, motivation, and team alignment" />
              {hrQs.map((q, i) => (
                <QuestionCard
                  key={q.questionId}
                  q={q}
                  n={roleQs.length + i + 1}
                  expanded={expanded === q.questionId}
                  onToggle={() => setExpanded(expanded === q.questionId ? null : q.questionId)}
                />
              ))}
            </>
          )}
        </>
      )}

      {filter !== 'all' && visible.map((q, i) => (
        <QuestionCard
          key={q.questionId}
          q={q}
          n={i + 1}
          expanded={expanded === q.questionId}
          onToggle={() => setExpanded(expanded === q.questionId ? null : q.questionId)}
        />
      ))}

      {/* Print tip */}
      <div style={{ padding: '14px 18px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-3)' }}>
        <strong style={{ color: 'var(--text-2)' }}>Tip:</strong> Expand each question to see the model answer guide and recommended follow-up probes. You don't need to ask all questions — choose the ones most relevant to your priorities.
      </div>
    </div>
  );
}

function SectionLabel({ text, color, sub }: { text: string; color: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '4px', borderBottom: `2px solid ${color}22` }}>
      <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{text}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{sub}</div>
      </div>
    </div>
  );
}

function QuestionCard({
  q, n, expanded, onToggle,
}: {
  q: Parameters<typeof generateFollowUps>[0] & { followUps?: string[] };
  n: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const followUps = q.followUps ?? generateFollowUps(q);
  const isHR = q.source === 'HR';
  const accentColor = isHR ? '#a78bfa' : 'var(--blue)';

  return (
    <div style={{
      border: `1px solid ${expanded ? accentColor + '40' : 'var(--border)'}`,
      borderRadius: '12px', background: 'var(--bg2)',
      overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* Question row */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '14px',
          padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
          background: accentColor + '18', border: `1px solid ${accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 800, color: accentColor, fontVariantNumeric: 'tabular-nums',
        }}>
          {n}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <Tag label={q.source === 'HR' ? 'Culture fit' : 'Role'} color={accentColor} />
            <Tag label={q.difficulty} color="var(--text-3)" />
            {q.competencyTags?.slice(0, 2).map(t => <Tag key={t} label={t} color="var(--text-3)" />)}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55 }}>
            {q.questionText}
          </div>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: '16px', flexShrink: 0, marginTop: '2px', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Model answer */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#34D399', marginBottom: '8px' }}>
              What a strong answer looks like
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: '8px', padding: '12px 14px' }}>
              {q.modelAnswer}
            </div>
          </div>

          {/* Follow-up probes */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: accentColor, marginBottom: '8px' }}>
              Follow-up probes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {followUps.map((fu, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <span style={{ color: accentColor, fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>↳</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{fu}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Red flags */}
          <RedFlagHint source={q.source} />
        </div>
      )}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: color + '15', color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
  );
}

function RedFlagHint({ source }: { source: string }) {
  const hints = source === 'HR'
    ? ['Vague on why this company specifically — suggests low motivation', 'Can\'t give a concrete example — may be exaggerating', 'Focuses only on salary or title — misaligned values']
    : ['Can\'t walk through a specific example — may be theoretical, not practical', 'Blames others for failures without reflection — low accountability', 'Gives only positive outcomes — no honesty about difficulty'];

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#F59E0B', marginBottom: '8px' }}>
        Watch out for
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {hints.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-3)', alignItems: 'flex-start' }}>
            <span style={{ color: '#F59E0B', flexShrink: 0 }}>⚠</span>
            {h}
          </div>
        ))}
      </div>
    </div>
  );
}
