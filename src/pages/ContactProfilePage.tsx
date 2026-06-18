import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Shield, Zap, Star, MapPin, Sparkles, MessageSquare,
  UserPlus, UserCheck, Clock, CheckCircle2, ExternalLink, ChevronRight,
} from "lucide-react";
import {
  getPersonById, CURRENT_DISCOVERY_USER, DiscoveryMatchingEngine,
  getRelationType, availabilityLabel, availabilityColor, domainConfig,
} from "../lib/contactsEngine";
import type { ProofBadge } from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   CONTACT PROFILE  /contacts/:id
   ══════════════════════════════════════════════════════════════ */

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

export default function ContactProfilePage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [tab, setTab]       = useState<"overview" | "match" | "proof" | "goals">("overview");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected]   = useState(false);

  const person = getPersonById(id ?? "");
  if (!person) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Person not found. <button onClick={() => navigate("/contacts")} className="ml-2 text-indigo-400 hover:underline">Back</button>
    </div>
  );

  const relation  = connected ? "accepted" : getRelationType(person.id);
  const matchScore = DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, person);
  const cfg        = domainConfig(person.domain);

  const doConnect = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 900));
    setConnected(true);
    setConnecting(false);
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "match",    label: "Match"    },
    { key: "proof",    label: "Proof"    },
    { key: "goals",    label: "Goals"    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/contacts")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white">{person.name}</h1>
          <p className="text-[11px] text-slate-500">{person.subdomain} · {person.location}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => navigate(`/messages`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.08] transition-colors">
            <MessageSquare size={12} /> Message
          </button>
          {relation === "accepted" ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-500/25 text-green-300 text-xs font-medium">
              <UserCheck size={12} /> Connected
            </span>
          ) : relation === "pending_sent" ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
              <Clock size={12} /> Pending
            </span>
          ) : (
            <button onClick={doConnect} disabled={connecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-60">
              {connecting
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting…</>
                : <><UserPlus size={12} /> Connect</>
              }
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

        {/* Hero */}
        <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{person.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{person.headline}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin size={10} /> {person.location}
                  </span>
                  <span className={`text-[11px] font-medium ${availabilityColor(person.availability)}`}>
                    {availabilityLabel(person.availability)}
                  </span>
                  {person.rate && (
                    <span className="text-[11px] text-slate-500">{person.rate}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${cfg?.color ?? "text-indigo-400"} bg-white/[0.04] border-white/[0.08]`}>
                    {cfg?.emoji} {person.domain}
                  </span>
                  <span className="text-[11px] text-slate-500 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                    {person.subdomain}
                  </span>
                </div>
              </div>
            </div>

            {/* Match ring */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <MatchRing score={matchScore.overall} size={72} />
              <p className={`text-[11px] font-bold ${DiscoveryMatchingEngine.getColor(matchScore.overall)}`}>
                {DiscoveryMatchingEngine.getLabel(matchScore.overall)}
              </p>
            </div>
          </div>

          {/* Score row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <MiniScore label="Trust" value={person.trustScore} color="text-indigo-400" />
            <MiniScore label="Behaviour" value={person.behaviourScore} color="text-violet-400" />
            <MiniScore label="Proof Items" value={person.proofCount} color="text-green-400" suffix="" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Overview */}
          {tab === "overview" && (
            <motion.div key="overview" {...fade} className="space-y-4">
              <SectionCard title="Bio">
                <p className="text-sm text-slate-300 leading-relaxed">{person.bio}</p>
              </SectionCard>

              <SectionCard title="Skills">
                <div className="flex flex-wrap gap-2">
                  {person.skills.map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-lg text-xs text-slate-300 bg-white/[0.04] border border-white/[0.06]">{s}</span>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Vision Areas">
                <div className="flex flex-wrap gap-2">
                  {person.visionAreas.map(v => (
                    <span key={v} className="px-2.5 py-1 rounded-lg text-xs text-indigo-300 bg-indigo-600/10 border border-indigo-500/20">{v}</span>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Cycle Stats">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0f1117]/60 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{person.cyclesCompleted}</p>
                    <p className="text-[10px] text-slate-500">Cycles Done</p>
                  </div>
                  <div className="bg-[#0f1117]/60 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{person.currentCycleWeek ?? "—"}</p>
                    <p className="text-[10px] text-slate-500">Current Week</p>
                  </div>
                  <div className="bg-[#0f1117]/60 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-400">{person.streakDays}d</p>
                    <p className="text-[10px] text-slate-500">Streak</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Achievements">
                <div className="space-y-2">
                  {person.achievements.map(a => (
                    <div key={a} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-green-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-300">{a}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* Match */}
          {tab === "match" && (
            <motion.div key="match" {...fade} className="space-y-4">
              {/* Agent analysis */}
              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">AI Match Analysis</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {person.name} is a <span className={`font-bold ${DiscoveryMatchingEngine.getColor(matchScore.overall)}`}>{matchScore.overall}% match</span> for you.
                  {matchScore.breakdown.length > 0 && ` Key signals: ${matchScore.breakdown.join(", ")}.`}
                </p>
              </div>

              {/* Dimension scores */}
              <SectionCard title="Match Dimensions">
                <div className="space-y-3">
                  {[
                    { label: "Vision Alignment",  score: matchScore.vision,   color: "bg-indigo-500"  },
                    { label: "Goal Similarity",   score: matchScore.goals,    color: "bg-violet-500"  },
                    { label: "Trust Proximity",   score: matchScore.trust,    color: "bg-blue-500"    },
                    { label: "Proof Quality",     score: matchScore.proof,    color: "bg-green-500"   },
                    { label: "Cycle Alignment",   score: matchScore.cycle,    color: "bg-amber-500"   },
                    { label: "Domain Match",      score: matchScore.domain,   color: "bg-pink-500"    },
                    { label: "Location",          score: matchScore.location, color: "bg-teal-500"    },
                  ].map(d => (
                    <div key={d.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{d.label}</span>
                        <span className="text-white font-semibold">{d.score}%</span>
                      </div>
                      <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                        <motion.div className={`h-1.5 rounded-full ${d.color}`}
                          initial={{ width: 0 }} animate={{ width: `${d.score}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* Proof */}
          {tab === "proof" && (
            <motion.div key="proof" {...fade} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{person.proofCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Total Proof Items</p>
                </div>
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-400">{person.trustScore}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Trust Score</p>
                </div>
              </div>

              <SectionCard title="Proof Badges">
                <div className="flex flex-wrap gap-2">
                  {person.proofBadges.map(b => (
                    <ProofBadgeChip key={b} badge={b} />
                  ))}
                </div>
              </SectionCard>

              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Proof on P1 is verified and attached to completed cycles. {person.name} has submitted <span className="text-white font-semibold">{person.proofCount} verified items</span> across their time on the platform.
                </p>
              </div>
            </motion.div>
          )}

          {/* Goals */}
          {tab === "goals" && (
            <motion.div key="goals" {...fade} className="space-y-3">
              <SectionCard title="Active Goals">
                <div className="space-y-2">
                  {person.goals.map(g => (
                    <div key={g} className="flex items-start gap-2 p-3 bg-[#0f1117]/60 rounded-xl border border-white/[0.04]">
                      <ChevronRight size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-200">{g}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Vision Areas">
                <div className="space-y-2">
                  {person.visionAreas.map(v => {
                    const userHas = CURRENT_DISCOVERY_USER.visionAreas.includes(v);
                    return (
                      <div key={v} className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        userHas ? "bg-indigo-600/8 border-indigo-500/20" : "bg-white/[0.03] border-white/[0.05]"
                      }`}>
                        <span className="text-xs text-slate-300">{v}</span>
                        {userHas && <span className="text-[10px] text-indigo-400 font-semibold">Also yours</span>}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </motion.div>
          )}

        </AnimatePresence>

        {/* CTA row */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => navigate("/messages")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-sm font-semibold hover:bg-white/[0.07] transition-colors">
            <MessageSquare size={14} /> Send Message
          </button>
          <button onClick={() => navigate(`/discover/${person.domain.toLowerCase()}`)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-sm font-semibold hover:bg-indigo-600/25 transition-colors">
            <ExternalLink size={14} /> Explore {person.domain}
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

function MatchRing({ score, size = 64 }: { score: number; size?: number }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 85 ? "#4ade80" : score >= 70 ? "#34d399" : score >= 55 ? "#60a5fa" : "#fbbf24";
  const textColor = score >= 85 ? "#4ade80" : score >= 70 ? "#34d399" : score >= 55 ? "#60a5fa" : "#fbbf24";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fontSize={size >= 72 ? 15 : 12} fontWeight="bold" fill={textColor}>{score}%</text>
    </svg>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</p>
      {children}
    </div>
  );
}

function MiniScore({ label, value, color, suffix = "/100" }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div className="bg-[#0f1117]/60 border border-white/[0.04] rounded-xl p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}{suffix}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function ProofBadgeChip({ badge }: { badge: ProofBadge }) {
  const labels: Record<ProofBadge, string> = {
    photo: "📸 Photo", video: "🎬 Video", certificate: "📜 Certificate",
    testimonial: "💬 Testimonial", case_study: "📊 Case Study", portfolio: "🗂️ Portfolio",
  };
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-500/20 text-green-300 text-xs">
      {labels[badge]}
    </span>
  );
}
