import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fetchFeedBooks } from '../api/feedBooksApi';
import type { FeedBook } from '../api/feedBooksApi';
import { localDate } from '../api/routinesApi';
import { logEvent } from '../api/flowLogger';
import { useBookMarks } from '../hooks/useBookMarks';
import { roundButton } from './VideoPlayer';
import { ThemeChips } from './ThemeChips';

// The feed's books strip (Francis, 2026-10-19), styled like the video strip: a heading, then a row of tall cards (book-cover shaped) that scrolls sideways with the next card peeking in.
// Every book was checked against Open Library when it was added. A card shows Open Library's own cover and links to the book's own page there, where it can often be borrowed free.
// The one-line reason under each card is ours, and the strip says so. No shop links and no affiliate code. The bookmark keeps a book on a private "Reading list" (Want to read).
// The app hides scrollbars everywhere, so the row has arrow buttons for a mouse. The X folds the strip down to one line until tomorrow; the Reading list stays one tap away.

const HIDE_KEY = 'tic_book_strip_hidden';
const CARD_W = 150;
const GAP = 12;
const GREEN = '#34D399';

type View = 'all' | 'saved';

function hiddenToday(): boolean {
  try { return localStorage.getItem(HIDE_KEY) === localDate(); } catch { return false; }
}

export function BookStrip() {
  const [books, setBooks] = useState<FeedBook[] | null>(null);
  const { saved, problem, toggle } = useBookMarks();
  const [view, setView] = useState<View>('all');
  const [theme, setTheme] = useState<string | null>(null);
  const [hidden, setHidden] = useState(hiddenToday);
  const [edges, setEdges] = useState({ left: false, right: false });
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let alive = true;
    void fetchFeedBooks().then(b => { if (alive) setBooks(b); });
    return () => { alive = false; };
  }, []);

  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, books, view, hidden]);

  if (!books || books.length === 0) return null;

  const savedCount = books.filter(b => saved.includes(b.id)).length;
  const shown = view === 'saved' ? saved.map(id => books.find(b => b.id === id)).filter((b): b is FeedBook => !!b)
    : theme ? books.filter(b => b.theme === theme) : books;

  function hide() { try { localStorage.setItem(HIDE_KEY, localDate()); } catch { /* it will just show again */ } setHidden(true); setView('all'); }
  function show(next: View = 'all') { try { localStorage.removeItem(HIDE_KEY); } catch { /* fine */ } setHidden(false); setView(next); }
  function open(b: FeedBook) { logEvent('feed_book_open', { metadata: { id: b.id, theme: b.theme } }); }
  // Choosing a theme starts the row again from its first card.
  function pickTheme(t: string | null) { setTheme(t); rowRef.current?.scrollTo?.({ left: 0 }); }
  function scrollBy(dir: 1 | -1) { rowRef.current?.scrollBy({ left: dir * (CARD_W + GAP) * 2, behavior: 'smooth' }); }

  const tab = (id: View, text: string, count?: number) => (
    <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
      style={{ background: view === id ? 'rgba(52,211,153,0.16)' : 'transparent', color: view === id ? GREEN : 'var(--text-3)', border: `1px solid ${view === id ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {text}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  if (hidden) {
    return (
      <section aria-label="Worth a read, folded away" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginRight: 'auto' }}>Worth a read</span>
        {savedCount > 0 && <button type="button" onClick={() => show('saved')} style={linkBtn}>Reading list ({savedCount})</button>}
        <button type="button" onClick={() => show('all')} style={linkBtn}>Show books</button>
      </section>
    );
  }

  return (
    <section aria-label="Worth a read" style={{ padding: '14px 0 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Worth a read</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Books we think are worth your time. The note under each one is ours; the cover and page are Open Library's, where you can often borrow it free.</div>
        </div>
        <button type="button" onClick={hide} aria-label="Hide books until tomorrow" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 6, display: 'flex' }}><X size={18} /></button>
      </div>

      <div role="tablist" aria-label="Which books" style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap' }}>
        {tab('all', 'All')}{tab('saved', 'Reading list', savedCount)}
      </div>

      {view === 'all' && <div style={{ padding: '0 16px 12px' }}><ThemeChips videos={books} value={theme} onChange={pickTheme} /></div>}

      {problem && <div role="alert" style={{ padding: '0 16px 8px', color: '#F87171', fontSize: 13 }}>{problem}</div>}

      {shown.length === 0 && (
        <div style={{ padding: '8px 16px 14px', fontSize: 14, color: 'var(--text-3)' }}>Nothing on your reading list yet. Tap the bookmark on any book to keep it for later. Only you can see this list.</div>
      )}

      <div style={{ position: 'relative' }}>
        {edges.left && <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll books left" style={{ ...arrow, left: 6 }}><ChevronLeft size={20} /></button>}
        {edges.right && <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll books right" style={{ ...arrow, right: 6 }}><ChevronRight size={20} /></button>}
        <ul ref={rowRef} onScroll={measure} style={{ listStyle: 'none', margin: 0, padding: '0 16px', display: shown.length === 0 ? 'none' : 'flex', alignItems: 'flex-start', gap: GAP, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, WebkitOverflowScrolling: 'touch' }}>
          {shown.map(b => {
            const isSaved = saved.includes(b.id);
            return (
              <li key={b.id} style={{ flex: `0 0 ${CARD_W}px`, scrollSnapAlign: 'start', position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" onClick={() => open(b)} aria-label={`${b.title}${b.authors ? `, by ${b.authors}` : ''}. Opens on Open Library in a new tab`}
                  style={{ position: 'relative', display: 'block', width: CARD_W, aspectRatio: '2 / 3', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#0b1018', textDecoration: 'none' }}>
                  <img src={b.coverUrl} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                </a>
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <button type="button" aria-pressed={isSaved} aria-label={isSaved ? `Remove ${b.title} from your reading list` : `Add ${b.title} to your reading list`} title={isSaved ? 'On your reading list. Tap to remove' : 'Add to your reading list'} onClick={() => void toggle(b)} style={roundButton(isSaved)}><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} /></button>
                </div>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.title}</span>
                  {b.authors && <span style={{ fontSize: 11.5, fontWeight: 700, color: GREEN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.authors}</span>}
                </span>
                {b.why && <span style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--text-3)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={b.why}>{b.why}</span>}
              </li>
            );
          })}
          {/* A little room at the end so the last card can scroll fully into view. */}
          <li aria-hidden="true" style={{ flex: '0 0 6px' }} />
        </ul>
      </div>
    </section>
  );
}

const linkBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700, color: GREEN, cursor: 'pointer', fontFamily: 'inherit' };
const arrow: React.CSSProperties = { position: 'absolute', top: 100, zIndex: 2, width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };
