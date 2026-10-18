import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LikedVideosPanel } from './LikedVideosPanel';
import { fetchLikedBy, fetchVideoMarks } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';

vi.mock('../api/feedVideosApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedVideosApi')>('../api/feedVideosApi');
  return { ...actual, fetchLikedBy: vi.fn(), fetchVideoMarks: vi.fn(), setVideoMark: vi.fn(), setLikesShared: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const likedBy = vi.mocked(fetchLikedBy);

const clip = (id: string): FeedVideo => ({ id, title: `Title ${id}`, channel: 'TED', channelUrl: '', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, theme: 'speaking' });

beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchVideoMarks).mockResolvedValue({ saved: [], liked: [], shareLikes: false }); });
afterEach(() => cleanup());

describe('LikedVideosPanel', () => {
  it('invites a non-follower to follow, without saying whether anything is liked', async () => {
    likedBy.mockResolvedValue({ visible: false, videos: [] });
    render(<LikedVideosPanel userId="u1" name="Sam" isOwn={false} following={false} />);
    expect(await screen.findByText(/Follow Sam to see the videos they like, when they choose to share them/)).toBeTruthy();
  });

  it('gives a follower the same plain answer when sharing is off', async () => {
    likedBy.mockResolvedValue({ visible: false, videos: [] });
    render(<LikedVideosPanel userId="u1" name="Sam" isOwn={false} following />);
    expect(await screen.findByText('There is nothing to show here.')).toBeTruthy();
  });

  it('lists the videos a follower may see, and plays one', async () => {
    likedBy.mockResolvedValue({ visible: true, videos: [clip('aaaaaaaaaaa'), clip('bbbbbbbbbbb')] });
    render(<LikedVideosPanel userId="u1" name="Sam" isOwn={false} following />);
    fireEvent.click(await screen.findByLabelText('Play Title aaaaaaaaaaa, from TED'));
    expect((await screen.findByTitle('Title aaaaaaaaaaa')).getAttribute('src')).toContain('youtube-nocookie.com/embed/aaaaaaaaaaa');
    expect(screen.getByLabelText('Play Title bbbbbbbbbbb, from TED')).toBeTruthy();
  });

  it('says so when someone shares but has liked nothing yet', async () => {
    likedBy.mockResolvedValue({ visible: true, videos: [] });
    render(<LikedVideosPanel userId="u1" name="Sam" isOwn={false} following />);
    expect(await screen.findByText('Sam has not liked any videos yet.')).toBeTruthy();
  });

  it('asks again when following changes', async () => {
    likedBy.mockResolvedValue({ visible: false, videos: [] });
    const { rerender } = render(<LikedVideosPanel userId="u1" name="Sam" isOwn={false} following={false} />);
    await waitFor(() => expect(likedBy).toHaveBeenCalledTimes(1));
    rerender(<LikedVideosPanel userId="u1" name="Sam" isOwn={false} following />);
    await waitFor(() => expect(likedBy).toHaveBeenCalledTimes(2));
  });
});
