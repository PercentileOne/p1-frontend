import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { COST_LABEL, courseLink, fetchFeedCourses } from '../api/feedCoursesApi';
import type { FeedCourse } from '../api/feedCoursesApi';
import { localDate } from '../api/routinesApi';
import { logEvent } from '../api/flowLogger';
import { useCourseMarks } from '../hooks/useCourseMarks';
import { roundButton } from './VideoPlayer';
import { ThemeChips } from './ThemeChips';

// The feed's courses strip (Francis, 2026-10-20), styled like the video and books strips: a heading, then a row of cards that scrolls sideways with the next card peeking in.
// Every course is from a real provider and was checked against the provider's own page when it was added (platforms that refuse automated checks, such as Udemy, are added by hand after an admin has opened the course).
// A card shows the provider's own picture and title and links to the course on the provider's own site. The one-line reason under each card is ours, and the strip says so. Whether a course is free is set by an admin, never assumed.
// The bookmark keeps a course on a private Saved list. The app hides scrollbars everywhere, so the row has arrow buttons for a mouse. The X folds the strip down to one line until tomorrow; Saved stays one tap away.

const HIDE_KEY = 'tic_course_strip_hidden';
const CARD_W = 230;
const GAP = 12;
const GREEN = '#34D399';

type View = 'all' | 'saved';

function hiddenToday(): boolean {
  try { return localStorage.getItem(HIDE_KEY) === localDate(); } catch { return false; }
}

export function CourseStrip() {
  const [courses, setCourses] = useState<FeedCourse[] | null>(null);
  const { saved, problem, toggle } = useCourseMarks();
  const [view, setView] = useState<View>('all');
  const [theme, setTheme] = useState<string | null>(null);
  const [hidden, setHidden] = useState(hiddenToday);
  const [edges, setEdges] = useState({ left: false, right: false });
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let alive = true;
    void fetchFeedCourses().then(c => { if (alive) setCourses(c); });
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
  }, [measure, courses, view, hidden]);

  if (!courses || courses.length === 0) return null;

  const savedCount = courses.filter(c => saved.includes(c.id)).length;
  const shown = view === 'saved' ? saved.map(id => courses.find(c => c.id === id)).filter((c): c is FeedCourse => !!c)
    : theme ? courses.filter(c => c.theme === theme) : courses;

  function hide() { try { localStorage.setItem(HIDE_KEY, localDate()); } catch { /* it will just show again */ } setHidden(true); setView('all'); }
  function show(next: View = 'all') { try { localStorage.removeItem(HIDE_KEY); } catch { /* fine */ } setHidden(false); setView(next); }
  function open(c: FeedCourse) { logEvent('feed_course_open', { metadata: { id: c.id, theme: c.theme, provider: c.provider } }); }
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
      <section aria-label="Courses worth taking, folded away" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginRight: 'auto' }}>Courses worth taking</span>
        {savedCount > 0 && <button type="button" onClick={() => show('saved')} style={linkBtn}>Saved ({savedCount})</button>}
        <button type="button" onClick={() => show('all')} style={linkBtn}>Show courses</button>
      </section>
    );
  }

  return (
    <section aria-label="Courses worth taking" style={{ padding: '14px 0 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Courses worth taking</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Courses from the providers who run them. The note under each one is ours; the title and picture are the provider's, and a card opens the course on the provider's own site.</div>
        </div>
        <button type="button" onClick={hide} aria-label="Hide courses until tomorrow" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 6, display: 'flex' }}><X size={18} /></button>
      </div>

      <div role="tablist" aria-label="Which courses" style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap' }}>
        {tab('all', 'All')}{tab('saved', 'Saved', savedCount)}
      </div>

      {view === 'all' && <div style={{ padding: '0 16px 12px' }}><ThemeChips videos={courses} value={theme} onChange={pickTheme} /></div>}

      {problem && <div role="alert" style={{ padding: '0 16px 8px', color: '#F87171', fontSize: 13 }}>{problem}</div>}

      {shown.length === 0 && (
        <div style={{ padding: '8px 16px 14px', fontSize: 14, color: 'var(--text-3)' }}>Nothing saved yet. Tap the bookmark on any course to keep it for later. Only you can see this list.</div>
      )}

      <div style={{ position: 'relative' }}>
        {edges.left && <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll courses left" style={{ ...arrow, left: 6 }}><ChevronLeft size={20} /></button>}
        {edges.right && <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll courses right" style={{ ...arrow, right: 6 }}><ChevronRight size={20} /></button>}
        <ul ref={rowRef} onScroll={measure} style={{ listStyle: 'none', margin: 0, padding: '0 16px', display: shown.length === 0 ? 'none' : 'flex', alignItems: 'flex-start', gap: GAP, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, WebkitOverflowScrolling: 'touch' }}>
          {shown.map(c => {
            const isSaved = saved.includes(c.id);
            return (
              <li key={c.id} style={{ flex: `0 0 ${CARD_W}px`, scrollSnapAlign: 'start', position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href={courseLink(c)} target="_blank" rel="noopener noreferrer" onClick={() => open(c)} aria-label={`${c.title}, from ${c.provider}. Opens on the provider's site in a new tab`}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: CARD_W, aspectRatio: '16 / 9', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #0f2a22, #0b1018)', textDecoration: 'none' }}>
                  {/* The provider's name sits behind the picture, so a missing or broken picture still leaves a clear card. */}
                  <span aria-hidden="true" style={{ padding: 12, textAlign: 'center', fontSize: 16, fontWeight: 800, color: GREEN }}>{c.provider}</span>
                  {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />}
                </a>
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <button type="button" aria-pressed={isSaved} aria-label={isSaved ? `Remove ${c.title} from your saved courses` : `Save ${c.title} for later`} title={isSaved ? 'Saved. Tap to remove' : 'Save for later'} onClick={() => void toggle(c)} style={roundButton(isSaved)}><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} /></button>
                </div>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.title}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: GREEN }}>
                    {c.provider}{c.cost ? <span style={{ color: 'var(--text-3)', fontWeight: 600 }}> · {COST_LABEL[c.cost]}</span> : null}
                  </span>
                </span>
                {c.why && <span style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--text-3)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={c.why}>{c.why}</span>}
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
const arrow: React.CSSProperties = { position: 'absolute', top: 60, zIndex: 2, width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };
