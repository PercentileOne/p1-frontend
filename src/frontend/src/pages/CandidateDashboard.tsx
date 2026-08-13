import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/authStore";
import {
  LayoutDashboard, User, Video, Briefcase, BookOpen,
  MessageSquare, Settings, LogOut, ChevronRight, CheckCircle2, Circle,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   CANDIDATE DASHBOARD — cockpit-grade portal for explain.global
   ══════════════════════════════════════════════════════════════ */

type CardSlide = { label: string; value: string; change: string };
type LiveCard  = { color: string; bg: string; border: string; shadow: string; interval: number; slides: CardSlide[] };

interface NewsItem { tag: string; timeAgo: string; headline: string; source: string; color: string }

const NAV_ITEMS = [
  { Icon: LayoutDashboard, label: "Dashboard" },
  { Icon: User,            label: "My Profile" },
  { Icon: Video,           label: "Interviews" },
  { Icon: Briefcase,       label: "Jobs" },
  { Icon: BookOpen,        label: "Learn" },
  { Icon: MessageSquare,   label: "Messages" },
  { Icon: Settings,        label: "Settings" },
] as const;

const LIVE_STATS: LiveCard[] = [
  {
    color: "#34D399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", shadow: "52,211,153",
    interval: 12000,
    slides: [
      { label: "Profile Score",    value: "78%",    change: "Above average for your role"      },
      { label: "Profile Strength", value: "Strong", change: "3 items left to complete"          },
      { label: "Visibility",       value: "High",   change: "Appearing in 94% of role searches" },
    ],
  },
  {
    color: "#4F8EF7", bg: "rgba(79,142,247,0.08)", border: "rgba(79,142,247,0.2)", shadow: "79,142,247",
    interval: 13000,
    slides: [
      { label: "Interviews Completed", value: "3",     change: "Last score: 84%"        },
      { label: "Best Score",           value: "84%",   change: "vs. 71% role average"   },
      { label: "Interview Status",     value: "Ready", change: "All modules complete"    },
    ],
  },
  {
    color: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", shadow: "167,139,250",
    interval: 14000,
    slides: [
      { label: "Employers Watching", value: "12",  change: "+3 new this week"          },
      { label: "Profile Saves",      value: "8",   change: "2 employers messaged you"  },
      { label: "Match Rate",         value: "91%", change: "Matching active job specs" },
    ],
  },
  {
    color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", shadow: "245,158,11",
    interval: 15000,
    slides: [
      { label: "Profile Views",  value: "47",   change: "+8 today"                    },
      { label: "This Week",      value: "23",   change: "Trending up 34%"             },
      { label: "Top Role Match", value: ".NET", change: "Most searched role this week" },
    ],
  },
  {
    color: "#F472B6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)", shadow: "244,114,182",
    interval: 16000,
    slides: [
      { label: "Paid Contacts This Week", value: "3",   change: "Employers paid to reach you"  },
      { label: "Total Paid Contacts",     value: "11",  change: "Since you went live"           },
      { label: "Your Earning Power",      value: "£55", change: "Value generated this month"    },
    ],
  },
];

const UPCOMING_INTERVIEWS = [
  { company: "Vallum Associates",    role: "Senior .NET Developer",  date: "Mon 18 Aug · 10:00am", interviewer: "Sarah Mitchell", statusColor: "#34D399" },
  { company: "Apex Tech Solutions",  role: "Cloud Engineer",         date: "Wed 20 Aug · 2:30pm",  interviewer: "James Carter",   statusColor: "#4F8EF7" },
];

const JOB_DEMAND = [
  { role: ".NET Developer",  demand: 94, trend: "+12%" },
  { role: "Cloud Engineer",  demand: 87, trend: "+8%"  },
  { role: "DevOps / SRE",    demand: 79, trend: "+21%" },
  { role: "Product Manager", demand: 65, trend: "+4%"  },
  { role: "Data Engineer",   demand: 58, trend: "+17%" },
];

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
  { text: "Your only limit is the amount of willingness you possess to reach the next level.", author: "Byron Pulsifer" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Don't wait for opportunity. Create it.", author: "George Bernard Shaw" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
];

const PROFILE_ITEMS = [
  { label: "Profile photo",        done: true  },
  { label: "Work experience",      done: true  },
  { label: "Skills & expertise",   done: true  },
  { label: "Profile video intro",  done: false },
  { label: "Career story",         done: false },
  { label: "Certifications",       done: false },
];

const FALLBACK_NEWS: NewsItem[] = [
  { tag: "Education",   timeAgo: "1h ago",  headline: "Record number of students achieve top A Level grades — universities brace for clearing surge",          source: "BBC News",             color: "#4F8EF7" },
  { tag: "Tech Jobs",   timeAgo: "2h ago",  headline: "UK tech hiring rebounds sharply in Q3 as AI-adjacent roles surge 34% — latest REC data",                source: "TechMarket",           color: "#34D399" },
  { tag: "AI & Work",   timeAgo: "4h ago",  headline: "Candidates using AI interview prep are landing roles 2× faster — new research confirms",                 source: "HR Magazine",          color: "#A78BFA" },
  { tag: "Salaries",    timeAgo: "6h ago",  headline: ".NET and cloud engineer salaries up 12% year-on-year as enterprise demand outpaces supply",              source: "LinkedIn Economic Graph", color: "#F59E0B" },
];

const NEWS_COLORS = ["#4F8EF7", "#34D399", "#A78BFA", "#F59E0B"];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

async function fetchTodaysNews(role: string): Promise<NewsItem[]> {
  const today = getTodayLabel();
  const key   = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) return FALLBACK_NEWS;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a career intelligence agent. Today is ${today}. Generate 4 topical career and job market news items relevant for a ${role || "professional"} who is actively job seeking. Include any real-world events from today if you know of them (e.g. A Level results, economic data, tech announcements). Return a JSON object with key "news" — an array of: { tag: string, timeAgo: string, headline: string, source: string }. timeAgo examples: "1h ago", "3h ago". Headlines should feel like real, specific, breaking news — never generic.`,
          },
          { role: "user", content: "Generate the 4 news items now." },
        ],
        response_format: { type: "json_object" },
        max_tokens: 700,
        temperature: 0.7,
      }),
    });
    const data = await res.json() as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(data.choices[0].message.content) as { news: Omit<NewsItem, "color">[] };
    return parsed.news.slice(0, 4).map((item, i) => ({ ...item, color: NEWS_COLORS[i % 4] }));
  } catch {
    return FALLBACK_NEWS;
  }
}

/* ── Sub-components ──────────────────────────────────────────── */

function LiveStatCard({ card }: { card: LiveCard }) {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % card.slides.length); setVisible(true); }, 280);
    }, card.interval);
    return () => clearInterval(t);
  }, [card.interval, card.slides.length]);

  const slide = card.slides[idx];

  return (
    <div style={{
      background: card.bg, border: `1px solid ${card.border}`, borderRadius: 14,
      padding: "20px 22px 16px", position: "relative", overflow: "hidden", minHeight: 110,
      boxShadow: `0 4px 24px rgba(${card.shadow},0.18), 0 1px 4px rgba(0,0,0,0.4)`,
      userSelect: "none", WebkitUserSelect: "none", cursor: "default",
    }}>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.28s ease, transform 0.28s ease",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: card.color, marginBottom: 10 }}>{slide.label}</div>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text)", lineHeight: 1 }}>{slide.value}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{slide.change}</div>
      </div>
      <div style={{ display: "flex", gap: 4, position: "absolute", bottom: 12, right: 14 }}>
        {card.slides.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 14 : 5, height: 5, borderRadius: 3,
            background: i === idx ? card.color : `rgba(${card.shadow},0.3)`,
            transition: "width 0.3s ease, background 0.3s ease",
          }} />
        ))}
      </div>
      <div style={{
        position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(ellipse,rgba(${card.shadow},0.12) 0%,transparent 70%)`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

function DashCard({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
        {action && (
          <button onClick={onAction} style={{ fontSize: 11, fontWeight: 700, color: "#34D399", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            {action} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);

  const [activeNav, setActiveNav] = useState("Dashboard");
  const [news,      setNews]      = useState<NewsItem[]>(FALLBACK_NEWS);
  const [newsReady, setNewsReady] = useState(false);

  const firstName = user?.firstName ?? user?.name?.split(" ")[0] ?? "there";
  const role      = user?.role ?? "Candidate";
  const initials  = (user?.name ?? "C").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const quote      = QUOTES[new Date().getDay() % QUOTES.length];
  const profileDone = PROFILE_ITEMS.filter(p => p.done).length;
  const profilePct  = Math.round((profileDone / PROFILE_ITEMS.length) * 100);

  useEffect(() => {
    fetchTodaysNews(role).then(items => { setNews(items); setNewsReady(true); });
  }, [role]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function navTo(label: string) {
    const routes: Record<string, string> = {
      "My Profile": "/profile",
      "Interviews": "/interviews",
      "Jobs":       "/jobs",
      "Learn":      "/learning",
      "Messages":   "/messages",
      "Settings":   "/settings",
    };
    if (routes[label]) { navigate(routes[label]); return; }
    setActiveNav(label);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", fontFamily: '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "var(--bg2)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#34D399,#047857)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.05em" }}>P1</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em", color: "#ffffff", lineHeight: 1.2 }}>
              Explain<span style={{ color: "#34D399" }}>.global</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 3 }}>
              Candidate Portal
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(({ Icon, label }) => (
            <button
              key={label}
              onClick={() => navTo(label)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, border: "none",
                cursor: "pointer", textAlign: "left", width: "100%",
                background: activeNav === label ? "rgba(52,211,153,0.12)" : "transparent",
                color: activeNav === label ? "#34D399" : "var(--text-2)",
                fontSize: 13, fontWeight: activeNav === label ? 700 : 500,
                transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              <Icon size={15} strokeWidth={activeNav === label ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#34D399,#047857)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name ?? "Candidate"}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{role}</div>
          </div>
          <button onClick={handleLogout} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex", padding: 4 }} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 220, flex: 1, minWidth: 0, padding: "0 28px 60px" }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 0 24px", borderBottom: "1px solid var(--border)",
          marginBottom: 28, position: "sticky", top: 0, background: "var(--bg)", zIndex: 5,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text)" }}>
              {getGreeting()}, {firstName} — <span style={{ color: "#34D399" }}>{role}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              {getTodayLabel()} · 2 interviews scheduled this week
            </div>
          </div>
          <button
            onClick={() => navigate("/profile/video")}
            style={{
              padding: "9px 18px", background: "linear-gradient(135deg,#34D399,#059669)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(52,211,153,0.3)",
            }}
          >
            + Record Profile Video
          </button>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
          {LIVE_STATS.map((s, i) => <LiveStatCard key={i} card={s} />)}
        </div>

        {/* ── TWO-COL LAYOUT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Today's Career Intelligence */}
            <DashCard title="📰 Today's Career Intelligence" action={newsReady ? "More" : undefined}>
              {!newsReady ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ height: 52, borderRadius: 8, background: "rgba(255,255,255,0.04)", animation: "pulse 1.6s ease-in-out infinite" }} />
                  ))}
                  <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {news.map((n, i) => (
                    <div key={i} style={{ paddingBottom: 14, borderBottom: i < news.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: n.color, background: `${n.color}18`, padding: "2px 8px", borderRadius: 20 }}>{n.tag}</span>
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{n.timeAgo}</span>
                        <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>{n.source}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, fontWeight: 600 }}>{n.headline}</div>
                    </div>
                  ))}
                </div>
              )}
            </DashCard>

            {/* Upcoming Interviews */}
            <DashCard title="📅 Upcoming Interviews" action="View all" onAction={() => navigate("/interviews")}>
              {UPCOMING_INTERVIEWS.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
                  No interviews scheduled yet.
                  <br />
                  <button onClick={() => navigate("/jobs")} style={{ marginTop: 10, color: "#34D399", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                    Browse matching jobs →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {UPCOMING_INTERVIEWS.map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: 10,
                      background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)",
                      userSelect: "none", WebkitUserSelect: "none",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{p.company}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{p.role}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: p.statusColor }}>{p.date}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>with {p.interviewer}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashCard>

            {/* Job Market Demand */}
            <DashCard title="📊 Job Market Demand — Your Field" action="Explore jobs" onAction={() => navigate("/jobs")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {JOB_DEMAND.map((r, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{r.role}</span>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#34D399", fontWeight: 700 }}>{r.trend}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: r.demand >= 80 ? "#34D399" : r.demand >= 65 ? "#F59E0B" : "#EF4444" }}>{r.demand}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${r.demand}%`, borderRadius: 3,
                        background: r.demand >= 80
                          ? "linear-gradient(90deg,#34D399,#6ee7b7)"
                          : r.demand >= 65
                            ? "linear-gradient(90deg,#F59E0B,#fcd34d)"
                            : "linear-gradient(90deg,#EF4444,#f87171)",
                        transition: "width 1s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </DashCard>

          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Profile Completion */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14 }}>
                ✅ Profile Completion
              </div>

              {/* Ring */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle
                    cx="30" cy="30" r="24" fill="none"
                    stroke="#34D399" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - profilePct / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                  <text x="30" y="35" textAnchor="middle" fontSize="13" fontWeight="900" fill="var(--text)" fontFamily="-apple-system,sans-serif">{profilePct}%</text>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{profileDone} of {PROFILE_ITEMS.length} complete</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, lineHeight: 1.4 }}>Complete your profile to appear in more employer searches</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {PROFILE_ITEMS.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.done
                      ? <CheckCircle2 size={14} color="#34D399" />
                      : <Circle size={14} color="var(--text-3)" />
                    }
                    <span style={{ fontSize: 12, color: item.done ? "var(--text-3)" : "var(--text-2)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4 }}>
                      {item.label}
                    </span>
                    {!item.done && (
                      <button
                        onClick={() => item.label === "Profile video intro" ? navigate("/profile/video") : navigate("/profile")}
                        style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#34D399", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quote of the Day */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>💬 Quote of the Day</div>
              <p style={{ fontSize: 14, fontStyle: "italic", color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
                "{quote.text}"
              </p>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>— {quote.author}</div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>⚡ Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Start a practice interview", path: "/interviews",    icon: "🎯" },
                  { label: "Browse matching jobs",        path: "/jobs",          icon: "💼" },
                  { label: "Record profile video",        path: "/profile/video", icon: "🎥" },
                  { label: "Update my profile",           path: "/profile",       icon: "👤" },
                  { label: "Continue learning",           path: "/learning",      icon: "📚" },
                ].map(a => (
                  <button
                    key={a.path}
                    onClick={() => navigate(a.path)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8,
                      background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                      color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(52,211,153,0.06)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(52,211,153,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "#34D399"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}
                  >
                    <span style={{ fontSize: 15 }}>{a.icon}</span>
                    {a.label}
                    <ChevronRight size={12} style={{ marginLeft: "auto" }} />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
