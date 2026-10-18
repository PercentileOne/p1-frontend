import { useEffect, useState } from 'react';
import { fetchLikedBy } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { useVideoMarks } from '../hooks/useVideoMarks';
import { VideoPlayer } from './VideoPlayer';
import { VideoGrid } from './VideoGrid';
import { useShareVideo } from '../hooks/useShareVideo';

// The Liked Videos tab on a profile (Francis, 2026-10-18). On someone else's profile it shows the videos they liked, but only if they have switched sharing on AND you follow them.
// Anyone else gets the same plain answer, so it never reveals whether that person has liked anything. On your own profile it shows your own likes; the switch itself lives on the
// Liked view of the video strip, where you like things.

type State = { kind: 'loading' } | { kind: 'hidden' } | { kind: 'shown'; videos: FeedVideo[] };

export function LikedVideosPanel({ userId, name, isOwn, following }: { userId: string; name: string; isOwn: boolean; following: boolean }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [playing, setPlaying] = useState<FeedVideo | null>(null);
  const { marks, toggle } = useVideoMarks();
  const { notice, share } = useShareVideo();

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
      <VideoGrid videos={state.videos} onPlay={setPlaying} />
      {playing && <VideoPlayer video={playing} marks={marks} onToggle={toggle} onShare={v => void share(v)} hint={notice} onClose={() => setPlaying(null)} />}
    </div>
  );
}
