// Shared pager for this portal's list pages (JobPositions, InterviewPreps) — extracted from
// what was 2 near-identical copy-pasted blocks, each with its own hardcoded, non-adjustable
// PAGE_SIZE. Francis: "that's what we've done everywhere" — one reusable control, not
// per-page hand-tweaks. Same #4F8EF7 active-page color already used in both original blocks.
//
// The size selector is shown even when there's only one page — otherwise a list that currently
// fits on one page at the default size gives no way to discover a smaller size exists.
export const PAGE_SIZE_OPTIONS = [7, 10, 25, 50] as const;

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent',
  color: disabled ? 'var(--text-3)' : 'var(--text-2)', cursor: disabled ? 'default' : 'pointer',
  fontSize: 12, fontFamily: 'inherit', opacity: disabled ? 0.4 : 1,
});

export function Pagination({
  page, totalPages, onPageChange, pageSize, onPageSizeChange, rangeStart, rangeEnd, total,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  rangeStart: number;
  rangeEnd: number;
  total: number;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      padding: '12px 16px', borderTop: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Showing {total === 0 ? 0 : rangeStart}–{rangeEnd} of {total}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
          Per page
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 8px', color: 'var(--text-2)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} style={navBtnStyle(page === 1)}>
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => onPageChange(n)} style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
              background: n === page ? 'rgba(79,142,247,0.15)' : 'transparent',
              borderColor: n === page ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              color: n === page ? '#4F8EF7' : 'var(--text-3)',
            }}>{n}</button>
          ))}
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={navBtnStyle(page === totalPages)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
