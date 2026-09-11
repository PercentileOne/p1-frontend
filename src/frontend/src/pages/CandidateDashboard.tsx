import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuthStore } from "../auth/authStore";
import { profileApi } from "../api/profileApi";
import { getMarketOverview, type MarketOverview } from "../api/careersApi";
import { getProfileEngagement, type ProfileEngagement } from "../api/profileEngagementApi";
import { getRoleActivity, type RoleActivity } from "../api/roleActivityApi";
import { getInDemandSubjects, type InDemandSubject } from "../api/inDemandSubjectsApi";
import { getTopLearnTopics, type LearnTopicStat } from "../api/learnTopicsApi";
import {
  LayoutDashboard, User, Video, Briefcase, BookOpen,
  MessageSquare, Settings, LogOut, ChevronRight, ChevronDown, CheckCircle2, Circle, Compass, Gift, Zap,
  HeartHandshake,
} from "lucide-react";
import LearnPanel from "./LearnPanel";
import CareersPanel from "./CareersPanel";
import MyInterviewsPage from "./MyInterviewsPage";
import ReceivedPreps from "./ReceivedPreps";
import ProfilePage from "./ProfilePage";
import JobsHome from "./JobsHome";
import MessagesPage from "./MessagesPage";
import SettingsPage from "./SettingsPage";
import DemoPanel from "./DemoPanel";
import CareerCoachPanel from "./CareerCoachPanel";

/* ══════════════════════════════════════════════════════════════
   CANDIDATE DASHBOARD — cockpit-grade portal for TheInterviewChair.com
   ══════════════════════════════════════════════════════════════ */

type CardSlide = { label: string; value: string; change: string };
type LiveCard  = { color: string; bg: string; border: string; shadow: string; interval: number; slides: CardSlide[] };

interface NewsItem { tag: string; headline: string; source: string; url: string; publishedAt: string; color: string }
interface FeaturedStat { value: string; label: string; sourceLabel?: string; sourceUrl?: string }

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

// slug: null keeps the URL as bare /dashboard for the home tab; every other tab gets a
// real ?tab= query param so the address bar always matches what's on screen, and browser
// back / our own Back button lands on the tab you were actually looking at, not a reset one.
const NAV_ITEMS = [
  { Icon: LayoutDashboard, label: "Dashboard",       slug: null },
  { Icon: HeartHandshake,  label: "My Career Coach", slug: "career-coach" },
  { Icon: User,            label: "My Profile",      slug: "profile" },
  { Icon: Video,           label: "My Interviews",   slug: "interviews" },
  { Icon: Gift,            label: "Interview Preps", slug: "interview-preps" },
  { Icon: Briefcase,       label: "Jobs",             slug: "jobs" },
  { Icon: BookOpen,        label: "Learn",            slug: "learn" },
  { Icon: Compass,         label: "Careers",          slug: "careers" },
  { Icon: MessageSquare,   label: "Messages",         slug: "messages" },
  { Icon: Zap,             label: "Demo",             slug: "demo" },
  { Icon: Settings,        label: "Settings",         slug: "settings" },
] as const;

// Five real, live-sourced dashboard cards (Francis, 2026-09-11) — replaces an earlier version
// where every number on every card was hardcoded placeholder data ("Employers Watching: 12",
// "Your Earning Power: £55", never wired to anything real). Each card's data source:
//   1. Your Profile Buzz  — GET /profile/engagement (real views/likes/interview-views)
//   2. Candidate Activity — GET /api/role-activity + /api/in-demand-subjects/{title} (real,
//      logged from InterviewPackStart.tsx; in-demand-subjects existed since 2026-08 but was
//      never read into any UI until now)
//   3. What People Study  — GET /api/learn-topics (real, logged from LearnPanel.tsx)
//   4. Business Pulse     — GET /api/business-news (real RSS, same architecture as Career News)
//   5. Career & Life Wisdom — GET /api/platform-stats (real, sourced) + the existing QUOTES list
const CARD_STYLES = [
  { color: "#34D399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", shadow: "52,211,153", interval: 12000 },
  { color: "#4F8EF7", bg: "rgba(79,142,247,0.08)", border: "rgba(79,142,247,0.2)", shadow: "79,142,247", interval: 13000 },
  { color: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", shadow: "167,139,250", interval: 14000 },
  { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", shadow: "245,158,11", interval: 15000 },
  { color: "#F472B6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)", shadow: "244,114,182", interval: 16000 },
] as const;

const LOADING_SLIDES: CardSlide[] = [{ label: "Loading…", value: "—", change: "Fetching the latest" }];

function titleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildLiveStats(data: {
  engagement: ProfileEngagement | null;
  roleActivity: RoleActivity[];
  topSubjects: InDemandSubject[];
  topRole: string | null;
  learnTopics: LearnTopicStat[];
  businessNews: NewsItem[];
  featuredStats: FeaturedStat[];
}): LiveCard[] {
  const cardSlides: CardSlide[][] = [
    data.engagement ? [
      { label: "Profile Views",   value: String(data.engagement.profileViews),   change: "People who've viewed your profile" },
      { label: "Profile Likes",   value: String(data.engagement.likes),          change: "Real likes from other candidates" },
      { label: "Interview Views", value: String(data.engagement.interviewViews), change: "Opens on your shared interview links" },
    ] : LOADING_SLIDES,

    (data.roleActivity.length || data.topSubjects.length || data.topRole) ? [
      ...(data.roleActivity[0] ? [{ label: "Most Active Role", value: titleCase(data.roleActivity[0].jobTitle), change: `${data.roleActivity[0].count} candidates interviewing this week` }] : []),
      ...(data.topSubjects[0] ? [{ label: "Top Requested Focus", value: titleCase(data.topSubjects[0].subject), change: `Most kept by candidates in this role` }] : []),
      ...(data.topRole ? [{ label: "Trending Search", value: data.topRole, change: "Most searched role right now" }] : []),
    ] : LOADING_SLIDES,

    data.learnTopics.length ? data.learnTopics.slice(0, 3).map((t, i) => ({
      label: i === 0 ? "Most Studied Topic" : `#${i + 1} Trending Topic`,
      value: titleCase(t.topic),
      change: `${t.count} candidate${t.count === 1 ? "" : "s"} studying this`,
    })) : LOADING_SLIDES,

    data.businessNews.length ? data.businessNews.slice(0, 3).map(n => ({
      label: n.tag,
      value: n.source,
      change: n.headline,
    })) : LOADING_SLIDES,

    data.featuredStats.length ? [
      ...data.featuredStats.slice(0, 2).map(s => ({ label: s.label, value: s.value, change: s.sourceLabel ?? "" })),
      { label: "Today's Wisdom", value: QUOTES[new Date().getDay() % QUOTES.length].author, change: `"${QUOTES[new Date().getDay() % QUOTES.length].text}"` },
    ] : LOADING_SLIDES,
  ];

  return CARD_STYLES.map((style, i) => ({ ...style, slides: cardSlides[i] }));
}

interface RecentInterview {
  id: string;
  createdAt: string;
  role: string | null;
  company: string | null;
  overallScore: number;
}

// Same thresholds/copy as MyInterviewsPage.tsx's scoreColor/fmtDate — kept in sync there.
function interviewScoreColor(pct: number) {
  if (pct >= 70) return "#34D399";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function fmtInterviewDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Default country for the Live Job Market card — only 'uk'/'us' have real data behind them
// (see careers-agent's own comment on why). Timezone is a real, zero-cost client-side signal
// for a first guess; the candidate can always switch via the dropdown regardless.
function guessMarketCountry(): 'uk' | 'us' {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('America/') ? 'us' : 'uk';
  } catch {
    return 'uk';
  }
}

function fmtSalaryK(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

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

const NEWS_COLORS = ["#4F8EF7", "#34D399", "#A78BFA", "#F59E0B"];

// "Xh ago" / "Xd ago" from a real publishedAt timestamp — computed at render time (not
// baked in server-side) so it stays correct regardless of the backend's 20-minute cache.
function timeAgoFrom(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

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

// Real articles from real publishers' own RSS feeds (see backend CareerNews/Endpoint.cs) —
// replaces a prior version that had GPT-4o-mini invent headlines and attribute them to real
// outlets (BBC News, LinkedIn Economic Graph, etc.), discovered live 2026-09-10 when the same
// four fabricated headlines had sat there unchanged for weeks.
async function fetchCareerNews(jobTitle?: string): Promise<NewsItem[]> {
  try {
    const qs = jobTitle ? `?jobTitle=${encodeURIComponent(jobTitle)}` : "";
    const res = await fetch(`${API_BASE}/api/career-news${qs}`);
    if (!res.ok) return [];
    const data = await res.json() as { news: Array<{ tag: string; headline: string; source: string; url: string; publishedAt: string }> };
    return data.news.map((item, i) => ({ ...item, color: NEWS_COLORS[i % NEWS_COLORS.length] }));
  } catch {
    return [];
  }
}

// Priority (Francis, 2026-09-10): most recent interview's job title > their profile's own
// job title > "Student" if that's their life stage > nothing (generic mix). Field-of-study
// isn't captured anywhere in onboarding yet ("we'll build better intelligence into onboarding
// to make this easier, later") — Student alone is the best available signal until then.
// Previously this dashboard sent user.role (an account PERMISSION role, e.g. "Admin") as the
// personalisation signal, which never made sense — this replaces that with real signals.
async function resolvePersonalizationTitle(token: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${API_BASE}/api/interviews`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const interviews = await res.json() as Array<{ role?: string | null }>;
      const mostRecentRole = interviews[0]?.role; // backend already returns newest-first
      if (mostRecentRole) return mostRecentRole;
    }
  } catch { /* fall through to profile */ }

  try {
    const profile = await profileApi.getProfile(token);
    if (profile.jobTitle) return profile.jobTitle;
    if (profile.jobRole) return profile.jobRole;
    if (profile.lifeStage?.toLowerCase().includes("student")) return "Student";
  } catch { /* fall through to generic mix */ }

  return undefined;
}

async function fetchFeaturedStats(): Promise<FeaturedStat[]> {
  try {
    const res = await fetch(`${API_BASE}/api/platform-stats`);
    if (!res.ok) return [];
    const data = await res.json() as { stats: FeaturedStat[] };
    return data.stats ?? [];
  } catch {
    return [];
  }
}

// Real RSS business/startup news for the "Startup & Business Pulse" card — same architecture
// as fetchCareerNews above (see backend CareerNews/Endpoint.cs's /api/business-news route),
// kept in its own feed "section" so it never mixes into Career Intelligence.
async function fetchBusinessNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/business-news`);
    if (!res.ok) return [];
    const data = await res.json() as { news: Array<{ tag: string; headline: string; source: string; url: string; publishedAt: string }> };
    return data.news.map((item, i) => ({ ...item, color: NEWS_COLORS[i % NEWS_COLORS.length] }));
  } catch {
    return [];
  }
}

/* ── Sub-components ──────────────────────────────────────────── */

function LiveStatCard({ card, onClick }: { card: LiveCard; onClick: () => void }) {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % card.slides.length); setVisible(true); }, 280);
    }, card.interval);
    return () => clearInterval(t);
  }, [card.interval, card.slides.length]);

  const slide = card.slides[idx];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: card.bg, border: `1px solid ${hovered ? card.color : card.border}`, borderRadius: 14,
        padding: "20px 22px 16px", position: "relative", overflow: "hidden", minHeight: 110,
        boxShadow: hovered
          ? `0 6px 28px rgba(${card.shadow},0.28), 0 1px 4px rgba(0,0,0,0.4)`
          : `0 4px 24px rgba(${card.shadow},0.18), 0 1px 4px rgba(0,0,0,0.4)`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
        userSelect: "none", WebkitUserSelect: "none", cursor: "pointer",
      }}
    >
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.28s ease, transform 0.28s ease",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: card.color, marginBottom: 10 }}>{slide.label}</div>
        <div style={{
          fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.15,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{slide.value}</div>
        <div style={{
          fontSize: 11, color: "var(--text-3)", marginTop: 6, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{slide.change}</div>
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

const CARD_TITLES = ["💜 Your Profile Buzz", "🌍 What Candidates Are Doing", "📚 What People Are Studying", "🚀 Startup & Business Pulse", "✨ Career & Life Wisdom"];

// The "immersive detail" behind each of the five stat cards — same real data the rotating
// slides are built from (buildLiveStats), just shown in full rather than one slide at a time.
function CardDetailModal({ cardIndex, onClose, engagement, roleActivity, topSubjects, candidateTitle, learnTopics, businessNews, featuredStats, navigate }: {
  cardIndex: number;
  onClose: () => void;
  engagement: ProfileEngagement | null;
  roleActivity: RoleActivity[];
  topSubjects: InDemandSubject[];
  candidateTitle: string | undefined;
  learnTopics: LearnTopicStat[];
  businessNews: NewsItem[];
  featuredStats: FeaturedStat[];
  navigate: (path: string, opts?: { state?: unknown }) => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,6,12,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 40,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(640px, 100%)", maxHeight: "85vh", overflow: "auto",
          background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{
          position: "sticky", top: 0, background: "var(--bg2)", zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{CARD_TITLES[cardIndex]}</div>
          <button onClick={onClose} title="Close (Esc)" style={{
            width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-2)", cursor: "pointer",
          }}>✕</button>
        </div>

        <div style={{ padding: "20px 22px 26px" }}>
          {cardIndex === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "Profile Views", value: engagement?.profileViews ?? 0, color: "#34D399" },
                  { label: "Profile Likes", value: engagement?.likes ?? 0, color: "#F472B6" },
                  { label: "Interview Views", value: engagement?.interviewViews ?? 0, color: "#4F8EF7" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.7 }}>
                Every number here is real — genuine views on your profile, real likes from other candidates, and real opens on the interviews you've shared. Keep your profile complete and your best interview shared to grow all three.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { onClose(); navigate("/dashboard?tab=profile"); }} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 12.5, cursor: "pointer", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", color: "#fff", fontFamily: "inherit" }}>View My Profile</button>
                <button onClick={() => { onClose(); navigate("/dashboard?tab=interviews"); }} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "var(--text)", fontFamily: "inherit" }}>Share an Interview</button>
              </div>
            </div>
          )}

          {cardIndex === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <ModalSection title="Most Active Roles Right Now" empty={roleActivity.length === 0} emptyText="Not enough activity logged yet — check back soon.">
                {roleActivity.slice(0, 6).map(r => (
                  <ModalRow key={r.jobTitle} label={titleCase(r.jobTitle)} value={`${r.count} interviewing`} />
                ))}
              </ModalSection>
              <ModalSection title={candidateTitle ? `Most-Kept Focus Topics for ${candidateTitle}` : "Most-Kept Focus Topics"} empty={topSubjects.length === 0} emptyText="No Special Focus data for your role yet.">
                {topSubjects.slice(0, 6).map(s => (
                  <ModalRow key={s.subject} label={titleCase(s.subject)} value={`kept ${s.keptCount}×`} />
                ))}
              </ModalSection>
            </div>
          )}

          {cardIndex === 2 && (
            <ModalSection title="Most Studied Topics" empty={learnTopics.length === 0} emptyText="Not enough Learn activity logged yet.">
              {learnTopics.slice(0, 8).map(t => (
                <div key={t.topic} onClick={() => { onClose(); navigate("/dashboard?tab=learn", { state: { studyTopic: titleCase(t.topic) } }); }} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  padding: "10px 4px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                }}>
                  <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{titleCase(t.topic)}</span>
                  <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{t.count} studying →</span>
                </div>
              ))}
            </ModalSection>
          )}

          {cardIndex === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {businessNews.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Couldn't reach the business feeds right now — check back shortly.</div>}
              {businessNews.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", paddingBottom: 14, textDecoration: "none",
                  borderBottom: i < businessNews.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: n.color, background: `${n.color}18`, padding: "2px 8px", borderRadius: 20 }}>{n.tag}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{timeAgoFrom(n.publishedAt)}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>{n.source}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5, fontWeight: 600 }}>{n.headline}</div>
                </a>
              ))}
            </div>
          )}

          {cardIndex === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {featuredStats.map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#A78BFA" }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{s.label}</div>
                  </div>
                  {s.sourceLabel && (
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {s.sourceUrl ? <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-3)" }}>{s.sourceLabel}</a> : s.sourceLabel}
                    </div>
                  )}
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>Words to Carry With You</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {QUOTES.map(q => (
                    <div key={q.text} style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, fontStyle: "italic" }}>
                      "{q.text}" <span style={{ color: "var(--text-3)", fontStyle: "normal" }}>— {q.author}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalSection({ title, empty, emptyText, children }: { title: string; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>{title}</div>
      {empty ? <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{emptyText}</div> : <div>{children}</div>}
    </div>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 4px", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{value}</span>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const user     = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);
  const logout   = useAuthStore(s => s.logout);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeNav = NAV_ITEMS.find(n => n.slug === searchParams.get("tab"))?.label ?? "Dashboard";
  // Set when arriving from InterviewSummaryPage's "Study {topic}" buttons, so Learn opens
  // straight into the weak area that sent the candidate here.
  const studyTopic = (location.state as { studyTopic?: string } | null)?.studyTopic;
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [news,          setNews]          = useState<NewsItem[]>([]);
  const [newsReady,     setNewsReady]     = useState(false);
  const [featuredStats, setFeaturedStats] = useState<FeaturedStat[]>([]);
  const featuredStat = featuredStats[0] ?? null;
  const [marketCountry, setMarketCountry] = useState<'uk' | 'us'>(guessMarketCountry);
  const [market,        setMarket]        = useState<MarketOverview | null>(null);
  const [marketReady,   setMarketReady]   = useState(false);
  const [marketTab,     setMarketTab]     = useState<'inDemand' | 'emerging'>('inDemand');
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement>(null);

  // Real data for the five dashboard stat cards (see buildLiveStats's own comment).
  const [candidateTitle, setCandidateTitle] = useState<string | undefined>(undefined);
  const [engagement,   setEngagement]   = useState<ProfileEngagement | null>(null);
  const [roleActivity, setRoleActivity] = useState<RoleActivity[]>([]);
  const [topSubjects,  setTopSubjects]  = useState<InDemandSubject[]>([]);
  const [learnTopics,  setLearnTopics]  = useState<LearnTopicStat[]>([]);
  const [businessNews, setBusinessNews] = useState<NewsItem[]>([]);
  const [openCard,     setOpenCard]     = useState<number | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<RecentInterview[] | null>(null);

  useEffect(() => {
    if (!countryMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (countryMenuRef.current && !countryMenuRef.current.contains(e.target as Node)) {
        setCountryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [countryMenuOpen]);

  const firstName = user?.firstName ?? user?.name?.split(" ")[0] ?? "there";
  const role      = user?.role ?? "Candidate";
  const initials  = (user?.name ?? "C").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const quote      = QUOTES[new Date().getDay() % QUOTES.length];
  const profileDone = PROFILE_ITEMS.filter(p => p.done).length;
  const profilePct  = Math.round((profileDone / PROFILE_ITEMS.length) * 100);

  useEffect(() => {
    (async () => {
      const personalizationTitle = authToken ? await resolvePersonalizationTitle(authToken) : undefined;
      setCandidateTitle(personalizationTitle);
      const items = await fetchCareerNews(personalizationTitle);
      setNews(items);
      setNewsReady(true);
    })();
    fetchFeaturedStats().then(setFeaturedStats);
    fetchBusinessNews().then(setBusinessNews);
    getRoleActivity().then(setRoleActivity).catch(() => setRoleActivity([]));
    getTopLearnTopics().then(setLearnTopics).catch(() => setLearnTopics([]));
    if (authToken) getProfileEngagement(authToken).then(setEngagement).catch(() => {});
    if (authToken) {
      fetch(`${API_BASE}/api/interviews`, { headers: { Authorization: `Bearer ${authToken}` } })
        .then(res => res.ok ? res.json() as Promise<RecentInterview[]> : Promise.reject())
        .then(items => setRecentInterviews(items.slice(0, 4)))
        .catch(() => setRecentInterviews([]));
    }
  }, [authToken]);

  useEffect(() => {
    setMarketReady(false);
    getMarketOverview(marketCountry, 10).then(data => { setMarket(data); setMarketReady(true); });
  }, [marketCountry]);

  // Card 2's "Top Requested Focus" slide — the real, previously-unwired in-demand-subjects
  // data (see buildLiveStats's own comment), scoped to this candidate's own role once resolved.
  useEffect(() => {
    if (!candidateTitle) return;
    getInDemandSubjects(candidateTitle).then(setTopSubjects).catch(() => setTopSubjects([]));
  }, [candidateTitle]);

  const liveStats = buildLiveStats({
    engagement,
    roleActivity,
    topSubjects,
    topRole: market?.inDemand?.[0]?.title ?? null,
    learnTopics,
    businessNews,
    featuredStats,
  });

  async function handleLogout() {
    await logout();
    // The neutral gate, not this portal's own /login — signing out shouldn't land you back
    // on a page that assumes you're a candidate, same reasoning as the theinterviewchair.com work.
    window.location.href = "https://www.theinterviewchair.com/login";
  }

  function navTo(label: string) {
    const item = NAV_ITEMS.find(n => n.label === label);
    setSearchParams(item?.slug ? { tab: item.slug } : {});
  }

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "var(--bg2)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#34D399,#047857)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>TIC</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em", color: "#ffffff", lineHeight: 1.2 }}>
              <span style={{ color: "#34D399" }}>The</span>Interview<span style={{ color: "#34D399" }}>Chair</span><span style={{ color: "rgba(255,255,255,0.55)" }}>.com</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 3 }}>
              Candidate Portal
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(({ Icon, label }) => {
            const active = activeNav === label;
            const hovered = hoveredNav === label;
            return (
              <button
                key={label}
                onClick={() => navTo(label)}
                onMouseEnter={() => setHoveredNav(label)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, border: "none",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  background: active ? "rgba(52,211,153,0.12)" : hovered ? "rgba(255,255,255,0.06)" : "transparent",
                  color: active ? "#34D399" : hovered ? "var(--text)" : "var(--text-2)",
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  transform: hovered && !active ? "translateX(3px)" : "translateX(0)",
                  boxShadow: hovered && !active ? "0 0 0 1px rgba(255,255,255,0.06)" : "none",
                  transition: "background 0.15s, color 0.15s, transform 0.15s, box-shadow 0.15s",
                  fontFamily: "inherit",
                }}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : hovered ? 2 : 1.8} />
                {label}
              </button>
            );
          })}
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
          {/* Quick actions only make sense on the Dashboard home view — every other panel
              (Learn, Careers, My Interviews, etc.) has its own contextual primary action,
              so showing these here too would just duplicate it. */}
          {activeNav === "Dashboard" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate("/interview-pack/start", { state: { preferredName: firstName } })}
                style={{
                  padding: "9px 18px", background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 4px 14px rgba(167,139,250,0.35)",
                }}
              >
                🎙️ Practice Interview
              </button>
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
          )}
        </div>

        {/* ── PANEL OVERRIDES ── */}
        {activeNav === "My Career Coach" && <CareerCoachPanel />}
        {activeNav === "Learn"          && <LearnPanel initialTopic={studyTopic} />}
        {activeNav === "Careers"        && <CareersPanel />}
        {activeNav === "My Interviews"  && <MyInterviewsPage />}
        {activeNav === "Interview Preps" && <ReceivedPreps />}
        {activeNav === "My Profile"     && <ProfilePage />}
        {activeNav === "Jobs"           && <JobsHome />}
        {activeNav === "Messages"       && <MessagesPage />}
        {activeNav === "Demo"           && <DemoPanel />}
        {activeNav === "Settings"       && <SettingsPage />}

        {!["My Career Coach", "Learn", "Careers", "My Interviews", "Interview Preps", "My Profile", "Jobs", "Messages", "Demo", "Settings"].includes(activeNav) && <>

        {/* ── STATS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
          {liveStats.map((s, i) => <LiveStatCard key={i} card={s} onClick={() => setOpenCard(i)} />)}
        </div>
        {openCard !== null && (
          <CardDetailModal
            cardIndex={openCard}
            onClose={() => setOpenCard(null)}
            engagement={engagement}
            roleActivity={roleActivity}
            topSubjects={topSubjects}
            candidateTitle={candidateTitle}
            learnTopics={learnTopics}
            businessNews={businessNews}
            featuredStats={featuredStats}
            navigate={navigate}
          />
        )}

        {/* ── TWO-COL LAYOUT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Live Job Market — real top careers by demand score and by 5-year growth, from
                the same careers-agent database the Careers module uses (Francis, 2026-09-10:
                "similar to our Careers module, but condensed"). Sits above Career
                Intelligence per Francis's own placement. Only UK/US have real data behind
                them — see careers-agent's own comment on why a full country list isn't
                possible yet; the dropdown is honestly scoped to just those two. */}
            <DashCard title="📊 Live Job Market" action="Explore jobs" onAction={() => navigate("/jobs")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3 }}>
                  {(["inDemand", "emerging"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setMarketTab(tab)}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                        fontFamily: "inherit", background: marketTab === tab ? "rgba(52,211,153,0.15)" : "transparent",
                        color: marketTab === tab ? "#34D399" : "var(--text-3)",
                      }}
                    >
                      {tab === "inDemand" ? "In Demand" : "Emerging"}
                    </button>
                  ))}
                </div>
                <div ref={countryMenuRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setCountryMenuOpen(o => !o)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 11, fontWeight: 700, color: "var(--text-2)", background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    {marketCountry === "uk" ? "🇬🇧 UK" : "🇺🇸 US"}
                    <ChevronDown size={12} style={{ opacity: 0.6, transform: countryMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                  {countryMenuOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20, minWidth: 100,
                      background: "var(--bg3, #111827)", border: "1px solid var(--border)", borderRadius: 8,
                      padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}>
                      {([["uk", "🇬🇧 UK"], ["us", "🇺🇸 US"]] as const).map(([code, label]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => { setMarketCountry(code); setCountryMenuOpen(false); }}
                          style={{
                            display: "block", width: "100%", textAlign: "left", fontFamily: "inherit",
                            fontSize: 11, fontWeight: 700, padding: "6px 8px", borderRadius: 5, border: "none",
                            cursor: "pointer", color: marketCountry === code ? "#34D399" : "var(--text-2)",
                            background: marketCountry === code ? "rgba(52,211,153,0.12)" : "transparent",
                          }}
                          onMouseEnter={e => { if (marketCountry !== code) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                          onMouseLeave={e => { if (marketCountry !== code) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!marketReady ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 40, borderRadius: 8, background: "rgba(255,255,255,0.04)", animation: "pulse 1.6s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : !market || market[marketTab].length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-3)", fontSize: 13 }}>
                  Couldn't reach live market data right now — check back shortly.
                </div>
              ) : (
                // Fixed height ≈ 5 rows, scrollable for the rest — keeps the card the same
                // height at top 10 as it was at top 5 (Francis, 2026-09-10).
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 250, overflowY: "auto", paddingRight: 4 }}>
                  {market[marketTab].map((c, i) => {
                    // futureScore, not demand.uk/demand.us — those turned out to be
                    // inconsistently scaled across records once checked against real data
                    // (e.g. 2500 vs 92, clearly not the same 0-100 scale), while futureScore
                    // is reliably 0-100 everywhere checked. See careers-agent's own comment.
                    const demand = c.demand?.futureScore ?? 0;
                    const growth = c.workforce?.[marketCountry]?.growthPct5yr ?? 0;
                    const salary = c.salary?.[marketCountry];
                    // Direct growth%, capped at 100 — NOT growth*2.5 (the previous formula),
                    // which saturated the bar at 100 for any growth above 40%. Every real
                    // "Emerging" role clears that easily (80%+ is typical), so every bar
                    // rendered visually identical regardless of the real spread between them
                    // — caught live: "It's interesting that they're all 100%".
                    const barValue = marketTab === "inDemand" ? demand : Math.min(100, Math.round(growth));
                    return (
                      <div key={c.id ?? i}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{c.title}</span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                            {salary && salary.starting > 0 && (
                              <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                                {salary.currency === "GBP" ? "£" : salary.currency === "USD" ? "$" : ""}{fmtSalaryK(salary.starting)}–{fmtSalaryK(salary.senior)}
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: growth >= 0 ? "#2F6FE4" : "#EF4444", fontWeight: 700 }}>
                              {growth > 0 ? "+" : ""}{growth}%
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: demand >= 80 ? "#2F6FE4" : demand >= 65 ? "#F59E0B" : "#EF4444" }}>{demand}%</span>
                          </div>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${barValue}%`, borderRadius: 3,
                            background: demand >= 80
                              ? "linear-gradient(90deg,#2F6FE4,#60A5FA)"
                              : demand >= 65
                                ? "linear-gradient(90deg,#F59E0B,#fcd34d)"
                                : "linear-gradient(90deg,#EF4444,#f87171)",
                            transition: "width 1s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashCard>

            {/* Today's Career Intelligence — real articles from real publishers' own RSS
                feeds (see fetchCareerNews's own comment for why this replaced an AI that
                was inventing headlines). Featured stat banner up top is the same live data
                shown on the marketing site — one shared source, so a number updated once by
                an admin updates it everywhere at once. */}
            <DashCard title="📰 Today's Career Intelligence" action={newsReady ? "More" : undefined}>
              {featuredStat && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 16,
                  background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12,
                }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#A78BFA", letterSpacing: "-0.02em", flexShrink: 0 }}>{featuredStat.value}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4, fontWeight: 600 }}>{featuredStat.label}</div>
                    {featuredStat.sourceLabel && (
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>
                        {featuredStat.sourceUrl ? (
                          <a href={featuredStat.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-3)" }}>{featuredStat.sourceLabel}</a>
                        ) : featuredStat.sourceLabel}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!newsReady ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ height: 52, borderRadius: 8, background: "rgba(255,255,255,0.04)", animation: "pulse 1.6s ease-in-out infinite" }} />
                  ))}
                  <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
                </div>
              ) : news.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-3)", fontSize: 13 }}>
                  Couldn't reach the news feeds right now — check back shortly.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {news.map((n, i) => (
                    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                      display: "block", paddingBottom: 14, textDecoration: "none",
                      borderBottom: i < news.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: n.color, background: `${n.color}18`, padding: "2px 8px", borderRadius: 20 }}>{n.tag}</span>
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{timeAgoFrom(n.publishedAt)}</span>
                        <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>{n.source}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, fontWeight: 600 }}>{n.headline}</div>
                    </a>
                  ))}
                </div>
              )}
            </DashCard>

            {/* Recent Interviews — real completed interviews, replaces a previous hardcoded
                "Upcoming Interviews" list (fake companies/interviewers/dates); this app has no
                real interview-scheduling system, so the real, useful equivalent is your own
                actual interview history with real scores. */}
            <DashCard title="🎬 Recent Interviews" action="View all" onAction={() => navigate("/interviews")}>
              {recentInterviews === null ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>Loading…</div>
              ) : recentInterviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
                  No interviews yet — your first one is a great place to start.
                  <br />
                  <button onClick={() => navigate("/interview-pack/start", { state: { preferredName: firstName } })} style={{ marginTop: 10, color: "#34D399", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                    Start a practice interview →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {recentInterviews.map(iv => (
                    <div
                      key={iv.id}
                      onClick={() => navigate(`/interview-summary/${iv.id}`)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)",
                        userSelect: "none", WebkitUserSelect: "none",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{iv.company || "Practice Interview"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{iv.role || "General"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: interviewScoreColor(iv.overallScore) }}>{Math.round(iv.overallScore)}%</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{fmtInterviewDate(iv.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        </>}
      </main>
    </div>
  );
}

