import { useCallback, useEffect, useState } from 'react';
import { Flame, Lightbulb, Pencil } from 'lucide-react';
import { questionOfTheDayApi, daysText } from '../api/questionOfTheDayApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';

// The feed's first card (Francis, 2026-10-18): one question a day about the person's own career, tap an answer, see the right one, keep a streak.
// The questions are written by TheInterviewChair and the card says so. A wrong answer still keeps the daily streak going: the habit is turning up.

const GREEN = '#34D399';
const RED = '#F87171';
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

export function QuestionOfTheDayCard() {
  const [q, setQ] = useState<QuestionOfTheDay | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setProblem('');
    try { setQ(await questionOfTheDayApi.today()); }
    catch (e) { setProblem((e as Error).message || 'Today\'s question did not load.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function pick(choice: number) {
    if (!q || q.answered || busy) return;
    setBusy(true); setProblem('');
    try { setQ(await questionOfTheDayApi.answer(choice)); }
    catch (e) { setProblem((e as Error).message || 'That answer did not save. Try again.'); }
    finally { setBusy(false); }
  }

  async function saveTopic() {
    const t = topic.trim();
    if (!t) { setProblem('Type a job or subject, such as "Nurse" or "Kubernetes".'); return; }
    setBusy(true); setProblem(''); setNote('');
    try {
      await questionOfTheDayApi.setTopic(t);
      const answeredToday = q?.answered === true;
      if (!answeredToday) await questionOfTheDayApi.swapToday();
      setEditing(false); setTopic('');
      if (answeredToday) setNote('Tomorrow\'s question will be about ' + t + '.');
      else { setQ(null); await load(); }
    } catch (e) { setProblem((e as Error).message || 'That did not save. Try again.'); }
    finally { setBusy(false); }
  }

  const shell: React.CSSProperties = { padding: '18px 20px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 14 };
  const head = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52,211,153,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, flexShrink: 0 }}><Lightbulb size={18} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: GREEN }}>QUESTION OF THE DAY</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Written by TheInterviewChair{q?.topic ? ` · ${q.topic}` : ''}</div>
      </div>
    </div>
  );

  if (!q && !problem) return <div style={shell} aria-busy="true">{head}<div style={{ color: 'var(--text-3)', fontSize: 14 }}>Getting today&apos;s question…</div></div>;

  if (!q) {
    return (
      <div style={shell}>
        {head}
        <div role="alert" style={{ color: RED, fontSize: 14 }}>{problem}</div>
        <button type="button" onClick={() => { setQ(null); void load(); }} style={{ alignSelf: 'flex-start', background: GREEN, color: '#04130d', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
      </div>
    );
  }

  const topicForm = (
    <div role="group" aria-label="Choose a topic" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor="qotdTopic" style={{ fontSize: 14, color: 'var(--text)' }}>What would you like a question about each day?</label>
      <input id="qotdTopic" value={topic} maxLength={80} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveTopic(); }} placeholder="A job or a subject, such as Nurse or Kubernetes" style={field} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={busy} onClick={() => void saveTopic()} style={{ background: GREEN, color: '#04130d', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{busy ? 'Saving…' : 'Get my question'}</button>
        {editing && <button type="button" onClick={() => { setEditing(false); setProblem(''); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', color: 'var(--text-2, var(--text))', fontFamily: 'inherit' }}>Cancel</button>}
      </div>
    </div>
  );

  if (q.needsTopic) {
    return <div style={shell}>{head}{topicForm}{problem && <div role="alert" style={{ color: RED, fontSize: 13 }}>{problem}</div>}</div>;
  }

  return (
    <div style={shell}>
      {head}
      {editing ? topicForm : (
        <>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.45, overflowWrap: 'anywhere' }}>{q.question}</div>
          <div role="group" aria-label="Answers" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.options ?? []).map((opt, i) => {
              const right = q.answered && i === q.correctIndex;
              const wrong = q.answered && i === q.selectedIndex && i !== q.correctIndex;
              return (
                <button key={i} type="button" disabled={q.answered || busy} onClick={() => void pick(i)} aria-pressed={q.answered && i === q.selectedIndex}
                  style={{
                    textAlign: 'left', padding: '12px 14px', borderRadius: 10, fontSize: 14.5, fontFamily: 'inherit', lineHeight: 1.4, overflowWrap: 'anywhere',
                    cursor: q.answered ? 'default' : 'pointer', color: 'var(--text)',
                    border: `1px solid ${right ? GREEN : wrong ? RED : 'var(--border)'}`,
                    background: right ? 'rgba(52,211,153,0.12)' : wrong ? 'rgba(248,113,113,0.10)' : 'var(--bg3, rgba(255,255,255,0.03))',
                  }}>
                  {opt}{right ? '  ✓ Correct answer' : wrong ? '  ✗ Your answer' : ''}
                </button>
              );
            })}
          </div>
          {q.answered && (
            <div style={{ fontSize: 14.5, color: 'var(--text)' }}>
              {q.isCorrect ? 'Nailed it.' : 'Not this time, and that is how it sticks.'} Back tomorrow for the next one.
            </div>
          )}
          {problem && <div role="alert" style={{ color: RED, fontSize: 13 }}>{problem}</div>}
          {note && <div style={{ color: GREEN, fontSize: 13 }}>{note}</div>}
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 13, color: 'var(--text-3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Flame size={15} color={q.streak > 0 ? '#F59E0B' : undefined} />
          {q.streak > 0 ? `${daysText(q.streak)} in a row` : 'Answer today to start a streak'}
          {q.answeredTotal > 0 ? ` · ${q.correctTotal} of ${q.answeredTotal} right` : ''}
        </span>
        {!editing && (
          <button type="button" onClick={() => { setEditing(true); setTopic(q.topic ?? ''); setNote(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>
            <Pencil size={13} /> Change topic
          </button>
        )}
      </div>
    </div>
  );
}
