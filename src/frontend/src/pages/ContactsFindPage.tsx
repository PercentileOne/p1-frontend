import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, SlidersHorizontal, MapPin, Shield, Star,
  Zap, X, ChevronRight,
} from "lucide-react";
import {
  DEMO_PEOPLE, CURRENT_DISCOVERY_USER, DOMAINS,
  DiscoveryMatchingEngine, availabilityLabel, availabilityColor,
} from "../lib/contactsEngine";
import type { Person, Domain, Availability } from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   CONTACTS FIND  /contacts/find
   ══════════════════════════════════════════════════════════════ */

export const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

const LOCATIONS = ["London", "Essex", "Manchester", "Birmingham", "Remote"];
const AVAILABILITIES: Availability[] = ["available", "open_to_work", "busy", "unavailable"];
const SORT_OPTIONS = [
  { value: "match",  label: "Best Match"  },
  { value: "trust",  label: "Trust Score" },
  { value: "proof",  label: "Most Proof"  },
  { value: "cycles", label: "Most Cycles" },
] as const;

type SortKey = typeof SORT_OPTIONS[number]["value"];

export default function ContactsFindPage() {
  const navigate = useNavigate();
  const [query,  setQuery]  = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [domain, setDomain]       = useState<Domain | "">("");
  const [location, setLocation]   = useState("");
  const [avail, setAvail]         = useState<Availability | "">("");
  const [sortBy, setSortBy]       = useState<SortKey>("match");
  const [minTrust, setMinTrust]   = useState(0);
  const [minProof, setMinProof]   = useState(0);

  const filtered = DEMO_PEOPLE
    .filter(p => p.id !== CURRENT_DISCOVERY_USER.id)
    .filter(p => {
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.subdomain.toLowerCase().includes(q) && !p.headline.toLowerCase().includes(q) && !p.skills.some(s => s.toLowerCase().includes(q))) return false;
      }
      if (domain   && p.domain !== domain) return false;
      if (location && p.location !== location && p.location !== "Remote") return false;
      if (avail    && p.availability !== avail) return false;
      if (p.trustScore < minTrust) return false;
      if (p.proofCount < minProof) return false;
      return true;
    })
    .map(p => ({ person: p, score: DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, p).overall }))
    .sort((a, b) => {
      if (sortBy === "match")  return b.score - a.score;
      if (sortBy === "trust")  return b.person.trustScore - a.person.trustScore;
      if (sortBy === "proof")  return b.person.proofCount - a.person.proofCount;
      if (sortBy === "cycles") return b.person.cyclesCompleted - a.person.cyclesCompleted;
      return 0;
    });

  const hasFilters = !!(domain || location || avail || minTrust > 0 || minProof > 0);

  const clearFilters = () => {
    setDomain(""); setLocation(""); setAvail(""); setMinTrust(0); setMinProof(0);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/contacts")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-bold text-white">Find People</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, skill, or role…"
              className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                <X size={13} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              showFilters || hasFilters
                ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-300"
            }`}>
            <SlidersHorizontal size={13} />
            Filters{hasFilters ? ` (${[domain,location,avail,minTrust>0,minProof>0].filter(Boolean).length})` : ""}
          </button>
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden border-b border-white/[0.06] bg-[#13151c]">
            <div className="px-6 py-4 space-y-4">

              {/* Domain */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Domain</p>
                <div className="flex flex-wrap gap-2">
                  {DOMAINS.map(d => (
                    <button key={d.label} onClick={() => setDomain(prev => prev === d.label ? "" : d.label)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                        domain === d.label
                          ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                          : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-300"
                      }`}>
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Location</p>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map(l => (
                    <button key={l} onClick={() => setLocation(prev => prev === l ? "" : l)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                        location === l
                          ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                          : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-300"
                      }`}>
                      <MapPin size={9} /> {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Availability</p>
                <div className="flex gap-2">
                  {AVAILABILITIES.map(a => (
                    <button key={a} onClick={() => setAvail(prev => prev === a ? "" : a)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-all capitalize ${
                        avail === a
                          ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                          : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-300"
                      }`}>
                      {availabilityLabel(a)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Trust */}
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Min Trust Score</p>
                  <span className="text-[11px] text-indigo-400 font-bold">{minTrust}+</span>
                </div>
                <input type="range" min={0} max={95} step={5} value={minTrust}
                  onChange={e => setMinTrust(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
              </div>

              {/* Min Proof */}
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Min Proof Items</p>
                  <span className="text-[11px] text-green-400 font-bold">{minProof}+</span>
                </div>
                <input type="range" min={0} max={40} step={5} value={minProof}
                  onChange={e => setMinProof(Number(e.target.value))}
                  className="w-full accent-green-500" />
              </div>

              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1.5 transition-colors">
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort + results */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] text-slate-500">{filtered.length} people found</p>
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {SORT_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setSortBy(s.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  sortBy === s.value ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Search size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No results</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ person, score }) => (
              <ResultCard key={person.id} person={person} score={score}
                onClick={() => navigate(`/contacts/${person.id}`)} />
            ))}
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}

/* ── Result card ─────────────────────────────────────────────── */
function ResultCard({ person, score, onClick }: { person: Person; score: number; onClick: () => void }) {
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick}
      className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-left hover:border-indigo-500/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{person.name}</p>
            <span className={`text-sm font-bold ${DiscoveryMatchingEngine.getColor(score)}`}>{score}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{person.headline}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <MapPin size={9} /> {person.location}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Shield size={9} /> {person.trustScore}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Star size={9} /> {person.proofCount} proof
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Zap size={9} /> {person.cyclesCompleted} cycles
            </span>
            <span className={`ml-auto text-[10px] font-medium ${availabilityColor(person.availability)}`}>
              {availabilityLabel(person.availability)}
            </span>
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-600 shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}
