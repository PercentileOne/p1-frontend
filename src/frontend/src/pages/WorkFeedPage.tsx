import { useEffect, useState } from 'react';
import { QuestionOfTheDayCard } from '../components/QuestionOfTheDayCard';
import { VideoStrip } from '../components/VideoStrip';
import { FeedLeftPanels, FeedRightPanels } from '../components/FeedSidePanels';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useRoutineSummary } from '../hooks/useRoutineSummary';
import { nextInterviewApi, upcoming } from '../api/nextInterviewApi';
import type { NextInterview } from '../api/nextInterviewApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';
import { localDate } from '../api/routinesApi';

// The candidate dashboard's Feed tab on WORK (Francis, 2026-10-18; design in docs/specs/agent-driven-feed.md and the Feed mock-up). Three columns on a wide screen, as in the mock-up: your profile and routine on the left,
// the feed in the middle, what is coming up and industry news on the right. On a narrower screen the feed comes first and the panels follow it.
// Built in the spec's order: the Question of the Day, the video strip, then books, courses and news. Everything here is labelled as curated or written by TheInterviewChair.
// Not to be confused with FeedPage.tsx, the older social-feed prototype with sample data that is routed at /feed.
export default function WorkFeedPage({ onNavigate }: { onNavigate?: (label: string) => void }) {
  const wide = useMediaQuery('(min-width: 1180px)');
  const routine = useRoutineSummary();
  const [qotd, setQotd] = useState<QuestionOfTheDay | null>(null);
  const [nextInterview, setNextInterview] = useState<NextInterview | null>(null);

  useEffect(() => {
    let alive = true;
    void nextInterviewApi.all().then(list => { if (alive) setNextInterview(upcoming(list, localDate())[0] ?? null); }).catch(() => { /* the panels just say none yet */ });
    return () => { alive = false; };
  }, []);

  const column: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 };
  return (
    <div style={{ maxWidth: wide ? 1180 : 720, display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>Your feed</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-3)' }}>A little something each day to keep you sharp for the job you want.</p>
      </div>
      <div style={wide ? { display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr) 270px', gap: 20, alignItems: 'start' } : { display: 'flex', flexDirection: 'column', gap: 18 }}>
        <main aria-label="Your feed" style={{ ...column, gap: 18, order: wide ? 2 : 1 }}>
          <QuestionOfTheDayCard onData={setQotd} />
          <VideoStrip />
        </main>
        <aside aria-label="You" style={{ ...column, order: wide ? 1 : 2 }}>
          <FeedLeftPanels qotd={qotd} nextInterview={nextInterview} routine={routine} onNavigate={onNavigate} />
        </aside>
        <aside aria-label="Coming up and news" style={{ ...column, order: 3 }}>
          <FeedRightPanels nextInterview={nextInterview} routine={routine} onNavigate={onNavigate} />
        </aside>
      </div>
    </div>
  );
}
