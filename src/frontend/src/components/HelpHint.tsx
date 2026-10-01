import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

// A small, dismissible "How does this work?" bar shown at the top of a page that has a help article (Francis, 2026-10-01).
// Help at the moment of confusion, not a manual: one line, one click to the article, and it stays hidden once dismissed.

export function HelpHint({ pageLabel, articleId, onOpen }: { pageLabel: string; articleId: string; onOpen: (articleId: string) => void }) {
  const key = `tic.helphint.${articleId}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  if (hidden) return null;
  function hide() { try { localStorage.setItem(key, '1'); } catch { /* ignore */ } setHidden(true); }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.22)', borderRadius: 10, padding: '9px 14px', margin: '0 0 16px' }}>
      <Lightbulb size={15} color="#4F8EF7" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>
        New to {pageLabel}?{' '}
        <button onClick={() => onOpen(articleId)} style={{ background: 'none', border: 'none', padding: 0, color: '#4F8EF7', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>See how it works →</button>
      </span>
      <button onClick={hide} aria-label="Hide this tip" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }}><X size={14} /></button>
    </div>
  );
}
