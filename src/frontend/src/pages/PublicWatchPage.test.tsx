import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicWatchPage from './PublicWatchPage';
import { fetchPublicVideos, fetchVideoMarks, shareVideo } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { useAuthStore } from '../auth/authStore';

vi.mock('../api/feedVideosApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedVideosApi')>('../api/feedVideosApi');
  return { ...actual, fetchPublicVideos: vi.fn(), fetchVideoMarks: vi.fn(), setVideoMark: vi.fn(), shareVideo: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const publicVideos = vi.mocked(fetchPublicVideos);

const clip = (id: string): FeedVideo => ({ id, title: `Title ${id}`, channel: 'TED', channelUrl: '', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, theme: 'speaking' });
const A = 'aaaaaaaaaaa', B = 'bbbbbbbbbbb';

const open = (url = '/watch') => render(<MemoryRouter initialEntries={[url]}><PublicWatchPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null });
  vi.mocked(fetchVideoMarks).mockResolvedValue({ saved: [], liked: [], shareLikes: false });
});
afterEach(() => cleanup());

describe('PublicWatchPage', () => {
  it('says the videos are not on show when the public switch is off', async () => {
    publicVideos.mockResolvedValue({ enabled: false, videos: [] });
    open();
    expect(await screen.findByText(/not on show to the public right now/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Play /)).toBeNull();
  });

  it('shows every video to a visitor who is not signed in, with a way to try an interview', async () => {
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A), clip(B)] });
    open();
    expect(await screen.findByLabelText(`Play Title ${A}, from TED`)).toBeTruthy();
    expect(screen.getByLabelText(`Play Title ${B}, from TED`)).toBeTruthy();
    expect(screen.getAllByText('Try an interview free').length).toBeGreaterThan(0);
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(vi.mocked(fetchVideoMarks)).not.toHaveBeenCalled();   // no sign-in, so no private lists are asked for
  });

  it('opens a shared link straight onto the video, playing', async () => {
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A), clip(B)] });
    open(`/watch?v=${B}`);
    const frame = await screen.findByTitle(`Title ${B}`);
    expect(frame.getAttribute('src')).toContain(`youtube-nocookie.com/embed/${B}`);
  });

  it('just shows the page when the shared video is not in the list', async () => {
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A)] });
    open('/watch?v=zzzzzzzzzzz');
    expect(await screen.findByLabelText(`Play Title ${A}, from TED`)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('invites a visitor to make an account when they try to save or like', async () => {
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A)] });
    open(`/watch?v=${A}`);
    fireEvent.click(await screen.findByLabelText('Save for later'));
    expect(await screen.findByText(/Create a free account to save and like videos/)).toBeTruthy();
    expect(screen.getByText('Sign up').getAttribute('href')).toBe('/register');
  });

  it('shares from the player, for anyone', async () => {
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A)] });
    vi.mocked(shareVideo).mockResolvedValue('copied');
    open(`/watch?v=${A}`);
    fireEvent.click(await screen.findByLabelText('Share this video'));
    await waitFor(() => expect(shareVideo).toHaveBeenCalledWith(expect.objectContaining({ id: A })));
    expect(await screen.findByText(/Link copied/)).toBeTruthy();
  });

  it('closes the player and keeps the grid', async () => {
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A)] });
    open(`/watch?v=${A}`);
    fireEvent.click(await screen.findByLabelText('Close video'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText(`Play Title ${A}, from TED`)).toBeTruthy();
  });

  it('offers a signed-in member their own Feed instead of Sign in', async () => {
    useAuthStore.setState({ token: 'tok' });
    publicVideos.mockResolvedValue({ enabled: true, videos: [clip(A)] });
    open();
    expect(await screen.findByText('Open my Feed')).toBeTruthy();
    expect(screen.queryByText('Sign in')).toBeNull();
  });
});
