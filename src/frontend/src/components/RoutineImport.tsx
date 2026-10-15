import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { routinesApi, MAX_ITEMS, MAX_ITEM_TEXT, MAX_READ_TEXT, MAX_SECTIONS } from '../api/routinesApi';
import type { ImportMode, Priority, RoutineDay, RoutineKind } from '../api/routinesApi';
import { parseRoutineList } from '../pages/routineListParser';
import type { ParsedItem } from '../pages/routineListParser';

// "Paste your list" for My Routines (Francis, 2026-10-13). Paste from Evernote / Notes / Word, review a preview, then add.
// Nothing is saved, and nothing leaves the browser, until the person presses the add button.

const GREEN = '#34D399';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KIND_LABEL: Record<RoutineKind, string> = { check: 'A tick box', number: 'A number', text: 'A note to write', read: 'Read aloud' };
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const primary: React.CSSProperties = { padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' };
const quiet: React.CSSProperties = { padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' };

export function RoutineImport({ date, onDone, onCancel }: { date: string; onDone: (day: RoutineDay) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [leftOut, setLeftOut] = useState(0);
  const [mode, setMode] = useState<ImportMode>('replace');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function read() {
    const parsed = parseRoutineList(text);
    if (parsed.items.length === 0) { setError('I could not find any items. Paste a list with headings and bullets, or one item per line.'); return; }
    setError(''); setItems(parsed.items); setSections(parsed.sections); setLeftOut(parsed.leftOut);
  }
  const patch = (key: string, p: Partial<ParsedItem>) => setItems(prev => prev && prev.map(i => (i.key === key ? { ...i, ...p } : i)));

  const chosen = useMemo(() => (items ?? []).filter(i => i.include && i.text.trim().length > 0), [items]);
  const usedSections = useMemo(() => sections.filter(s => chosen.some(i => i.section === s)), [sections, chosen]);
  const essentials = chosen.filter(i => i.priority === 'essential' && i.kind !== 'text').length;
  const missingDays = chosen.filter(i => i.needsDays && i.weekdays.length === 0 && !i.lastDay);
  const problem =
    chosen.length === 0 ? 'Tick at least one item.' :
    chosen.length > MAX_ITEMS ? `That is ${chosen.length} items; a routine holds up to ${MAX_ITEMS}. Untick a few.` :
    usedSections.length > MAX_SECTIONS ? `That is ${usedSections.length} sections; a routine holds up to ${MAX_SECTIONS}. Untick some items.` :
    missingDays.length > 0 ? `Choose the days for "${missingDays[0].label}", or untick it.` : '';

  async function save() {
    if (problem) return;
    setBusy(true); setError('');
    try {
      const day = await routinesApi.importList({
        date, mode, sections: usedSections,
        items: chosen.map(i => ({
          text: i.text.trim(), section: i.section, kind: i.kind,
          essential: i.kind !== 'text' && i.priority === 'essential', priority: i.kind === 'text' ? 'standard' : i.priority,
          rule: i.weekdays.length > 0 || i.lastDay ? { weekdays: i.weekdays.length > 0 ? i.weekdays : null, lastDayOfMonth: i.lastDay || null, label: i.label || null } : null,
        })),
      });
      onDone(day);
    } catch (e) {
      setError((e as Error).message || 'That did not save. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Paste your list</div>
        <button onClick={onCancel} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
      </div>

      {!items && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 8 }}>
            Paste a routine you already keep in Evernote, Notes, Word or an email. Headings become sections and bullets become items. You will see a preview and choose what to keep before anything is saved.
          </div>
          <textarea value={text} onChange={e => { setText(e.target.value); setError(''); }} rows={10} aria-label="Your list" placeholder={'Morning:\n* Ten minutes of quiet\n* Make the bed\n\nEvening:\n* Check tomorrow\'s calendar'}
            style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
          {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={read} disabled={text.trim().length === 0} style={{ ...primary, opacity: text.trim().length === 0 ? 0.5 : 1 }}>Read my list</button>
            <button onClick={onCancel} style={quiet}>Cancel</button>
          </div>
        </>
      )}

      {items && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
            <b style={{ color: 'var(--text)' }}>{chosen.length} items in {usedSections.length} section{usedSections.length === 1 ? '' : 's'}</b>
            {essentials > 0 ? `, ${essentials} marked essential` : ''}. Untick anything you do not want, give each item a priority (the few that matter most are Essential), and fix anything I guessed wrong.
            {leftOut > 0 && <> {leftOut} line{leftOut === 1 ? '' : 's'} you had written under headings like gratitude or how you feel {leftOut === 1 ? 'was' : 'were'} left out on purpose, because those are written fresh each day.</>}
          </div>

          {sections.map(section => {
            const rows = items.filter(i => i.section === section);
            if (rows.length === 0) return null;
            const allOn = rows.every(r => r.include);
            return (
              <div key={section} style={{ marginTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', cursor: 'pointer', marginBottom: 4 }}>
                  <input type="checkbox" checked={allOn} onChange={() => rows.forEach(r => patch(r.key, { include: !allOn }))} aria-label={`Keep every item in ${section}`} style={{ accentColor: GREEN }} />
                  {section}
                </label>
                {rows.map(r => <PreviewRow key={r.key} row={r} sections={sections} onChange={p => patch(r.key, p)} />)}
              </div>
            );
          })}

          <div style={{ marginTop: 14, display: 'grid', gap: 4 }}>
            <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13.5, color: 'var(--text)' }}>
              <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} style={{ marginTop: 3, accentColor: GREEN }} />
              <span><b>Use this as my routine</b><br /><span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Replaces what is there now. Past days stay as they were, and anything you have already ticked or written today is kept.</span></span>
            </label>
            <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13.5, color: 'var(--text)' }}>
              <input type="radio" name="import-mode" checked={mode === 'add'} onChange={() => setMode('add')} style={{ marginTop: 3, accentColor: GREEN }} />
              <span><b>Add these to my routine</b><br /><span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Keeps everything you have and adds these on top.</span></span>
            </label>
          </div>

          {(problem || error) && <div role="alert" style={{ color: '#EF4444', fontSize: 13, marginTop: 10 }}>{error || problem}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => void save()} disabled={busy || !!problem} style={{ ...primary, opacity: busy || problem ? 0.55 : 1 }}>{busy ? 'Saving…' : `Add ${chosen.length} items`}</button>
            <button onClick={() => setItems(null)} style={quiet}>Back to my list</button>
            <button onClick={onCancel} style={quiet}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

function PreviewRow({ row, sections, onChange }: { row: ParsedItem; sections: string[]; onChange: (p: Partial<ParsedItem>) => void }) {
  const isRead = row.kind === 'read';
  const hasRule = row.weekdays.length > 0 || row.lastDay || row.needsDays;
  const limit = isRead ? MAX_READ_TEXT : MAX_ITEM_TEXT;
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', opacity: row.include ? 1 : 0.5 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={row.include} onChange={e => onChange({ include: e.target.checked })} aria-label={`Keep: ${row.text.slice(0, 60)}`} style={{ marginTop: 9, width: 17, height: 17, accentColor: GREEN, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {isRead
            ? <textarea value={row.text} onChange={e => onChange({ text: e.target.value })} rows={4} maxLength={limit} aria-label="Passage to read aloud" style={{ ...field, resize: 'vertical', lineHeight: 1.55 }} />
            : <input value={row.text} onChange={e => onChange({ text: e.target.value })} maxLength={limit} aria-label="Item" style={field} />}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
            <select value={row.kind} onChange={e => onChange({ kind: e.target.value as RoutineKind })} aria-label="Type of item" style={{ ...field, width: 'auto', padding: '5px 8px', fontSize: 12.5 }}>
              {(Object.keys(KIND_LABEL) as RoutineKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <select value={row.section} onChange={e => onChange({ section: e.target.value })} aria-label="Section" style={{ ...field, width: 'auto', maxWidth: 220, padding: '5px 8px', fontSize: 12.5 }}>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {row.kind !== 'text' && (
              <select value={row.priority} onChange={e => onChange({ priority: e.target.value as Priority })} aria-label="Priority" style={{ ...field, width: 'auto', padding: '5px 8px', fontSize: 12.5 }}>
                <option value="essential">Essential</option>
                <option value="standard">Standard</option>
                <option value="low">Low priority</option>
              </select>
            )}
          </div>
          {hasRule && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{row.label ? `${row.label}:` : 'On days:'}</span>
              {WEEKDAYS.map((w, d) => {
                const on = row.weekdays.includes(d);
                return <button key={w} onClick={() => onChange({ weekdays: on ? row.weekdays.filter(x => x !== d) : [...row.weekdays, d].sort() })} aria-pressed={on}
                  style={{ padding: '4px 9px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${on ? GREEN : 'var(--border)'}`, background: on ? 'rgba(52,211,153,0.15)' : 'transparent', color: on ? GREEN : 'var(--text-2)' }}>{w}</button>;
              })}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={row.lastDay} onChange={e => onChange({ lastDay: e.target.checked })} style={{ accentColor: GREEN }} /> Last day of the month
              </label>
            </div>
          )}
          {row.note && <div style={{ fontSize: 12, color: row.needsDays && row.weekdays.length === 0 && !row.lastDay ? '#F59E0B' : 'var(--text-3)', marginTop: 5, lineHeight: 1.45 }}>{row.note}</div>}
        </div>
      </div>
    </div>
  );
}
