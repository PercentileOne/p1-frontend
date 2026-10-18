import { Play } from 'lucide-react';
import type { FeedVideo } from '../api/feedVideosApi';

// A grid of video cards (16:9 thumbnail, channel, title). Used by the public Watch page and the profile's Liked Videos tab. A tap plays it (the caller opens the player).

export function VideoGrid({ videos, onPlay }: { videos: FeedVideo[]; onPlay: (v: FeedVideo) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {videos.map(v => (
        <button key={v.id} type="button" onClick={() => onPlay(v)} aria-label={`Play ${v.title}, from ${v.channel}`}
          style={{ textAlign: 'left', padding: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', background: '#0b0f14', cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>
          <span style={{ position: 'relative', display: 'block', aspectRatio: '16 / 9', background: '#000' }}>
            <img src={`https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hq720.jpg`} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { const img = e.currentTarget; if (img.dataset.fellBack === '1') { img.style.display = 'none'; return; } img.dataset.fellBack = '1'; img.src = v.thumbnail; }} />
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={17} fill="#fff" /></span>
          </span>
          <span style={{ display: 'block', padding: '8px 10px 10px' }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#34D399' }}>{v.channel}</span>
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{v.title}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
