import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Flame, Lightbulb, Pencil, X } from 'lucide-react';
import { questionOfTheDayApi, daysText } from '../api/questionOfTheDayApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';
import { localDate } from '../api/routinesApi';

// The feed's first card (Francis, 2026-10-18): one question a day about the person's own career, tap an answer, see the right one, keep a streak.
// The questions are written by TheInterviewChair and the card says so. A wrong answer still keeps the daily streak going: the habit is turning up.
// Once answered, right or wrong, the card can be tucked away until tomorrow (Francis, 2026-10-19). On the Feed it folds to one line with a "Show again"; on the Dashboard (hideWhenDone) it goes entirely.
// Only an answered card can be hidden, and the choice is remembered for the day on this device only.

const GREEN = '#34D399';
const RED = '#F87171';
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

const HIDE_KEY = 'tic_qotd_hidden';
function hiddenToday(): boolean {
  try { return localStorage.getItem(HIDE_KEY) === localDate(); } catch { return false; }
}

export function QuestionOfTheDayCard({ hideWhenDone = false, onOpenFeed, spaced = false }: {
  /** The Dashboard version: once answered and hidden, show nothing at all. */
  hideWhenDone?: boolean;
  /** When given, the footer carries a "More in your Feed" link (the Dashboard uses it). */
  onOpenFeed?: () => void;
  /** Leave a gap under the card, for stacking on the Dashboard. */
  spaced?: boolean;
}) {
  const [hidden, setHidden] = useState(hiddenToday);
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

  function hide() { try { localStorage.setItem(HIDE_KEY, localDate()); } catch { /* it will just show again */ } setHidden(true); }
  function showAgain() { try { localStorage.removeItem(HIDE_KEY); } catch { /* fine */ } setHidden(false); }

  const shell: React.CSSProperties = { padding: '18px 20px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: spaced ? 20 : 0 };
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

  if (q.answered && hidden) {
    if (hideWhenDone) return null;
    return (
      <div style={{ ...shell, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '12px 20px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-2, var(--text))' }}>
          <Lightbulb size={16} color={GREEN} /> <strong style={{ color: GREEN }}>Question of the Day</strong> done
          {q.streak > 0 && <span style={{ color: 'var(--text-3)' }}>· <Flame size={14} color="#F59E0B" style={{ verticalAlign: '-2px' }} /> {daysText(q.streak)} in a row</span>}
        </span>
        <button type="button" onClick={showAgain} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>Show again</button>
      </div>
    );
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14.5, color: 'var(--text)' }}>
                {q.isCorrect ? 'Nailed it.' : 'Not this time, and that is how it sticks.'} Back tomorrow for the next one.
              </div>
              <button type="button" onClick={hide} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', color: 'var(--text-2, var(--text))', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700 }}>
                <X size={13} /> Hide until tomorrow
              </button>
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
        {onOpenFeed && !editing && (
          <button type="button" onClick={onOpenFeed} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: 0 }}>
            More in your Feed <ArrowRight size={13} />
          </button>
        )}
        {!editing && (
          <button type="button" onClick={() => { setEditing(true); setTopic(q.topic ?? ''); setNote(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>
            <Pencil size={13} /> Change topic
          </button>
        )}
      </div>
    </div>
  );
}
