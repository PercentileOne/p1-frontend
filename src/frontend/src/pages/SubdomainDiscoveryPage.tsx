import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Shield, Star, MapPin, Zap, Sparkles, ChevronRight, SlidersHorizontal,
} from "lucide-react";
import {
  DEMO_PEOPLE, CURRENT_DISCOVERY_USER, DOMAINS,
  DiscoveryMatchingEngine, availabilityLabel, availabilityColor, domainConfig,
} from "../lib/contactsEngine";
import type { Person } from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   SUBDOMAIN DISCOVERY  /discover/:domain/:subdomain
   ══════════════════════════════════════════════════════════════ */

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

const SORT_OPTIONS = [
  { value: "match",  label: "Best Match"  },
  { value: "trust",  label: "Trust"       },
  { value: "proof",  label: "Most Proof"  },
  { value: "avail",  label: "Available"   },
] as const;

type SortKey = typeof SORT_OPTIONS[number]["value"];

export default function SubdomainDiscoveryPage() {
  const { domain, subdomain } = useParams<{ domain: string; subdomain: string }>();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [locationFilter, setLocationFilter] = useState("");

  const domainLabel    = DOMAINS.find(d => d.label.toLowerCase() === domain?.toLowerCase())?.label ?? domain ?? "";
  const subdomainLabel = decodeURIComponent(subdomain ?? "");
  const cfg            = domainConfig(domainLabel);

  const people = DEMO_PEOPLE.filter(p =>
    p.domain.toLowerCase() === domainLabel.toLowerCase() &&
    p.subdomain.toLowerCase() === subdomainLabel.toLowerCase()
  );

  const locations = [...new Set(people.map(p => p.location))];

  const filtered = people
    .filter(p => !locationFilter || p.location === locationFilter || p.location === "Remote")
    .map(p => ({ person: p, score: DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, p).overall }))
    .sort((a, b) => {
      if (sortBy === "match")  return b.score - a.score;
      if (sortBy === "trust")  return b.person.trustScore - a.person.trustScore;
      if (sortBy === "proof")  return b.person.proofCount - a.person.proofCount;
      if (sortBy === "avail") {
        const order = { available: 0, open_to_work: 1, busy: 2, unavailable: 3 };
        return order[a.person.availability] - order[b.person.availability];
      }
      return 0;
    });

  const avgTrust  = Math.round(people.reduce((s, p) => s + p.trustScore, 0) / Math.max(people.length, 1));
  const avgProof  = Math.round(people.reduce((s, p) => s + p.proofCount, 0) / Math.max(people.length, 1));
  const available = people.filter(p => p.availability === "available" || p.availability === "open_to_work").length;

  if (!cfg) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Not found. <button onClick={() => navigate("/discover")} className="ml-2 text-indigo-400">Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate(`/discover/${domainLabel.toLowerCase()}`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white">{subdomainLabel}</h1>
          <p className="text-[11px] text-slate-500">{cfg.emoji} {domainLabel} · {people.length} professionals</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* Stats */}
        <motion.div {...fade} className="grid grid-cols-3 gap-3">
          <StatCard icon={<Shield size={14} className="text-indigo-400" />} value={`${avgTrust}`} label="Avg Trust" color="text-indigo-400" />
          <StatCard icon={<Star size={14} className="text-green-400" />} value={`${avgProof}`} label="Avg Proof" color="text-green-400" />
          <StatCard icon={<Zap size={14} className="text-amber-400" />} value={`${available}`} label="Available" color="text-amber-400" />
        </motion.div>

        {/* Agent insight */}
        <motion.div {...fade} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Agent Insight</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {filtered[0] && `Your top match in ${subdomainLabel} is `}
            {filtered[0] && (
              <button onClick={() => navigate(`/contacts/${filtered[0].person.id}`)}
                className="text-indigo-300 font-semibold hover:text-indigo-200 transition-colors">
                {filtered[0].person.name}
              </button>
            )}
            {filtered[0] && ` at ${filtered[0].score}% compatibility. `}
            There are <span className="text-white font-semibold">{available} available</span> professionals in this specialisation.
            {people.length > 0 ? ` Average trust score is ${avgTrust}/100.` : " Be the first to add your profile here."}
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div {...fade}>
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal size={11} className="text-slate-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Filter by Location</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setLocationFilter("")}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                !locationFilter ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
              }`}>All</button>
            {locations.map(l => (
              <button key={l} onClick={() => setLocationFilter(prev => prev === l ? "" : l)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                  locationFilter === l ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                }`}>
                <MapPin size={9} /> {l}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Sort + list */}
        <motion.div {...fade}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-slate-500">{filtered.length} shown</p>
            <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
              {SORT_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSortBy(s.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    sortBy === s.value ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No {subdomainLabel.toLowerCase()} professionals in this location yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(({ person, score }) => (
                <ProfileCard key={person.id} person={person} score={score}
                  onClick={() => navigate(`/contacts/${person.id}`)} />
              ))}
            </div>
          )}
        </motion.div>

        {/* All locations CTA */}
        {locations.length > 1 && (
          <motion.div {...fade}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Browse by Area</p>
            <div className="space-y-2">
              {locations.map(loc => {
                const locPeople = people.filter(p => p.location === loc || p.location === "Remote");
                return (
                  <button key={loc} onClick={() => navigate(`/discover/${domainLabel.toLowerCase()}/${encodeURIComponent(subdomainLabel.toLowerCase())}/${loc.toLowerCase()}`)}
                    className="w-full flex items-center justify-between p-3 bg-[#1c1f2e] border border-white/[0.08] rounded-xl hover:border-indigo-500/20 transition-all">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-500" />
                      <span className="text-sm font-medium text-white">{loc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{locPeople.length} people</span>
                      <ChevronRight size={12} className="text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
      <div className="h-8" />
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function ProfileCard({ person, score, onClick }: { person: Person; score: number; onClick: () => void }) {
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick}
      className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-left hover:border-indigo-500/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{person.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{person.headline}</p>
            </div>
            <div className={`text-right shrink-0 ${DiscoveryMatchingEngine.getColor(score)}`}>
              <p className="text-sm font-bold">{score}%</p>
              <p className="text-[10px]">match</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={9} /> {person.location}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><Shield size={9} /> {person.trustScore}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><Star size={9} /> {person.proofCount}</span>
            {person.rate && <span className="text-[10px] text-slate-500">{person.rate}</span>}
            <span className={`ml-auto text-[10px] font-medium ${availabilityColor(person.availability)}`}>
              {availabilityLabel(person.availability)}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
