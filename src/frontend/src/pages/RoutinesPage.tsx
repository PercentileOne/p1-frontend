import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardPaste, Compass, GripVertical, ListOrdered, Pencil, Plus, Square, Star, Sun, Trash2, Volume2, X } from 'lucide-react';
import { localDate, routinesApi, MAX_ITEM_TEXT, MAX_READ_TEXT } from '../api/routinesApi';
import { MAX_FAVOURITE_NOTE, planningApi } from '../api/planningApi';
import type { FavouriteDay } from '../api/planningApi';
import type { AddScope, DayItem, DaySummary, Priority, RoutineDay, RoutineKind } from '../api/routinesApi';
import { RoutineImport } from '../components/RoutineImport';
import { RoutineCategories } from '../components/RoutineCategories';
import { DayNotes } from '../components/DayNotes';
import type { CategoryEdit } from '../components/RoutineCategories';
import { canMove, moveId, moveSection, orderByDrop, reorderWithin } from './routineOrder';
import type { MoveTo } from './routineOrder';
import { coachVoiceFor, currentPeriod, priorityOf, priorityPhrase, routineStatus, sectionPeriod, spokenStatus } from './routineStatus';
import { speak, unlockTTSAudio } from '../api/ttsApi';

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
function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
const MIN_DATE = '2024-01-01';
/** A calendar date shifted by whole days, in the person's own time zone. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
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
  const [monthKeys, setMonthKeys] = useState<string[]>([]);        // yyyy-MM months that have opened days
  const [openYears, setOpenYears] = useState<string[]>([today.slice(0, 4)]);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [editingCats, setEditingCats] = useState(false);
  const [catMenu, setCatMenu] = useState<string | null>(null);      // the category whose ⋯ menu is open
  // While an item is being dragged: the category's ids in the order they would land in, drawn live.
  const previewRef = useRef<{ section: string; ids: string[]; dragId: string } | null>(null);
  const [preview, setPreviewState] = useState<{ section: string; ids: string[]; dragId: string } | null>(null);
  const setPreview = (p: { section: string; ids: string[]; dragId: string } | null) => { previewRef.current = p; setPreviewState(p); };
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const dayRef = useRef<RoutineDay | null>(null);        // the latest day on screen, so a change never builds on a stale copy
  const pending = useRef<RoutineDay | null>(null);        // the latest unsaved ticks and typed text
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const applyDay = (d: RoutineDay | null) => { dayRef.current = d; setDay(d); };
  /** Go to any day (from the date picker, the arrows or the Today button) and make sure the tree shows its month. */
  const goTo = (d: string) => {
    setDate(d); setOpenMonth(d.slice(0, 7));
    setOpenYears(prev => (prev.includes(d.slice(0, 4)) ? prev : [...prev, d.slice(0, 4)]));
  };
  // Favourite days: the star on a day, with an optional note, and a list to jump back to them.
  const [favs, setFavs] = useState<FavouriteDay[]>([]);
  useEffect(() => {
    let alive = true;
    planningApi.favourites().then(list => { if (alive && Array.isArray(list)) setFavs(list); }).catch(() => { /* the stars are a nicety; the day still works */ });
    return () => { alive = false; };
  }, []);
  const favToggle = async () => {
    try {
      if (favs.some(f => f.date === date)) { await planningApi.removeFavourite(date); setFavs(p => p.filter(f => f.date !== date)); }
      else { const f = await planningApi.setFavourite(date, ''); setFavs(p => [...p.filter(x => x.date !== date), f]); }
    } catch (e) { setError((e as Error).message || 'That did not save. Try again.'); }
  };
  const favNote = async (note: string) => {
    try { const f = await planningApi.setFavourite(date, note); setFavs(p => p.map(x => (x.date === date ? f : x))); }
    catch (e) { setError((e as Error).message || 'That did not save. Try again.'); }
  };
  // The tree is built from the months that really have days, plus this month, grouped by year (newest year first). A new year just adds a row; earlier years stay reachable.
  const todayMonth = today.slice(0, 7);
  const treeMonths = Array.from(new Set([...monthKeys, todayMonth, date.slice(0, 7)])).sort();   // the month being looked at is always in the tree, even if it has no opened days
  const treeYears = Array.from(new Set(treeMonths.map(k => k.slice(0, 4)))).sort().reverse();

  const loadMonth = useCallback(async (m: string) => {
    try { const list = await routinesApi.month(m); setMonths(prev => ({ ...prev, [m]: list })); } catch { /* the dots are a nicety; the day still works */ }
  }, []);

  useEffect(() => {
    let alive = true;
    applyDay(null); setSaveState('idle'); setError(''); setAdding(false); setImporting(false); setMenuFor(null);
    routinesApi.day(date).then(d => { if (alive) applyDay(d); }).catch(e => { if (alive) setError((e as Error).message || 'Could not open this day.'); });
    return () => { alive = false; };
  }, [date]);

  useEffect(() => { if (openMonth) void loadMonth(openMonth); }, [openMonth, loadMonth]);
  useEffect(() => {
    routinesApi.months().then(list => { if (Array.isArray(list)) setMonthKeys(list); }).catch(() => { /* the tree still shows this month */ });
  }, []);

  // Ticks and typed text save by themselves a moment after the last change (there is no Save button). "Saving…" / "Saved" shows it happened.
  const sendPending = useCallback(async () => {
    if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    try {
      const s = await routinesApi.saveState(next.date, next.checked, next.values);
      setMonths(prev => {
        const m = next.date.slice(0, 7);
        const list = (prev[m] ?? []).filter(x => x.date !== s.date);
        return { ...prev, [m]: [s, ...list].sort((a, b) => b.date.localeCompare(a.date)) };
      });
      if (!pending.current) setSaveState('saved');
    } catch {
      setSaveState('idle');
      setError('Your last change could not be saved. Check your connection and try again.');
    }
  }, []);

  function scheduleSave(next: RoutineDay) {
    if (pending.current && pending.current.date !== next.date) void sendPending();   // never drop another day's unsaved text
    pending.current = next;
    setSaveState('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void sendPending(); }, 600);
  }
  function mutate(fn: (d: RoutineDay) => RoutineDay) {
    const prev = dayRef.current;
    if (!prev) return;
    const next = fn(prev);
    applyDay(next);
    scheduleSave(next);
  }

  // Closing the tab or switching away inside that 600 ms must not lose what was just typed: send it at once, in a request that survives the page going.
  useEffect(() => {
    const flush = () => {
      const next = pending.current;
      if (!next) return;
      pending.current = null;
      if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
      routinesApi.saveStateOnExit(next.date, next.checked, next.values);
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  }, []);

  const tick = (id: string) => mutate(d => ({ ...d, checked: { ...d.checked, [id]: !d.checked[id] } }));
  const setValue = (id: string, v: string) => mutate(d => ({ ...d, values: { ...d.values, [id]: v } }));

  // The server's copy of the day may be a moment older than the screen: keep any text typed but not yet saved.
  function withPending(d: RoutineDay): RoutineDay {
    const waiting = pending.current;
    return waiting && waiting.date === d.date ? { ...d, checked: waiting.checked, values: waiting.values } : d;
  }

  async function run(p: Promise<RoutineDay>): Promise<boolean> {
    setError('');
    try {
      const d = withPending(await p);
      applyDay(d);
      void loadMonth(d.date.slice(0, 7));
      return true;
    }
    catch (e) { setError((e as Error).message || 'That did not work. Try again.'); return false; }
  }

  // ---- ordering: Move to top / up / down / bottom, or drag the grip ----
  async function commitOrder(section: string, ids: string[]) {
    const base = dayRef.current;
    if (!base) return;
    applyDay({ ...base, items: reorderWithin(base.items, section, ids) });          // at once; the server then saves it for tomorrow too
    const ok = await run(routinesApi.reorder(base.date, section, ids));
    if (!ok) routinesApi.day(base.date).then(d => applyDay(withPending(d))).catch(() => { /* the error message is already showing */ });
  }
  function moveItem(section: string, ids: string[], id: string, to: MoveTo) {
    const next = moveId(ids, id, to);
    if (next.join('|') !== ids.join('|')) void commitOrder(section, next);
  }
  function beginDrag(e: React.PointerEvent, section: string, items: DayItem[], dragId: string) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const mids: Record<string, number> = {};
    items.forEach(it => {
      const el = document.getElementById(`routine-item-${it.id}`);
      if (el) { const r = el.getBoundingClientRect(); mids[it.id] = r.top + window.scrollY + r.height / 2; }
    });
    const startIds = items.map(i => i.id);
    setPreview({ section, ids: startIds, dragId });
    const onMove = (ev: PointerEvent) => {
      const next = orderByDrop(startIds, dragId, ev.clientY + window.scrollY, mids);
      const cur = previewRef.current;
      if (cur && cur.ids.join('|') !== next.join('|')) setPreview({ ...cur, ids: next });
      if (ev.clientY < 70) window.scrollBy(0, -14); else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      const last = previewRef.current;
      setPreview(null);
      if (commit && last && last.ids.join('|') !== startIds.join('|')) void commitOrder(section, last.ids);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') finish(false); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
  }

  // Move a whole category (its items go with it). Saved like any category edit, so the template and tomorrow follow.
  async function moveCategory(name: string, to: MoveTo) {
    const base = dayRef.current;
    if (!base) return;
    const visible = base.sections.filter(sec => base.items.some(i => i.section === sec));
    const next = moveSection(base.sections, visible, name, to);
    setCatMenu(null);
    if (next.join('|') === base.sections.join('|')) return;
    applyDay({ ...base, sections: next });
    const ok = await run(routinesApi.editSections(base.date, { sections: next.map(n => ({ was: n, name: n })), removed: [] }));
    if (!ok) routinesApi.day(base.date).then(d => applyDay(withPending(d))).catch(() => { /* the error message is already showing */ });
  }

  async function saveCategories(edit: CategoryEdit) {
    const base = dayRef.current;
    if (!base) return;
    const d = withPending(await routinesApi.editSections(base.date, edit));       // a failure reaches the editor, which shows the message
    applyDay(d);
    setEditingCats(false);
    void loadMonth(d.date.slice(0, 7));
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
        <TreeButton on={date === today} onClick={() => goTo(today)} icon={<Sun size={15} />} label="Today" />
        {treeYears.map(y => {
          const yearOpen = openYears.includes(y);
          return (
            <div key={y}>
              <button onClick={() => setOpenYears(prev => (prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]))} aria-expanded={yearOpen} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', margin: '12px 0 2px', padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-3)', textAlign: 'left',
              }}>
                {yearOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{y}
              </button>
              {yearOpen && treeMonths.filter(k => k.startsWith(y)).map(key => {
                const name = MONTHS[Number(key.slice(5)) - 1];
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
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '10px 8px 2px', lineHeight: 1.5 }}>
          Green: essentials done. Amber: part done.
        </div>
      </aside>

      <section style={{ ...card, padding: '18px 20px', minWidth: 0 }}>
        <DateBar date={date} today={today} onGo={goTo} favourites={favs} onToggleFavourite={() => void favToggle()} onNote={n => void favNote(n)} />
        {!day && !error && <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Opening your day…</div>}
        {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
        {day && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{prettyDate(day.date)}</h2>
                <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 3 }}>{day.date === today ? greeting() : 'Looking back on this day.'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setShowStatus(v => !v)} aria-expanded={showStatus} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13.5, fontWeight: 700, border: `1px solid ${showStatus ? GREEN : 'rgba(52,211,153,0.45)'}`,
                    background: showStatus ? 'rgba(52,211,153,0.14)' : 'rgba(52,211,153,0.07)', color: GREEN,
                  }}><Compass size={15} /> Where am I?</button>
                  <button onClick={() => { setImporting(false); setEditingCats(false); setAdding(true); }} style={topBtn}>
                    <Plus size={15} /> Add an item
                  </button>
                  <button onClick={() => { setAdding(false); setEditingCats(false); setImporting(true); }} style={topBtn}>
                    <ClipboardPaste size={15} /> Paste your list
                  </button>
                  <button onClick={() => { setMenuFor(null); setAdding(false); setImporting(false); setEditingCats(true); }} style={topBtn}>
                    <ListOrdered size={15} /> Edit categories
                  </button>
                </div>
              </div>
              <div style={{ minWidth: 150, textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {ess.length > 0 ? <><b style={{ color: 'var(--text)' }}>{essDone} of {ess.length}</b> essentials</> : <><b style={{ color: 'var(--text)' }}>{allDone} of {counted.length}</b> done</>}
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: GREEN, transition: 'width 0.25s' }} />
                </div>
                {ess.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{allDone} of {counted.length} in all</div>}
                <div aria-live="polite" style={{ fontSize: 11.5, color: saveState === 'saved' ? GREEN : 'var(--text-3)', marginTop: 4, minHeight: 15 }}>
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
                </div>
              </div>
            </div>

            {showStatus && <WhereAmI day={day} isToday={day.date === today} onClose={() => setShowStatus(false)} />}

            {adding && <AddItem sections={day.sections} onCancel={() => setAdding(false)}
              onAdd={async body => { await run(routinesApi.addItem(day.date, body)); setAdding(false); }} />}
            {importing && <RoutineImport date={day.date} onCancel={() => setImporting(false)}
              onDone={d => { applyDay(d); void loadMonth(d.date.slice(0, 7)); setImporting(false); }} />}

            {!editingCats && day.sections.map(section => {
              const base = day.items.filter(i => i.section === section);
              if (base.length === 0) return null;
              const items = preview && preview.section === section
                ? preview.ids.map(id => base.find(b => b.id === id)).filter((x): x is DayItem => !!x)
                : base;
              const shown = day.sections.filter(sec => day.items.some(i => i.section === sec));
              const pos = shown.indexOf(section);
              return (
                <div key={section} style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{section}</div>
                    {shown.length > 1 && (
                      <button onClick={() => setCatMenu(catMenu === section ? null : section)} aria-label={`Options for category ${section}`} aria-expanded={catMenu === section}
                        style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 6px' }}>⋯</button>
                    )}
                  </div>
                  {catMenu === section && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 6px' }}>
                      {canMove(pos, shown.length, 'top') && <SmallBtn onClick={() => void moveCategory(section, 'top')}>Move to top</SmallBtn>}
                      {canMove(pos, shown.length, 'up') && <SmallBtn onClick={() => void moveCategory(section, 'up')}>Move up</SmallBtn>}
                      {canMove(pos, shown.length, 'down') && <SmallBtn onClick={() => void moveCategory(section, 'down')}>Move down</SmallBtn>}
                      {canMove(pos, shown.length, 'bottom') && <SmallBtn onClick={() => void moveCategory(section, 'bottom')}>Move to bottom</SmallBtn>}
                    </div>
                  )}
                  {items.map((i, idx) => (
                    <ItemRow key={i.id} item={i} day={day} menuOpen={menuFor === i.id} index={idx} count={items.length} dragging={preview?.dragId === i.id}
                      onMenu={() => setMenuFor(menuFor === i.id ? null : i.id)}
                      onTick={() => tick(i.id)} onValue={v => setValue(i.id, v)}
                      onPriority={pr => { setMenuFor(null); void run(routinesApi.updateItem(day.date, i.id, { priority: pr })); }}
                      onMove={to => { setMenuFor(null); moveItem(section, items.map(x => x.id), i.id, to); }}
                      onGrip={e => beginDrag(e, section, items, i.id)}
                      onEdit={async text => { await run(routinesApi.updateItem(day.date, i.id, { text })); setMenuFor(null); }}
                      onRemoveToday={() => { setMenuFor(null); void run(routinesApi.removeItem(day.date, i.id, 'today')); }}
                      onRemoveAlways={() => { setMenuFor(null); void run(routinesApi.removeItem(day.date, i.id, 'template')); }} />
                  ))}
                </div>
              );
            })}

            {editingCats && (
              <RoutineCategories
                sections={day.sections}
                itemCount={day.items.reduce<Record<string, number>>((acc, i) => { acc[i.section] = (acc[i.section] ?? 0) + 1; return acc; }, {})}
                onSave={saveCategories}
                onCancel={() => setEditingCats(false)} />
            )}

            <DayNotes key={day.date} date={day.date} />
          </>
        )}
      </section>
    </div>
  );
}

// "Where am I?": a plain-English read of the day from what is ticked, recalculated live as ticks change. Worked out in the browser; nothing is sent anywhere.
function DateBar({ date, today, onGo, favourites, onToggleFavourite, onNote }: {
  date: string; today: string; onGo: (d: string) => void;
  favourites: FavouriteDay[]; onToggleFavourite: () => void; onNote: (note: string) => void;
}) {
  const max = addDays(today, 30);
  const step = (n: number) => { const d = addDays(date, n); if (d >= MIN_DATE && d <= max) onGo(d); };
  const arrow: React.CSSProperties = { display: 'inline-flex', padding: 8, borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' };
  const onToday = date === today;
  const fav = favourites.find(f => f.date === date);
  const GOLD = '#F5B942';
  const [note, setNote] = useState(fav?.note ?? '');
  useEffect(() => { setNote(fav?.note ?? ''); }, [date, fav?.note]);
  const label = (f: FavouriteDay) => `${shortDate(f.date)}${f.note ? ` · ${f.note}` : ''}`;
  return (
    <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="group" aria-label="Choose a day" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" aria-label="Previous day" disabled={date <= MIN_DATE} onClick={() => step(-1)} style={arrow}><ChevronLeft size={16} /></button>
        <input type="date" aria-label="Go to a date" value={date} min={MIN_DATE} max={max}
          onChange={e => { const v = e.target.value; if (v && v >= MIN_DATE && v <= max) onGo(v); }}
          style={{ ...field, width: 'auto', padding: '7px 10px' }} />
        <button type="button" aria-label="Next day" disabled={date >= max} onClick={() => step(1)} style={arrow}><ChevronRight size={16} /></button>
        <button type="button" aria-label="Back to today" onClick={() => onGo(today)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
          border: `1px solid ${GREEN}`, background: onToday ? 'rgba(52,211,153,0.16)' : 'transparent', color: GREEN,
        }}><Sun size={14} /> Today</button>
        <button type="button" aria-pressed={!!fav} aria-label={fav ? 'Remove this day from your favourites' : 'Mark this day as a favourite'} onClick={onToggleFavourite} style={{ ...arrow, color: fav ? GOLD : 'var(--text-3)', borderColor: fav ? GOLD : 'var(--border)' }}>
          <Star size={16} fill={fav ? GOLD : 'none'} />
        </button>
        {favourites.length > 0 && (
          <select aria-label="Favourite days" value="" onChange={e => { if (e.target.value) onGo(e.target.value); }} style={{ ...field, width: 'auto', padding: '7px 10px', maxWidth: '100%' }}>
            <option value="">★ Favourite days ({favourites.length})</option>
            {[...favourites].sort((a, b) => b.date.localeCompare(a.date)).map(f => <option key={f.date} value={f.date}>{label(f)}</option>)}
          </select>
        )}
      </div>
      {fav && (
        <div>
          <label htmlFor="favNote" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.03em' }}>WHY IS THIS DAY SPECIAL? (OPTIONAL)</label>
          <input id="favNote" value={note} maxLength={MAX_FAVOURITE_NOTE} onChange={e => setNote(e.target.value)} placeholder="Got the job. Met a dear friend. Bought the house."
            onBlur={() => { if (note.trim() !== fav.note) onNote(note.trim()); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
            style={{ ...field, marginTop: 6 }} />
        </div>
      )}
    </div>
  );
}

function WhereAmI({ day, isToday, onClose }: { day: RoutineDay; isToday: boolean; onClose: () => void }) {
  const s = useMemo(() => routineStatus(day, new Date(), isToday), [day, isToday]);
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { cancelRef.current?.(); }, []);   // closing the panel stops the voice

  // The spoken line is generic on purpose (counts and parts of the day, no item names), because speech goes through the voice provider.
  function listen() {
    if (speaking) { cancelRef.current?.(); cancelRef.current = null; setSpeaking(false); return; }
    unlockTTSAudio();   // must run inside the tap, before any network call, or phones stay silent
    setSpeaking(true);
    const now = new Date();
    const voice = coachVoiceFor(now);   // Catherine through the day, Malcolm from five in the evening
    cancelRef.current = speak(spokenStatus(day, now, isToday), voice.seat, () => { cancelRef.current = null; setSpeaking(false); }, undefined, undefined, { interviewerId: voice.interviewerId });
  }
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
      <button onClick={listen} aria-pressed={speaking} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 13, fontWeight: 700, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)',
      }}>{speaking ? <><Square size={13} /> Stop</> : <><Volume2 size={14} /> Listen</>}</button>
      {priorityPhrase(s.priorityLeft) && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>Still to do: {priorityPhrase(s.priorityLeft)}.</div>}
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
  index: number; count: number; dragging: boolean;
  onPriority: (pr: Priority) => void; onMove: (to: MoveTo) => void; onGrip: (e: React.PointerEvent) => void;
  onEdit: (text: string) => Promise<void>; onRemoveToday: () => void; onRemoveAlways: () => void;
}) {
  const { item, day } = p;
  const done = !!day.checked[item.id] || (item.kind === 'number' && !!day.values[item.id]?.trim());
  const note = item.kind === 'text';
  const read = item.kind === 'read';
  const priority: Priority = priorityOf(item);
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
      {priority === 'essential' && <span style={tag('52,211,153', GREEN)}>Essential</span>}
      {priority === 'low' && <span style={tag('148,163,184', '#94A3B8')}>Low</span>}
      {item.ruleLabel && <span style={tag('245,158,11', '#F59E0B')}>{item.ruleLabel}</span>}
    </>
  );

  return (
    <div id={`routine-item-${item.id}`} data-dragging={p.dragging ? 'true' : undefined}
      style={{ borderBottom: '1px solid var(--border)', padding: '9px 0', position: 'relative', opacity: p.dragging ? 0.55 : 1, background: p.dragging ? 'rgba(52,211,153,0.07)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button
          onPointerDown={p.onGrip}
          onKeyDown={e => {
            if (e.key === 'ArrowUp') { e.preventDefault(); p.onMove('up'); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); p.onMove('down'); }
          }}
          aria-label={`Drag to reorder: ${item.text.slice(0, 60)}`} title="Drag to reorder, or use the arrow keys"
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: p.dragging ? 'grabbing' : 'grab', padding: '2px 0', margin: '0 -2px 0 -4px', display: 'flex', touchAction: 'none', flexShrink: 0 }}>
          <GripVertical size={16} />
        </button>
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
          {!note && (['essential', 'standard', 'low'] as const).map(pr => (
            <SmallBtn key={pr} onClick={() => p.onPriority(pr)} pressed={priority === pr}>{pr === 'essential' ? 'Essential' : pr === 'standard' ? 'Standard' : 'Low'}</SmallBtn>
          ))}
          {canMove(p.index, p.count, 'top') && <SmallBtn onClick={() => p.onMove('top')}>Move to top</SmallBtn>}
          {canMove(p.index, p.count, 'up') && <SmallBtn onClick={() => p.onMove('up')}>Move up</SmallBtn>}
          {canMove(p.index, p.count, 'down') && <SmallBtn onClick={() => p.onMove('down')}>Move down</SmallBtn>}
          {canMove(p.index, p.count, 'bottom') && <SmallBtn onClick={() => p.onMove('bottom')}>Move to bottom</SmallBtn>}
          <SmallBtn onClick={p.onRemoveToday}><Trash2 size={12} /> Remove for today</SmallBtn>
          {item.source === 'template' && <SmallBtn onClick={p.onRemoveAlways}><Trash2 size={12} /> Remove from every day</SmallBtn>}
        </div>
      )}
    </div>
  );
}

const topBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 10, padding: '8px 12px',
  color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
};

const tag = (rgb: string, color: string): React.CSSProperties => ({
  marginLeft: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 99, color,
  background: `rgba(${rgb},0.14)`, border: `1px solid rgba(${rgb},0.35)`, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
});

function SmallBtn({ children, onClick, pressed }: { children: React.ReactNode; onClick: () => void; pressed?: boolean }) {
  return <button onClick={onClick} aria-pressed={pressed} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: pressed ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.05)', border: `1px solid ${pressed ? GREEN : 'var(--border)'}`, borderRadius: 8, padding: '6px 10px', color: pressed ? GREEN : 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{children}</button>;
}

function AddItem({ sections, onAdd, onCancel }: {
  sections: string[]; onCancel: () => void;
  onAdd: (b: { text: string; section: string; kind: RoutineKind; priority: Priority; scope: AddScope; rule?: { weekdays: number[]; lastDayOfMonth: boolean; label: string } }) => Promise<void>;
}) {
  const [text, setText] = useState('');
  // Defaults to the part of the day it is now (so in the evening, "Evening"). Sections that do not exist yet can be created on the spot.
  const [section, setSection] = useState(() => sections.find(s => sectionPeriod(s) === currentPeriod(new Date())) ?? sections[0] ?? '');
  const [newSection, setNewSection] = useState('');
  const missing = (['Morning', 'Afternoon', 'Evening'] as const).filter((_, idx) => !sections.some(s => sectionPeriod(s) === idx));
  const [kind, setKind] = useState<RoutineKind>('check');
  const [priority, setPriority] = useState<Priority>('standard');
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
      await onAdd({ text: text.trim(), section: target, kind, priority, scope, ...(scope === 'rule' ? { rule: { weekdays, lastDayOfMonth: last, label: label.trim() } } : {}) });
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
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} aria-label="Priority" style={{ ...field, width: 'auto', minWidth: 140 }}>
            <option value="essential">Essential</option>
            <option value="standard">Standard</option>
            <option value="low">Low priority</option>
          </select>
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
