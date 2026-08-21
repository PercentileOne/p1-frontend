import { useState, useEffect, useRef, useCallback } from 'react';
import { type Career, type SalaryRegion, type WorkforceRegion, searchCareers, getCategories, getCareersByCategory, FALLBACK_CATEGORIES } from '../api/careersApi';
import { CareerGuideOverlay } from '../components/CareerGuideOverlay';

// ── Category icons ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  'Technology': '💻', 'Healthcare': '🏥', 'Finance': '💰', 'Education': '📚',
  'Engineering': '⚙️', 'Creative': '🎨', 'Legal': '⚖️', 'Science': '🔬',
  'Business': '📊', 'Hospitality': '🏨', 'Construction': '🏗️', 'Transport': '🚗',
  'Retail': '🛍️', 'Agriculture': '🌾', 'Media': '📺', 'Sport': '⚽',
  'Public Sector': '🏛️', 'Social Care': '🤝', 'Trades': '🔧', 'General': '🌐',
  'Music & Entertainment': '🎵', 'Art & Culture': '🖼️', 'Property': '🏠',
};

function categoryIcon(cat: string) {
  if (CATEGORY_ICONS[cat]) return CATEGORY_ICONS[cat];
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '💼';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  if (!n) return '—';
  return currency + new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
}

function fmtK(n: number) {
  if (!n) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'm';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return n.toString();
}

function growthColor(pct: number) {
  if (pct >= 10) return '#34d399';
  if (pct >= 0) return '#7b5cf5';
  return '#f87171';
}

// ── AI Impact ─────────────────────────────────────────────────────────────────

function aiImpactLabel(risk: number) {
  if (risk >= 75) return { label: 'High AI Disruption Risk', sublabel: 'Many tasks in this role are already being automated. Adaptability is key.', color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: '⚠️' };
  if (risk >= 45) return { label: 'Moderate AI Impact', sublabel: 'AI is changing parts of this role. Those who adapt will thrive.', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '🤖' };
  if (risk >= 20) return { label: 'Low AI Risk — AI-Assisted', sublabel: 'AI tools help professionals do more, faster. Human judgement stays central.', color: '#7b5cf5', bg: 'rgba(120,80,255,0.08)', icon: '✨' };
  return { label: 'AI-Resilient Career', sublabel: 'This role relies on creativity, empathy, and physical presence that AI cannot replicate.', color: '#34d399', bg: 'rgba(52,211,153,0.08)', icon: '🛡️' };
}

function AiImpactBanner({ risk, futureScore }: { risk: number; futureScore: number }) {
  const { label, sublabel, color, bg, icon } = aiImpactLabel(risk);
  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color }}>{label}</div>
          <div style={{ fontSize: 11, color: '#6060a0', marginTop: 1 }}>Automation risk: {risk}%</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: futureScore >= 70 ? '#34d399' : futureScore >= 40 ? '#f59e0b' : '#f87171' }}>{futureScore}</div>
          <div style={{ fontSize: 10, color: '#5050a0' }}>Future Score</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#8080b0', margin: 0, lineHeight: 1.6 }}>{sublabel}</p>
    </div>
  );
}

function TimeToJuniorBanner({ career }: { career: Career }) {
  const ttj = career.pathway?.timeToJunior;
  const ttm = career.pathway?.timeToMid;
  const tts = career.pathway?.timeToSenior;
  if (!ttj) return null;
  return (
    <div style={{ background: 'rgba(120,80,255,0.07)', border: '1px solid rgba(120,80,255,0.2)', borderRadius: 12, padding: '16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>🗓️ Journey Timeline</div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
        {[{ label: 'Junior', time: ttj, color: '#7b5cf5' }, { label: 'Mid', time: ttm, color: '#5b8ff7' }, { label: 'Senior', time: tts, color: '#34d399' }]
          .filter(s => s.time).map((step, i, arr) => (
            <div key={step.label} style={{ flex: 1 }}>
              <div style={{ height: 4, background: step.color, opacity: 0.3 + i * 0.2, borderRadius: i === 0 ? '4px 0 0 4px' : i === arr.length - 1 ? '0 4px 4px 0' : 0 }} />
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: step.color }}>{step.label}</div>
                <div style={{ fontSize: 11, color: '#9090b0', marginTop: 1 }}>{step.time}</div>
              </div>
            </div>
          ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,80,255,0.15)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#c0aaff' }}>🎯 Personalised estimate</div>
          <div style={{ fontSize: 11, color: '#5050a0', marginTop: 2 }}>We'll calculate your exact time to Junior from your CV and skills.</div>
        </div>
        <button style={{ background: 'rgba(120,80,255,0.2)', border: '1px solid rgba(120,80,255,0.3)', borderRadius: 7, padding: '6px 10px', color: '#c0aaff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Unlock →
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function SalaryCard({ label, region }: { label: string; region: SalaryRegion }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', marginBottom: 8 }}>{label}</div>
      {[['Starting', region.starting], ['Mid', region.mid], ['Senior', region.senior], ['Expert', region.expert]].map(([l, v]) => (
        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: '#7070a0' }}>{l}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#c0b8e0' }}>{fmt(v as number, region.currency)}</span>
        </div>
      ))}
    </div>
  );
}

function WorkforceCard({ label, w }: { label: string; w: WorkforceRegion }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', marginBottom: 8 }}>{label}</div>
      {[['Employed', fmtK(w.employed)], ['Studying', fmtK(w.studying)], ['Vacancies', fmtK(w.vacancies)]].map(([l, v]) => (
        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: '#7070a0' }}>{l}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#c0b8e0' }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#7070a0' }}>5yr Growth</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: growthColor(w.growthPct5yr) }}>{w.growthPct5yr > 0 ? '+' : ''}{w.growthPct5yr}%</span>
      </div>
    </div>
  );
}

function StatTile({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  const color = good ? '#34d399' : bad ? '#f87171' : '#c0b8e0';
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: '#6060a0', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ── Career Detail Slide Panel ──────────────────────────────────────────────────

// ── Course Finder ──────────────────────────────────────────────────────────────

interface CourseResult {
  title: string;
  provider: 'Udemy' | 'Coursera' | 'LinkedIn Learning';
  instructor: string;
  rating: number;
  reviewCount: number;
  price: string;
  originalPrice?: string;
  durationHours: number;
  level: string;
  url: string;
  badge?: string;
}

async function fetchCourses(career: Career): Promise<CourseResult[]> {
  try {
    const res = await fetch(
      `/api/courses?career=${encodeURIComponent(career.id)}&title=${encodeURIComponent(career.title)}&category=${encodeURIComponent(career.category)}`
    );
    if (res.ok) return await res.json() as CourseResult[];
  } catch { /* fall through */ }
  return generateFallbackCourses(career);
}

function generateFallbackCourses(career: Career): CourseResult[] {
  const skills = career.pathway?.skills?.slice(0, 2) ?? [];
  return [
    {
      title: `The Complete ${career.title} Bootcamp`,
      provider: 'Udemy',
      instructor: 'Industry Expert',
      rating: 4.7,
      reviewCount: 12400,
      price: '£14.99',
      originalPrice: '£79.99',
      durationHours: 22,
      level: 'Beginner to Advanced',
      url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(career.title)}`,
      badge: 'Bestseller',
    },
    {
      title: `${career.title}: Professional Certificate`,
      provider: 'Coursera',
      instructor: skills[0] ? `${skills[0]} Specialisation` : 'Professional Series',
      rating: 4.8,
      reviewCount: 6200,
      price: 'Free to audit',
      durationHours: 40,
      level: 'Intermediate',
      url: `https://www.coursera.org/search?query=${encodeURIComponent(career.title)}`,
      badge: 'Certificate',
    },
    {
      title: `${skills[0] || career.category} for ${career.title}s`,
      provider: 'LinkedIn Learning',
      instructor: 'LinkedIn Instructor',
      rating: 4.5,
      reviewCount: 3100,
      price: 'Free with LinkedIn Premium',
      durationHours: 8,
      level: 'Intermediate',
      url: `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(career.title)}`,
    },
  ];
}

const PROVIDER_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Udemy':            { bg: 'rgba(167,103,28,0.15)',  color: '#f59e0b', border: 'rgba(167,103,28,0.3)'  },
  'Coursera':         { bg: 'rgba(30,100,220,0.12)',  color: '#60a5fa', border: 'rgba(30,100,220,0.25)' },
  'LinkedIn Learning':{ bg: 'rgba(10,100,150,0.12)',  color: '#38bdf8', border: 'rgba(10,100,150,0.25)' },
};

function CourseCard({ course }: { course: CourseResult }) {
  const pc = PROVIDER_COLORS[course.provider] ?? PROVIDER_COLORS['Udemy'];
  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(120,80,255,0.35)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(120,80,255,0.06)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e0dcff', lineHeight: 1.4, marginBottom: 3 }}>{course.title}</div>
          <div style={{ fontSize: 11, color: '#7060a0' }}>{course.instructor} · {course.durationHours}h · {course.level}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 20, padding: '2px 8px' }}>{course.provider}</span>
          {course.badge && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '2px 8px' }}>{course.badge}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{'★'.repeat(Math.round(course.rating))}</span>
          <span style={{ fontSize: 11, color: '#7060a0' }}>{course.rating.toFixed(1)} ({course.reviewCount.toLocaleString()})</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>{course.price}</span>
          {course.originalPrice && <span style={{ fontSize: 11, color: '#4040a0', textDecoration: 'line-through', marginLeft: 6 }}>{course.originalPrice}</span>}
        </div>
      </div>
    </a>
  );
}

function CoursesSection({ career }: { career: Career }) {
  const [courses, setCourses] = useState<CourseResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses(career).then(c => { setCourses(c); setLoading(false); });
  }, [career.id]);

  return (
    <Section title="📚 Courses to Get There">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: 'rgba(255,255,255,0.03)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {courses.map((c, i) => <CourseCard key={i} course={c} />)}
        </div>
      )}
    </Section>
  );
}

// ── Career Detail Panel ────────────────────────────────────────────────────────

function CareerDetailPanel({ career, onClose }: { career: Career; onClose: () => void }) {
  const uk = career.salary?.uk;
  const us = career.salary?.us;
  const wuk = career.workforce?.uk;
  const wus = career.workforce?.us;
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 640,
        maxHeight: '85vh',
        background: '#0a0818',
        border: '1px solid rgba(120,80,255,0.25)',
        borderRadius: 20,
        boxShadow: '0 0 100px rgba(120,80,255,0.22), 0 30px 90px rgba(0,0,0,0.55)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0a0818', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 4 }}>
                {career.category} · {career.subcategory}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>{career.title}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#9090b0', cursor: 'pointer', padding: '7px 9px', fontSize: 15 }}>✕</button>
          </div>
          {career.identity?.summary && (
            <p style={{ fontSize: 12, color: '#8080b0', lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>{career.identity.summary}</p>
          )}
          <button
            onClick={() => setShowGuide(true)}
            style={{
              marginTop: 14, width: '100%',
              background: 'linear-gradient(135deg, rgba(123,92,245,0.18), rgba(91,143,247,0.14))',
              border: '1px solid rgba(120,80,255,0.4)', borderRadius: 10,
              padding: '10px 16px', fontSize: 12.5, fontWeight: 700, color: '#c0aaff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🎙️ Tell Me About This Role
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {career.demand?.automationRisk !== undefined && (
            <AiImpactBanner risk={career.demand.automationRisk} futureScore={career.demand.futureScore ?? 0} />
          )}
          <TimeToJuniorBanner career={career} />

          {(uk || us) && (
            <Section title="💰 Salary">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {uk && <SalaryCard label="UK" region={uk} />}
                {us && <SalaryCard label="US" region={us} />}
              </div>
            </Section>
          )}

          <CoursesSection career={career} />

          {(wuk || wus) && (
            <Section title="👥 Workforce">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {wuk && <WorkforceCard label="UK" w={wuk} />}
                {wus && <WorkforceCard label="US" w={wus} />}
              </div>
            </Section>
          )}

          {career.demand && (
            <Section title="📈 Demand & Future">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <StatTile label="Automation Risk" value={career.demand.automationRisk + '%'} bad={career.demand.automationRisk > 60} />
                <StatTile label="Future Score" value={career.demand.futureScore + '/100'} good={career.demand.futureScore > 70} />
                <StatTile label="Trend" value={career.demand.trend} />
              </div>
            </Section>
          )}

          {career.lifestyle && (
            <Section title="🧘 Lifestyle">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <StatTile label="Environment" value={career.lifestyle.environment} />
                <StatTile label="Typical Hours" value={career.lifestyle.typicalHours} />
                <StatTile label="Stress" value={career.lifestyle.stress + '/100'} bad={career.lifestyle.stress > 70} />
                <StatTile label="Remote Score" value={career.lifestyle.remoteScore + '/100'} good={career.lifestyle.remoteScore > 60} />
              </div>
            </Section>
          )}

          {career.pathway?.skills?.length > 0 && (
            <Section title="🛠️ Key Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {career.pathway.skills.slice(0, 12).map(s => (
                  <span key={s} style={{ background: 'rgba(120,80,255,0.12)', border: '1px solid rgba(120,80,255,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#c0aaff', fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </Section>
          )}

          {career.pathway?.entryRequirements?.length > 0 && (
            <Section title="🎓 Getting Started">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {career.pathway.entryRequirements.map(r => (
                  <li key={r} style={{ fontSize: 12, color: '#9090b0', lineHeight: 1.8 }}>{r}</li>
                ))}
              </ul>
            </Section>
          )}

          {career.identity?.traits?.length > 0 && (
            <Section title="🧠 Who Thrives Here">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {career.identity.traits.map(t => (
                  <span key={t} style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#6ee7b7', fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </Section>
          )}

          <div style={{ background: 'linear-gradient(135deg, rgba(120,80,255,0.15), rgba(60,100,255,0.1))', border: '1px solid rgba(120,80,255,0.3)', borderRadius: 14, padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e0dcff', marginBottom: 5 }}>Ready to interview for this role?</div>
            <div style={{ fontSize: 12, color: '#8080b0', marginBottom: 14 }}>Practice with an AI interviewer tailored to {career.title} questions.</div>
            <button
              onClick={() => window.open('https://recruiter.interviewme.global/demo/vallum-job-paid', '_blank')}
              style={{ background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              Start Interview Practice →
            </button>
          </div>
        </div>
      </div>
    </div>
    {showGuide && <CareerGuideOverlay career={career} onClose={() => setShowGuide(false)} />}
    </>
  );
}

// ── Career Card ────────────────────────────────────────────────────────────────

function CareerCard({ career, onClick }: { career: Career; onClick: () => void }) {
  const uk = career.salary?.uk;
  const wuk = career.workforce?.uk;
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(120,80,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hov ? 'rgba(120,80,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, padding: '16px 18px',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e0dcff', lineHeight: 1.3 }}>{career.title}</div>
        {wuk?.growthPct5yr !== undefined && wuk.growthPct5yr !== 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: growthColor(wuk.growthPct5yr), background: 'rgba(52,211,153,0.08)', borderRadius: 6, padding: '2px 7px', flexShrink: 0, marginLeft: 8 }}>
            {wuk.growthPct5yr > 0 ? '+' : ''}{wuk.growthPct5yr}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#6060a0', marginBottom: 8 }}>{career.subcategory || career.category}</div>
      {uk && uk.mid > 0 && (
        <div style={{ fontSize: 12, color: '#9080c0', fontWeight: 600 }}>{fmt(uk.mid, '£')} mid · {fmt(uk.senior, '£')} senior</div>
      )}
      {career.pathway?.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {career.pathway.skills.slice(0, 3).map(s => (
            <span key={s} style={{ fontSize: 10, color: '#7060a0', background: 'rgba(120,80,255,0.08)', borderRadius: 4, padding: '2px 6px' }}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main CareersPanel ──────────────────────────────────────────────────────────

export default function CareersPanel() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Career[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Career[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getCategories().then(setCategories); }, []);

  // Real, live total — was a static "4,000+" that never reflected what was actually in
  // the database. Sums the per-category counts already being fetched for the tiles below,
  // so it grows on its own as the database does, no separate endpoint needed.
  const totalCareers = categories.reduce((sum, c) => sum + c.count, 0);

  // A real search (2+ chars) replaces category browsing with search results — was
  // previously two disconnected data flows: the category grid always rendered its
  // once-on-mount data regardless of what was typed, so "installation operative" (no
  // matches) still showed every category untouched instead of showing nothing found.
  const isSearchActive = query.trim().length >= 2;

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchCareers(q);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    }, 280);
  }, []);

  async function browseCategory(cat: string) {
    if (activeCategory === cat) { setActiveCategory(null); setCategoryResults([]); return; }
    setActiveCategory(cat);
    setLoadingCategory(true);
    const results = await getCareersByCategory(cat);
    setCategoryResults(results);
    setLoadingCategory(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <div style={{ padding: '32px 28px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 8 }}>✦ CAREERS EXPLORER</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#e2e8f0', margin: '0 0 8px', lineHeight: 1.1 }}>Explore {totalCareers.toLocaleString('en-GB')}+ careers</h1>
        <p style={{ fontSize: 14, color: '#5a6478', margin: 0, lineHeight: 1.6 }}>
          Real salary data, workforce figures, AI impact and growth trends — for every career in the UK and US. Growing daily.
        </p>
      </div>

      {/* Search */}
      <div style={{ maxWidth: 600, marginBottom: 40, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(120,80,255,0.35)', borderRadius: 12, padding: '0 16px', boxShadow: '0 0 0 4px rgba(120,80,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b5cf5" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search any career — Surgeon, Plumber, CTO, Music Producer..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 14, padding: '14px 12px', fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', color: '#6060a0', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#0d0c1e', border: '1px solid rgba(120,80,255,0.25)', borderRadius: 12, overflow: 'hidden', zIndex: 100, boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            {suggestions.map(c => (
              <div
                key={c.id}
                onMouseDown={() => { setSelectedCareer(c); setShowSuggestions(false); setQuery(c.title); }}
                style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(120,80,255,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e0dcff' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: '#6060a0' }}>{c.category}</div>
                </div>
                {c.salary?.uk?.mid > 0 && (
                  <div style={{ fontSize: 12, color: '#9080c0', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{fmt(c.salary.uk.mid, '£')}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Browse by Category — only when not actively searching; a search replaces this
          with its own results/empty state below, rather than sitting there unfiltered. */}
      {!isSearchActive && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 16, margin: '0 0 16px' }}>Browse by category</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {categories.map(({ category, count }) => {
              const active = activeCategory === category;
              return (
                <div
                  key={category}
                  onClick={() => browseCategory(category)}
                  style={{
                    background: active ? 'rgba(120,80,255,0.18)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(120,80,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 3,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-3px)';
                    el.style.boxShadow = '0 10px 24px rgba(120,80,255,0.18)';
                    if (!active) el.style.borderColor = 'rgba(120,80,255,0.3)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = 'none';
                    if (!active) el.style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>{categoryIcon(category)}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: active ? '#a78bfa' : '#7060b0',
                      background: active ? 'rgba(120,80,255,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${active ? 'rgba(120,80,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 20, padding: '2px 7px', letterSpacing: '0.02em',
                    }}>{count}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : '#c0b8e0' }}>{category}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search results — replaces category browsing while a search is active */}
      {isSearchActive && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: '0 0 16px' }}>
            Search results
            {!searching && <span style={{ fontSize: 12, fontWeight: 400, color: '#5050a0', marginLeft: 8 }}>{suggestions.length} found</span>}
          </h2>
          {searching ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#5050a0' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⟳</div>
              Searching...
            </div>
          ) : suggestions.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {suggestions.map(c => (
                <CareerCard key={c.id} career={c} onClick={() => setSelectedCareer(c)} />
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '36px', textAlign: 'center', color: '#5050a0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No careers found for "{query}"</div>
              <div style={{ fontSize: 12 }}>We're adding new careers daily — try a broader search, or clear it to browse by category.</div>
            </div>
          )}
        </div>
      )}

      {/* Category results */}
      {activeCategory && !isSearchActive && (
        <div ref={resultsRef}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: '0 0 16px' }}>
            {categoryIcon(activeCategory)} {activeCategory}
            {!loadingCategory && categoryResults.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: '#5050a0', marginLeft: 8 }}>{categoryResults.length} careers</span>
            )}
          </h2>

          {loadingCategory ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#5050a0' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⟳</div>
              Loading careers...
            </div>
          ) : categoryResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {categoryResults.map(c => (
                <CareerCard key={c.id} career={c} onClick={() => setSelectedCareer(c)} />
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '36px', textAlign: 'center', color: '#5050a0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔌</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>API not connected yet</div>
              <div style={{ fontSize: 12 }}>Career data is in Cosmos DB — the Azure Function endpoint is being deployed.</div>
            </div>
          )}
        </div>
      )}

      {/* Career detail slide panel */}
      {selectedCareer && <CareerDetailPanel career={selectedCareer} onClose={() => setSelectedCareer(null)} />}
    </div>
  );
}
