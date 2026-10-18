import { useCallback, useEffect, useRef, useState } from 'react';
import { shareVideo } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { logEvent } from '../api/flowLogger';

// The Share button on a video (Francis, 2026-10-18): a link that opens our Watch page with the video playing. On a phone this opens the share sheet; elsewhere the link is copied
// and `notice` says so for a few seconds.
export function useShareVideo() {
  const [notice, setNotice] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const share = useCallback(async (v: FeedVideo) => {
    const result = await shareVideo(v);
    if (result === 'cancelled') return;
    logEvent('feed_video_share', { metadata: { id: v.id, theme: v.theme, how: result } });
    setNotice(result === 'copied' ? 'Link copied. Paste it anywhere to share this video.' : result === 'failed' ? 'Could not copy the link. Try again.' : '');
    window.clearTimeout(timer.current);
    if (result === 'copied' || result === 'failed') timer.current = window.setTimeout(() => setNotice(''), 3500);
  }, []);

  return { notice, share };
}
