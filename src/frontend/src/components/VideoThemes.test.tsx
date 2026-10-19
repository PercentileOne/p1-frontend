import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeChips } from './ThemeChips';
import { VideoStrip } from './VideoStrip';
import PublicWatchPage from '../pages/PublicWatchPage';
import { themeLabel, themesIn } from '../utils/videoThemes';
import { fetchFeedVideos, fetchPublicVideos, fetchVideoMarks } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';

vi.mock('../api/feedVideosApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedVideosApi')>('../api/feedVideosApi');
  return { ...actual, fetchFeedVideos: vi.fn(), fetchPublicVideos: vi.fn(), fetchVideoMarks: vi.fn(), setVideoMark: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));

const clip = (id: string, theme: string): FeedVideo => ({ id, title: `Title ${id}`, channel: 'TED', channelUrl: '', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, theme });
const VIDEOS = [clip('aaaaaaaaaaa', 'routines'), clip('bbbbbbbbbbb', 'pitching'), clip('ccccccccccc', 'pitching'), clip('ddddddddddd', 'interviews')];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchFeedVideos).mockResolvedValue(VIDEOS);
  vi.mocked(fetchPublicVideos).mockResolvedValue({ enabled: true, videos: VIDEOS });
  vi.mocked(fetchVideoMarks).mockResolvedValue({ saved: [], liked: [], shareLikes: false });
  try { localStorage.clear(); } catch { /* fine */ }
});
afterEach(() => cleanup());

describe('video themes', () => {
  it('names the themes in plain words, and tidies one it does not know', () => {
    expect(themeLabel('rejection')).toBe('Turned down, then succeeded');
    expect(themeLabel('software-and-cloud')).toBe('Software and cloud');
    expect(themeLabel('new_theme-idea')).toBe('New theme idea');
  });

  it('counts the themes present, in the standard order, with unknown ones last', () => {
    const list = themesIn([...VIDEOS, clip('eeeeeeeeeee', 'zebra')]);
    expect(list.map(t => t.theme)).toEqual(['pitching', 'interviews', 'routines', 'zebra']);
    expect(list.find(t => t.theme === 'pitching')!.count).toBe(2);
  });
});

describe('ThemeChips', () => {
  it('shows nothing when there is only one theme to choose', () => {
    const { container } = render(<ThemeChips videos={[clip('aaaaaaaaaaa', 'pitching'), clip('bbbbbbbbbbb', 'pitching')]} value={null} onChange={() => {}} />);
    expect(container.textContent).toBe('');
  });

  it('shows All themes plus each theme with its count, and reports a choice', () => {
    const onChange = vi.fn();
    render(<ThemeChips videos={VIDEOS} value="pitching" onChange={onChange} />);
    expect(screen.getByText('All themes').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Pitching (2)').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByText('Routines (1)'));
    expect(onChange).toHaveBeenCalledWith('routines');
    fireEvent.click(screen.getByText('All themes'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('the video strip with theme chips', () => {
  it('filters the cards to one theme, and All themes brings them all back', async () => {
    render(<VideoStrip />);
    await screen.findByLabelText('Play Title aaaaaaaaaaa, from TED');
    expect(screen.getAllByLabelText(/^Play /).length).toBe(4);
    fireEvent.click(screen.getByText('Pitching (2)'));
    expect(screen.getAllByLabelText(/^Play /).length).toBe(2);
    expect(screen.queryByLabelText('Play Title aaaaaaaaaaa, from TED')).toBeNull();
    fireEvent.click(screen.getByText('All themes'));
    expect(screen.getAllByLabelText(/^Play /).length).toBe(4);
  });

  it('shows the theme chips on All only, not on the Saved or Liked views', async () => {
    render(<VideoStrip />);
    await screen.findByText('All themes');
    fireEvent.click(screen.getByText('Saved (0)'));
    expect(screen.queryByText('All themes')).toBeNull();
    fireEvent.click(screen.getByText('Liked (0)'));
    expect(screen.queryByText('All themes')).toBeNull();
  });
});

describe('the public Watch page with theme chips', () => {
  it('filters the grid by theme', async () => {
    render(<MemoryRouter initialEntries={['/watch']}><PublicWatchPage /></MemoryRouter>);
    await screen.findByLabelText('Play Title aaaaaaaaaaa, from TED');
    fireEvent.click(screen.getByText('Interview tips (1)'));
    expect(screen.getAllByLabelText(/^Play /).length).toBe(1);
    expect(screen.getByLabelText('Play Title ddddddddddd, from TED')).toBeTruthy();
  });
});
