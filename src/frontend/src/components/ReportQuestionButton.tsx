import { useState } from 'react';
import { Flag } from 'lucide-react';
import { reportExamQuestion } from '../api/certExamApi';

const REASONS: { value: string; label: string }[] = [
  { value: 'wrong-answer', label: 'The marked answer is wrong' },
  { value: 'unclear', label: 'Unclear or ambiguous' },
  { value: 'off-topic', label: "Not relevant to this exam" },
  { value: 'other', label: 'Something else' },
];

// "Report this question" (Francis, 2026-09-19) — the questions are AI-written, so accuracy is the
// biggest risk of the whole feature and candidates are the best fact-checkers. Enough distinct
// reports and the question stops being served and lands in the admin review queue (server side:
// Features/ExamQuestions/Endpoint.cs). Fully non-blocking: never interrupts the exam flow.
export function ReportQuestionButton({ examId, questionId, compact = false }: { examId: string; questionId: string; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'choosing' | 'sending' | 'sent' | 'error'>('idle');

  async function send(reason: string) {
    setState('sending');
    setState((await reportExamQuestion(examId, questionId, reason)) ? 'sent' : 'error');
  }

  if (state === 'sent') {
    return <span style={{ fontSize: 11, color: '#34D399' }}>Thanks — flagged for review.</span>;
  }
  if (state === 'choosing' || state === 'sending' || state === 'error') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>What's wrong?</span>
        {REASONS.map(r => (
          <button
            key={r.value} disabled={state === 'sending'} onClick={() => send(r.value)}
            style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {r.label}
          </button>
        ))}
        {state === 'error' && <span style={{ fontSize: 11, color: '#EF4444' }}>Couldn't send — try again.</span>}
      </div>
    );
  }
  return (
    <button
      onClick={() => setState('choosing')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, color: 'var(--text-3)', fontSize: compact ? 11 : 12, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <Flag size={compact ? 11 : 12} /> Report this question
    </button>
  );
}
