import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { MAX_SECTIONS } from '../api/routinesApi';

// "Edit categories" for My Routines (Francis, 2026-10-15): the headers (Morning, Plan for today, Check in, and the person's own) can be renamed, put in a new order,
// added and deleted. Nothing is saved until the person presses Save; deleting a category that has items asks where they should go.

const GREEN = '#34D399';
const field: React.CSSProperties = {
  background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', minWidth: 0,
};
const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', cursor: 'pointer',
};

interface Row { key: string; was: string | null; name: string }
export interface CategoryEdit {
  sections: { was: string | null; name: string }[];
  removed: { was: string; moveTo: string | null }[];
}

export function RoutineCategories({ sections, itemCount, onSave, onCancel }: {
  sections: string[];
  /** How many items each category holds on this day. */
  itemCount: Record<string, number>;
  onSave: (edit: CategoryEdit) => Promise<void>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => sections.map((s, i) => ({ key: `r${i}`, was: s, name: s })));
  const [removed, setRemoved] = useState<{ was: string; moveTo: string | null }[]>([]);
  const [asking, setAsking] = useState<string | null>(null);      // key of the row whose delete is waiting for a destination
  const [target, setTarget] = useState('');
  const [fresh, setFresh] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  let nextKey = rows.length + removed.length + 100;

  const names = rows.map(r => r.name.trim());
  const blank = names.some(n => n.length === 0);
  const dupes = new Set(names.map(n => n.toLowerCase())).size !== names.length;
  const problem = blank ? 'Every category needs a name.' : dupes ? 'Two categories have the same name.' : rows.length === 0 ? 'Keep at least one category.' : '';

  const patch = (key: string, p: Partial<Row>) => setRows(prev => prev.map(r => (r.key === key ? { ...r, ...p } : r)));
  const move = (key: string, by: -1 | 1) => setRows(prev => {
    const i = prev.findIndex(r => r.key === key); const j = i + by;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const copy = prev.slice(); [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
  });

  function askDelete(r: Row) {
    const items = r.was ? itemCount[r.was] ?? 0 : 0;
    if (items === 0) { dropRow(r, null); return; }
    setAsking(r.key);
    setTarget(rows.find(x => x.key !== r.key)?.key ?? '');
  }
  function dropRow(r: Row, moveToKey: string | null) {
    const dest = moveToKey ? rows.find(x => x.key === moveToKey) : undefined;
    if (r.was) setRemoved(prev => [...prev, { was: r.was!, moveTo: dest ? dest.name.trim() : null }]);
    setRows(prev => prev.filter(x => x.key !== r.key));
    setAsking(null);
  }
  function addRow() {
    const n = fresh.trim();
    if (!n) return;
    setRows(prev => [...prev, { key: `n${nextKey++}`, was: null, name: n }]);
    setFresh('');
  }

  async function save() {
    if (problem || busy) return;
    setBusy(true); setError('');
    try {
      await onSave({
        sections: rows.map(r => ({ was: r.was, name: r.name.trim() })),
        // A category that was renamed and then removed is not a removal of its old name's items; only real deletions are sent.
        removed,
      });
    } catch (e) {
      setError((e as Error).message || 'That did not save. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 18, border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Edit categories</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 12px', lineHeight: 1.5 }}>
        Rename them, put them in the order you want, add your own, or delete the ones you do not use. Past days keep the names they had.
      </div>

      {rows.map((r, i) => {
        const items = r.was ? itemCount[r.was] ?? 0 : 0;
        return (
          <div key={r.key} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={r.name} onChange={e => patch(r.key, { name: e.target.value })} maxLength={60} aria-label={`Category name ${i + 1}`} style={{ ...field, flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', minWidth: 54, textAlign: 'right' }}>{items === 1 ? '1 item' : `${items} items`}</span>
              <button onClick={() => move(r.key, -1)} disabled={i === 0} aria-label={`Move ${r.name} up`} style={{ ...iconBtn, opacity: i === 0 ? 0.35 : 1 }}><ArrowUp size={15} /></button>
              <button onClick={() => move(r.key, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.name} down`} style={{ ...iconBtn, opacity: i === rows.length - 1 ? 0.35 : 1 }}><ArrowDown size={15} /></button>
              <button onClick={() => askDelete(r)} disabled={rows.length <= 1} aria-label={`Delete ${r.name}`} style={{ ...iconBtn, color: '#EF4444', opacity: rows.length <= 1 ? 0.35 : 1 }}><Trash2 size={15} /></button>
            </div>
            {asking === r.key && (
              <div role="group" aria-label={`Where should the items in ${r.name} go`} style={{ margin: '6px 0 0', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', fontSize: 13, color: 'var(--text-2)' }}>
                Move its {items === 1 ? 'item' : `${items} items`} to{' '}
                <select value={target} onChange={e => setTarget(e.target.value)} aria-label="Move items to" style={{ ...field, padding: '5px 8px', margin: '0 6px' }}>
                  {rows.filter(x => x.key !== r.key).map(x => <option key={x.key} value={x.key}>{x.name || '(unnamed)'}</option>)}
                </select>
                <button onClick={() => dropRow(r, target)} style={{ ...field, cursor: 'pointer', fontWeight: 700, color: '#EF4444', borderColor: 'rgba(239,68,68,0.4)' }}>Move and delete</button>{' '}
                <button onClick={() => setAsking(null)} style={{ ...field, cursor: 'pointer', fontWeight: 600 }}>Keep it</button>
              </div>
            )}
          </div>
        );
      })}

      {rows.length < MAX_SECTIONS && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={fresh} onChange={e => setFresh(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addRow(); }} placeholder="A new category, for example Evening or Gym" aria-label="New category name" maxLength={60} style={{ ...field, flex: 1 }} />
          <button onClick={addRow} disabled={!fresh.trim()} style={{ ...iconBtn, width: 'auto', padding: '0 14px', gap: 6, fontWeight: 700, fontSize: 13.5, opacity: fresh.trim() ? 1 : 0.5 }}><Plus size={15} /> Add</button>
        </div>
      )}

      {(problem || error) && <div role="alert" style={{ color: '#EF4444', fontSize: 13, marginTop: 10 }}>{error || problem}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={() => void save()} disabled={!!problem || busy} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', opacity: problem || busy ? 0.55 : 1 }}>{busy ? 'Saving…' : 'Save categories'}</button>
        <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      </div>
      <div style={{ fontSize: 12, color: GREEN, marginTop: 8 }} aria-hidden="true" />
    </div>
  );
}
