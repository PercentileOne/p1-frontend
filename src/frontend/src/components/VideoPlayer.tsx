import { useEffect, useRef } from 'react';
import { Bookmark, Heart, X } from 'lucide-react';
import { embedUrl, watchUrl } from '../api/feedVideosApi';
import type { FeedVideo, VideoMark, VideoMarks } from '../api/feedVideosApi';

// The pop-up player for a feed video: YouTube's own privacy-enhanced player, the channel credited, a link to the original, and Save and Like. Closes with Escape or a tap outside.
// Used by the video strip and by the profile's Liked Videos tab.

const GREEN = '#34D399';

export const roundButton = (on: boolean): React.CSSProperties => ({
  width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  background: on ? 'rgba(52,211,153,0.9)' : 'rgba(0,0,0,0.55)', color: on ? '#04130d' : '#fff',
});

export function VideoPlayer({ video, marks, onToggle, onClose }: {
  video: FeedVideo; marks: VideoMarks; onToggle: (v: FeedVideo, mark: VideoMark) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saved = marks.saved.includes(video.id), liked = marks.liked.includes(video.id);
  return (
    <div role="dialog" aria-modal="true" aria-label={video.title} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(100%, 760px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close video" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 999, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <iframe src={embedUrl(video.id)} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: '#fff', fontSize: 14, lineHeight: 1.45 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{video.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              From {video.channelUrl ? <a href={video.channelUrl} target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>{video.channel}</a> : video.channel} on YouTube
              {' · '}<a href={watchUrl(video.id)} target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>Watch on YouTube</a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save for later'} onClick={() => onToggle(video, 'saved')} style={roundButton(saved)}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /></button>
            <button type="button" aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} onClick={() => onToggle(video, 'liked')} style={roundButton(liked)}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
