/* ══════════════════════════════════════════════════════════════
   ReadinessView — big ring, weak/strong concepts, study plan
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import {
  Brain, TrendingUp, AlertTriangle, CheckCircle2,
  BookOpen, Flame, Target,
} from "lucide-react";
import type { ReadinessResult } from "../readinessEngine";
import type { Certification } from "../certificationsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

// ── Big readiness ring ────────────────────────────────────────────

function BigRing({ score }: { score: number }) {
  const size   = 140;
  const r      = 56;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color  = score >= 80 ? "#10b981" : score >= 55 ? "#f59e0b" : "#6366f1";
  const label  = score >= 80 ? "Ready" : score >= 55 ? "Progressing" : "Needs Work";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={9} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={11} />
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-[30px] font-black leading-none"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {score}
          </motion.span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 mt-0.5">readiness</span>
        </div>
      </div>
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
        style={{
          color,
          borderColor: color + "40",
          background:  color + "15",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Mini trend chart (mock sparkline) ────────────────────────────

function TrendSparkline({ baseScore }: { baseScore: number }) {
  const points = [
    baseScore * 0.4,
    baseScore * 0.52,
    baseScore * 0.60,
    baseScore * 0.68,
    baseScore * 0.74,
    baseScore * 0.82,
    baseScore,
  ];
  const w = 180, h = 48;
  const maxV = Math.max(...points);
  const minV = Math.min(...points);
  const range = maxV - minV || 1;

  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((v - minV) / range) * (h - 8) - 4,
  }));

  const d = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fill = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sparkFill)" />
      <motion.path
        d={d}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />
      {coords.map((p, i) => i === coords.length - 1 && (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />
      ))}
    </svg>
  );
}

// ── Section bar ───────────────────────────────────────────────────

function SectionBar({ title, score, chapterCount, testedCount }: {
  title: string; score: number; chapterCount: number; testedCount: number;
}) {
  const color = score >= 80 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-white/70 truncate">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <SectionLabel className="text-white/20">{testedCount}/{chapterCount} tested</SectionLabel>
          <span className="text-[10px] font-bold" style={{ color }}>{score}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

interface Props {
  cert:     Certification;
  result:   ReadinessResult;
  onStudy?: (cardId: string) => void;
}

export default function ReadinessView({ result }: Props) {
  const {
    readinessScore, weakConcepts, strongConcepts,
    recommendedChapters, predictedExamScore, sectionScores,
    totalConcepts, testedConcepts, masteredConcepts,
  } = result;

  return (
    <div className="flex flex-col gap-5">

      {/* Hero: big ring + stats */}
      <div
        className="relative flex flex-col items-center gap-4 p-5 rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 70%)" }}
      >
        <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-50" />
        <BigRing score={readinessScore} />

        {/* 3-stat row */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { label: "Concepts", value: String(totalConcepts),    icon: <Brain size={10} className="text-indigo-400" />,   sub: "in syllabus" },
            { label: "Tested",   value: String(testedConcepts),   icon: <Target size={10} className="text-sky-400" />,     sub: "covered" },
            { label: "Mastered", value: String(masteredConcepts), icon: <Flame  size={10} className="text-emerald-400" />, sub: "strong" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              {s.icon}
              <span className="text-[14px] font-black text-white/85">{s.value}</span>
              <SectionLabel>{s.label}</SectionLabel>
            </div>
          ))}
        </div>

        {/* Predicted exam score */}
        <div className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <TrendingUp size={12} className="text-indigo-400 shrink-0" />
          <span className="text-[11px] text-white/55">Predicted exam score:</span>
          <span className="ml-auto text-[14px] font-black text-indigo-400">{predictedExamScore}%</span>
        </div>
      </div>

      {/* Trend chart */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Readiness trend (7 sessions)</SectionLabel>
          <SectionLabel className="text-indigo-400">+{Math.round(readinessScore * 0.3)}pts</SectionLabel>
        </div>
        <TrendSparkline baseScore={readinessScore} />
      </div>

      {/* Section breakdown */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]">
        <SectionLabel>Section breakdown</SectionLabel>
        <div className="flex flex-col gap-3">
          {sectionScores.map(s => (
            <SectionBar
              key={s.sectionId}
              title={s.sectionTitle}
              score={s.score}
              chapterCount={s.chapterCount}
              testedCount={s.testedCount}
            />
          ))}
        </div>
      </div>

      {/* Weak concepts */}
      {weakConcepts.length > 0 && (
        <div className="p-4 rounded-2xl border border-red-500/15 bg-red-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={11} className="text-red-400" />
            <SectionLabel className="text-red-400/80">Weak concepts — focus here</SectionLabel>
          </div>
          <div className="flex flex-col gap-2">
            {weakConcepts.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-red-500/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <span className="text-[11px] text-white/65 leading-snug">{c.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Strong concepts */}
      {strongConcepts.length > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-500/15 bg-emerald-950/15">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <SectionLabel className="text-emerald-400/80">Strong concepts</SectionLabel>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {strongConcepts.map(c => (
              <span
                key={c.id}
                className="text-[9px] text-emerald-300/70 bg-emerald-500/10 border border-emerald-500/15 px-2 py-1 rounded-full"
              >
                {c.text.split(" ").slice(0, 6).join(" ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended study plan */}
      <div className="p-4 rounded-2xl border border-indigo-500/15 bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={11} className="text-indigo-400" />
          <SectionLabel className="text-indigo-400/80">Recommended study plan</SectionLabel>
        </div>
        <div className="flex flex-col gap-2">
          {recommendedChapters.slice(0, 4).map((ref, i) => (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-indigo-500/10"
            >
              <span className="text-[9px] font-bold text-indigo-400/50 w-4 shrink-0">{i + 1}</span>
              <span className="flex-1 text-[11px] text-white/65">{ref.title}</span>
              <span className="text-[8px] text-white/25 capitalize shrink-0">{ref.sourceType}</span>
            </motion.div>
          ))}
          {recommendedChapters.length === 0 && (
            <p className="text-[11px] text-white/30 text-center py-2">All sections on track — keep testing!</p>
          )}
        </div>
      </div>
    </div>
  );
}
