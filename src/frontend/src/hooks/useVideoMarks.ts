import { useCallback, useEffect, useState } from 'react';
import { fetchVideoMarks, setLikesShared, setVideoMark } from '../api/feedVideosApi';
import type { FeedVideo, VideoMark, VideoMarks } from '../api/feedVideosApi';
import { logEvent } from '../api/flowLogger';

// A person's saved ("watch later") and liked videos, and the switch that shows the liked ones to followers. Shared by the video strip and the profile's Liked Videos tab.
// Optimistic: a button changes at once, and goes back with a short message if the save fails.
export function useVideoMarks() {
  const [marks, setMarks] = useState<VideoMarks>({ saved: [], liked: [], shareLikes: false });
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let alive = true;
    void fetchVideoMarks().then(m => { if (alive) setMarks(m); });
    return () => { alive = false; };
  }, []);

  const toggle = useCallback(async (v: FeedVideo, mark: VideoMark) => {
    let was = false;
    setProblem('');
    setMarks(m => { was = m[mark].includes(v.id); return { ...m, [mark]: was ? m[mark].filter(id => id !== v.id) : [v.id, ...m[mark]] }; });
    if (!was) logEvent(mark === 'saved' ? 'feed_video_save' : 'feed_video_like', { metadata: { id: v.id, theme: v.theme } });
    try { setMarks(await setVideoMark(v.id, mark, !was)); }
    catch (e) {
      setMarks(m => ({ ...m, [mark]: was ? [v.id, ...m[mark].filter(id => id !== v.id)] : m[mark].filter(id => id !== v.id) }));
      setProblem((e as Error).message);
    }
  }, []);

  const setSharing = useCallback(async (on: boolean) => {
    setProblem('');
    setMarks(m => ({ ...m, shareLikes: on }));
    try { setMarks(await setLikesShared(on)); }
    catch (e) { setMarks(m => ({ ...m, shareLikes: !on })); setProblem((e as Error).message); }
  }, []);

  return { marks, problem, toggle, setSharing };
}
