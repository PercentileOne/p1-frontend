import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardPaste, Compass, Pencil, Plus, Sun, Trash2, X } from 'lucide-react';
import { localDate, routinesApi, MAX_ITEM_TEXT, MAX_READ_TEXT } from '../api/routinesApi';
import type { AddScope, DayItem, DaySummary, RoutineDay, RoutineKind } from '../api/routinesApi';
import { RoutineImport } from '../components/RoutineImport';
import { currentPeriod, routineStatus, sectionPeriod } from './routineStatus';

// My Routines (Francis, 2026-10-13). One page per day, built from the person's template plus their if-then rules the first time that day is opened.
// Left: Today and a year / month / day tree with a dot per day. Right: the day. Essentials are counted first, so a long list is never the thing that makes someone give up.

const GREEN = '#34D399';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const NEW_SECTION = '__new__';
const SUGGESTED = '__suggest__';

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 };
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

function prettyDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function shortDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}
function dotColor(s: DaySummary | undefined): string {
  if (!s || s.total === 0) return 'rgba(255,255,255,0.18)';
  if (s.essentialsTotal > 0 ? s.essentialsDone >= s.essentialsTotal : s.done >= s.total) return GREEN;
  return s.done > 0 ? '#F59E0B' : 'rgba(255,255,255,0.18)';
}
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning. Win the first 40 minutes.' : h < 18 ? 'Good afternoon. What will you make sure you do?' : 'Good evening. How did today go?';
}

export default function RoutinesPage() {
  const today = useMemo(() => localDate(), []);
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<RoutineDay | null>(null);
  const [error, setError] = useState('');
  const [months, setMonths] = useState<Record<string, DaySummary[]>>({});
  const [openMonth, setOpenMonth] = useState<string | null>(today.slice(0, 7));
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const year = Number(today.slice(0, 4));

  const loadMonth = useCallback(async (m: string) => {
    try { const list = await routinesApi.month(m); setMonths(prev => ({ ...prev, [m]: list })); } catch { /* the dots are a nicety; the day still works */ }
  }, []);

  useEffect(() => {
    let alive = true;
    setDay(null); setError(''); setAdding(false); setImporting(false); setMenuFor(null);
    routinesApi.day(date).then(d => { if (alive) setDay(d); }).catch(e => { if (alive) setError((e as Error).message || 'Could not open this day.'); });
    return () => { alive = false; };
  }, [date]);

  useEffect(() => { if (openMonth) void loadMonth(openMonth); }, [openMonth, loadMonth]);

  // Ticks and typed values are saved a moment after the last change.
  function scheduleSave(next: RoutineDay) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      routinesApi.saveState(next.date, next.checked, next.values)
        .then(s => setMonths(prev => {
          const m = next.date.slice(0, 7);
          const list = (prev[m] ?? []).filter(x => x.date !== s.date);
          return { ...prev, [m]: [s, ...list].sort((a, b) => b.date.localeCompare(a.date)) };
        }))
        .catch(() => setError('Your last change could not be saved. Check your connection and try again.'));
    }, 600);
  }
  function mutate(fn: (d: RoutineDay) => RoutineDay) {
    setDay(prev => { if (!prev) return prev; const next = fn(prev); scheduleSave(next); return next; });
  }
  const tick = (id: string) => mutate(d => ({ ...d, checked: { ...d.checked, [id]: !d.checked[id] } }));
  const setValue = (id: string, v: string) => mutate(d => ({ ...d, values: { ...d.values, [id]: v } }));

  async function run(p: Promise<RoutineDay>) {
    setError('');
    try { const d = await p; setDay(d); void loadMonth(d.date.slice(0, 7)); }
    catch (e) { setError((e as Error).message || 'That did not work. Try again.'); }
  }

  const counted = day?.items.filter(i => i.kind !== 'text') ?? [];
  const isDone = (i: DayItem) => !!day && (day.checked[i.id] || (i.kind === 'number' && !!day.values[i.id]?.trim()));
  const ess = counted.filter(i => i.essential);
  const essDone = ess.filter(isDone).length;
  const allDone = counted.filter(isDone).length;
  const pct = ess.length > 0 ? essDone / ess.length : counted.length > 0 ? allDone / counted.length : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 230px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }} className="routines-grid">
      <style>{`@media (max-width: 760px) { .routines-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>

      <aside style={{ ...card, padding: 10 }}>
        <TreeButton on={date === today} onClick={() => setDate(today)} icon={<Sun size={15} />} label="Today" />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-3)', margin: '12px 8px 4px' }}>{year}</div>
        {MONTHS.map((name, idx) => {
          const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
          if (key > today.slice(0, 7)) return null;
          const open = openMonth === key;
          const list = months[key] ?? [];
          return (
            <div key={key}>
              <TreeButton on={false} onClick={() => setOpenMonth(open ? null : key)} icon={open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} label={name} />
              {open && (
                <div style={{ padding: '2px 0 6px 18px' }}>
                  {list.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '4px 8px' }}>No days opened yet</div>}
                  {list.map(s => (
                    <button key={s.date} onClick={() => setDate(s.date)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: date === s.date ? 'rgba(52,211,153,0.12)' : 'transparent', color: date === s.date ? GREEN : 'var(--text-2)', fontSize: 12.5, textAlign: 'left',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(s), flexShrink: 0 }} />
                      {shortDay(s.date)}{s.date === today ? ' (today)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '10px 8px 2px', lineHeight: 1.5 }}>
          Green: essentials done. Amber: part done.
        </div>
      </aside>

      <section style={{ ...card, padding: '18px 20px', minWidth: 0 }}>
        {!day && !error && <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Opening your day…</div>}
        {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
        {day && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{prettyDate(day.date)}</h2>
                <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 3 }}>{day.date === today ? greeting() : 'Looking back on this day.'}</div>
                <button onClick={() => setShowStatus(v => !v)} aria-expanded={showStatus} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13.5, fontWeight: 700, border: `1px solid ${showStatus ? GREEN : 'rgba(52,211,153,0.45)'}`,
                  background: showStatus ? 'rgba(52,211,153,0.14)' : 'rgba(52,211,153,0.07)', color: GREEN,
                }}><Compass size={15} /> Where am I?</button>
              </div>
              <div style={{ minWidth: 150, textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {ess.length > 0 ? <><b style={{ color: 'var(--text)' }}>{essDone} of {ess.length}</b> essentials</> : <><b style={{ color: 'var(--text)' }}>{allDone} of {counted.length}</b> done</>}
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: GREEN, transition: 'width 0.25s' }} />
                </div>
                {ess.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{allDone} of {counted.length} in all</div>}
              </div>
            </div>

            {showStatus && <WhereAmI day={day} isToday={day.date === today} onClose={() => setShowStatus(false)} />}

            {day.sections.map(section => {
              const items = day.items.filter(i => i.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section} style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>{section}</div>
                  {items.map(i => (
                    <ItemRow key={i.id} item={i} day={day} menuOpen={menuFor === i.id}
                      onMenu={() => setMenuFor(menuFor === i.id ? null : i.id)}
                      onTick={() => tick(i.id)} onValue={v => setValue(i.id, v)}
                      onEssential={() => { setMenuFor(null); void run(routinesApi.updateItem(day.date, i.id, { essential: !i.essential })); }}
                      onEdit={async text => { await run(routinesApi.updateItem(day.date, i.id, { text })); setMenuFor(null); }}
                      onRemoveToday={() => { setMenuFor(null); void run(routinesApi.removeItem(day.date, i.id, 'today')); }}
                      onRemoveAlways={() => { setMenuFor(null); void run(routinesApi.removeItem(day.date, i.id, 'template')); }} />
                  ))}
                </div>
              );
            })}

            <div style={{ marginTop: 18 }}>
              {!adding && !importing && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setAdding(true)} style={dashed}>
                    <Plus size={15} /> Add an item
                  </button>
                  <button onClick={() => setImporting(true)} style={dashed}>
                    <ClipboardPaste size={15} /> Paste your list
                  </button>
                </div>
              )}
              {adding && <AddItem sections={day.sections} onCancel={() => setAdding(false)}
                onAdd={async body => { await run(routinesApi.addItem(day.date, body)); setAdding(false); }} />}
              {importing && <RoutineImport date={day.date} onCancel={() => setImporting(false)}
                onDone={d => { setDay(d); void loadMonth(d.date.slice(0, 7)); setImporting(false); }} />}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// "Where am I?": a plain-English read of the day from what is ticked, recalculated live as ticks change. Worked out in the browser; nothing is sent anywhere.
function WhereAmI({ day, isToday, onClose }: { day: RoutineDay; isToday: boolean; onClose: () => void }) {
  const s = useMemo(() => routineStatus(day, new Date(), isToday), [day, isToday]);
  const jump = (id: string) => {
    const el = document.getElementById(`routine-item-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <div role="status" aria-live="polite" style={{ marginTop: 16, border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.06)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>{s.headline}</div>
        <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', padding: 2 }}><X size={16} /></button>
      </div>
      {s.blocks.map(b => (
        <div key={b.label} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>{b.label}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {b.items.map(i => (
              <button key={i.id} onClick={() => jump(i.id)} style={{
                padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', overflowWrap: 'anywhere',
              }}>{i.text.length > 70 ? i.text.slice(0, 67) + '…' : i.text}</button>
            ))}
            {b.more > 0 && <span style={{ fontSize: 12.5, color: 'var(--text-3)', alignSelf: 'center' }}>and {b.more} more</span>}
          </div>
        </div>
      ))}
      {s.ahead.length > 0 && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-3)' }}>Still ahead: {s.ahead.join(' · ')}</div>}
    </div>
  );
}

function TreeButton({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      background: on ? 'rgba(52,211,153,0.12)' : 'transparent', color: on ? GREEN : 'var(--text-2)', fontSize: 13, fontWeight: on ? 700 : 500,
    }}>{icon}{label}</button>
  );
}

function ItemRow(p: {
  item: DayItem; day: RoutineDay; menuOpen: boolean; onMenu: () => void; onTick: () => void; onValue: (v: string) => void;
  onEssential: () => void; onEdit: (text: string) => Promise<void>; onRemoveToday: () => void; onRemoveAlways: () => void;
}) {
  const { item, day } = p;
  const done = !!day.checked[item.id] || (item.kind === 'number' && !!day.values[item.id]?.trim());
  const note = item.kind === 'text';
  const read = item.kind === 'read';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [saving, setSaving] = useState(false);
  const limit = read ? MAX_READ_TEXT : MAX_ITEM_TEXT;

  async function saveEdit() {
    if (!draft.trim()) return;
    setSaving(true);
    try { await p.onEdit(draft.trim()); setEditing(false); } finally { setSaving(false); }
  }

  const tags = (
    <>
      {item.essential && <span style={tag('52,211,153', GREEN)}>Essential</span>}
      {item.ruleLabel && <span style={tag('245,158,11', '#F59E0B')}>{item.ruleLabel}</span>}
    </>
  );

  return (
    <div id={`routine-item-${item.id}`} style={{ borderBottom: '1px solid var(--border)', padding: '9px 0', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {!note && !read && <input type="checkbox" checked={!!day.checked[item.id]} onChange={p.onTick} aria-label={item.text} style={{ marginTop: 3, width: 17, height: 17, accentColor: GREEN, flexShrink: 0, cursor: 'pointer' }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={read ? 6 : 2} maxLength={limit} aria-label="Edit wording" style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <SmallBtn onClick={() => void saveEdit()}>{saving ? 'Saving…' : 'Save wording'}</SmallBtn>
                <SmallBtn onClick={() => { setEditing(false); setDraft(item.text); }}>Cancel</SmallBtn>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                {item.source === 'template' ? 'This changes today and every day from now on. Past days keep their wording.' : 'This changes today only.'}
              </div>
            </div>
          ) : read ? (
            <>
              <div style={{
                whiteSpace: 'pre-wrap', fontSize: 15.5, lineHeight: 1.75, color: 'var(--text)', background: 'rgba(52,211,153,0.06)',
                borderLeft: `3px solid ${GREEN}`, borderRadius: 10, padding: '12px 14px', overflowWrap: 'anywhere', opacity: day.checked[item.id] ? 0.7 : 1,
              }}>{item.text}</div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 10, cursor: 'pointer', fontSize: 14, color: done ? 'var(--text-3)' : 'var(--text)', fontWeight: 600 }}>
                <input type="checkbox" checked={!!day.checked[item.id]} onChange={p.onTick} aria-label={`I've read it: ${item.text.slice(0, 40)}`} style={{ width: 17, height: 17, accentColor: GREEN, cursor: 'pointer' }} />
                I've read it{tags}
              </label>
            </>
          ) : (
            <div style={{ fontSize: 14.5, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>
              {item.text}
              {tags}
            </div>
          )}
          {!editing && item.kind === 'number' && (
            <input value={day.values[item.id] ?? ''} onChange={e => p.onValue(e.target.value)} inputMode="decimal" placeholder="Enter the number" aria-label={`${item.text}: value`}
              style={{ ...field, width: 150, marginTop: 6, padding: '6px 9px', fontSize: 13.5 }} />
          )}
          {!editing && note && (
            <textarea value={day.values[item.id] ?? ''} onChange={e => p.onValue(e.target.value)} rows={2} placeholder="Write a line or two" aria-label={item.text}
              style={{ ...field, marginTop: 6, resize: 'vertical' }} />
          )}
        </div>
        <button onClick={p.onMenu} aria-label={`Options for ${item.text.slice(0, 60)}`} aria-expanded={p.menuOpen} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 6px' }}>⋯</button>
      </div>
      {p.menuOpen && !editing && (
        <div style={{ margin: '8px 0 0 27px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SmallBtn onClick={() => { setDraft(item.text); setEditing(true); }}><Pencil size={12} /> Edit wording</SmallBtn>
          {!note && <SmallBtn onClick={p.onEssential}>{item.essential ? 'Not essential' : 'Make essential'}</SmallBtn>}
          <SmallBtn onClick={p.onRemoveToday}><Trash2 size={12} /> Remove for today</SmallBtn>
          {item.source === 'template' && <SmallBtn onClick={p.onRemoveAlways}><Trash2 size={12} /> Remove from every day</SmallBtn>}
        </div>
      )}
    </div>
  );
}

const dashed: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 10, padding: '9px 14px',
  color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
};

const tag = (rgb: string, color: string): React.CSSProperties => ({
  marginLeft: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 99, color,
  background: `rgba(${rgb},0.14)`, border: `1px solid rgba(${rgb},0.35)`, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
});

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{children}</button>;
}

function AddItem({ sections, onAdd, onCancel }: {
  sections: string[]; onCancel: () => void;
  onAdd: (b: { text: string; section: string; kind: RoutineKind; essential: boolean; scope: AddScope; rule?: { weekdays: number[]; lastDayOfMonth: boolean; label: string } }) => Promise<void>;
}) {
  const [text, setText] = useState('');
  // Defaults to the part of the day it is now (so in the evening, "Evening"). Sections that do not exist yet can be created on the spot.
  const [section, setSection] = useState(() => sections.find(s => sectionPeriod(s) === currentPeriod(new Date())) ?? sections[0] ?? '');
  const [newSection, setNewSection] = useState('');
  const missing = (['Morning', 'Afternoon', 'Evening'] as const).filter((_, idx) => !sections.some(s => sectionPeriod(s) === idx));
  const [kind, setKind] = useState<RoutineKind>('check');
  const [essential, setEssential] = useState(false);
  const [scope, setScope] = useState<AddScope>('today');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [last, setLast] = useState(false);
  const [label, setLabel] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim()) { setProblem('Type what the item is.'); return; }
    if (scope === 'rule' && weekdays.length === 0 && !last) { setProblem('Choose which days.'); return; }
    const target = section === NEW_SECTION ? newSection.trim()
      : section.startsWith(SUGGESTED) ? section.slice(SUGGESTED.length)
      : section;
    if (!target) { setProblem('Name the new section.'); return; }
    setProblem(''); setBusy(true);
    try {
      await onAdd({ text: text.trim(), section: target, kind, essential, scope, ...(scope === 'rule' ? { rule: { weekdays, lastDayOfMonth: last, label: label.trim() } } : {}) });
    } finally { setBusy(false); }
  }
  const radio = (v: AddScope, title: string, sub: string) => (
    <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', padding: '6px 0' }}>
      <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} style={{ marginTop: 3, accentColor: GREEN }} />
      <span><span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{title}</span><br /><span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{sub}</span></span>
    </label>
  );
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Add an item</div>
        <button onClick={onCancel} aria-label="Cancel" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
      </div>
      {kind === 'read'
        ? <textarea value={text} onChange={e => { setText(e.target.value); setProblem(''); }} rows={6} placeholder={'The words you read aloud, for example your morning declarations or a prayer. Keep your own line breaks.'} aria-label="What is the item" style={{ ...field, resize: 'vertical', lineHeight: 1.55 }} maxLength={MAX_READ_TEXT} />
        : <input value={text} onChange={e => { setText(e.target.value); setProblem(''); }} placeholder="For example: Take a walk after lunch" aria-label="What is the item" style={field} maxLength={MAX_ITEM_TEXT} />}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <select value={section} onChange={e => { setSection(e.target.value); setProblem(''); }} aria-label="Section" style={{ ...field, width: 'auto', minWidth: 140 }}>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
          {missing.map(n => <option key={n} value={SUGGESTED + n}>{n} (new section)</option>)}
          <option value={NEW_SECTION}>Another new section…</option>
        </select>
        {section === NEW_SECTION && (
          <input value={newSection} onChange={e => { setNewSection(e.target.value); setProblem(''); }} placeholder="Name the section" aria-label="New section name" maxLength={60}
            style={{ ...field, width: 'auto', minWidth: 160 }} />
        )}
        <select value={kind} onChange={e => setKind(e.target.value as RoutineKind)} aria-label="Type of item" style={{ ...field, width: 'auto', minWidth: 140 }}>
          <option value="check">A tick box</option>
          <option value="number">A number to enter</option>
          <option value="text">A note to write</option>
          <option value="read">Something to read aloud</option>
        </select>
        {kind !== 'text' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={essential} onChange={e => setEssential(e.target.checked)} style={{ accentColor: GREEN }} /> Essential
          </label>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        {radio('today', 'Just for today', 'It appears on this day only.')}
        {radio('always', 'Every day', 'It joins your template, so it appears every day from now on.')}
        {radio('rule', 'On certain days', 'For example every Sunday, or the last day of the month.')}
      </div>
      {scope === 'rule' && (
        <div style={{ margin: '4px 0 6px 26px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((w, i) => {
              const on = weekdays.includes(i);
              return <button key={w} onClick={() => setWeekdays(on ? weekdays.filter(x => x !== i) : [...weekdays, i])} aria-pressed={on} style={{
                padding: '6px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${on ? GREEN : 'var(--border)'}`, background: on ? 'rgba(52,211,153,0.15)' : 'transparent', color: on ? GREEN : 'var(--text-2)',
              }}>{w}</button>;
            })}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--text-2)', marginTop: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={last} onChange={e => setLast(e.target.checked)} style={{ accentColor: GREEN }} /> The last day of the month
          </label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name this rule, for example Dialysis day (optional)" maxLength={40} style={{ ...field, marginTop: 8 }} />
        </div>
      )}
      {problem && <div role="alert" style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{problem}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={() => void submit()} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>{busy ? 'Adding…' : 'Add item'}</button>
        <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      </div>
    </div>
  );
}
