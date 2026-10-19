import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, Flame, ListChecks, Newspaper } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { daysText } from '../api/questionOfTheDayApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';
import { whenText } from '../api/nextInterviewApi';
import type { NextInterview } from '../api/nextInterviewApi';
import { localDate } from '../api/routinesApi';
import { fetchIndustryNews, timeAgo } from '../api/feedNewsApi';
import type { FeedNewsItem } from '../api/feedNewsApi';
import { routineProgress } from '../hooks/useRoutineSummary';
import type { RoutineSummary } from '../hooks/useRoutineSummary';

// The two side columns of the Feed (Francis, 2026-10-19, from the 18 Oct mock-up). Left: who you are on the platform and your routine. Right: what is coming up, industry news, and how the feed works.
// Everything shown is real: names, streaks and counts come from the person's own account, the news is the same RSS headlines as the Dashboard, and nothing is made up.

const GREEN = '#34D399';
const panel: React.CSSProperties = { padding: '16px 18px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 };
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' };
const linkButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: GREEN, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700 };

export function initialsOf(name: string | undefined | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ color: 'var(--text-2, var(--text))' }}>{label}</span>
      <b style={{ color: GREEN, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</b>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div aria-hidden="true" style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: GREEN }} />
    </div>
  );
}

function prettyDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Left column: your profile card and your routine. */
export function FeedLeftPanels({ qotd, nextInterview, routine, onNavigate }: {
  qotd: QuestionOfTheDay | null; nextInterview: NextInterview | null; routine: RoutineSummary | null; onNavigate?: (label: string) => void;
}) {
  const user = useAuthStore(s => s.user);
  const today = localDate();
  const progress = routineProgress(routine);
  return (
    <>
      <section aria-label="Your profile" style={panel}>
        <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,0.14)', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 19 }}>{initialsOf(user?.name)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', overflowWrap: 'anywhere' }}>{user?.name || 'You'}</div>
          {qotd?.topic && <div style={{ fontSize: 13.5, color: 'var(--text-3)', overflowWrap: 'anywhere' }}>Aiming for: {qotd.topic}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Stat label="Question streak" value={qotd ? daysText(qotd.streak) : '…'} />
          <Stat label="Questions answered" value={qotd ? String(qotd.answeredTotal) : '…'} />
          <Stat label="Next interview" value={nextInterview ? whenText(nextInterview.date, today) : 'None yet'} />
        </div>
        {onNavigate && <button type="button" onClick={() => onNavigate('My Profile')} style={linkButton}>My profile <ArrowRight size={13} /></button>}
      </section>

      <section aria-label="Routines and systems" style={panel}>
        <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}><ListChecks size={13} /> Routines &amp; Systems</div>
        {progress ? (
          <>
            <div style={{ fontSize: 14.5, color: 'var(--text)' }}>{progress.done} of {progress.total} {progress.label} done today</div>
            <Bar pct={(progress.done / progress.total) * 100} />
          </>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.5 }}>Set up your routine and today's progress shows here.</div>
        )}
        {onNavigate && <button type="button" onClick={() => onNavigate('My Routines')} style={linkButton}>Open My Routines <ArrowRight size={13} /></button>}
      </section>
    </>
  );
}

/** Right column: what is coming up, industry news, and how the feed works. */
export function FeedRightPanels({ nextInterview, routine, onNavigate }: {
  nextInterview: NextInterview | null; routine: RoutineSummary | null; onNavigate?: (label: string) => void;
}) {
  const today = localDate();
  const progress = routineProgress(routine);
  const [news, setNews] = useState<FeedNewsItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchIndustryNews(3).then(n => { if (alive) setNews(n); });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <section aria-label="Coming up" style={panel}>
        <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}><CalendarClock size={13} /> Coming up</div>
        {nextInterview ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', overflowWrap: 'anywhere' }}>
              {nextInterview.role || 'Your interview'}{nextInterview.company ? ` at ${nextInterview.company}` : ''}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}><span style={{ color: GREEN, fontWeight: 700 }}>{whenText(nextInterview.date, today)}</span> · {prettyDate(nextInterview.date)}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            No interview added yet. Add one on your Dashboard and we will count down with you.
            {onNavigate && <div style={{ marginTop: 8 }}><button type="button" onClick={() => onNavigate('Dashboard')} style={linkButton}>Go to Dashboard <ArrowRight size={13} /></button></div>}
          </div>
        )}
        {progress && (
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>Today's routine: {progress.done} of {progress.total} {progress.label}</div>
            <Bar pct={(progress.done / progress.total) * 100} />
          </div>
        )}
      </section>

      <section aria-label="Industry news" style={panel}>
        <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}><Newspaper size={13} /> Industry news</div>
        {news === null && <div style={{ fontSize: 13.5, color: 'var(--text-3)' }} aria-busy="true">Loading…</div>}
        {news !== null && news.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>The news feeds could not be reached just now. Check back shortly.</div>}
        {(news ?? []).map((n, i) => (
          <a key={n.url} href={n.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', textDecoration: 'none', paddingTop: i === 0 ? 0 : 10, borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, overflowWrap: 'anywhere' }}>{n.headline}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{n.source}{timeAgo(n.publishedAt) ? ` · ${timeAgo(n.publishedAt)}` : ''}</div>
          </a>
        ))}
      </section>

      <section aria-label="How your feed works" style={panel}>
        <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}><Flame size={13} /> How your feed works</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.55 }}>
          The questions are written by TheInterviewChair and say so. Every video comes from an official channel and is checked when it is added. Save and Like are private to you, unless you choose to show your likes to the people who follow you.
        </div>
      </section>
    </>
  );
}
