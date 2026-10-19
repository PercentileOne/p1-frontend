import type { FeedVideo } from '../api/feedVideosApi';
import { themeLabel, themesIn } from '../utils/videoThemes';

// A row of theme filters for the video lists (Pitching, Interview tips, Routines…), with how many videos each has. Shows nothing when there is only one theme, since there is nothing to choose.
// `value` is the chosen theme, or null for all of them.

const GREEN = '#34D399';

export function ThemeChips({ videos, value, onChange }: { videos: FeedVideo[]; value: string | null; onChange: (theme: string | null) => void }) {
  const themes = themesIn(videos);
  if (themes.length < 2) return null;

  const chip = (id: string | null, text: string, count?: number) => {
    const on = value === id;
    return (
      <button key={id ?? 'all'} type="button" aria-pressed={on} onClick={() => onChange(id)}
        style={{ background: on ? 'rgba(52,211,153,0.16)' : 'transparent', color: on ? GREEN : 'var(--text-3, #8b98a8)', border: `1px solid ${on ? 'rgba(52,211,153,0.4)' : 'var(--border, rgba(255,255,255,0.1))'}`, borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
        {text}{count !== undefined ? ` (${count})` : ''}
      </button>
    );
  };

  return (
    <div role="group" aria-label="Filter by theme" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {chip(null, 'All themes')}
      {themes.map(t => chip(t.theme, themeLabel(t.theme), t.count))}
    </div>
  );
}
