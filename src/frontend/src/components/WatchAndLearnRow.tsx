export interface WatchVideo {
  id: string; // YouTube video id
  title: string;
  channel: string;
  duration: string;
}

// Reuses the exact video ids already vetted in CockpitShell.tsx's own YT_VIDEOS list, rather
// than picking new ones — all three are real, well-known TED talks already live elsewhere in
// this codebase. CockpitShell's own YouTubeModal found that embedding these inline via
// <iframe> hits YouTube's embed restrictions, so it opens on youtube.com in a new tab instead
// — same approach here, just as a plain link-out card rather than pulling in that Tailwind
// component (this page uses the candidate portal's inline-style convention, not Tailwind).
export const PUBLIC_SPEAKING_VIDEOS: WatchVideo[] = [
  { id: 'qp0HIF3SfI4', title: 'How Great Leaders Inspire Action', channel: 'Simon Sinek · TED', duration: '18 min' },
  { id: 'Lp7E973zozc', title: 'The Power of Vulnerability', channel: 'Brené Brown · TED', duration: '20 min' },
  { id: 'iG9CE55wbtY', title: 'Inside the Mind of a Master Procrastinator', channel: 'Tim Urban · TED', duration: '14 min' },
];

export function WatchAndLearnRow({ videos = PUBLIC_SPEAKING_VIDEOS, title = 'Watch & Learn' }: { videos?: WatchVideo[]; title?: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '10px' }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
        {videos.map(v => (
          <a
            key={v.id}
            href={`https://www.youtube.com/watch?v=${v.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: '0 0 200px', textDecoration: 'none', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '110px', background: '#0a0a12' }}>
              <img
                src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                {v.duration}
              </div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: '4px' }}>{v.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{v.channel}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
