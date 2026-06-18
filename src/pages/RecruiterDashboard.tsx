import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Briefcase, Users, Eye, CheckCircle2, TrendingUp,
  Sparkles, ChevronRight, Filter, Star, Shield, Zap,
} from "lucide-react";
import {
  DEMO_JOBS, DEMO_APPLICATIONS, DEMO_RECRUITER_POSTS,
  JobMatchingEngine,
} from "../lib/jobsEngine";
import type { JobApplication } from "../lib/jobsEngine";

/* ══════════════════════════════════════════════════════════════
   RECRUITER DASHBOARD  /recruiter
   ══════════════════════════════════════════════════════════════ */

type Tab = "jobs" | "applicants" | "analytics";
type ApplicantSort = "match" | "trust" | "proof" | "cycles";

export default function RecruiterDashboard() {
  const navigate  = useNavigate();
  const [tab, setTab]     = useState<Tab>("jobs");
  const [sortBy, setSortBy] = useState<ApplicantSort>("match");
  const [filterTrustMin, setFilterTrustMin] = useState(0);
  const [filterProof, setFilterProof] = useState(false);

  const myJobs = DEMO_RECRUITER_POSTS.map(p => ({
    ...p,
    job: DEMO_JOBS.find(j => j.id === p.jobId)!,
  })).filter(p => p.job);

  const allApplicants = [...DEMO_APPLICATIONS].filter(a => filterTrustMin === 0 || a.userTrustScore >= filterTrustMin)
    .filter(a => !filterProof || a.proofAttached)
    .sort((a, b) => {
      if (sortBy === "match") return b.matchScore - a.matchScore;
      if (sortBy === "trust") return b.userTrustScore - a.userTrustScore;
      if (sortBy === "proof") return Number(b.proofAttached) - Number(a.proofAttached);
      if (sortBy === "cycles") return b.cyclesCompleted - a.cyclesCompleted;
      return 0;
    });

  const totalApplicants = myJobs.reduce((sum, p) => sum + p.applicants, 0);
  const totalViews      = myJobs.reduce((sum, p) => sum + p.views, 0);
  const totalMatches    = myJobs.reduce((sum, p) => sum + p.matches, 0);
  const totalProofs     = myJobs.reduce((sum, p) => sum + p.proofSubmissions, 0);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/jobs")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-indigo-400" />
          <h1 className="text-sm font-semibold text-white">Recruiter Dashboard</h1>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate("/recruiter/post")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={14} /> Post a Job
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard icon={<Eye size={16} />} label="Total Views" value={totalViews.toLocaleString()} color="text-blue-400" bg="bg-blue-600/10 border-blue-500/20" />
          <KPICard icon={<Users size={16} />} label="Applicants" value={totalApplicants.toString()} color="text-indigo-400" bg="bg-indigo-600/10 border-indigo-500/20" />
          <KPICard icon={<Zap size={16} />} label="AI Matches" value={totalMatches.toString()} color="text-violet-400" bg="bg-violet-600/10 border-violet-500/20" />
          <KPICard icon={<CheckCircle2 size={16} />} label="Proof Subs" value={totalProofs.toString()} color="text-green-400" bg="bg-green-600/10 border-green-500/20" />
        </div>

        {/* ── Agent insight ── */}
        <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Recruiter Intelligence</span>
          </div>
          <p className="text-sm text-slate-300">
            Your top active role (<span className="text-white font-medium">Senior Product Manager</span>) has 3 shortlisted applicants with Trust Scores above 85.
            {" "}The Head of Growth role is getting the most views — consider adding proof requirements to filter for quality.
          </p>
        </div>

        {/* ── Tab nav ── */}
        <div className="flex gap-1 border-b border-white/[0.06] pb-0">
          {(["jobs", "applicants", "analytics"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? "border-indigo-500 text-indigo-300" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab: Jobs ── */}
        {tab === "jobs" && (
          <div className="space-y-3">
            {myJobs.map(p => (
              <motion.div key={p.jobId} whileHover={{ y: -1 }}
                className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900/60 to-violet-900/60 border border-white/10 flex items-center justify-center text-xl">
                      {p.job.companyLogo}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{p.job.title}</p>
                      <p className="text-xs text-slate-500">{p.job.location} · {p.job.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      p.status === "active" ? "bg-green-600/10 border-green-500/20 text-green-400" :
                      p.status === "paused" ? "bg-amber-600/10 border-amber-500/20 text-amber-400" :
                      "bg-slate-600/10 border-slate-500/20 text-slate-400"
                    }`}>{p.status}</span>
                    <button onClick={() => navigate(`/recruiter/jobs/${p.jobId}`)}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors">
                      Manage <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <StatCell icon={<Eye size={12} />} label="Views" value={p.views} color="text-blue-400" />
                  <StatCell icon={<Users size={12} />} label="Applicants" value={p.applicants} color="text-indigo-400" />
                  <StatCell icon={<Zap size={12} />} label="AI Matches" value={p.matches} color="text-violet-400" />
                  <StatCell icon={<CheckCircle2 size={12} />} label="Proof Subs" value={p.proofSubmissions} color="text-green-400" />
                </div>
              </motion.div>
            ))}

            <button
              onClick={() => navigate("/recruiter/post")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-white/10 text-slate-500 hover:border-indigo-500/30 hover:text-indigo-400 transition-colors text-sm font-medium"
            >
              <Plus size={15} /> Post New Job
            </button>
          </div>
        )}

        {/* ── Tab: Applicants ── */}
        {tab === "applicants" && (
          <div className="space-y-4">

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Filter size={12} /> Filters:
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Min Trust Score:</span>
                <select value={filterTrustMin} onChange={e => setFilterTrustMin(Number(e.target.value))}
                  className="bg-[#1c1f2e] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none">
                  <option value={0}>Any</option>
                  <option value={60}>60+</option>
                  <option value={75}>75+</option>
                  <option value={85}>85+</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={filterProof} onChange={e => setFilterProof(e.target.checked)}
                  className="accent-indigo-500 w-3 h-3" />
                <span className="text-[11px] text-slate-400">Proof attached only</span>
              </label>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Sort by:</span>
                {(["match","trust","proof","cycles"] as ApplicantSort[]).map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                      sortBy === s ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/25" : "text-slate-500 hover:text-slate-300"
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            {allApplicants.map(app => (
              <ApplicantCard key={app.id} app={app} onView={() => navigate(`/recruiter/applicants/${app.id}`)} />
            ))}
          </div>
        )}

        {/* ── Tab: Analytics ── */}
        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <AnalyticsCard title="Application Quality" icon={<Star size={14} />}>
                <div className="space-y-3">
                  <AnalyticsBar label="With Proof" pct={62} color="bg-green-500" />
                  <AnalyticsBar label="Cycle History" pct={48} color="bg-indigo-500" />
                  <AnalyticsBar label="Trust Score 75+" pct={31} color="bg-violet-500" />
                  <AnalyticsBar label="All Three" pct={18} color="bg-amber-500" />
                </div>
              </AnalyticsCard>
              <AnalyticsCard title="Trust Score Distribution" icon={<Shield size={14} />}>
                <div className="space-y-3">
                  <AnalyticsBar label="85–100 (Excellent)" pct={22} color="bg-green-500" />
                  <AnalyticsBar label="70–84 (Strong)"     pct={34} color="bg-blue-500" />
                  <AnalyticsBar label="55–69 (Good)"       pct={28} color="bg-amber-500" />
                  <AnalyticsBar label="Below 55"           pct={16} color="bg-slate-500" />
                </div>
              </AnalyticsCard>
              <AnalyticsCard title="Match Score vs Hire Rate" icon={<TrendingUp size={14} />}>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Applicants with match scores <span className="text-green-400 font-semibold">≥80%</span> are 3.2× more likely to be shortlisted. AI matching is working.
                </p>
              </AnalyticsCard>
              <AnalyticsCard title="Proof Impact" icon={<CheckCircle2 size={14} />}>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Applications with verified proof have a <span className="text-indigo-400 font-semibold">67% higher</span> shortlist rate vs. those without. Require proof on all future roles.
                </p>
              </AnalyticsCard>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Applicant Card ── */
function ApplicantCard({ app, onView }: { app: JobApplication; onView: () => void }) {
  const job = DEMO_JOBS.find(j => j.id === app.jobId);
  return (
    <motion.div whileHover={{ y: -1 }}
      className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
            {app.userName.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{app.userName}</p>
            {job && <p className="text-xs text-slate-500">Applied for {job.title}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                app.status === "shortlisted" ? "bg-green-600/10 border-green-500/20 text-green-400" :
                app.status === "reviewed"    ? "bg-blue-600/10 border-blue-500/20 text-blue-400" :
                app.status === "rejected"    ? "bg-red-600/10 border-red-500/20 text-red-400" :
                "bg-amber-600/10 border-amber-500/20 text-amber-400"
              } capitalize`}>{app.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-center px-3 py-1.5 rounded-xl border ${JobMatchingEngine.getMatchBg(app.matchScore)}`}>
            <p className={`text-base font-bold ${JobMatchingEngine.getMatchColor(app.matchScore)}`}>{app.matchScore}%</p>
            <p className="text-[9px] text-slate-500">match</p>
          </div>
          <button onClick={onView}
            className="flex items-center gap-1.5 text-xs text-indigo-400 border border-indigo-500/25 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors font-medium">
            View <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <ScoreBar label="Trust" value={app.userTrustScore} color="text-indigo-400" />
        <ScoreBar label="Behaviour" value={app.userBehaviourScore} color="text-violet-400" />
        <ScoreBar label="Cycles" value={app.cyclesCompleted * 20} color="text-amber-400" raw={`${app.cyclesCompleted} done`} />
        <ScoreBar label="Proof" value={app.proofAttached ? 100 : 0} color="text-green-400" raw={app.proofAttached ? "Attached" : "None"} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {app.skills.slice(0, 4).map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400">{s}</span>
        ))}
        {app.cycleHistoryAttached && <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400">Cycle history</span>}
        {app.trustScoreAttached   && <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">Trust score shared</span>}
      </div>
    </motion.div>
  );
}

/* ── Primitives ── */
function KPICard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`bg-[#1c1f2e] border rounded-2xl p-4 ${bg}`}>
      <div className={`${color} mb-2`}>{icon}</div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#0f1117]/60 border border-white/[0.04] rounded-xl px-3 py-2.5">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>{icon}<span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span></div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ScoreBar({ label, value, color, raw }: { label: string; value: number; color: string; raw?: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className={`text-[10px] font-bold ${color}`}>{raw ?? `${value}%`}</span>
      </div>
      <div className="w-full bg-white/[0.05] rounded-full h-1">
        <div className={`h-1 rounded-full bg-current ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function AnalyticsCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      </div>
      {children}
    </div>
  );
}

function AnalyticsBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold text-slate-300">{pct}%</span>
      </div>
      <div className="w-full bg-white/[0.05] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
