import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { fetchPublicVideos } from '../api/feedVideosApi';
import type { FeedVideo } from '../api/feedVideosApi';
import { logEvent } from '../api/flowLogger';
import { useVideoMarks } from '../hooks/useVideoMarks';
import { useShareVideo } from '../hooks/useShareVideo';
import { VideoGrid } from '../components/VideoGrid';
import { VideoPlayer } from '../components/VideoPlayer';

// The public Watch page (Francis, 2026-10-18): the feed's videos with no sign-in, for as long as an admin leaves the public switch on, and the page a shared video link lands on.
// A link like /watch?v=VIDEOID opens straight onto that video, playing. Save and Like need an account, so anyone who is not signed in is invited to make one; Share works for everyone.
// Every video is on an official channel and plays in YouTube's own privacy-enhanced player, with the channel credited.

type State = { kind: 'loading' } | { kind: 'off' } | { kind: 'on'; videos: FeedVideo[] };

export default function PublicWatchPage() {
  const token = useAuthStore(s => s.token);
  const signedIn = !!token;
  const [params] = useSearchParams();
  const wanted = params.get('v');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [playing, setPlaying] = useState<FeedVideo | null>(null);
  const [hint, setHint] = useState(false);
  const { marks, toggle } = useVideoMarks(signedIn);
  const { notice, share } = useShareVideo();

  useEffect(() => {
    let alive = true;
    void fetchPublicVideos().then(r => {
      if (!alive) return;
      if (!r.enabled) { setState({ kind: 'off' }); logEvent('public_watch_view', { metadata: { available: false, shared: !!wanted } }); return; }
      setState({ kind: 'on', videos: r.videos });
      logEvent('public_watch_view', { metadata: { available: true, shared: !!wanted, count: r.videos.length } });
      const hit = wanted ? r.videos.find(v => v.id === wanted) : undefined;
      if (hit) { logEvent('feed_video_play', { metadata: { id: hit.id, theme: hit.theme, channel: hit.channel, via: 'shared-link' } }); setPlaying(hit); }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the page asks once when it opens
  }, []);

  const play = (v: FeedVideo) => { logEvent('feed_video_play', { metadata: { id: v.id, theme: v.theme, channel: v.channel, via: 'watch-page' } }); setPlaying(v); setHint(false); };
  const close = useCallback(() => {
    setPlaying(null); setHint(false);
    // The link that was shared opened this video; closing it leaves the plain page address.
    try { window.history.replaceState(null, '', window.location.pathname); } catch { /* fine */ }
  }, []);

  const onToggle = (v: FeedVideo, mark: 'saved' | 'liked') => { if (signedIn) void toggle(v, mark); else setHint(true); };

  const green = '#34D399';
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0b0f14)', color: 'var(--text, #fff)', fontFamily: '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
        <a href="https://www.theinterviewchair.com" style={{ textDecoration: 'none', fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>
          <span style={{ color: green }}>The</span>Interview<span style={{ color: green }}>Chair</span><span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>.com</span>
        </a>
        <nav style={{ display: 'flex', gap: 8 }}>
          {signedIn
            ? <Link to="/dashboard?tab=feed" style={ghostLink}>Open my Feed</Link>
            : <Link to="/login" style={ghostLink}>Sign in</Link>}
          <Link to="/try" style={{ ...ghostLink, background: green, color: '#04130d', border: 'none' }}>Try an interview free</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 64px' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Worth a watch</h1>
        <p style={{ margin: '6px 0 22px', fontSize: 15, color: 'var(--text-3, #8b98a8)', maxWidth: 620, lineHeight: 1.55 }}>
          Clips from the official channels of the people who made them: Shark Tank, Dragons&rsquo; Den, TED and more. Pitches, interview tips, routines and what it takes to succeed. Tap one to play.
        </p>

        {state.kind === 'loading' && <div aria-busy="true" style={{ color: 'var(--text-3, #8b98a8)' }}>Loading…</div>}
        {state.kind === 'off' && (
          <div style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'var(--bg2, #121820)' }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>These videos are not on show to the public right now.</div>
            <div style={{ color: 'var(--text-3, #8b98a8)', fontSize: 14 }}>
              {signedIn ? <>You can watch them in your <Link to="/dashboard?tab=feed" style={{ color: green }}>Feed</Link>.</> : <>Members can watch them in their Feed. <Link to="/login" style={{ color: green }}>Sign in</Link> or <Link to="/try" style={{ color: green }}>try an interview free</Link>.</>}
            </div>
          </div>
        )}
        {state.kind === 'on' && state.videos.length === 0 && <div style={{ color: 'var(--text-3, #8b98a8)' }}>No videos yet. Check back soon.</div>}
        {state.kind === 'on' && state.videos.length > 0 && <VideoGrid videos={state.videos} onPlay={play} />}

        {state.kind === 'on' && (
          <section aria-label="Try an interview" style={{ marginTop: 36, padding: '22px 22px', borderRadius: 16, border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.06)' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Now practise it, out loud.</div>
            <p style={{ margin: '6px 0 14px', color: 'var(--text-2, #cbd5e1)', fontSize: 14.5, lineHeight: 1.55 }}>
              Sit in front of an AI interviewer who talks back, answer three questions and get a score. Free to try, no account. Make your mistakes here, not in the real interview.
            </p>
            <Link to="/try" style={{ ...ghostLink, background: green, color: '#04130d', border: 'none', display: 'inline-block' }}>Try an interview free</Link>
          </section>
        )}
      </main>

      {playing && (
        <VideoPlayer video={playing} marks={marks} onToggle={onToggle} onShare={v => void share(v)} onClose={close}
          hint={hint ? <>Create a free account to save and like videos. <Link to="/register" style={{ color: green }}>Sign up</Link> or <Link to="/login" style={{ color: green }}>sign in</Link>.</> : notice} />
      )}
    </div>
  );
}

const ghostLink: React.CSSProperties = { textDecoration: 'none', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px 14px', fontSize: 13.5, fontWeight: 700 };
