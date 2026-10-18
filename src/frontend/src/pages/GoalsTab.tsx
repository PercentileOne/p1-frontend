import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Pause, Pencil, Play, Plus, Target, Trash2, X } from 'lucide-react';
import { GOAL_CATEGORIES, MAX_GOAL_DESCRIPTION, MAX_GOAL_TITLE, MAX_MILESTONES, daysUntil, planningApi } from '../api/planningApi';
import type { Goal, GoalInput, GoalTrack, Milestone } from '../api/planningApi';
import { localDate } from '../api/routinesApi';

// Goals (Francis, 2026-10-18): a smaller version of the original P1 goals. A list of goal cards, each with a description, dates and tracking: a checklist of milestones or a number.

const GREEN = '#34D399';
const AMBER = '#F59E0B';
const RED = '#F87171';
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 };
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const label: React.CSSProperties = { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.03em' };

function prettyDate(date: string): string {
  if (!date) return 'No date';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function barColour(g: Goal, today: string): string {
  if (g.status === 'completed') return GREEN;
  if (g.targetDate && daysUntil(g.targetDate, today) < 0) return RED;
  return g.progress >= 60 ? GREEN : AMBER;
}
function dueText(g: Goal, today: string): { text: string; colour: string } {
  if (g.status === 'completed') return { text: g.completedAt ? `Completed ${prettyDate(g.completedAt.slice(0, 10))}` : 'Completed', colour: GREEN };
  if (!g.targetDate) return { text: 'No target date', colour: 'var(--text-3)' };
  const n = daysUntil(g.targetDate, today);
  if (n < 0) return { text: `${-n} day${n === -1 ? '' : 's'} overdue`, colour: RED };
  if (n === 0) return { text: 'Due today', colour: AMBER };
  return { text: `${n} day${n === 1 ? '' : 's'} left`, colour: n <= 14 ? AMBER : 'var(--text-3)' };
}

export default function GoalsTab() {
  const today = useMemo(() => localDate(), []);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let alive = true;
    planningApi.goals().then(g => { if (alive) setGoals(g); }).catch(e => { if (alive) { setGoals([]); setError((e as Error).message); } });
    return () => { alive = false; };
  }, []);

  function replace(g: Goal) { setGoals(prev => (prev ?? []).map(x => (x.id === g.id ? g : x))); }
  async function run(fn: () => Promise<Goal | void>) {
    setError('');
    try { const r = await fn(); if (r) replace(r); } catch (e) { setError((e as Error).message || 'That did not save. Try again.'); }
  }

  const active = (goals ?? []).filter(g => g.status === 'active');
  const paused = (goals ?? []).filter(g => g.status === 'paused');
  const done = (goals ?? []).filter(g => g.status === 'completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Your goals</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>People who write their goals down are far more likely to reach them. Keep this list short and real.</div>
        </div>
        <button type="button" onClick={() => setEditing('new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: GREEN, color: '#04130d', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={16} /> Add a goal
        </button>
      </div>

      {error && <div role="alert" style={{ ...card, padding: 12, color: RED, fontSize: 14 }}>{error}</div>}

      {editing && (
        <GoalForm
          goal={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={async input => {
            setError('');
            try {
              if (editing === 'new') { const g = await planningApi.createGoal(input); setGoals(prev => [g, ...(prev ?? [])]); }
              else { const g = await planningApi.updateGoal(editing.id, input); replace(g); }
              setEditing(null);
            } catch (e) { setError((e as Error).message || 'That did not save. Try again.'); }
          }}
        />
      )}

      {goals === null && <div style={{ color: 'var(--text-3)' }}>Loading your goals…</div>}

      {goals !== null && goals.length === 0 && !editing && (
        <div style={{ ...card, padding: 22, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Target size={28} color={GREEN} />
          <div style={{ fontWeight: 700, color: 'var(--text)' }}>No goals yet</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14, maxWidth: 460 }}>
            Start with one. For example: pass my next interview, learn Azure fundamentals, or practise a spoken answer every day for 30 days.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {active.map(g => <GoalCard key={g.id} g={g} today={today} run={run} onEdit={() => setEditing(g)} onDelete={() => run(async () => { await planningApi.deleteGoal(g.id); setGoals(prev => (prev ?? []).filter(x => x.id !== g.id)); })} />)}
      </div>

      {paused.length > 0 && (
        <>
          <div style={{ ...label, marginTop: 4 }}>PAUSED</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {paused.map(g => <GoalCard key={g.id} g={g} today={today} run={run} onEdit={() => setEditing(g)} onDelete={() => run(async () => { await planningApi.deleteGoal(g.id); setGoals(prev => (prev ?? []).filter(x => x.id !== g.id)); })} />)}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <button type="button" onClick={() => setShowDone(s => !s)} aria-expanded={showDone} style={{ ...label, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>
            {showDone ? 'HIDE' : 'SHOW'} COMPLETED ({done.length})
          </button>
          {showDone && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {done.map(g => <GoalCard key={g.id} g={g} today={today} run={run} onEdit={() => setEditing(g)} onDelete={() => run(async () => { await planningApi.deleteGoal(g.id); setGoals(prev => (prev ?? []).filter(x => x.id !== g.id)); })} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({ g, today, run, onEdit, onDelete }: {
  g: Goal; today: string; run: (fn: () => Promise<Goal | void>) => Promise<void>; onEdit: () => void; onDelete: () => void;
}) {
  const [note, setNote] = useState('');
  const [value, setValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const due = dueText(g, today);
  const colour = barColour(g, today);
  const last = g.updates.length > 0 ? g.updates[g.updates.length - 1] : null;

  function toggleMilestone(i: number) {
    const next = g.milestones.map((m, k) => (k === i ? { ...m, done: !m.done } : m));
    void run(() => planningApi.updateGoal(g.id, { milestones: next }));
  }

  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: g.status === 'paused' ? 0.8 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', overflowWrap: 'anywhere' }}>{g.title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {g.category && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(52,211,153,0.12)', color: GREEN }}>{g.category}</span>}
            {g.status === 'paused' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.14)', color: AMBER }}>Paused</span>}
            {g.status === 'completed' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(52,211,153,0.2)', color: GREEN }}>Completed</span>}
          </div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: colour, fontVariantNumeric: 'tabular-nums' }}>{g.progress}%</div>
      </div>

      <div role="progressbar" aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title} progress`} style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${g.progress}%`, height: '100%', background: colour }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-3)' }}><CalendarDays size={14} /> {prettyDate(g.startDate)} to {prettyDate(g.targetDate)}</span>
        <span style={{ color: due.colour, fontWeight: 600 }}>{due.text}</span>
      </div>

      {g.description && <div style={{ fontSize: 14, color: 'var(--text-2, var(--text))', overflowWrap: 'anywhere' }}>{g.description}</div>}

      {g.track === 'milestones' && g.milestones.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {g.milestones.map((m, i) => (
            <li key={m.id ?? i}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: g.status === 'completed' ? 'default' : 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={m.done} disabled={g.status === 'completed'} onChange={() => toggleMilestone(i)} style={{ marginTop: 3, accentColor: GREEN }} />
                <span style={{ textDecoration: m.done ? 'line-through' : 'none', color: m.done ? 'var(--text-3)' : 'var(--text)', overflowWrap: 'anywhere' }}>{m.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {g.track === 'number' && (
        <div style={{ fontSize: 14, color: 'var(--text)' }}>
          <b>{g.currentValue ?? 0}</b> of <b>{g.targetValue ?? '?'}</b> {g.unit ?? ''}
          {g.status !== 'completed' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input aria-label={`New value for ${g.title}`} inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="Where are you now?" style={{ ...field, flex: 1 }} />
              <button type="button" disabled={value.trim() === '' || Number.isNaN(Number(value))} onClick={() => { const v = Number(value); setValue(''); void run(() => planningApi.addUpdate(g.id, { value: v })); }}
                style={{ background: 'rgba(52,211,153,0.15)', color: GREEN, border: '1px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Update</button>
            </div>
          )}
        </div>
      )}

      {last && (
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: 8, overflowWrap: 'anywhere' }}>
          Latest note ({prettyDate(last.date)}): {last.note || `value ${last.value}`}
        </div>
      )}

      {g.status !== 'completed' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input aria-label={`Progress note for ${g.title}`} value={note} maxLength={500} onChange={e => setNote(e.target.value)} placeholder="Add a progress note" style={{ ...field, flex: 1 }} />
          <button type="button" disabled={note.trim() === ''} onClick={() => { const n = note.trim(); setNote(''); void run(() => planningApi.addUpdate(g.id, { note: n })); }}
            style={{ background: 'none', color: GREEN, border: '1px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        {g.status === 'active' && <SmallAction icon={<Check size={14} />} label="Mark complete" onClick={() => void run(() => planningApi.updateGoal(g.id, { status: 'completed' }))} />}
        {g.status === 'active' && <SmallAction icon={<Pause size={14} />} label="Pause" onClick={() => void run(() => planningApi.updateGoal(g.id, { status: 'paused' }))} />}
        {g.status !== 'active' && <SmallAction icon={<Play size={14} />} label="Reopen" onClick={() => void run(() => planningApi.updateGoal(g.id, { status: 'active' }))} />}
        <SmallAction icon={<Pencil size={14} />} label="Edit" onClick={onEdit} />
        {!confirmDelete
          ? <SmallAction icon={<Trash2 size={14} />} label="Delete" onClick={() => setConfirmDelete(true)} />
          : <>
              <SmallAction icon={<Trash2 size={14} />} label="Yes, delete it" danger onClick={onDelete} />
              <SmallAction icon={<X size={14} />} label="Keep it" onClick={() => setConfirmDelete(false)} />
            </>}
      </div>
    </div>
  );
}

function SmallAction({ icon, label: text, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12.5, cursor: 'pointer', color: danger ? RED : 'var(--text-2, var(--text))', fontFamily: 'inherit' }}>
      {icon}{text}
    </button>
  );
}

function GoalForm({ goal, onCancel, onSave }: { goal: Goal | null; onCancel: () => void; onSave: (input: GoalInput) => Promise<void> }) {
  const today = localDate();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [category, setCategory] = useState(goal?.category ?? GOAL_CATEGORIES[0]);
  const [startDate, setStartDate] = useState(goal?.startDate ?? today);
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [track, setTrack] = useState<GoalTrack>(goal?.track ?? 'milestones');
  const [milestones, setMilestones] = useState<Milestone[]>(goal?.milestones ?? []);
  const [newMilestone, setNewMilestone] = useState('');
  const [targetValue, setTargetValue] = useState(goal?.targetValue != null ? String(goal.targetValue) : '');
  const [currentValue, setCurrentValue] = useState(goal?.currentValue != null ? String(goal.currentValue) : '');
  const [unit, setUnit] = useState(goal?.unit ?? '');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  function addMilestone() {
    const t = newMilestone.trim();
    if (!t || milestones.length >= MAX_MILESTONES) return;
    setMilestones(m => [...m, { text: t, done: false }]);
    setNewMilestone('');
  }
  async function submit() {
    if (title.trim() === '') { setProblem('Give the goal a title.'); return; }
    if (targetDate && startDate && targetDate < startDate) { setProblem("The target date can't be before the start date."); return; }
    if (track === 'number' && !(Number(targetValue) > 0)) { setProblem('Enter the number you are aiming for.'); return; }
    setProblem(''); setSaving(true);
    const pending = newMilestone.trim();
    const all = pending && track === 'milestones' ? [...milestones, { text: pending, done: false }] : milestones;
    await onSave({
      title: title.trim(), description: description.trim(), category, startDate, targetDate, track,
      milestones: track === 'milestones' ? all : [],
      targetValue: track === 'number' ? Number(targetValue) : null,
      currentValue: track === 'number' && currentValue.trim() !== '' ? Number(currentValue) : null,
      unit: track === 'number' ? unit.trim() : '',
    });
    setSaving(false);
  }

  return (
    <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }} role="group" aria-label={goal ? 'Edit goal' : 'Add a goal'}>
      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{goal ? 'Edit goal' : 'Add a goal'}</div>
      <div>
        <label htmlFor="goalTitle" style={label}>WHAT IS THE GOAL?</label>
        <input id="goalTitle" value={title} maxLength={MAX_GOAL_TITLE} onChange={e => setTitle(e.target.value)} placeholder="Pass my next interview" style={field} />
      </div>
      <div>
        <label htmlFor="goalDesc" style={label}>WHY DOES IT MATTER? (OPTIONAL)</label>
        <textarea id="goalDesc" value={description} maxLength={MAX_GOAL_DESCRIPTION} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...field, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div>
          <label htmlFor="goalCat" style={label}>CATEGORY</label>
          <select id="goalCat" value={category} onChange={e => setCategory(e.target.value)} style={field}>
            {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="goalStart" style={label}>START</label>
          <input id="goalStart" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={field} />
        </div>
        <div>
          <label htmlFor="goalTarget" style={label}>TARGET DATE</label>
          <input id="goalTarget" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={field} />
        </div>
      </div>

      <div>
        <div style={label}>HOW WILL YOU TRACK IT?</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }} role="group" aria-label="Tracking style">
          {([['milestones', 'A checklist of steps'], ['number', 'A number']] as [GoalTrack, string][]).map(([t, text]) => (
            <button key={t} type="button" aria-pressed={track === t} onClick={() => setTrack(t)}
              style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${track === t ? GREEN : 'var(--border)'}`, background: track === t ? 'rgba(52,211,153,0.14)' : 'none', color: track === t ? GREEN : 'var(--text-2, var(--text))', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>{text}</button>
          ))}
        </div>
      </div>

      {track === 'milestones' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {milestones.map((m, i) => (
            <div key={m.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{m.text}</span>
              <button type="button" aria-label={`Remove step ${m.text}`} onClick={() => setMilestones(list => list.filter((_, k) => k !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input aria-label="Add a step" value={newMilestone} maxLength={200} onChange={e => setNewMilestone(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }} placeholder="Add a step, then press Enter" style={{ ...field, flex: 1 }} />
            <button type="button" onClick={addMilestone} style={{ background: 'none', color: GREEN, border: '1px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          <div><label htmlFor="goalTV" style={label}>AIMING FOR</label><input id="goalTV" inputMode="decimal" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="24" style={field} /></div>
          <div><label htmlFor="goalCV" style={label}>SO FAR</label><input id="goalCV" inputMode="decimal" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0" style={field} /></div>
          <div><label htmlFor="goalUnit" style={label}>UNIT</label><input id="goalUnit" value={unit} maxLength={20} onChange={e => setUnit(e.target.value)} placeholder="books" style={field} /></div>
        </div>
      )}

      {problem && <div role="alert" style={{ color: RED, fontSize: 13 }}>{problem}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={saving} onClick={() => void submit()} style={{ background: GREEN, color: '#04130d', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save goal'}</button>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', color: 'var(--text-2, var(--text))', fontFamily: 'inherit' }}>Cancel</button>
      </div>
    </div>
  );
}
