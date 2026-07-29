import { useNavigate } from 'react-router-dom';
import { InterviewShowcase } from '../components/InterviewShowcase';
import { MOCK_JOBS } from '../data/mockJobs';
import { JobCard } from '../components/JobCard';
import type { Job } from '../data/mockJobs';

const STORIES = [
  {
    avatar: 'SJ',
    name: 'Sofía J.',
    role: 'Software Engineer → Senior Engineer',
    body: 'I bombed three interviews before I found Explain. Ran through 20 practice questions the night before my Amazon loop. Got the offer.',
    tag: 'Win',
    tagColor: '#1a3d2e',
    tagText: '#5ecb8e',
  },
  {
    avatar: 'MT',
    name: 'Marcus T.',
    role: 'Finance Analyst',
    body: 'Got rejected for a VP role and felt devastated. The LEARN recommendations showed me exactly what to fix. Interview 2 went differently.',
    tag: 'Lesson',
    tagColor: '#2a1e3a',
    tagText: '#c47ef7',
  },
  {
    avatar: 'PK',
    name: 'Priya K.',
    role: 'Product Manager',
    body: 'Mike\'s briefing on the company before the practice panel was gold. I walked in knowing their Q3 challenges. Interviewer was visibly impressed.',
    tag: 'Advice',
    tagColor: '#1e2a3a',
    tagText: '#7eb8f7',
  },
];

const STATS = [
  { value: '12,400+', label: 'Interviews run' },
  { value: '8,200+', label: 'Interview packs generated' },
  { value: '340+', label: 'LEARN modules completed' },
  { value: '94%', label: 'Would recommend' },
];

export default function Home() {
  const navigate = useNavigate();
  const featured = MOCK_JOBS.filter(j => j.featured).slice(0, 3);

  function handlePrepare(job: Job) {
    if (job.id === 'j1') {
      window.open('https://recruiter.explain.global/demo/vallum-job-paid', '_blank');
    } else {
      navigate('/jobs');
    }
  }

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'radial-gradient(ellipse at 60% 0%, rgba(120,80,255,0.22) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(60,100,255,0.12) 0%, transparent 60%)',
        padding: '80px 24px 72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(120,80,255,0.12)',
            border: '1px solid rgba(120,80,255,0.3)',
            borderRadius: 20, padding: '4px 14px',
            fontSize: 12, fontWeight: 700, color: '#b09fff',
            letterSpacing: '0.06em', marginBottom: 28,
          }}>
            ✦ HOME OF INTERVIEWEES
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            color: '#fff',
            marginBottom: 20,
            letterSpacing: '-0.03em',
          }}>
            Get the interview.<br />
            <span style={{ background: 'linear-gradient(90deg, #7b5cf5, #5b8ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Keep learning.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#9090b8', lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            Social stories. Real jobs. AI-powered interview prep. LEARN modules.
            Everything you need — from first application to final offer.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/jobs')}
              style={{
                background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px 28px',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>
              Browse Jobs →
            </button>
            <button
              onClick={() => navigate('/learn')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#c0c0e0', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '14px 28px',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>
              Explore LEARN
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#b09fff', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6060a0', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview Room Showcase */}
      <InterviewShowcase />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>

        {/* Featured jobs */}
        <SectionHeader
          tag="JOBS"
          title="Featured roles this week"
          cta="View all jobs"
          onCta={() => navigate('/jobs')}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 64 }}>
          {featured.map(job => (
            <JobCard key={job.id} job={job} onPrepare={handlePrepare} />
          ))}
        </div>

        {/* Social feed preview */}
        <SectionHeader tag="COMMUNITY" title="Interview stories" cta="Join the conversation" onCta={() => navigate('/community')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 64 }}>
          {STORIES.map(s => (
            <div key={s.name} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: '#fff',
                }}>{s.avatar}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e0dcff' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#6060a0' }}>{s.role}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.tagColor, color: s.tagText }}>{s.tag}</div>
              </div>
              <p style={{ fontSize: 14, color: '#9090b8', lineHeight: 1.65 }}>"{s.body}"</p>
            </div>
          ))}
        </div>

        {/* LEARN teaser */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(120,80,255,0.12), rgba(60,100,255,0.08))',
          border: '1px solid rgba(120,80,255,0.25)',
          borderRadius: 18, padding: '40px 36px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 8 }}>✦ LEARN ENGINE</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
              Turn signals into skills.
            </h2>
            <p style={{ fontSize: 15, color: '#8080b0', maxWidth: 500, lineHeight: 1.65 }}>
              Every interview you run feeds personalised LEARN modules — mapped to your real gaps, not generic courses.
            </p>
          </div>
          <button
            onClick={() => navigate('/learn')}
            style={{
              background: 'rgba(120,80,255,0.2)',
              color: '#c0aaff',
              border: '1px solid rgba(120,80,255,0.4)',
              borderRadius: 10, padding: '13px 24px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              flexShrink: 0,
            }}>
            Explore LEARN →
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ tag, title, cta, onCta }: { tag: string; title: string; cta: string; onCta: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.08em', marginBottom: 4 }}>✦ {tag}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0edff' }}>{title}</h2>
      </div>
      <button onClick={onCta} style={{ background: 'none', border: 'none', color: '#7b5cf5', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        {cta} →
      </button>
    </div>
  );
}
