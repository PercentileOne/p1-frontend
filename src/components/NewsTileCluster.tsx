import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Cloud, CloudRain, Wind, Thermometer,
  Globe, TrendingUp, Trophy, Cpu,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   P1 NEWS TILE CLUSTER
   ══════════════════════════════════════════════════════════════ */

// ── Shared tile animation engine ─────────────────────────────

const NEWS_ANIMS = [
  { initial: { opacity: 0 },                     exit: { opacity: 0 } },
  { initial: { opacity: 0, scale: 0.96 },        exit: { opacity: 0, scale: 1.04 } },
  { initial: { opacity: 0, y: 22 },              exit: { opacity: 0, y: -22 } },
  { initial: { opacity: 0, y: -18 },             exit: { opacity: 0, y: 18 } },
  { initial: { opacity: 0, x: 24, scale: 0.98 }, exit: { opacity: 0, x: -24, scale: 0.98 } },
  { initial: { opacity: 0, x: -20 },             exit: { opacity: 0, x: 20 } },
];

function NewsTile({
  children,
  bg,
  border,
  shadow,
  height = 160,
  intervalMin = 25000,
  intervalMax = 50000,
}: {
  children: React.ReactNode[];
  bg: string;
  border: string;
  shadow: string;
  height?: number;
  intervalMin?: number;
  intervalMax?: number;
}) {
  const [faceIdx, setFaceIdx] = useState(0);
  const animRef  = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = intervalMin + Math.random() * (intervalMax - intervalMin);
      timerRef.current = setTimeout(() => {
        animRef.current = Math.floor(Math.random() * NEWS_ANIMS.length);
        setFaceIdx((prev) => {
          let next = Math.floor(Math.random() * children.length);
          while (next === prev && children.length > 1) {
            next = Math.floor(Math.random() * children.length);
          }
          return next;
        });
        schedule();
      }, delay);
    };
    // per-tile jitter: 1.5–7s so tiles desync immediately
    timerRef.current = setTimeout(schedule, Math.random() * 5500 + 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const anim = NEWS_ANIMS[animRef.current];

  return (
    <div
      className="relative flex-1 min-w-0 rounded-2xl overflow-hidden"
      style={{ height, background: bg, border: `1px solid ${border}`, boxShadow: shadow }}
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={faceIdx}
          initial={anim.initial}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={anim.exit}
          transition={{ duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {children[faceIdx]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Helper UI atoms ───────────────────────────────────────────

function TileLabel({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest"
      style={{ color }}
    >
      {text}
    </span>
  );
}

function TileHeadline({ text, color = "rgba(255,255,255,0.92)", size = "text-[13px]" }: {
  text: string; color?: string; size?: string;
}) {
  return (
    <p className={`${size} font-bold leading-snug line-clamp-3`} style={{ color }}>
      {text}
    </p>
  );
}

function TileBody({ text, color = "rgba(148,163,184,0.75)" }: { text: string; color?: string }) {
  return (
    <p className="text-[10px] leading-relaxed mt-1.5 line-clamp-3" style={{ color }}>
      {text}
    </p>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WEATHER TILE FACES
// ══════════════════════════════════════════════════════════════

const WEATHER_BG   = "linear-gradient(150deg, #0a1628 0%, #0e2040 50%, #112244 100%)";
const WEATHER_BDR  = "rgba(56,189,248,0.22)";
const WEATHER_SHD  = "0 14px 44px rgba(0,0,0,0.65), 0 1px 0 rgba(56,189,248,0.15) inset, 0 -1px 0 rgba(0,0,0,0.4) inset";
const W_LABEL      = "#38bdf8";
const W_TEXT       = "rgba(255,255,255,0.9)";
const W_SUB        = "rgba(147,197,253,0.65)";

const WeatherFaces: React.ReactNode[] = [
  /* F0 — current conditions */
  <div key="w0" className="h-full flex flex-col px-4 py-4 justify-between">
    <TileLabel text="Weather · Colchester" color={W_LABEL} />
    <div className="flex flex-col items-center justify-center flex-1 gap-1">
      <Sun size={32} className="text-amber-300 drop-shadow-lg" />
      <span className="text-4xl font-black text-white leading-none mt-1">21°</span>
      <span className="text-[11px] font-semibold" style={{ color: W_SUB }}>Sunny spells</span>
    </div>
    <div className="flex justify-between text-[10px]" style={{ color: W_SUB }}>
      <span>H: 23°</span><span>L: 14°</span><span>Humidity: 52%</span>
    </div>
  </div>,

  /* F1 — hourly trend */
  <div key="w1" className="h-full flex flex-col px-4 py-4 gap-2">
    <TileLabel text="Hourly Trend" color={W_LABEL} />
    <div className="flex-1 flex items-end gap-1.5 pb-1">
      {[
        { h: "8am",  t: 16, icon: <Sun size={8} className="text-amber-300" /> },
        { h: "10am", t: 18, icon: <Sun size={8} className="text-amber-300" /> },
        { h: "12pm", t: 21, icon: <Sun size={8} className="text-amber-300" /> },
        { h: "2pm",  t: 22, icon: <Sun size={8} className="text-amber-300" /> },
        { h: "4pm",  t: 20, icon: <Cloud size={8} className="text-slate-400" /> },
        { h: "6pm",  t: 18, icon: <Cloud size={8} className="text-slate-400" /> },
        { h: "8pm",  t: 15, icon: <Cloud size={8} className="text-slate-400" /> },
      ].map(({ h, t, icon }) => (
        <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-bold" style={{ color: W_TEXT }}>{t}°</span>
          {icon}
          <div
            className="w-full rounded-t-sm"
            style={{ height: `${(t - 12) * 5}px`, background: "rgba(56,189,248,0.35)" }}
          />
          <span className="text-[8px]" style={{ color: W_SUB }}>{h}</span>
        </div>
      ))}
    </div>
  </div>,

  /* F2 — tomorrow forecast */
  <div key="w2" className="h-full flex flex-col px-4 py-4 justify-between">
    <TileLabel text="Tomorrow" color={W_LABEL} />
    <div className="flex flex-col items-center justify-center flex-1 gap-2">
      <Cloud size={28} className="text-slate-300" />
      <span className="text-3xl font-black text-white">18°</span>
      <span className="text-[11px] font-semibold" style={{ color: W_SUB }}>Partly cloudy</span>
      <span className="text-[10px]" style={{ color: W_SUB }}>Light SW breeze · UV 4</span>
    </div>
    <div className="flex justify-between text-[10px]" style={{ color: W_SUB }}>
      <span>H: 19°</span><span>L: 12°</span><span>Wind: 14 km/h</span>
    </div>
  </div>,

  /* F3 — feels like + mood */
  <div key="w3" className="h-full flex flex-col px-4 py-4 justify-between">
    <TileLabel text="Feels Like" color={W_LABEL} />
    <div className="flex flex-col items-center justify-center flex-1 gap-2">
      <Thermometer size={26} className="text-sky-300" />
      <span className="text-3xl font-black text-white">19°</span>
      <span className="text-[12px] font-semibold text-center leading-snug" style={{ color: W_TEXT }}>
        Comfortable & clear
      </span>
      <span className="text-[10px]" style={{ color: W_SUB }}>A great day to work outside</span>
    </div>
    <div className="flex items-center gap-1.5">
      <Wind size={10} className="text-sky-400" />
      <span className="text-[10px]" style={{ color: W_SUB }}>Gentle breeze from the west</span>
    </div>
  </div>,

  /* F4 — weekend outlook */
  <div key="w4" className="h-full flex flex-col px-4 py-4 gap-2">
    <TileLabel text="Weekend Outlook" color={W_LABEL} />
    <div className="flex flex-col gap-3 flex-1 justify-center">
      {[
        { day: "Saturday", icon: <CloudRain size={14} className="text-slate-400" />, temp: "14°", desc: "Rain, heavy at times" },
        { day: "Sunday",   icon: <Cloud size={14} className="text-slate-300" />,     temp: "16°", desc: "Clearing, dry by noon" },
      ].map(({ day, icon, temp, desc }) => (
        <div key={day} className="flex items-center gap-3">
          {icon}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold" style={{ color: W_TEXT }}>{day}</p>
            <p className="text-[10px]" style={{ color: W_SUB }}>{desc}</p>
          </div>
          <span className="text-[13px] font-black text-white">{temp}</span>
        </div>
      ))}
    </div>
  </div>,
];

// ══════════════════════════════════════════════════════════════
// WORLD NEWS TILE FACES
// ══════════════════════════════════════════════════════════════

const WORLD_BG  = "linear-gradient(150deg, #0c0c0c 0%, #141414 55%, #1a1a1a 100%)";
const WORLD_BDR = "rgba(209,213,219,0.14)";
const WORLD_SHD = "0 14px 44px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(0,0,0,0.5) inset";
const WN_LABEL  = "#9ca3af";
const WN_TEXT   = "rgba(255,255,255,0.93)";
const WN_SUB    = "rgba(156,163,175,0.7)";
const WN_ACC    = "#e5e7eb";

const WorldNewsFaces: React.ReactNode[] = [
  /* F0 — top headline */
  <div key="n0" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Globe size={10} style={{ color: WN_LABEL }} />
      <TileLabel text="World" color={WN_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="G7 leaders agree on new digital trade framework in Rome summit"
        color={WN_TEXT}
        size="text-[14px]"
      />
      <TileBody
        text="A landmark deal reshaping cross-border data flows between 40+ nations is expected to boost digital commerce by €2.4 trillion over five years."
        color={WN_SUB}
      />
    </div>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.07]" style={{ color: WN_ACC }}>
        Breaking
      </span>
      <span className="text-[9px]" style={{ color: WN_SUB }}>2 hours ago</span>
    </div>
  </div>,

  /* F1 — second headline */
  <div key="n1" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Globe size={10} style={{ color: WN_LABEL }} />
      <TileLabel text="Economy" color={WN_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="IMF upgrades global growth forecast to 3.4% for 2026"
        color={WN_TEXT}
        size="text-[14px]"
      />
      <TileBody
        text="Revised upward from 3.1%, driven by resilient US consumer spending and a recovery in emerging markets, particularly India and Southeast Asia."
        color={WN_SUB}
      />
    </div>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.07]" style={{ color: WN_ACC }}>
        Economy
      </span>
      <span className="text-[9px]" style={{ color: WN_SUB }}>5 hours ago</span>
    </div>
  </div>,

  /* F2 — climate story */
  <div key="n2" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Globe size={10} style={{ color: WN_LABEL }} />
      <TileLabel text="Climate" color={WN_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="Renewables now cheaper than fossil fuels in 94 countries"
        color={WN_TEXT}
        size="text-[14px]"
      />
      <TileBody
        text="UN climate report: solar + wind LCOE has dropped 89% in a decade. Nations accelerating coal retirement ahead of 2030 targets."
        color={WN_SUB}
      />
    </div>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.07]" style={{ color: WN_ACC }}>
        Climate
      </span>
      <span className="text-[9px]" style={{ color: WN_SUB }}>Today</span>
    </div>
  </div>,

  /* F3 — "what matters today" */
  <div key="n3" className="h-full flex flex-col px-4 py-4 gap-2">
    <div className="flex items-center gap-1.5">
      <Globe size={10} style={{ color: WN_LABEL }} />
      <TileLabel text="What Matters Today" color={WN_LABEL} />
    </div>
    <div className="flex flex-col gap-2.5 flex-1 justify-center">
      {[
        { dot: "#60a5fa", text: "G7 digital trade deal signed in Rome" },
        { dot: "#34d399", text: "IMF raises global growth to 3.4%" },
        { dot: "#facc15", text: "94 countries: renewables beat fossil fuels" },
      ].map(({ dot, text }) => (
        <div key={text} className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: dot }} />
          <p className="text-[11px] font-semibold leading-snug" style={{ color: WN_TEXT }}>{text}</p>
        </div>
      ))}
    </div>
  </div>,
];

// ══════════════════════════════════════════════════════════════
// SPORT TILE FACES
// ══════════════════════════════════════════════════════════════

const SPORT_BG  = "linear-gradient(150deg, #0a1a0a 0%, #0e220e 55%, #102010 100%)";
const SPORT_BDR = "rgba(74,222,128,0.22)";
const SPORT_SHD = "0 14px 44px rgba(0,0,0,0.65), 0 1px 0 rgba(74,222,128,0.14) inset, 0 -1px 0 rgba(0,0,0,0.4) inset";
const SP_LABEL  = "#4ade80";
const SP_TEXT   = "rgba(255,255,255,0.92)";
const SP_SUB    = "rgba(134,239,172,0.6)";

const SportFaces: React.ReactNode[] = [
  /* F0 — latest result */
  <div key="s0" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Trophy size={10} style={{ color: SP_LABEL }} />
      <TileLabel text="Latest Result" color={SP_LABEL} />
    </div>
    <div className="flex flex-col items-center justify-center flex-1 gap-1">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
          <span className="text-[10px] font-bold" style={{ color: SP_TEXT }}>England</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-3xl font-black text-white">2–1</span>
          <span className="text-[9px]" style={{ color: SP_SUB }}>FT · Nations League</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🇫🇷</span>
          <span className="text-[10px] font-bold" style={{ color: SP_TEXT }}>France</span>
        </div>
      </div>
    </div>
    <p className="text-[10px] text-center" style={{ color: SP_SUB }}>Wembley Stadium · 16 Jun 2026</p>
  </div>,

  /* F1 — upcoming match */
  <div key="s1" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Trophy size={10} style={{ color: SP_LABEL }} />
      <TileLabel text="Next Match" color={SP_LABEL} />
    </div>
    <div className="flex flex-col items-center justify-center flex-1 gap-2">
      <span className="text-[11px] font-semibold" style={{ color: SP_SUB }}>Premier League</span>
      <div className="flex items-center gap-4">
        <span className="text-[12px] font-bold text-white">Arsenal</span>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold" style={{ color: SP_LABEL }}>vs</span>
          <span className="text-[9px]" style={{ color: SP_SUB }}>Sat 20 Jun</span>
        </div>
        <span className="text-[12px] font-bold text-white">Man City</span>
      </div>
      <span className="text-[10px]" style={{ color: SP_SUB }}>Emirates Stadium · 12:30 kick-off</span>
    </div>
    <div className="flex justify-between text-[9px]" style={{ color: SP_SUB }}>
      <span>Arsenal 3rd · 72 pts</span>
      <span>City 1st · 81 pts</span>
    </div>
  </div>,

  /* F2 — headline story */
  <div key="s2" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Trophy size={10} style={{ color: SP_LABEL }} />
      <TileLabel text="Sport Today" color={SP_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="Joshua confirms September comeback — opponent TBC"
        color={SP_TEXT}
        size="text-[13px]"
      />
      <TileBody
        text="Anthony Joshua is targeting a world title shot in late 2026 after a 14-month absence from the ring. Promoter Eddie Hearn expects a blockbuster announcement by end of June."
        color={SP_SUB}
      />
    </div>
  </div>,

  /* F3 — broadcast rights story */
  <div key="s3" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Trophy size={10} style={{ color: SP_LABEL }} />
      <TileLabel text="Business of Sport" color={SP_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="Premier League seals £7.8bn broadcast rights deal for 2027–30"
        color={SP_TEXT}
        size="text-[13px]"
      />
      <TileBody
        text="A record global package sees Sky, TNT Sport, and two new streaming entrants split the rights. Each club set to receive £180m+ per season."
        color={SP_SUB}
      />
    </div>
    <div className="flex items-center gap-2 mt-1">
      <TrendingUp size={10} style={{ color: SP_LABEL }} />
      <span className="text-[9px]" style={{ color: SP_SUB }}>Up 28% from the previous deal</span>
    </div>
  </div>,

  /* F4 — league snapshot */
  <div key="s4" className="h-full flex flex-col px-4 py-4 gap-2">
    <div className="flex items-center gap-1.5">
      <Trophy size={10} style={{ color: SP_LABEL }} />
      <TileLabel text="Premier League" color={SP_LABEL} />
    </div>
    <div className="flex flex-col gap-1.5 flex-1 justify-center">
      {[
        { pos: 1, team: "Man City",    pts: 81, form: "W W D W W" },
        { pos: 2, team: "Liverpool",   pts: 78, form: "W L W W D" },
        { pos: 3, team: "Arsenal",     pts: 72, form: "W W W L W" },
        { pos: 4, team: "Chelsea",     pts: 67, form: "D W L W W" },
      ].map(({ pos, team, pts, form }) => (
        <div key={team} className="flex items-center gap-2">
          <span className="text-[10px] font-bold w-3 text-center" style={{ color: SP_SUB }}>{pos}</span>
          <span className="flex-1 text-[11px] font-semibold" style={{ color: SP_TEXT }}>{team}</span>
          <span className="text-[9px]" style={{ color: SP_SUB }}>{form}</span>
          <span className="text-[11px] font-black text-white w-6 text-right">{pts}</span>
        </div>
      ))}
    </div>
  </div>,
];

// ══════════════════════════════════════════════════════════════
// INDUSTRY / TECH TILE FACES
// ══════════════════════════════════════════════════════════════

const TECH_BG  = "linear-gradient(150deg, #070d1a 0%, #0b1426 55%, #0d1830 100%)";
const TECH_BDR = "rgba(99,102,241,0.24)";
const TECH_SHD = "0 14px 44px rgba(0,0,0,0.68), 0 1px 0 rgba(99,102,241,0.16) inset, 0 -1px 0 rgba(0,0,0,0.45) inset";
const TC_LABEL = "#818cf8";
const TC_TEXT  = "rgba(255,255,255,0.92)";
const TC_SUB   = "rgba(148,163,184,0.65)";
const TC_ACC   = "#6366f1";

const TechFaces: React.ReactNode[] = [
  /* F0 — AI headline */
  <div key="t0" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Cpu size={10} style={{ color: TC_LABEL }} />
      <TileLabel text="AI" color={TC_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="Enterprise AI adoption surges 40% in Q2 2026"
        color={TC_TEXT}
        size="text-[13px]"
      />
      <TileBody
        text="Productivity tooling leads adoption. 60% of Fortune 500 firms now have dedicated AI operations teams. The bottleneck has shifted from technology to change management."
        color={TC_SUB}
      />
    </div>
    <div className="flex items-center gap-2 mt-1">
      <TrendingUp size={10} style={{ color: TC_ACC }} />
      <span className="text-[9px]" style={{ color: TC_SUB }}>+40% YoY · Source: Gartner 2026</span>
    </div>
  </div>,

  /* F1 — SaaS consolidation */
  <div key="t1" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Cpu size={10} style={{ color: TC_LABEL }} />
      <TileLabel text="SaaS" color={TC_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <TileHeadline
        text="SaaS consolidation continues — 3 major mergers this week"
        color={TC_TEXT}
        size="text-[13px]"
      />
      <TileBody
        text="Buyers are targeting profitability over growth. Multi-product platform strategies are winning. Solo-product SaaS under $10M ARR faces the hardest path to exit."
        color={TC_SUB}
      />
    </div>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${TC_ACC}20`, color: TC_LABEL }}>
        M&amp;A
      </span>
      <span className="text-[9px]" style={{ color: TC_SUB }}>3 deals · combined $2.1bn</span>
    </div>
  </div>,

  /* F2 — hiring rebound */
  <div key="t2" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Cpu size={10} style={{ color: TC_LABEL }} />
      <TileLabel text="Talent" color={TC_LABEL} />
    </div>
    <div className="flex flex-col gap-1.5 flex-1 justify-center">
      <TileHeadline
        text="Junior dev hiring rebounds — up 22% YoY"
        color={TC_TEXT}
        size="text-[13px]"
      />
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span style={{ color: TC_TEXT }}>Junior roles</span>
          <span style={{ color: TC_LABEL }}>+22%</span>
        </div>
        <ProgressBar pct={78} color={TC_ACC} />
        <div className="flex justify-between text-[10px] mb-0.5 mt-1">
          <span style={{ color: TC_TEXT }}>Senior / Staff</span>
          <span style={{ color: TC_LABEL }}>+9%</span>
        </div>
        <ProgressBar pct={45} color="#818cf8" />
      </div>
      <p className="text-[10px] mt-2" style={{ color: TC_SUB }}>AI skills premium: +34% salary uplift</p>
    </div>
  </div>,

  /* F3 — founders watching */
  <div key="t3" className="h-full flex flex-col px-4 py-4 gap-2">
    <div className="flex items-center gap-1.5">
      <Cpu size={10} style={{ color: TC_LABEL }} />
      <TileLabel text="Founders Are Watching" color={TC_LABEL} />
    </div>
    <div className="flex flex-col gap-2.5 flex-1 justify-center">
      {[
        { emoji: "🤖", text: "AI agents replacing SaaS workflows", trend: "+41%" },
        { emoji: "💰", text: "Series A valuations stabilise at 8–12× ARR", trend: "Stable" },
        { emoji: "⚡", text: "Edge computing + AI convergence accelerates", trend: "Watch" },
        { emoji: "🏗️", text: "Infra layer sees biggest VC interest in 3 years", trend: "+29%" },
      ].map(({ emoji, text, trend }) => (
        <div key={text} className="flex items-center gap-2">
          <span className="text-[13px] shrink-0">{emoji}</span>
          <p className="text-[10px] flex-1 leading-snug" style={{ color: TC_TEXT }}>{text}</p>
          <span className="text-[9px] font-bold shrink-0" style={{ color: TC_LABEL }}>{trend}</span>
        </div>
      ))}
    </div>
  </div>,

  /* F4 — market shifts */
  <div key="t4" className="h-full flex flex-col px-4 py-4 justify-between">
    <div className="flex items-center gap-1.5">
      <Cpu size={10} style={{ color: TC_LABEL }} />
      <TileLabel text="Market Shifts" color={TC_LABEL} />
    </div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      {[
        { label: "AI / LLM tooling",   pct: 87, color: "#6366f1" },
        { label: "Developer platforms", pct: 62, color: "#818cf8" },
        { label: "Vertical SaaS",       pct: 54, color: "#a5b4fc" },
        { label: "Infra & DevOps",      pct: 71, color: "#c4b5fd" },
      ].map(({ label, pct, color }) => (
        <div key={label} className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-[10px]" style={{ color: TC_TEXT }}>{label}</span>
            <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} color={color} />
        </div>
      ))}
    </div>
    <p className="text-[9px]" style={{ color: TC_SUB }}>VC sentiment index · June 2026</p>
  </div>,
];

// ══════════════════════════════════════════════════════════════
// TILE CLUSTER EXPORT
// ══════════════════════════════════════════════════════════════

export default function NewsTileCluster() {
  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={11} className="text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Live Feed
          </span>
        </div>
        <span className="text-[9px] text-slate-600 font-medium">Auto-rotating · Colchester</span>
      </div>

      {/* 4-tile row */}
      <div className="flex gap-3">
        <NewsTile
          bg={WEATHER_BG}
          border={WEATHER_BDR}
          shadow={WEATHER_SHD}
          height={165}
          intervalMin={25000}
          intervalMax={45000}
        >
          {WeatherFaces}
        </NewsTile>

        <NewsTile
          bg={WORLD_BG}
          border={WORLD_BDR}
          shadow={WORLD_SHD}
          height={165}
          intervalMin={28000}
          intervalMax={50000}
        >
          {WorldNewsFaces}
        </NewsTile>

        <NewsTile
          bg={SPORT_BG}
          border={SPORT_BDR}
          shadow={SPORT_SHD}
          height={165}
          intervalMin={30000}
          intervalMax={48000}
        >
          {SportFaces}
        </NewsTile>

        <NewsTile
          bg={TECH_BG}
          border={TECH_BDR}
          shadow={TECH_SHD}
          height={165}
          intervalMin={26000}
          intervalMax={46000}
        >
          {TechFaces}
        </NewsTile>
      </div>
    </>
  );
}
