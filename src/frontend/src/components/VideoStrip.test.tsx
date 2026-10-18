import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { VideoStrip } from './VideoStrip';
import { fetchFeedVideos } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';

vi.mock('../api/feedVideosApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedVideosApi')>('../api/feedVideosApi');
  return { ...actual, fetchFeedVideos: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const fetchVideos = vi.mocked(fetchFeedVideos);

const clip = (id: string, over: Partial<FeedVideo> = {}): FeedVideo => ({
  id, title: `Title ${id}`, channel: 'Shark Tank', channelUrl: 'https://www.youtube.com/@sharktank', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, theme: 'pitching', ...over,
});

beforeEach(() => { vi.clearAllMocks(); try { localStorage.clear(); } catch { /* fine */ } });
afterEach(() => cleanup());

describe('VideoStrip', () => {
  it('shows nothing when there are no videos, or they could not load', async () => {
    fetchVideos.mockResolvedValue([]);
    const { container } = render(<VideoStrip />);
    await waitFor(() => expect(fetchVideos).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('shows a card for each video with the channel credited', async () => {
    fetchVideos.mockResolvedValue([clip('aaaaaaaaaaa'), clip('bbbbbbbbbbb', { channel: 'TED' })]);
    render(<VideoStrip />);
    expect(await screen.findByText('Worth a watch')).toBeTruthy();
    expect(screen.getByLabelText('Play Title aaaaaaaaaaa, from Shark Tank')).toBeTruthy();
    expect(screen.getByLabelText('Play Title bbbbbbbbbbb, from TED')).toBeTruthy();
  });

  it('plays a tapped video in the privacy-enhanced player, credits the channel, and closes with Escape', async () => {
    fetchVideos.mockResolvedValue([clip('aaaaaaaaaaa')]);
    render(<VideoStrip />);
    fireEvent.click(await screen.findByLabelText(/Play Title aaaaaaaaaaa/));
    const frame = await screen.findByTitle('Title aaaaaaaaaaa');
    expect(frame.getAttribute('src')).toContain('https://www.youtube-nocookie.com/embed/aaaaaaaaaaa');
    expect(screen.getByText('Watch on YouTube').getAttribute('href')).toBe('https://www.youtube.com/watch?v=aaaaaaaaaaa');
    expect(screen.getAllByText('Shark Tank').some(el => el.getAttribute('href') === 'https://www.youtube.com/@sharktank')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTitle('Title aaaaaaaaaaa')).toBeNull());
  });

  it('hides the strip for the rest of the day when the X is pressed', async () => {
    fetchVideos.mockResolvedValue([clip('aaaaaaaaaaa')]);
    const { unmount } = render(<VideoStrip />);
    fireEvent.click(await screen.findByLabelText('Hide videos until tomorrow'));
    expect(screen.queryByText('Worth a watch')).toBeNull();
    unmount();
    fetchVideos.mockClear();
    const again = render(<VideoStrip />);
    expect(again.container.textContent).toBe('');
    expect(fetchVideos).not.toHaveBeenCalled();
  });
});
