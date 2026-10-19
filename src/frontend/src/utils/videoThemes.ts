import type { FeedVideo } from '../api/feedVideosApi';

// The feed's video themes (docs/specs/agent-driven-feed.md), with the short names people see on the filter chips. The order here is the order the chips appear in; a theme the list does not know
// (one an admin adds later) still shows, after these, under its own name.

const THEMES: { id: string; label: string }[] = [
  { id: 'pitching', label: 'Pitching' },
  { id: 'rejection', label: 'Turned down, then succeeded' },
  { id: 'founders', label: 'Founders' },
  { id: 'interviews', label: 'Interview tips' },
  { id: 'motivation', label: 'Motivation' },
  { id: 'business', label: 'Business' },
  { id: 'success', label: 'Success' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'routines', label: 'Routines' },
  { id: 'habits', label: 'Habits' },
  { id: 'learning', label: 'Learning' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'career-change', label: 'Career change' },
  { id: 'software-and-cloud', label: 'Software and cloud' },
];

export function themeLabel(theme: string): string {
  const known = THEMES.find(t => t.id === theme);
  if (known) return known.label;
  const words = theme.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Other';
}

/** The themes present in a list of videos, in the standard order, each with how many videos it has. */
export function themesIn(videos: FeedVideo[]): { theme: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of videos) counts.set(v.theme, (counts.get(v.theme) ?? 0) + 1);
  const order = new Map(THEMES.map((t, i) => [t.id, i]));
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => (order.get(a.theme) ?? 999) - (order.get(b.theme) ?? 999) || a.theme.localeCompare(b.theme));
}
