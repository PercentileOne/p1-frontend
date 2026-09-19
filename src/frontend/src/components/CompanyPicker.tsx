import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { groupForSector, searchCompanies, type CompanySummary } from '../api/companiesApi';

// Searchable "Interview Style" picker (Francis, 2026-09-19). Standard first, then ~190 employers. A plain
// <select> stopped being usable at that size — Netflix was in it but easy to miss in a long scrolling list, and
// nobody could find Facebook/Instagram/Twitter, which live under Meta and X. So: type to search (names AND
// well-known brands/aliases), or browse grouped by sector.
const GROUP_ORDER = [
  'Technology', 'Banking & Finance', 'Consulting & Professional Services', 'Retail, Consumer & Food',
  'Media & Telecoms', 'Healthcare & Pharma', 'Energy, Auto & Industry', 'Travel & Hospitality', 'Public Service', 'Other',
];

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;

export function CompanyPicker({ companies, value, onChange }: {
  companies: CompanySummary[];
  value: string; // 'standard' | company id
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = companies.find(c => c.id === value);

  // Flat, ordered list of what is currently selectable (for keyboard nav): Standard, then matches or grouped browse.
  const { rows, flat } = useMemo(() => {
    const q = query.trim();
    type Row = { kind: 'heading'; label: string } | { kind: 'item'; id: string; label: string; hint?: string; index: number };
    const out: Row[] = [];
    const ids: string[] = [];
    const push = (id: string, label: string, hint?: string) => { out.push({ kind: 'item', id, label, hint, index: ids.length }); ids.push(id); };
    if (!q) {
      push('standard', 'Standard', 'A well-rounded interview for any role');
      const groups = new Map<string, CompanySummary[]>();
      for (const c of companies) {
        const g = groupForSector(c.sector);
        (groups.get(g) ?? groups.set(g, []).get(g)!).push(c);
      }
      for (const g of GROUP_ORDER) {
        const list = groups.get(g);
        if (!list?.length) continue;
        out.push({ kind: 'heading', label: g });
        for (const c of [...list].sort((a, b) => a.name.localeCompare(b.name))) push(c.id, c.name);
      }
    } else {
      for (const m of searchCompanies(companies, q)) push(m.company.id, m.company.name, m.via ? `${m.via} → ${m.company.name}` : m.company.sector);
    }
    return { rows: out, flat: ids };
  }, [companies, query]);

  useEffect(() => { setActive(0); }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const choose = (id: string) => { onChange(id); setOpen(false); setQuery(''); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); choose(flat[active]); }
  };

  // Keep the highlighted row scrolled into view while arrowing.
  useEffect(() => {
    if (!open) return;
    boxRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', textAlign: 'left', background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '14px',
          fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
          backgroundImage: CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
        }}
      >
        {selected ? selected.name : 'Standard'}
      </button>

      {open && (
        <div
          role="listbox"
          onKeyDown={onKey}
          style={{
            position: 'absolute', zIndex: 50, left: 0, right: 0, top: 'calc(100% + 6px)',
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <Search size={14} color="var(--text-3)" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search a company — try Netflix, Instagram, M&S…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '14px', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px' }}>
            {rows.length === 0 || (query.trim() && flat.length === 0) ? (
              <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-3)' }}>No match yet — try a different name, or pick Standard.</div>
            ) : rows.map((r, i) => r.kind === 'heading' ? (
              <div key={`h-${r.label}-${i}`} style={{ padding: '10px 10px 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{r.label}</div>
            ) : (
              <div
                key={r.id}
                data-idx={r.index}
                role="option"
                aria-selected={r.id === value}
                onMouseEnter={() => setActive(r.index)}
                onClick={() => choose(r.id)}
                style={{
                  padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline',
                  background: r.index === active ? 'rgba(52,211,153,0.10)' : 'transparent',
                  color: r.id === value ? '#34D399' : 'var(--text)', fontSize: '14px', fontWeight: r.id === value ? 700 : 500,
                }}
              >
                <span>{r.label}</span>
                {r.hint && <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400, textAlign: 'right' }}>{r.hint}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
