import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareUrl, shareVideo } from './feedVideosApi';
import type { FeedVideo } from './feedVideosApi';

const video: FeedVideo = { id: 'dQw4w9WgXcQ', title: 'A pitch', channel: 'Shark Tank', channelUrl: '', thumbnail: '', theme: 'pitching' };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('shareUrl', () => {
  it('opens our Watch page on the video, tagged so the Activity Log shows shares as a source', () => {
    const url = new URL(shareUrl('dQw4w9WgXcQ'));
    expect(url.pathname).toBe('/watch');
    expect(url.searchParams.get('v')).toBe('dQw4w9WgXcQ');
    expect(url.searchParams.get('utm_source')).toBe('share');
    expect(url.searchParams.get('utm_medium')).toBe('video');
    expect(url.searchParams.get('utm_campaign')).toBe('feed-share');
  });

  it('keeps the local address when developing, so a link can be tried', () => {
    expect(shareUrl('dQw4w9WgXcQ').startsWith(window.location.origin)).toBe(true);   // the test runs on localhost
  });
});

describe('shareVideo', () => {
  it('uses the phone share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    expect(await shareVideo(video)).toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'A pitch', url: expect.stringContaining('/watch?v=dQw4w9WgXcQ') }));
  });

  it('says cancelled, and does not copy, when the person closes the share sheet', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')), clipboard: { writeText } });
    expect(await shareVideo(video)).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareVideo(video)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/watch?v=dQw4w9WgXcQ'));
  });

  it('falls back to copying if the share sheet fails for another reason, and reports a copy that fails', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('nope')), clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } });
    expect(await shareVideo(video)).toBe('failed');
  });
});
