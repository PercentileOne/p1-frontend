import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Heart, Play, Share2, X } from 'lucide-react';
import { fetchFeedVideos } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { localDate } from '../api/routinesApi';
import { logEvent } from '../api/flowLogger';
import { useVideoMarks } from '../hooks/useVideoMarks';
import { useShareVideo } from '../hooks/useShareVideo';
import { VideoPlayer, roundButton } from './VideoPlayer';

// The feed's video strip (Francis, 2026-10-18), after the LinkedIn layout he showed: a heading, then a row of tall phone-shaped cards that scrolls sideways, with the next card
// peeking in at the edge so people know to swipe. Every video is from an official channel and checked with YouTube when it was added. A card shows YouTube's own thumbnail and credits
// the channel; tapping plays it in YouTube's own privacy-enhanced player. Nothing is copied or re-hosted.
// Save ("watch later", Francis's "Save in my Videos") and Like are private to the person, unless they switch on sharing their likes with the people who follow them (the switch sits on the
// Liked view). The app hides scrollbars everywhere, so the row has arrow buttons for a mouse. The X folds the strip down to one line until tomorrow; Saved and Liked stay one tap away.

const HIDE_KEY = 'tic_video_strip_hidden';
const CARD_W = 176;
const GAP = 10;
const GREEN = '#34D399';

type View = 'all' | 'saved' | 'liked';

// YouTube's default thumbnail has black bars above and below the picture, which show on a tall card. The 720p one has none; not every video has it, so fall back to the default.
const sharpThumb = (id: string) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hq720.jpg`;
function fallBack(img: HTMLImageElement, fallback: string) {
  if (img.dataset.fellBack === '1') { img.style.display = 'none'; return; }
  img.dataset.fellBack = '1';
  img.src = fallback;
}

function hiddenToday(): boolean {
  try { return localStorage.getItem(HIDE_KEY) === localDate(); } catch { return false; }
}

export function VideoStrip() {
  const [videos, setVideos] = useState<FeedVideo[] | null>(null);
  const { marks, problem, toggle, setSharing } = useVideoMarks();
  const { notice, share } = useShareVideo();
  const [view, setView] = useState<View>('all');
  const [hidden, setHidden] = useState(hiddenToday);
  const [playing, setPlaying] = useState<FeedVideo | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let alive = true;
    void fetchFeedVideos().then(v => { if (alive) setVideos(v); });
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
  }, [measure, videos, view, hidden]);

  const closePlayer = useCallback(() => setPlaying(null), []);

  if (!videos || videos.length === 0) return null;

  const savedCount = videos.filter(v => marks.saved.includes(v.id)).length;
  const likedCount = videos.filter(v => marks.liked.includes(v.id)).length;
  const shown = view === 'saved' ? marks.saved.map(id => videos.find(v => v.id === id)).filter((v): v is FeedVideo => !!v)
    : view === 'liked' ? marks.liked.map(id => videos.find(v => v.id === id)).filter((v): v is FeedVideo => !!v)
    : videos;

  function hide() { try { localStorage.setItem(HIDE_KEY, localDate()); } catch { /* it will just show again */ } setHidden(true); setView('all'); }
  function show(next: View = 'all') { try { localStorage.removeItem(HIDE_KEY); } catch { /* fine */ } setHidden(false); setView(next); }
  function play(v: FeedVideo) { logEvent('feed_video_play', { metadata: { id: v.id, theme: v.theme, channel: v.channel } }); setPlaying(v); }
  function scrollBy(dir: 1 | -1) { rowRef.current?.scrollBy({ left: dir * (CARD_W + GAP) * 2, behavior: 'smooth' }); }

  const tab = (id: View, text: string, count?: number) => (
    <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
      style={{ background: view === id ? 'rgba(52,211,153,0.16)' : 'transparent', color: view === id ? GREEN : 'var(--text-3)', border: `1px solid ${view === id ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {text}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  if (hidden) {
    return (
      <section aria-label="Worth a watch, folded away" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginRight: 'auto' }}>Worth a watch</span>
        {savedCount > 0 && <button type="button" onClick={() => show('saved')} style={linkBtn}>Saved ({savedCount})</button>}
        {likedCount > 0 && <button type="button" onClick={() => show('liked')} style={linkBtn}>Liked ({likedCount})</button>}
        <button type="button" onClick={() => show('all')} style={linkBtn}>Show videos</button>
      </section>
    );
  }

  return (
    <section aria-label="Worth a watch" style={{ padding: '14px 0 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Worth a watch</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Clips from the official channels of the people who made them. Tap to play.</div>
        </div>
        <button type="button" onClick={hide} aria-label="Hide videos until tomorrow" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 6, display: 'flex' }}><X size={18} /></button>
      </div>

      <div role="tablist" aria-label="Which videos" style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap' }}>
        {tab('all', 'All')}{tab('saved', 'Saved', savedCount)}{tab('liked', 'Liked', likedCount)}
      </div>

      {view === 'liked' && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0 16px 12px', cursor: 'pointer' }}>
          <input type="checkbox" role="switch" checked={marks.shareLikes} onChange={e => void setSharing(e.target.checked)} style={{ marginTop: 3, accentColor: GREEN }} />
          <span>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Show my liked videos to people who follow me</span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)' }}>
              {marks.shareLikes ? 'On. People who follow you can see these on your profile, under Liked Videos.' : 'Off. Only you can see them. Nobody else sees anything unless you switch this on.'}
            </span>
          </span>
        </label>
      )}

      {notice && <div role="status" style={{ padding: '0 16px 8px', color: GREEN, fontSize: 13 }}>{notice}</div>}
      {problem && <div role="alert" style={{ padding: '0 16px 8px', color: '#F87171', fontSize: 13 }}>{problem}</div>}

      {shown.length === 0 && (
        <div style={{ padding: '8px 16px 14px', fontSize: 14, color: 'var(--text-3)' }}>
          {view === 'saved' ? 'Nothing saved yet. Tap the bookmark on any video to keep it for later.' : 'Nothing liked yet. Tap the heart on a video you enjoy.'}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {edges.left && <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll videos left" style={{ ...arrow, left: 6 }}><ChevronLeft size={20} /></button>}
        {edges.right && <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll videos right" style={{ ...arrow, right: 6 }}><ChevronRight size={20} /></button>}
        <ul ref={rowRef} onScroll={measure} style={{ listStyle: 'none', margin: 0, padding: '0 16px', display: shown.length === 0 ? 'none' : 'flex', gap: GAP, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, WebkitOverflowScrolling: 'touch' }}>
          {shown.map(v => {
            const isSaved = marks.saved.includes(v.id), isLiked = marks.liked.includes(v.id);
            return (
              <li key={v.id} style={{ flex: `0 0 ${CARD_W}px`, scrollSnapAlign: 'start', position: 'relative' }}>
                <button type="button" onClick={() => play(v)} aria-label={`Play ${v.title}, from ${v.channel}`}
                  style={{ position: 'relative', display: 'block', width: CARD_W, aspectRatio: '9 / 16', padding: 0, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: '#05070b', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <img src={sharpThumb(v.id)} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => fallBack(e.currentTarget, v.thumbnail)} />
                  <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.88) 100%)' }} />
                  <span style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={20} fill="#fff" /></span>
                  <span style={{ position: 'absolute', left: 10, right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.channel}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</span>
                  </span>
                </button>
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button type="button" aria-pressed={isSaved} aria-label={isSaved ? `Remove ${v.title} from saved` : `Save ${v.title} for later`} title={isSaved ? 'Saved. Tap to remove' : 'Save for later'} onClick={() => void toggle(v, 'saved')} style={roundButton(isSaved)}><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} /></button>
                  <button type="button" aria-pressed={isLiked} aria-label={isLiked ? `Unlike ${v.title}` : `Like ${v.title}`} title={isLiked ? 'Liked. Tap to remove' : 'Like'} onClick={() => void toggle(v, 'liked')} style={roundButton(isLiked)}><Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /></button>
                  <button type="button" aria-label={`Share ${v.title}`} title="Share" onClick={() => void share(v)} style={roundButton(false)}><Share2 size={16} /></button>
                </div>
              </li>
            );
          })}
          {/* A little room at the end so the last card can scroll fully into view. */}
          <li aria-hidden="true" style={{ flex: '0 0 6px' }} />
        </ul>
      </div>

      {playing && <VideoPlayer video={playing} marks={marks} onToggle={(v, m) => void toggle(v, m)} onShare={v => void share(v)} hint={notice} onClose={closePlayer} />}
    </section>
  );
}

const linkBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700, color: GREEN, cursor: 'pointer', fontFamily: 'inherit' };
const arrow: React.CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };
