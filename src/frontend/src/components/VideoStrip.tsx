import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { embedUrl, fetchFeedVideos, watchUrl } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { localDate } from '../api/routinesApi';
import { logEvent } from '../api/flowLogger';

// The feed's video strip (Francis, 2026-10-18), after the LinkedIn layout he showed: a heading, then a row of tall phone-shaped cards that scrolls sideways, with the next card
// peeking in at the edge so people know to swipe. Every video is from an official channel and checked with YouTube when it was added. A card shows YouTube's own thumbnail and credits
// the channel; tapping plays it in YouTube's own privacy-enhanced player. Nothing is copied or re-hosted. The X hides the strip until tomorrow.

const HIDE_KEY = 'tic_video_strip_hidden';
const CARD_W = 176;

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
  const [hidden, setHidden] = useState(hiddenToday);
  const [playing, setPlaying] = useState<FeedVideo | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hidden) return;
    let alive = true;
    void fetchFeedVideos().then(v => { if (alive) setVideos(v); });
    return () => { alive = false; };
  }, [hidden]);

  useEffect(() => {
    if (!playing) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlaying(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  if (hidden || !videos || videos.length === 0) return null;

  function hide() { try { localStorage.setItem(HIDE_KEY, localDate()); } catch { /* it will just show again */ } setHidden(true); }
  function play(v: FeedVideo) { logEvent('feed_video_play', { metadata: { id: v.id, theme: v.theme, channel: v.channel } }); setPlaying(v); }

  return (
    <section aria-label="Worth a watch" style={{ padding: '14px 0 16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Worth a watch</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Clips from the official channels of the people who made them. Tap to play.</div>
        </div>
        <button type="button" onClick={hide} aria-label="Hide videos until tomorrow" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 6, display: 'flex' }}><X size={18} /></button>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: '0 16px', display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, WebkitOverflowScrolling: 'touch' }}>
        {videos.map(v => (
          <li key={v.id} style={{ flex: `0 0 ${CARD_W}px`, scrollSnapAlign: 'start' }}>
            <button type="button" onClick={() => play(v)} aria-label={`Play ${v.title}, from ${v.channel}`}
              style={{ position: 'relative', display: 'block', width: CARD_W, aspectRatio: '9 / 16', padding: 0, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: '#05070b', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <img src={sharpThumb(v.id)} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => fallBack(e.currentTarget, v.thumbnail)} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.88) 100%)' }} />
              <span style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={20} fill="#fff" /></span>
              <span style={{ position: 'absolute', left: 10, right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#34D399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.channel}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</span>
              </span>
            </button>
          </li>
        ))}
        {/* A little room at the end so the last card can scroll fully into view. */}
        <li aria-hidden="true" style={{ flex: '0 0 6px' }} />
      </ul>

      {playing && (
        <div role="dialog" aria-modal="true" aria-label={playing.title} onClick={() => setPlaying(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(100%, 760px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button ref={closeRef} type="button" onClick={() => setPlaying(null)} aria-label="Close video" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 999, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
              <iframe src={embedUrl(playing.id)} title={playing.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
            <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700 }}>{playing.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                From {playing.channelUrl ? <a href={playing.channelUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#34D399' }}>{playing.channel}</a> : playing.channel} on YouTube
                {' · '}<a href={watchUrl(playing.id)} target="_blank" rel="noopener noreferrer" style={{ color: '#34D399' }}>Watch on YouTube</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
