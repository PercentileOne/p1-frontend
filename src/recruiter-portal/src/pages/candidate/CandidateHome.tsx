import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Compass, BookOpen, Mic, User, Settings,
  Plus, TrendingUp, Star, Flame, ChevronRight, Globe, Play,
  Clock, Award, BarChart2, Zap,
} from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG       = '#0c0e14';
const BG2      = '#10131a';
const BG3      = '#14171f';
const BORDER   = 'rgba(255,255,255,0.07)';
const BLUE     = '#4F8EF7';
const GREEN    = '#34D399';
const PURPLE   = '#A78BFA';
const AMBER    = '#F59E0B';
const RED      = '#EF4444';
const TEXT1    = '#e2e8f0';
const TEXT2    = '#94a3b8';
const TEXT3    = '#5a6478';

// ── Mock data ─────────────────────────────────────────────────────────────────
const USER = { name: 'Candidate', country: 'GB', lang: 'EN' };

const SESSIONS = [
  { score: 7.8, role: 'Senior Software Engineer', date: '30 Jul 2026', tier: 'Pro',    tier_color: BLUE,   interviewer: 'Sarah', flag: 'GB', top: 82, round: '2nd Interview' },
  { score: 8.9, role: 'Data Scientist',            date: '22 Jul 2026', tier: 'Expert', tier_color: PURPLE, interviewer: 'James', flag: 'GB', top: 94, round: '1st Interview' },
  { score: 7.1, role: 'Product Manager',           date: '15 Jul 2026', tier: 'Pro',    tier_color: BLUE,   interviewer: 'Tyler', flag: 'US', top: 73, round: '1st Interview' },
  { score: 6.4, role: 'DevOps Engineer',           date: '8 Jul 2026',  tier: 'Standard', tier_color: GREEN, interviewer: 'Sarah', flag: 'GB', top: 61, round: '1st Interview' },
  { score: 8.1, role: 'Senior Software Engineer',  date: '1 Jul 2026',  tier: 'Pro',    tier_color: BLUE,   interviewer: 'James', flag: 'GB', top: 88, round: '3rd Interview' },
];

const PERF_POINTS = [6.4, 7.1, 7.8, 8.9, 7.8]; // last 5 scores

function scoreColor(s: number) {
  if (s >= 8)  return GREEN;
  if (s >= 6.5) return BLUE;
  if (s >= 5)  return AMBER;
  return RED;
}

function topColor(t: number) {
  if (t >= 85) return GREEN;
  if (t >= 65) return BLUE;
  return AMBER;
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { Icon: LayoutDashboard, label: 'Dashboard' },
  { Icon: FileText,        label: 'My Interviews' },
  { Icon: Compass,         label: 'Careers' },
  { Icon: BookOpen,        label: 'Learn' },
  { Icon: Mic,             label: 'Practice' },
];
const NAV_BOTTOM = [
  { Icon: User,     label: 'Profile' },
  { Icon: Settings, label: 'Settings' },
];

// ── Mini sparkline SVG ────────────────────────────────────────────────────────
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const W = 80; const H = 32;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map(p => H - ((p - min) / (max - min + 0.001)) * (H - 4) - 2);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3} fill={color} />
    </svg>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  const pct = (score / 10) * 100;
  const r = 18; const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke={BORDER} strokeWidth={3} />
      <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${c}`} strokeDashoffset={c * 0.25}
        strokeLinecap="round" />
      <text x={22} y={27} textAnchor="middle" fill={color} fontSize={11} fontWeight={700} fontFamily="-apple-system,sans-serif">{score}</text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CandidateHome() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Dashboard');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const avgScore = (SESSIONS.reduce((s, x) => s + x.score, 0) / SESSIONS.length).toFixed(1);
  const bestSession = [...SESSIONS].sort((a, b) => b.score - a.score)[0];
  const streak = 3;
  const perfDelta = +(PERF_POINTS[PERF_POINTS.length - 1] - PERF_POINTS[0]).toFixed(1);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif', color: TEXT1 }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 216, flexShrink: 0,
        background: BG2, borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0,
            }}>E</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: TEXT1, letterSpacing: '-0.01em' }}>
                Explain<span style={{ color: BLUE }}>.global</span>
              </div>
              <div style={{ fontSize: 10, color: TEXT3, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
                Candidate Portal
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: TEXT3, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px 8px' }}>Navigation</div>
          {NAV.map(({ Icon, label }) => {
            const active = activeNav === label;
            return (
              <button key={label} onClick={() => setActiveNav(label)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 10px', borderRadius: 8,
                background: active ? `${BLUE}15` : 'transparent',
                border: active ? `1px solid ${BLUE}30` : '1px solid transparent',
                color: active ? BLUE : TEXT2,
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s', marginBottom: 2,
                textAlign: 'left',
              }}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div style={{ padding: '10px 10px 16px', borderTop: `1px solid ${BORDER}` }}>
          {NAV_BOTTOM.map(({ Icon, label }) => (
            <button key={label} onClick={() => setActiveNav(label)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 10px', borderRadius: 8,
              background: 'transparent', border: '1px solid transparent',
              color: TEXT3, fontSize: 13, fontWeight: 400,
              cursor: 'pointer', transition: 'all 0.15s', marginBottom: 2,
              textAlign: 'left',
            }}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </button>
          ))}

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 2px' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `linear-gradient(135deg, ${BLUE}60, ${PURPLE}60)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>C</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT1 }}>Candidate</div>
              <div style={{ fontSize: 10, color: TEXT3 }}>candidate.explain.global</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: 216, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top header */}
        <header style={{
          borderBottom: `1px solid ${BORDER}`, background: BG2,
          padding: '0 28px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div style={{ fontSize: 13, color: TEXT3 }}>Dashboard</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Country / Lang */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TEXT3, background: BG3, border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 10px' }}>
              <Globe size={12} />
              <span style={{ fontWeight: 700 }}>{USER.country}</span>
              <span style={{ color: TEXT3 }}>·</span>
              <span>{USER.lang}</span>
            </div>
            {/* New Session */}
            <button
              onClick={() => navigate('/candidate/prep')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: BLUE, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '-0.01em',
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              New Session
            </button>
          </div>
        </header>

        {/* Page body */}
        <div style={{ flex: 1, padding: '28px 28px 40px', maxWidth: 1240 }}>

          {/* Greeting */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT1, letterSpacing: '-0.02em', margin: 0, marginBottom: 4 }}>
              {greeting}, {USER.name}
            </h1>
            <div style={{ fontSize: 13, color: TEXT3 }}>
              You're in the top {100 - Math.round(SESSIONS.reduce((s, x) => s + x.top, 0) / SESSIONS.length)}% of candidates in your field. Keep going.
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { Icon: BarChart2,   label: 'SESSIONS',   value: String(SESSIONS.length),  sub: 'total',              color: BLUE   },
              { Icon: TrendingUp,  label: 'AVG SCORE',  value: avgScore,                  sub: 'out of 10',           color: BLUE   },
              { Icon: Star,        label: 'BEST SCORE', value: String(bestSession.score), sub: bestSession.role,      color: GREEN  },
              { Icon: Flame,       label: 'STREAK',     value: String(streak),            sub: 'days',                color: AMBER  },
            ].map(s => (
              <div key={s.label} style={{
                background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: TEXT3, marginBottom: 12, textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: TEXT3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Main two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 24 }}>

            {/* Left — Recent sessions */}
            <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT1 }}>Recent sessions</div>
                <button onClick={() => navigate('/interview-history')} style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  color: BLUE, fontSize: 12, cursor: 'pointer', fontWeight: 500,
                }}>
                  See all <ChevronRight size={13} />
                </button>
              </div>

              {/* Column headers */}
              <div style={{
                display: 'grid', gridTemplateColumns: '44px 1fr auto auto auto',
                gap: 12, padding: '9px 20px', alignItems: 'center',
                borderBottom: `1px solid ${BORDER}`,
              }}>
                {['', 'ROLE', 'ROUND', 'INTERVIEWER', 'TOP %'].map((h, i) => (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: TEXT3, textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>

              {/* Session rows */}
              {SESSIONS.map((s, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '44px 1fr auto auto auto',
                  gap: 12, padding: '12px 20px', alignItems: 'center',
                  borderBottom: i < SESSIONS.length - 1 ? `1px solid ${BORDER}` : 'none',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${BORDER}`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <ScoreRing score={s.score} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT1, marginBottom: 3 }}>{s.role}</div>
                    <div style={{ fontSize: 11, color: TEXT3 }}>{s.date}</div>
                  </div>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: `${s.tier_color}18`, color: s.tier_color,
                      border: `1px solid ${s.tier_color}30`,
                    }}>{s.tier}</span>
                    <div style={{ fontSize: 10, color: TEXT3, marginTop: 3, textAlign: 'center' }}>{s.round}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: TEXT2 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: `${BLUE}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: BLUE, flexShrink: 0,
                    }}>{s.interviewer[0]}</div>
                    {s.interviewer}
                    <span style={{ fontSize: 10, color: TEXT3 }}>{s.flag}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: TEXT3, marginBottom: 2 }}>Top</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: topColor(s.top) }}>{s.top}%</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Performance */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: TEXT3, textTransform: 'uppercase', marginBottom: 12 }}>Performance</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: perfDelta >= 0 ? GREEN : RED, letterSpacing: '-0.02em' }}>
                      {perfDelta >= 0 ? '+' : ''}{perfDelta}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>last {PERF_POINTS.length} sessions</div>
                  </div>
                  <Sparkline points={PERF_POINTS} color={perfDelta >= 0 ? GREEN : RED} />
                </div>
              </div>

              {/* Target Role */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: TEXT3, textTransform: 'uppercase', marginBottom: 12 }}>Target Role</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1, marginBottom: 4 }}>Senior Software Engineer</div>
                <div style={{ fontSize: 11, color: TEXT3, marginBottom: 14 }}>Technology · Mid-level → Senior</div>
                <button onClick={() => navigate('/learn')} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none',
                  border: `1px solid ${BORDER}`, borderRadius: 7, padding: '7px 12px',
                  color: BLUE, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  View career guide <ChevronRight size={12} />
                </button>
              </div>

              {/* Preferred Interviewer */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: TEXT3, textTransform: 'uppercase', marginBottom: 12 }}>Preferred Interviewer</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${BLUE}40, ${PURPLE}40)`,
                    border: `2px solid ${BLUE}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: BLUE,
                  }}>S</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT1 }}>Sarah</div>
                    <div style={{ fontSize: 11, color: TEXT3 }}>UK HR Director · Balanced</div>
                  </div>
                </div>
              </div>

              {/* Next Session CTA */}
              <button onClick={() => navigate('/candidate/prep')} style={{
                background: `linear-gradient(135deg, ${BLUE}18, ${PURPLE}18)`,
                border: `1px solid ${BLUE}35`, borderRadius: 14,
                padding: '16px 20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={14} fill="#fff" color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT1, marginBottom: 2 }}>Start new session</div>
                  <div style={{ fontSize: 10, color: TEXT3 }}>Set role, stage, CV · get your pack</div>
                </div>
                <ChevronRight size={14} style={{ marginLeft: 'auto', color: TEXT3 }} />
              </button>
            </div>
          </div>

          {/* Quick action row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { Icon: Zap,        label: 'Start new session',    sub: 'AI pack in 30 seconds',   color: BLUE,   path: '/candidate/prep' },
              { Icon: Compass,    label: 'Explore Careers',      sub: 'Find your target role',   color: GREEN,  path: '/learn' },
              { Icon: Clock,      label: 'View my interviews',   sub: 'Full session history',    color: PURPLE, path: '/interview-history' },
              { Icon: BookOpen,   label: 'Learn Engine',         sub: 'Role-matched modules',    color: AMBER,  path: '/learn' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.path)} style={{
                background: BG2, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color 0.15s',
                textAlign: 'left',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${a.color}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: `${a.color}15`, border: `1px solid ${a.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <a.Icon size={15} color={a.color} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT1, marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: TEXT3 }}>{a.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Multi-stage awareness banner */}
          <div style={{
            marginTop: 20, background: `${PURPLE}0a`, border: `1px solid ${PURPLE}25`,
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: `${PURPLE}15`, border: `1px solid ${PURPLE}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Award size={15} color={PURPLE} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT1, marginBottom: 2 }}>
                Got a second interview for Senior Software Engineer?
              </div>
              <div style={{ fontSize: 11, color: TEXT3 }}>
                Tell us what was asked in Round 1 — we'll prepare you specifically for Round 2. Multi-stage intelligence built in.
              </div>
            </div>
            <button onClick={() => navigate('/candidate/prep')} style={{
              background: `${PURPLE}20`, border: `1px solid ${PURPLE}35`,
              borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700,
              color: PURPLE, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              Prep for Round 2 →
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
