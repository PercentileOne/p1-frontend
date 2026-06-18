/* ══════════════════════════════════════════════════════════════
   CertificationsList — grid of cert tiles + Add CTA
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Plus, Trophy, Layers, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Certification } from "../certificationsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

interface Props {
  certifications: Certification[];
  onSelect:       (cert: Certification) => void;
  onAdd:          () => void;
}

function ReadinessRing({ score, size = 52 }: { score: number; size?: number }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color  = score >= 80 ? "#10b981" : score >= 55 ? "#f59e0b" : "#6366f1";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

const MOCK_SCORES: Record<string, number> = {
  "cert-aws-saa":  48,
  "cert-cfa-l1":   32,
  "cert-anatomy":  61,
};

export default function CertificationsList({ certifications, onSelect, onAdd }: Props) {
  const totalSections = certifications.reduce((s, c) => s + c.syllabus.length, 0);

  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white/90">Certifications</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Track exam readiness and earn P1 credentials</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
        >
          <Plus size={11} /> Add Custom
        </motion.button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Trophy size={12} className="text-amber-400" />,  label: "Certs",    value: String(certifications.length) },
          { icon: <Layers  size={12} className="text-indigo-400" />, label: "Sections", value: String(totalSections) },
          { icon: <CheckCircle2 size={12} className="text-emerald-400" />, label: "Earned", value: "0" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {s.icon}
            <span className="text-[15px] font-black text-white/85">{s.value}</span>
            <SectionLabel>{s.label}</SectionLabel>
          </div>
        ))}
      </div>

      {/* Cert tiles */}
      <div className="flex flex-col gap-3">
        {certifications.map((cert, i) => {
          const score = MOCK_SCORES[cert.id] ?? 40;
          const chapterCount = cert.syllabus.reduce((s, sec) => s + sec.chapters.length, 0);

          return (
            <motion.button
              key={cert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(cert)}
              className="w-full text-left flex gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
              style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
            >
              {/* Cover swatch */}
              <div
                className="w-12 h-14 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: cert.cover ?? "linear-gradient(135deg,#1e293b,#0f172a)" }}
              >
                <Trophy size={16} className="text-white/40" />
              </div>

              {/* Ring + info */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="relative shrink-0">
                  <ReadinessRing score={score} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-white/80">{score}%</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white/88 leading-snug">{cert.title}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{cert.provider}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <SectionLabel>{cert.syllabus.length} sections</SectionLabel>
                    <SectionLabel className="text-white/20">·</SectionLabel>
                    <SectionLabel>{chapterCount} chapters</SectionLabel>
                  </div>
                </div>
              </div>

              <ChevronRight size={13} className="text-white/15 self-center shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
