import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { VideoStrip } from './VideoStrip';
import { fetchFeedVideos, fetchVideoMarks, setVideoMark } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';

vi.mock('../api/feedVideosApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedVideosApi')>('../api/feedVideosApi');
  return { ...actual, fetchFeedVideos: vi.fn(), fetchVideoMarks: vi.fn(), setVideoMark: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const fetchVideos = vi.mocked(fetchFeedVideos);
const fetchMarks = vi.mocked(fetchVideoMarks);
const setMark = vi.mocked(setVideoMark);

const clip = (id: string, over: Partial<FeedVideo> = {}): FeedVideo => ({
  id, title: `Title ${id}`, channel: 'Shark Tank', channelUrl: 'https://www.youtube.com/@sharktank', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, theme: 'pitching', ...over,
});
const A = 'aaaaaaaaaaa', B = 'bbbbbbbbbbb';

beforeEach(() => {
  vi.clearAllMocks();
  fetchMarks.mockResolvedValue({ saved: [], liked: [] });
  try { localStorage.clear(); } catch { /* fine */ }
});
afterEach(() => cleanup());

describe('VideoStrip', () => {
  it('shows nothing when there are no videos, or they could not load', async () => {
    fetchVideos.mockResolvedValue([]);
    const { container } = render(<VideoStrip />);
    await waitFor(() => expect(fetchVideos).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('shows a card for each video with the channel credited', async () => {
    fetchVideos.mockResolvedValue([clip(A), clip(B, { channel: 'TED' })]);
    render(<VideoStrip />);
    expect(await screen.findByText('Worth a watch')).toBeTruthy();
    expect(screen.getByLabelText(`Play Title ${A}, from Shark Tank`)).toBeTruthy();
    expect(screen.getByLabelText(`Play Title ${B}, from TED`)).toBeTruthy();
  });

  it('plays a tapped video in the privacy-enhanced player, credits the channel, and closes with Escape', async () => {
    fetchVideos.mockResolvedValue([clip(A)]);
    render(<VideoStrip />);
    fireEvent.click(await screen.findByLabelText(new RegExp(`Play Title ${A}`)));
    const frame = await screen.findByTitle(`Title ${A}`);
    expect(frame.getAttribute('src')).toContain(`https://www.youtube-nocookie.com/embed/${A}`);
    expect(screen.getByText('Watch on YouTube').getAttribute('href')).toBe(`https://www.youtube.com/watch?v=${A}`);
    expect(screen.getAllByText('Shark Tank').some(el => el.getAttribute('href') === 'https://www.youtube.com/@sharktank')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTitle(`Title ${A}`)).toBeNull());
  });

  it('folds the strip away for the rest of the day, keeps Saved reachable, and can be opened again', async () => {
    fetchVideos.mockResolvedValue([clip(A), clip(B)]);
    fetchMarks.mockResolvedValue({ saved: [B], liked: [] });
    const { unmount } = render(<VideoStrip />);
    fireEvent.click(await screen.findByLabelText('Hide videos until tomorrow'));
    expect(screen.queryByLabelText(`Play Title ${A}, from Shark Tank`)).toBeNull();
    unmount();

    render(<VideoStrip />);
    expect(await screen.findByText('Saved (1)')).toBeTruthy();   // still folded away the next time
    expect(screen.queryByLabelText(`Play Title ${A}, from Shark Tank`)).toBeNull();
    fireEvent.click(screen.getByText('Saved (1)'));
    expect(await screen.findByLabelText(`Play Title ${B}, from Shark Tank`)).toBeTruthy();
    expect(screen.queryByLabelText(`Play Title ${A}, from Shark Tank`)).toBeNull();
  });

  it('saves a video for later and puts the button back if the save fails', async () => {
    fetchVideos.mockResolvedValue([clip(A)]);
    setMark.mockResolvedValueOnce({ saved: [A], liked: [] });
    render(<VideoStrip />);
    fireEvent.click(await screen.findByLabelText(`Save Title ${A} for later`));
    await waitFor(() => expect(setMark).toHaveBeenCalledWith(A, 'saved', true));
    expect(await screen.findByLabelText(`Remove Title ${A} from saved`)).toBeTruthy();
    expect(screen.getByText('Saved (1)')).toBeTruthy();

    setMark.mockRejectedValueOnce(new Error('That did not save. Try again.'));
    fireEvent.click(screen.getByLabelText(`Remove Title ${A} from saved`));
    expect((await screen.findByRole('alert')).textContent).toMatch(/did not save/);
    expect(screen.getByLabelText(`Remove Title ${A} from saved`)).toBeTruthy();   // still saved
  });

  it('likes a video and lists it under Liked', async () => {
    fetchVideos.mockResolvedValue([clip(A), clip(B)]);
    setMark.mockResolvedValueOnce({ saved: [], liked: [B] });
    render(<VideoStrip />);
    fireEvent.click(await screen.findByLabelText(`Like Title ${B}`));
    await waitFor(() => expect(setMark).toHaveBeenCalledWith(B, 'liked', true));
    fireEvent.click(await screen.findByText('Liked (1)'));
    expect(screen.queryByLabelText(`Play Title ${A}, from Shark Tank`)).toBeNull();
    expect(screen.getByLabelText(`Play Title ${B}, from Shark Tank`)).toBeTruthy();
  });

  it('says what the Saved view is for when nothing is saved', async () => {
    fetchVideos.mockResolvedValue([clip(A)]);
    render(<VideoStrip />);
    fireEvent.click(await screen.findByText('Saved (0)'));
    expect(screen.getByText(/Nothing saved yet/)).toBeTruthy();
  });

  it('shows saved videos that were saved earlier, in the order they were saved', async () => {
    fetchVideos.mockResolvedValue([clip(A), clip(B)]);
    fetchMarks.mockResolvedValue({ saved: [B, A], liked: [] });
    render(<VideoStrip />);
    fireEvent.click(await screen.findByText('Saved (2)'));
    const cards = screen.getAllByLabelText(/^Play Title/);
    expect(cards.map(c => c.getAttribute('aria-label'))).toEqual([`Play Title ${B}, from Shark Tank`, `Play Title ${A}, from Shark Tank`]);
  });
});
