import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Compass, Search, Sparkles, ChevronRight, TrendingUp,
  Users, Shield, Star,
} from "lucide-react";
import {
  DOMAINS, DEMO_PEOPLE, CURRENT_DISCOVERY_USER,
  DiscoveryMatchingEngine,
} from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   DISCOVER HOME  /discover
   ══════════════════════════════════════════════════════════════ */

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export default function DiscoverHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const topMatches = DEMO_PEOPLE
    .filter(p => p.id !== CURRENT_DISCOVERY_USER.id)
    .map(p => ({ person: p, score: DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, p).overall }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const topTrusted = [...DEMO_PEOPLE]
    .filter(p => p.id !== CURRENT_DISCOVERY_USER.id)
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, 4);

  const searchResults = search.trim().length > 1
    ? DEMO_PEOPLE.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.domain.toLowerCase().includes(search.toLowerCase()) ||
        p.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Compass size={16} className="text-indigo-400" />
          <h1 className="text-base font-bold text-white">Discover</h1>
          <span className="text-[11px] text-slate-500 ml-1">{DEMO_PEOPLE.length} verified professionals</span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search any domain, skill, or location…"
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="px-6 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Search results ({searchResults.length})</p>
          <div className="space-y-2">
            {searchResults.map(p => (
              <motion.button key={p.id} whileHover={{ y: -1 }}
                onClick={() => navigate(`/contacts/${p.id}`)}
                className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-left hover:border-indigo-500/20 transition-all flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {p.avatar ?? p.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-[11px] text-slate-400">{p.subdomain} · {p.location}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {!search && (
        <div className="px-6 py-5 space-y-7">

          {/* AI Recommendation */}
          <motion.div {...fade} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">Agent Recommendation</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Based on your vision and goals, you should explore{" "}
              <span className="text-white font-semibold">Coaches</span> and{" "}
              <span className="text-white font-semibold">Business</span> domains first.
              Your top match in the network is{" "}
              <button onClick={() => navigate(`/contacts/${topMatches[0]?.person.id}`)}
                className="text-indigo-300 font-semibold hover:text-indigo-200 transition-colors">
                {topMatches[0]?.person.name}
              </button>{" "}
              at <span className="text-white font-semibold">{topMatches[0]?.score}%</span>.
            </p>
          </motion.div>

          {/* All Domains */}
          <motion.div {...fade}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Browse by Domain</p>
            <div className="grid grid-cols-3 gap-3">
              {DOMAINS.map(d => {
                const count = DEMO_PEOPLE.filter(p => p.domain === d.label).length;
                const avgTrust = Math.round(
                  DEMO_PEOPLE.filter(p => p.domain === d.label).reduce((s, p) => s + p.trustScore, 0) / Math.max(count, 1)
                );
                return (
                  <motion.button key={d.label} whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/discover/${d.label.toLowerCase()}`)}
                    className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-left hover:border-indigo-500/25 hover:bg-[#1e2235] transition-all">
                    <span className="text-2xl">{d.emoji}</span>
                    <p className="text-xs font-semibold text-white mt-2">{d.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{count} people</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Shield size={8} className="text-indigo-400" />
                      <span className="text-[10px] text-indigo-400">{avgTrust} avg trust</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Top Matches for You */}
          <motion.div {...fade}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Sparkles size={10} className="text-indigo-400" /> Top Matches for You
              </p>
              <button onClick={() => navigate("/contacts/find")} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                See all <ChevronRight size={10} />
              </button>
            </div>
            <div className="space-y-2.5">
              {topMatches.map(({ person, score }) => (
                <motion.button key={person.id} whileHover={{ y: -1 }}
                  onClick={() => navigate(`/contacts/${person.id}`)}
                  className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-left hover:border-indigo-500/20 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
                    {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{person.name}</p>
                    <p className="text-[11px] text-slate-400">{person.subdomain} · {person.location}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500"><Shield size={9} /> {person.trustScore}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500"><Star size={9} /> {person.proofCount}</span>
                    </div>
                  </div>
                  <div className={`text-right shrink-0 ${DiscoveryMatchingEngine.getColor(score)}`}>
                    <p className="text-base font-bold">{score}%</p>
                    <p className="text-[10px]">match</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Most Trusted */}
          <motion.div {...fade}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <TrendingUp size={10} /> Most Trusted
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {topTrusted.map(p => (
                <motion.button key={p.id} whileHover={{ y: -1 }}
                  onClick={() => navigate(`/contacts/${p.id}`)}
                  className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-left hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {p.avatar ?? p.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.subdomain}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold">
                      <Shield size={9} /> {p.trustScore}/100
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Users size={9} /> {p.proofCount} proof
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
