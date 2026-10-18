import { QuestionOfTheDayCard } from '../components/QuestionOfTheDayCard';

// The candidate dashboard's Feed tab on WORK (Francis, 2026-10-18; design in docs/specs/agent-driven-feed.md). Built in the spec's order: the Question of the Day first,
// then books and courses, then videos and news. Everything here is labelled as curated or written by TheInterviewChair.
// Not to be confused with FeedPage.tsx, the older social-feed prototype with sample data that is routed at /feed.
export default function WorkFeedPage() {
  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>Your feed</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-3)' }}>A little something each day to keep you sharp for the job you want.</p>
      </div>
      <QuestionOfTheDayCard />
    </div>
  );
}
