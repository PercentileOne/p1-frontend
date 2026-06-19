import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Shield, Star, Zap, Sparkles, Phone, MessageSquare,
} from "lucide-react";
import {
  DEMO_PEOPLE, CURRENT_DISCOVERY_USER, DOMAINS,
  DiscoveryMatchingEngine, availabilityLabel, availabilityColor,
} from "../lib/contactsEngine";
import type { Person } from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   LOCAL DISCOVERY  /discover/:domain/:subdomain/:location
   ══════════════════════════════════════════════════════════════ */

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

export default function LocalDiscoveryPage() {
  const { domain, subdomain, location } = useParams<{ domain: string; subdomain: string; location: string }>();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<"match" | "trust" | "proof">("match");

  const domainLabel    = DOMAINS.find(d => d.label.toLowerCase() === domain?.toLowerCase())?.label ?? domain ?? "";
  const subdomainLabel = decodeURIComponent(subdomain ?? "");
  const locationLabel  = decodeURIComponent(location ?? "");

  const people = DEMO_PEOPLE.filter(p =>
    p.domain.toLowerCase() === domainLabel.toLowerCase() &&
    p.subdomain.toLowerCase() === subdomainLabel.toLowerCase() &&
    (p.location.toLowerCase() === locationLabel.toLowerCase() || p.location === "Remote")
  );

  const sorted = [...people]
    .map(p => ({ person: p, score: DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, p).overall }))
    .sort((a, b) => {
      if (sortBy === "trust") return b.person.trustScore - a.person.trustScore;
      if (sortBy === "proof") return b.person.proofCount - a.person.proofCount;
      return b.score - a.score;
    });

  const available = people.filter(p => p.availability === "available" || p.availability === "open_to_work");

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate(`/discover/${domainLabel.toLowerCase()}/${encodeURIComponent(subdomainLabel.toLowerCase())}`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white capitalize">{subdomainLabel} in {locationLabel}</h1>
          <p className="text-[11px] text-slate-500">{domainLabel} · {people.length} results</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Location header card */}
        <motion.div {...fade} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center">
              <MapPin size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white capitalize">{locationLabel}</p>
              <p className="text-[11px] text-slate-400">{subdomainLabel} professionals</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0f1117]/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{people.length}</p>
              <p className="text-[10px] text-slate-500">Professionals</p>
            </div>
            <div className="bg-[#0f1117]/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-400">{available.length}</p>
              <p className="text-[10px] text-slate-500">Available Now</p>
            </div>
            <div className="bg-[#0f1117]/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-indigo-400">
                {Math.round(people.reduce((s, p) => s + p.trustScore, 0) / Math.max(people.length, 1))}
              </p>
              <p className="text-[10px] text-slate-500">Avg Trust</p>
            </div>
          </div>
        </motion.div>

        {/* Agent suggestion */}
        {sorted[0] && (
          <motion.div {...fade} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">Agent Recommendation</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <button onClick={() => navigate(`/contacts/${sorted[0].person.id}`)}
                className="text-white font-semibold hover:text-indigo-200 transition-colors">
                {sorted[0].person.name}
              </button>{" "}
              is your top match in {locationLabel} at{" "}
              <span className={`font-bold ${DiscoveryMatchingEngine.getColor(sorted[0].score)}`}>
                {sorted[0].score}%
              </span>{" "}
              compatibility — {sorted[0].person.proofCount} verified proof items and a trust score of {sorted[0].person.trustScore}/100.
              {sorted[0].person.availability !== "unavailable" && " They're currently accepting work."}
            </p>
          </motion.div>
        )}

        {/* Sort */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500">{sorted.length} shown</p>
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {(["match","trust","proof"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                  sortBy === s ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                }`}>
                {s === "match" ? "Best Match" : s === "trust" ? "Most Trusted" : "Most Proof"}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <MapPin size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No results in {locationLabel}</p>
            <p className="text-xs text-slate-500 mt-1">Try searching in a nearby area or filtering for Remote.</p>
            <button onClick={() => navigate(`/discover/${domainLabel.toLowerCase()}/${encodeURIComponent(subdomainLabel.toLowerCase())}`)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/25 transition-colors">
              View all {subdomainLabel}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(({ person, score }) => (
              <LocalPersonCard key={person.id} person={person} score={score}
                onClick={() => navigate(`/contacts/${person.id}`)} />
            ))}
          </div>
        )}

      </div>
      <div className="h-8" />
    </div>
  );
}

function LocalPersonCard({ person, score, onClick }: { person: Person; score: number; onClick: () => void }) {
  return (
    <motion.div whileHover={{ y: -1 }} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5 hover:border-indigo-500/20 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">{person.name}</p>
              <p className="text-[11px] text-slate-400">{person.headline}</p>
            </div>
            <div className={`text-right shrink-0 ml-3 ${DiscoveryMatchingEngine.getColor(score)}`}>
              <p className="text-base font-bold">{score}%</p>
              <p className="text-[10px]">{DiscoveryMatchingEngine.getLabel(score)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[11px] font-medium ${availabilityColor(person.availability)}`}>
              {availabilityLabel(person.availability)}
            </span>
            {person.rate && <span className="text-[11px] text-slate-400">{person.rate}</span>}
          </div>
        </div>
      </div>

      {/* Scores row */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-[#0f1117]/50 rounded-xl">
        <div className="flex items-center gap-1.5">
          <Shield size={11} className="text-indigo-400" />
          <span className="text-xs text-slate-300"><span className="font-bold text-indigo-400">{person.trustScore}</span> Trust</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={11} className="text-green-400" />
          <span className="text-xs text-slate-300"><span className="font-bold text-green-400">{person.proofCount}</span> Proof</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-amber-400" />
          <span className="text-xs text-slate-300"><span className="font-bold text-amber-400">{person.cyclesCompleted}</span> Cycles</span>
        </div>
      </div>

      {/* Skills preview */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {person.skills.slice(0, 3).map(s => (
          <span key={s} className="px-2 py-0.5 rounded-md text-[10px] text-slate-400 bg-white/[0.04] border border-white/[0.06]">{s}</span>
        ))}
        {person.skills.length > 3 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-600">+{person.skills.length - 3} more</span>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-2">
        <button onClick={onClick}
          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
          View Profile
        </button>
        <button onClick={e => { e.stopPropagation(); }}
          className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-300 hover:bg-white/[0.07] transition-colors">
          <MessageSquare size={13} />
        </button>
        <button onClick={e => { e.stopPropagation(); }}
          className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-300 hover:bg-white/[0.07] transition-colors">
          <Phone size={13} />
        </button>
      </div>
    </motion.div>
  );
}
