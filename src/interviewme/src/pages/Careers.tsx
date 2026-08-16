import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SalaryRegion { starting: number; mid: number; senior: number; expert: number; currency: string }
interface WorkforceRegion { employed: number; studying: number; growthPct5yr: number; growthTrend: string; vacancies: number }
interface Career {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  tags: string[];
  salary: { uk: SalaryRegion; us: SalaryRegion };
  workforce: { uk: WorkforceRegion; us: WorkforceRegion };
  demand: { uk: number; us: number; automationRisk: number; futureScore: number; trend: string };
  lifestyle: { environment: string; stress: number; energy: number; remoteScore: number; typicalHours: string };
  identity: { summary: string; traits: string[]; strengths: string[] };
  pathway: { entryRequirements: string[]; qualifications: string[]; skills: string[]; timeToJunior: string; timeToMid: string; timeToSenior: string; timeToExpert: string; learningPath: string[] };
  confidence: number;
}

// ── Category icons ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  'Technology': '💻', 'Healthcare': '🏥', 'Finance': '💰', 'Education': '📚',
  'Engineering': '⚙️', 'Creative': '🎨', 'Legal': '⚖️', 'Science': '🔬',
  'Business': '📊', 'Hospitality': '🏨', 'Construction': '🏗️', 'Transport': '🚗',
  'Retail': '🛍️', 'Agriculture': '🌾', 'Media': '📺', 'Sport': '⚽',
  'Public Sector': '🏛️', 'Social Care': '🤝', 'Trades': '🔧', 'General': '🌐',
  'Music & Entertainment': '🎵', 'Art & Culture': '🖼️',
};

function categoryIcon(cat: string) {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '💼';
}

// ── Cosmos proxy call (via /api/careers/* Azure Function) ─────────────────────
// For now we call the recruiter portal's ai-proxy pattern.
// We'll swap this for a real Azure Function endpoint once deployed.

const PROXY_BASE = 'https://p1-careers-agent.azurewebsites.net/api/careers';

async function searchCareers(q: string): Promise<Career[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/search?q=${encodeURIComponent(q)}&top=12`);
    if (!res.ok) throw new Error('api');
    return await res.json();
  } catch {
    // Fallback: client-side filter on the category list (no Cosmos yet from browser)
    return [];
  }
}

async function getCategories(): Promise<{ category: string; count: number }[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/categories`);
    if (!res.ok) throw new Error('api');
    return await res.json();
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

async function getCareersByCategory(category: string): Promise<Career[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/by-category?category=${encodeURIComponent(category)}&top=20`);
    if (!res.ok) throw new Error('api');
    return await res.json();
  } catch {
    return [];
  }
}

// ── Static fallback categories (from our seed data) ───────────────────────────

const FALLBACK_CATEGORIES = [
  { category: 'Technology',            count: 142 },
  { category: 'Healthcare',            count: 198 },
  { category: 'Finance',               count: 87  },
  { category: 'Engineering',           count: 134 },
  { category: 'Education',             count: 76  },
  { category: 'Creative',              count: 94  },
  { category: 'Music & Entertainment', count: 68  },
  { category: 'Art & Culture',         count: 52  },
  { category: 'Legal',                 count: 48  },
  { category: 'Science',               count: 112 },
  { category: 'Business',              count: 89  },
  { category: 'Construction',          count: 67  },
  { category: 'Hospitality',           count: 54  },
  { category: 'Transport',             count: 43  },
  { category: 'Retail',                count: 38  },
  { category: 'Social Care',           count: 61  },
  { category: 'Trades',                count: 72  },
  { category: 'Media',                 count: 45  },
  { category: 'Agriculture',           count: 29  },
  { category: 'Public Sector',         count: 56  },
  { category: 'Sport',                 count: 34  },
  { category: 'General',               count: 32  },
];

// ── Salary formatter ───────────────────────────────────────────────────────────

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

// ── AI Impact helpers ──────────────────────────────────────────────────────────

function aiImpactLabel(risk: number): { label: string; sublabel: string; color: string; bg: string; icon: string } {
  if (risk >= 75) return {
    label: 'High AI Disruption Risk',
    sublabel: 'Many tasks in this role are already being automated. Roles are evolving — adaptability is key.',
    color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: '⚠️',
  };
  if (risk >= 45) return {
    label: 'Moderate AI Impact',
    sublabel: 'AI is changing parts of this role. New tools are emerging — those who adapt will thrive.',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '🤖',
  };
  if (risk >= 20) return {
    label: 'Low AI Risk — AI-Assisted',
    sublabel: 'AI tools are helping professionals in this field do more, faster. Human judgement stays central.',
    color: '#7b5cf5', bg: 'rgba(120,80,255,0.08)', icon: '✨',
  };
  return {
    label: 'AI-Resilient Career',
    sublabel: 'This role relies heavily on human skills — creativity, empathy, physical presence — that AI cannot replicate.',
    color: '#34d399', bg: 'rgba(52,211,153,0.08)', icon: '🛡️',
  };
}

function AiImpactBanner({ risk, futureScore }: { risk: number; futureScore: number }) {
  const { label, sublabel, color, bg, icon } = aiImpactLabel(risk);
  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}30`,
      borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
          <div style={{ fontSize: 11, color: '#6060a0', marginTop: 1 }}>Automation risk: {risk}%</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: futureScore >= 70 ? '#34d399' : futureScore >= 40 ? '#f59e0b' : '#f87171' }}>
            {futureScore}
          </div>
          <div style={{ fontSize: 10, color: '#5050a0' }}>Future Score</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#8080b0', margin: 0, lineHeight: 1.6 }}>{sublabel}</p>
    </div>
  );
}

// ── Time to Junior helpers ─────────────────────────────────────────────────────

function TimeToJuniorBanner({ career }: { career: Career }) {
  const ttj = career.pathway?.timeToJunior;
  const ttm = career.pathway?.timeToMid;
  const tts = career.pathway?.timeToSenior;
  if (!ttj) return null;

  return (
    <div style={{
      background: 'rgba(120,80,255,0.07)',
      border: '1px solid rgba(120,80,255,0.2)',
      borderRadius: 12, padding: '18px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6060a0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
        🗓️ Your Journey Timeline
      </div>

      {/* Timeline bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
        {[
          { label: 'Junior', time: ttj, color: '#7b5cf5' },
          { label: 'Mid', time: ttm, color: '#5b8ff7' },
          { label: 'Senior', time: tts, color: '#34d399' },
        ].filter(s => s.time).map((step, i, arr) => (
          <div key={step.label} style={{ flex: 1, position: 'relative' }}>
            <div style={{
              height: 4,
              background: step.color,
              opacity: 0.3 + (i * 0.2),
              borderRadius: i === 0 ? '4px 0 0 4px' : i === arr.length - 1 ? '0 4px 4px 0' : 0,
            }} />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: step.color }}>{step.label}</div>
              <div style={{ fontSize: 12, color: '#9090b0', marginTop: 2 }}>{step.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Personalised teaser */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(120,80,255,0.15)',
        borderRadius: 8, padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#c0aaff' }}>🎯 Personalised estimate</div>
          <div style={{ fontSize: 11, color: '#5050a0', marginTop: 3 }}>
            Sign in and we'll calculate your exact time to Junior based on your CV and skills.
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/login'}
          style={{
            background: 'rgba(120,80,255,0.2)', border: '1px solid rgba(120,80,255,0.3)',
            borderRadius: 8, padding: '7px 12px', color: '#c0aaff',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          Sign in →
        </button>
      </div>
    </div>
  );
}

// ── Career Detail Panel ────────────────────────────────────────────────────────

function CareerPanel({ career, onClose }: { career: Career; onClose: () => void }) {
  const uk = career.salary?.uk;
  const us = career.salary?.us;
  const wuk = career.workforce?.uk;
  const wus = career.workforce?.us;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 520,
        height: '100vh',
        background: '#0a0818',
        borderLeft: '1px solid rgba(120,80,255,0.2)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 28px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0,
          background: '#0a0818', zIndex: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 6 }}>
                {career.category} · {career.subcategory}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>{career.title}</h2>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#9090b0', cursor: 'pointer', padding: '8px 10px', fontSize: 16 }}
            >✕</button>
          </div>

          {career.identity?.summary && (
            <p style={{ fontSize: 13, color: '#8080b0', lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>
              {career.identity.summary}
            </p>
          )}
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* AI Impact */}
          {career.demand?.automationRisk !== undefined && (
            <AiImpactBanner
              risk={career.demand.automationRisk}
              futureScore={career.demand.futureScore ?? 0}
            />
          )}

          {/* Time to Junior */}
          <TimeToJuniorBanner career={career} />

          {/* Salary */}
          {(uk || us) && (
            <Section title="💰 Salary">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {uk && <SalaryCard label="UK" region={uk} />}
                {us && <SalaryCard label="US" region={us} />}
              </div>
            </Section>
          )}

          {/* Workforce */}
          {(wuk || wus) && (
            <Section title="👥 Workforce">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {wuk && <WorkforceCard label="UK" w={wuk} />}
                {wus && <WorkforceCard label="US" w={wus} />}
              </div>
            </Section>
          )}

          {/* Demand */}
          {career.demand && (
            <Section title="📈 Demand & Future">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <StatTile label="Automation Risk" value={career.demand.automationRisk + '%'} bad={career.demand.automationRisk > 60} />
                <StatTile label="Future Score" value={career.demand.futureScore + '/100'} good={career.demand.futureScore > 70} />
                <StatTile label="Trend" value={career.demand.trend} />
              </div>
            </Section>
          )}

          {/* Lifestyle */}
          {career.lifestyle && (
            <Section title="🧘 Lifestyle">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <StatTile label="Environment" value={career.lifestyle.environment} />
                <StatTile label="Typical Hours" value={career.lifestyle.typicalHours} />
                <StatTile label="Stress" value={career.lifestyle.stress + '/100'} bad={career.lifestyle.stress > 70} />
                <StatTile label="Remote Score" value={career.lifestyle.remoteScore + '/100'} good={career.lifestyle.remoteScore > 60} />
              </div>
            </Section>
          )}

          {/* Skills & Pathway */}
          {career.pathway?.skills?.length > 0 && (
            <Section title="🛠️ Key Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {career.pathway.skills.slice(0, 12).map(s => (
                  <span key={s} style={{
                    background: 'rgba(120,80,255,0.12)',
                    border: '1px solid rgba(120,80,255,0.2)',
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: 12, color: '#c0aaff', fontWeight: 500,
                  }}>{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Entry requirements */}
          {career.pathway?.entryRequirements?.length > 0 && (
            <Section title="🎓 Getting Started">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {career.pathway.entryRequirements.map(r => (
                  <li key={r} style={{ fontSize: 13, color: '#9090b0', lineHeight: 1.8 }}>{r}</li>
                ))}
              </ul>
              {career.pathway.timeToSenior && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#7b5cf5', fontWeight: 600 }}>
                  ⏱ Time to Senior: {career.pathway.timeToSenior}
                </div>
              )}
            </Section>
          )}

          {/* Traits */}
          {career.identity?.traits?.length > 0 && (
            <Section title="🧠 Who Thrives Here">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {career.identity.traits.map(t => (
                  <span key={t} style={{
                    background: 'rgba(52,211,153,0.1)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: 12, color: '#6ee7b7', fontWeight: 500,
                  }}>{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* CTA */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(120,80,255,0.15), rgba(60,100,255,0.1))',
            border: '1px solid rgba(120,80,255,0.3)',
            borderRadius: 14, padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e0dcff', marginBottom: 6 }}>
              Ready to interview for this role?
            </div>
            <div style={{ fontSize: 13, color: '#8080b0', marginBottom: 16 }}>
              Practice with an AI interviewer tailored to {career.title} questions.
            </div>
            <button
              onClick={() => window.open('https://recruiter.explain.global/demo/vallum-job-paid', '_blank')}
              style={{
                background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
              }}>
              Start Interview Practice →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6060a0', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SalaryCard({ label, region }: { label: string; region: SalaryRegion }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', marginBottom: 10 }}>{label}</div>
      {[['Starting', region.starting], ['Mid', region.mid], ['Senior', region.senior], ['Expert', region.expert]].map(([l, v]) => (
        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#7070a0' }}>{l}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#c0b8e0' }}>{fmt(v as number, region.currency)}</span>
        </div>
      ))}
    </div>
  );
}

function WorkforceCard({ label, w }: { label: string; w: WorkforceRegion }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#7070a0' }}>Employed</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#c0b8e0' }}>{fmtK(w.employed)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#7070a0' }}>Studying</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#c0b8e0' }}>{fmtK(w.studying)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#7070a0' }}>5yr Growth</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: growthColor(w.growthPct5yr) }}>{w.growthPct5yr > 0 ? '+' : ''}{w.growthPct5yr}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#7070a0' }}>Vacancies</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#c0b8e0' }}>{fmtK(w.vacancies)}</span>
      </div>
    </div>
  );
}

function StatTile({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  const color = good ? '#34d399' : bad ? '#f87171' : '#c0b8e0';
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: '#6060a0', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
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
        borderRadius: 12, padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e0dcff', lineHeight: 1.3 }}>{career.title}</div>
        {wuk?.growthPct5yr !== undefined && wuk.growthPct5yr !== 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: growthColor(wuk.growthPct5yr),
            background: 'rgba(52,211,153,0.08)',
            borderRadius: 6, padding: '2px 7px', flexShrink: 0, marginLeft: 8,
          }}>
            {wuk.growthPct5yr > 0 ? '+' : ''}{wuk.growthPct5yr}%
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#6060a0', marginBottom: 10 }}>
        {career.subcategory || career.category}
      </div>

      {uk && uk.mid > 0 && (
        <div style={{ fontSize: 13, color: '#9080c0', fontWeight: 600 }}>
          {fmt(uk.mid, '£')} mid · {fmt(uk.senior, '£')} senior
        </div>
      )}

      {career.pathway?.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {career.pathway.skills.slice(0, 3).map(s => (
            <span key={s} style={{
              fontSize: 11, color: '#7060a0',
              background: 'rgba(120,80,255,0.08)',
              borderRadius: 4, padding: '2px 7px',
            }}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Careers() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Career[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Career[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Type-ahead search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCareers(q);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 280);
  }, []);

  // Browse by category
  async function browseCategory(cat: string) {
    if (activeCategory === cat) { setActiveCategory(null); setCategoryResults([]); return; }
    setActiveCategory(cat);
    setLoadingCategory(true);
    const results = await getCareersByCategory(cat);
    setCategoryResults(results);
    setLoadingCategory(false);
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 12 }}>
          ✦ CAREERS EXPLORER
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.1 }}>
          Explore 4,000+ careers
        </h1>
        <p style={{ fontSize: 16, color: '#7070a0', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
          Real salary data, workforce figures, AI impact and growth trends — for every career in the UK and US. Growing daily.
        </p>
      </div>

      {/* Search */}
      <div style={{ maxWidth: 620, margin: '0 auto 52px', position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(120,80,255,0.35)',
          borderRadius: 14, padding: '0 18px',
          boxShadow: '0 0 0 4px rgba(120,80,255,0.06)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7b5cf5" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search any career — Surgeon, Plumber, CTO, Dog Walker..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e0dcff', fontSize: 15, padding: '16px 12px',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', color: '#6060a0', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
            >✕</button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: '#0d0c1e',
            border: '1px solid rgba(120,80,255,0.25)',
            borderRadius: 12, overflow: 'hidden',
            zIndex: 100, boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}>
            {suggestions.map(c => (
              <div
                key={c.id}
                onMouseDown={() => { setSelectedCareer(c); setShowSuggestions(false); setQuery(c.title); }}
                style={{
                  padding: '12px 18px',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(120,80,255,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e0dcff' }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: '#6060a0' }}>{c.category}</div>
                </div>
                {c.salary?.uk?.mid > 0 && (
                  <div style={{ fontSize: 13, color: '#9080c0', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
                    {fmt(c.salary.uk.mid, '£')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Browse by Category */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#9090b0', marginBottom: 20 }}>
          Browse by category
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {categories.map(({ category, count }) => {
            const active = activeCategory === category;
            return (
              <div
                key={category}
                onClick={() => browseCategory(category)}
                style={{
                  background: active ? 'rgba(120,80,255,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(120,80,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12, padding: '14px 16px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(120,80,255,0.3)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <span style={{ fontSize: 22 }}>{categoryIcon(category)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : '#c0b8e0' }}>{category}</span>
                <span style={{ fontSize: 11, color: '#5050a0' }}>{count} careers</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category results */}
      {activeCategory && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#9090b0', marginBottom: 20 }}>
            {categoryIcon(activeCategory)} {activeCategory}
            {!loadingCategory && categoryResults.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 400, color: '#5050a0', marginLeft: 10 }}>
                {categoryResults.length} careers
              </span>
            )}
          </h2>

          {loadingCategory ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#5050a0' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
              Loading careers...
            </div>
          ) : categoryResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {categoryResults.map(c => (
                <CareerCard key={c.id} career={c} onClick={() => setSelectedCareer(c)} />
              ))}
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '40px',
              textAlign: 'center', color: '#5050a0',
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔌</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>API not connected yet</div>
              <div style={{ fontSize: 13 }}>Career data is in Cosmos DB — wire up the Azure Function endpoint to browse live data.</div>
            </div>
          )}
        </div>
      )}

      {/* Career detail panel */}
      {selectedCareer && (
        <CareerPanel career={selectedCareer} onClose={() => setSelectedCareer(null)} />
      )}
    </div>
  );
}
