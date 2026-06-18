import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Shield, Star, Zap, MapPin, Sparkles,
} from "lucide-react";
import {
  DEMO_PEOPLE, CURRENT_DISCOVERY_USER, DOMAINS,
  DiscoveryMatchingEngine, availabilityLabel, availabilityColor, domainConfig,
} from "../lib/contactsEngine";
import type { Person } from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   DOMAIN DISCOVERY  /discover/:domain
   ══════════════════════════════════════════════════════════════ */

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

export default function DomainDiscoveryPage() {
  const { domain } = useParams<{ domain: string }>();
  const navigate   = useNavigate();

  const domainLabel = DOMAINS.find(d => d.label.toLowerCase() === domain?.toLowerCase())?.label ?? domain ?? "";
  const cfg         = domainConfig(domainLabel);
  const people      = DEMO_PEOPLE.filter(p => p.domain.toLowerCase() === domainLabel.toLowerCase());

  const subdomains = [...new Set(people.map(p => p.subdomain))];

  const topRated  = [...people].sort((a, b) => b.trustScore - a.trustScore).slice(0, 4);
  const mostProof = [...people].sort((a, b) => b.proofCount - a.proofCount).slice(0, 4);
  const bestMatch = [...people]
    .map(p => ({ person: p, score: DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, p).overall }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const [activeTab, setActiveTab] = useState<"match" | "trust" | "proof">("match");

  if (!cfg) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Domain not found. <button onClick={() => navigate("/discover")} className="ml-2 text-indigo-400">Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/discover")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            {cfg.emoji} {cfg.label}
          </h1>
          <p className="text-[11px] text-slate-500">{people.length} professionals · {subdomains.length} specialisations</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-7">

        {/* Domain hero */}
        <motion.div {...fade} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{cfg.emoji}</span>
            <div>
              <h2 className="text-lg font-bold text-white">{cfg.label}</h2>
              <p className="text-sm text-slate-400 mt-1">{cfg.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield size={12} className="text-indigo-400" />
                  Avg Trust {Math.round(people.reduce((s, p) => s + p.trustScore, 0) / Math.max(people.length, 1))}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Star size={12} className="text-green-400" />
                  Avg Proof {Math.round(people.reduce((s, p) => s + p.proofCount, 0) / Math.max(people.length, 1))}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Zap size={12} className="text-amber-400" />
                  {people.filter(p => p.availability === "available" || p.availability === "open_to_work").length} available
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Subdomains */}
        <motion.div {...fade}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Specialisations</p>
          <div className="grid grid-cols-2 gap-2">
            {cfg.subdomains.map(sub => {
              const count = people.filter(p => p.subdomain === sub).length;
              const hasData = count > 0;
              return (
                <button key={sub}
                  onClick={() => hasData && navigate(`/discover/${domainLabel.toLowerCase()}/${encodeURIComponent(sub.toLowerCase())}`)}
                  disabled={!hasData}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    hasData
                      ? "bg-[#1c1f2e] border-white/[0.08] hover:border-indigo-500/25 hover:bg-[#1e2235] cursor-pointer"
                      : "bg-[#16181f] border-white/[0.04] opacity-50 cursor-not-allowed"
                  }`}>
                  <div>
                    <p className="text-xs font-semibold text-white">{sub}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{count} {count === 1 ? "person" : "people"}</p>
                  </div>
                  {hasData && <ChevronRight size={13} className="text-slate-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Top people tabs */}
        <motion.div {...fade}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">People in {cfg.label}</p>
            <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
              {(["match","trust","proof"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                    activeTab === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}>
                  {t === "match" ? "Best Match" : t === "trust" ? "Trusted" : "Proof"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {(activeTab === "match" ? bestMatch.map(x => x.person) : activeTab === "trust" ? topRated : mostProof)
              .map(person => {
                const score = DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, person).overall;
                return (
                  <PersonRow key={person.id} person={person} score={score}
                    onClick={() => navigate(`/contacts/${person.id}`)} />
                );
              })}

            {people.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">No people in this domain yet.</div>
            )}
          </div>
        </motion.div>

        {/* Agent insight */}
        <motion.div {...fade} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Agent Insight</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The <span className="text-white font-semibold">{cfg.label}</span> domain has{" "}
            <span className="text-white font-semibold">{people.filter(p => p.proofCount >= 25).length} highly verified</span> professionals.
            {bestMatch[0] && ` Your best match here is ${bestMatch[0].person.name} at ${bestMatch[0].score}%.`}
          </p>
        </motion.div>

      </div>
      <div className="h-8" />
    </div>
  );
}

function PersonRow({ person, score, onClick }: { person: Person; score: number; onClick: () => void }) {
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick}
      className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-left hover:border-indigo-500/20 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{person.name}</p>
          <p className="text-[11px] text-slate-400">{person.subdomain}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={8} /> {person.location}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><Shield size={8} /> {person.trustScore}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><Star size={8} /> {person.proofCount}</span>
            <span className={`text-[10px] font-medium ${availabilityColor(person.availability)}`}>
              {availabilityLabel(person.availability)}
            </span>
          </div>
        </div>
        <div className={`text-right shrink-0 ${DiscoveryMatchingEngine.getColor(score)}`}>
          <p className="text-sm font-bold">{score}%</p>
          <p className="text-[10px]">match</p>
        </div>
      </div>
    </motion.button>
  );
}
