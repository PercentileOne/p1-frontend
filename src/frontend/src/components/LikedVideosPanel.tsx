import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { fetchLikedBy } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { useVideoMarks } from '../hooks/useVideoMarks';
import { VideoPlayer } from './VideoPlayer';

// The Liked Videos tab on a profile (Francis, 2026-10-18). On someone else's profile it shows the videos they liked, but only if they have switched sharing on AND you follow them.
// Anyone else gets the same plain answer, so it never reveals whether that person has liked anything. On your own profile it shows your own likes; the switch itself lives on the
// Liked view of the video strip, where you like things.

type State = { kind: 'loading' } | { kind: 'hidden' } | { kind: 'shown'; videos: FeedVideo[] };

export function LikedVideosPanel({ userId, name, isOwn, following }: { userId: string; name: string; isOwn: boolean; following: boolean }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [playing, setPlaying] = useState<FeedVideo | null>(null);
  const { marks, toggle } = useVideoMarks();

  // Following (or un-following) changes what may be shown, so it is asked again.
  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    void fetchLikedBy(userId).then(r => { if (alive) setState(r.visible ? { kind: 'shown', videos: r.videos } : { kind: 'hidden' }); });
    return () => { alive = false; };
  }, [userId, following]);

  const muted: React.CSSProperties = { fontSize: 14, color: 'var(--text-3, #8b98a8)', lineHeight: 1.5 };
  if (state.kind === 'loading') return <div style={muted} aria-busy="true">Loading…</div>;
  if (state.kind === 'hidden') {
    return <div style={muted}>{following ? 'There is nothing to show here.' : `Follow ${name} to see the videos they like, when they choose to share them.`}</div>;
  }
  if (state.videos.length === 0) return <div style={muted}>{isOwn ? 'You have not liked any videos yet. Tap the heart on a video in your Feed.' : `${name} has not liked any videos yet.`}</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        {state.videos.map(v => (
          <button key={v.id} type="button" onClick={() => setPlaying(v)} aria-label={`Play ${v.title}, from ${v.channel}`}
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
      {playing && <VideoPlayer video={playing} marks={marks} onToggle={toggle} onClose={() => setPlaying(null)} />}
    </div>
  );
}
