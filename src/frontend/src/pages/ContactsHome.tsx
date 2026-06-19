import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, Sparkles, ChevronRight, UserPlus,
  UserCheck, Clock, MapPin, Shield, Zap, Star, MessageSquare,
} from "lucide-react";
import {
  DEMO_PEOPLE, DEMO_RELATIONS, CURRENT_DISCOVERY_USER,
  DiscoveryMatchingEngine, getMyContacts, getSuggestedContacts,
  availabilityLabel, availabilityColor, domainConfig,
} from "../lib/contactsEngine";
import type { Person } from "../lib/contactsEngine";

/* ══════════════════════════════════════════════════════════════
   CONTACTS HOME  /contacts
   ══════════════════════════════════════════════════════════════ */

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export default function ContactsHome() {
  const navigate  = useNavigate();
  const [search, setSearch]   = useState("");
  const [tab, setTab]         = useState<"network" | "suggested" | "cycle" | "discover">("network");

  const myContacts  = getMyContacts();
  const suggested   = getSuggestedContacts(CURRENT_DISCOVERY_USER).slice(0, 8);
  const pending     = DEMO_RELATIONS.filter(r => r.type === "pending_sent").map(r => DEMO_PEOPLE.find(p => p.id === r.personId)!).filter(Boolean);
  const inCycle     = DEMO_PEOPLE.filter(p => p.currentCycleWeek === CURRENT_DISCOVERY_USER.currentCycleWeek && p.id !== CURRENT_DISCOVERY_USER.id).slice(0, 6);

  const searchResults = search.trim().length > 1
    ? DEMO_PEOPLE.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 12)
    : [];

  const tabs = [
    { key: "network",   label: "My Network",   count: myContacts.length },
    { key: "suggested", label: "Suggested",     count: suggested.length  },
    { key: "cycle",     label: "In My Cycle",  count: inCycle.length    },
    { key: "discover",  label: "Discover",      count: null              },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-indigo-400" /> Contacts
            </h1>
            <p className="text-[11px] text-slate-500">{myContacts.length} connections · {DEMO_PEOPLE.length} people in P1</p>
          </div>
          <button onClick={() => navigate("/contacts/find")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            <Search size={12} /> Find People
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search people, skills, locations…"
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Search results overlay */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div {...fade} className="px-6 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Search results ({searchResults.length})
            </p>
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map(p => (
                <PersonCard key={p.id} person={p} onClick={() => navigate(`/contacts/${p.id}`)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!search && (
        <div className="px-6 py-4 space-y-6">

          {/* Agent suggestion banner */}
          <motion.div {...fade} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">Agent Insight</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              You're in <span className="text-white font-semibold">Week {CURRENT_DISCOVERY_USER.currentCycleWeek}</span> of your current cycle.
              {" "}<span className="text-white font-semibold">{inCycle.length} people</span> on P1 are in the same cycle week — connecting now could unlock shared accountability momentum.
            </p>
            <button onClick={() => setTab("cycle")} className="mt-3 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View cycle connections <ChevronRight size={11} />
            </button>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                }`}>
                {t.label}{t.count !== null ? ` (${t.count})` : ""}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* My Network */}
            {tab === "network" && (
              <motion.div key="network" {...fade} className="space-y-4">
                {pending.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                      <Clock size={10} /> Pending ({pending.length})
                    </p>
                    <div className="space-y-2">
                      {pending.map(p => p && (
                        <PendingCard key={p.id} person={p} onClick={() => navigate(`/contacts/${p.id}`)} />
                      ))}
                    </div>
                  </div>
                )}

                {myContacts.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                      <UserCheck size={10} /> Connected ({myContacts.length})
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {myContacts.map(p => (
                        <PersonCard key={p.id} person={p} onClick={() => navigate(`/contacts/${p.id}`)} showConnection />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Users size={24} className="text-slate-600" />}
                    title="No connections yet"
                    subtitle="Start by exploring suggested contacts or discovering people in your domain."
                    action={{ label: "Find People", onClick: () => navigate("/contacts/find") }}
                  />
                )}
              </motion.div>
            )}

            {/* Suggested */}
            {tab === "suggested" && (
              <motion.div key="suggested" {...fade} className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI-Matched Suggestions</p>
                {suggested.map(p => {
                  const score = DiscoveryMatchingEngine.overallMatchScore(CURRENT_DISCOVERY_USER, p);
                  return (
                    <SuggestedCard key={p.id} person={p} score={score.overall}
                      onClick={() => navigate(`/contacts/${p.id}`)} />
                  );
                })}
              </motion.div>
            )}

            {/* In My Cycle */}
            {tab === "cycle" && (
              <motion.div key="cycle" {...fade} className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Also on Week {CURRENT_DISCOVERY_USER.currentCycleWeek}
                </p>
                {inCycle.length === 0 ? (
                  <EmptyState icon={<Zap size={24} className="text-slate-600" />} title="No one in your exact cycle week"
                    subtitle="People will appear here when they're on the same week as you." />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {inCycle.map(p => (
                      <PersonCard key={p.id} person={p} onClick={() => navigate(`/contacts/${p.id}`)} showCycleWeek />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Discover */}
            {tab === "discover" && (
              <motion.div key="discover" {...fade} className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Explore Domains</p>
                <div className="grid grid-cols-3 gap-3">
                  {["Tradesmen","Musicians","Creatives","Coaches","Professionals","Developers","Designers","Fitness","Business"].map(d => {
                    const cfg = domainConfig(d);
                    const count = DEMO_PEOPLE.filter(p => p.domain === d).length;
                    return (
                      <button key={d} onClick={() => navigate(`/discover/${d.toLowerCase()}`)}
                        className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3 text-left hover:border-indigo-500/30 hover:bg-[#1e2235] transition-all">
                        <span className="text-xl">{cfg?.emoji}</span>
                        <p className="text-xs font-semibold text-white mt-1.5">{d}</p>
                        <p className="text-[10px] text-slate-500">{count} people</p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function PersonCard({ person, onClick, showConnection, showCycleWeek }: {
  person: Person; onClick: () => void;
  showConnection?: boolean; showCycleWeek?: boolean;
}) {
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick}
      className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-left hover:border-indigo-500/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{person.name}</p>
          <p className="text-[10px] text-slate-500 truncate">{person.subdomain}</p>
          <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-0.5">
            <MapPin size={8} /> {person.location}
          </p>
          {showCycleWeek && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-400">
              <Zap size={8} /> Week {person.currentCycleWeek}
            </span>
          )}
          {showConnection && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-green-400">
              <UserCheck size={8} /> Connected
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
        <span className="flex items-center gap-1 text-[10px] text-indigo-400">
          <Shield size={8} /> {person.trustScore}
        </span>
        <span className={`text-[10px] font-medium ${availabilityColor(person.availability)}`}>
          {availabilityLabel(person.availability)}
        </span>
      </div>
    </motion.button>
  );
}

function SuggestedCard({ person, score, onClick }: { person: Person; score: number; onClick: () => void }) {
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick}
      className="w-full bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-left hover:border-indigo-500/25 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{person.name}</p>
          <p className="text-[11px] text-slate-400">{person.subdomain} · {person.location}</p>
        </div>
        <div className={`text-right shrink-0 ${DiscoveryMatchingEngine.getColor(score)}`}>
          <p className="text-base font-bold">{score}%</p>
          <p className="text-[10px]">{DiscoveryMatchingEngine.getLabel(score)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Shield size={9} /> {person.trustScore}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Star size={9} /> {person.proofCount} proof
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Zap size={9} /> {person.cyclesCompleted} cycles
        </div>
        <span className={`ml-auto text-[10px] font-medium ${availabilityColor(person.availability)}`}>
          {availabilityLabel(person.availability)}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex-1 py-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-[11px] font-semibold hover:bg-indigo-600/25 transition-colors flex items-center justify-center gap-1">
          <UserPlus size={10} /> Connect
        </button>
        <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 text-[11px] hover:bg-white/[0.07] transition-colors flex items-center gap-1">
          <MessageSquare size={10} /> Message
        </button>
      </div>
    </motion.button>
  );
}

function PendingCard({ person, onClick }: { person: Person; onClick: () => void }) {
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick}
      className="w-full bg-[#1c1f2e] border border-amber-500/15 rounded-xl p-4 text-left hover:border-amber-500/25 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {person.avatar ?? person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{person.name}</p>
          <p className="text-[11px] text-slate-400">{person.subdomain}</p>
        </div>
        <span className="text-[10px] text-amber-400 flex items-center gap-1 shrink-0">
          <Clock size={9} /> Pending
        </span>
      </div>
    </motion.button>
  );
}

function EmptyState({ icon, title, subtitle, action }: {
  icon: React.ReactNode; title: string; subtitle: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="flex justify-center">{icon}</div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-500 max-w-xs mx-auto">{subtitle}</p>
      {action && (
        <button onClick={action.onClick}
          className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
