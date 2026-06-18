import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Search, MapPin, DollarSign, Sparkles, TrendingUp,
  Star, Filter, ChevronRight, Eye, Users, CheckCircle2, Zap,
  Target, Trophy, ArrowLeft, Wifi, Clock,
} from "lucide-react";
import {
  DEMO_JOBS, CURRENT_JOB_USER, JobMatchingEngine,
  getFeaturedJobs, getTrendingJobs, getJobsForUser,
  formatSalary, daysSince,
} from "../lib/jobsEngine";
import type { Job } from "../lib/jobsEngine";

/* ══════════════════════════════════════════════════════════════
   JOBS HOME  /jobs
   ══════════════════════════════════════════════════════════════ */

type FilterTab = "all" | "remote" | "full-time" | "contract";

export default function JobsHome() {
  const navigate = useNavigate();
  const [search, setSearch]     = useState("");
  const [location, setLocation] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [salaryMin, setSalaryMin] = useState(0);

  const user = CURRENT_JOB_USER;
  const featured  = getFeaturedJobs();
  const forYou    = getJobsForUser(user).slice(0, 4);
  const trending  = getTrendingJobs();
  const visionJobs = DEMO_JOBS.filter(j =>
    j.visionAreas.some(a => user.visionAreas.includes(a))
  ).slice(0, 3);
  const goalJobs = DEMO_JOBS.filter(j =>
    j.skills.some(s => user.skills.some(us => us.toLowerCase().includes(s.toLowerCase().split(" ")[0])))
  ).slice(0, 3);
  const proofJobs = DEMO_JOBS.filter(j => j.proofRequired).slice(0, 3);

  const filtered = DEMO_JOBS.filter(j => {
    const matchesSearch   = !search   || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = !location || j.location.toLowerCase().includes(location.toLowerCase());
    const matchesType     = filterTab === "all" || j.type === filterTab || (filterTab === "remote" && j.remote);
    const matchesSalary   = j.salaryMin >= salaryMin;
    return matchesSearch && matchesLocation && matchesType && matchesSalary;
  });

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-indigo-400" />
          <h1 className="text-sm font-semibold text-white">Jobs</h1>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate("/recruiter")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-xs font-medium hover:bg-indigo-600/25 transition-colors"
          >
            <Briefcase size={12} /> Recruiter Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">

        {/* ── Search bar ── */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Job title, company, or keyword…"
                className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f2e] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location…"
                className="pl-9 pr-4 py-2.5 w-44 bg-[#1c1f2e] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showFilters ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-[#1c1f2e] border-white/[0.08] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Filter size={14} /> Filters
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(["all","remote","full-time","contract"] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setFilterTab(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterTab === t
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/25"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {t === "all" ? "All Jobs" : t}
              </button>
            ))}
          </div>

          {/* Advanced filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: "hidden" }}
              >
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 flex gap-6 items-center">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Min Salary</p>
                    <select
                      value={salaryMin}
                      onChange={e => setSalaryMin(Number(e.target.value))}
                      className="bg-[#0f1117] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value={0}>Any</option>
                      <option value={40000}>£40k+</option>
                      <option value={60000}>£60k+</option>
                      <option value={80000}>£80k+</option>
                      <option value={100000}>£100k+</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Proof Required</p>
                    <div className="flex gap-2">
                      {["Any", "Yes", "No"].map(o => (
                        <button key={o} className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">{o}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Difficulty</p>
                    <div className="flex gap-2">
                      {["Any", "Entry", "Mid", "Senior", "Lead"].map(o => (
                        <button key={o} className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors capitalize">{o}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* If searching — show results */}
        {(search || location || filterTab !== "all" || salaryMin > 0) ? (
          <Section title={`${filtered.length} Results`} icon={<Search size={14} />}>
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm">No jobs match your filters.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filtered.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCard key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            )}
          </Section>
        ) : (
          <>
            {/* ── Featured ── */}
            <Section title="Featured Jobs" icon={<Star size={14} className="text-yellow-400" />}>
              <div className="grid grid-cols-2 gap-4">
                {featured.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCardFeatured key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            </Section>

            {/* ── AI Matched For You ── */}
            <Section
              title="Jobs For You"
              icon={<Sparkles size={14} className="text-indigo-400" />}
              badge="AI-Matched"
              sub="Based on your Vision, Goals, Skills, Proof, Cycle, and Behaviour"
            >
              <div className="grid grid-cols-2 gap-3">
                {forYou.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCard key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            </Section>

            {/* ── Based on Vision ── */}
            <Section
              title="Based on Your Vision"
              icon={<Target size={14} className="text-violet-400" />}
              sub={`Aligned to: ${user.visionAreas.join(", ")}`}
            >
              <div className="grid grid-cols-3 gap-3">
                {visionJobs.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCardCompact key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            </Section>

            {/* ── Based on Goals ── */}
            <Section
              title="Based on Your Goals"
              icon={<Trophy size={14} className="text-amber-400" />}
              sub="Roles requiring skills you are currently building in your cycle"
            >
              <div className="grid grid-cols-3 gap-3">
                {goalJobs.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCardCompact key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            </Section>

            {/* ── Based on Proof ── */}
            <Section
              title="Based on Your Proof"
              icon={<CheckCircle2 size={14} className="text-green-400" />}
              sub={`You have ${user.proofCount} verified proof submissions — these roles value that`}
            >
              <div className="grid grid-cols-3 gap-3">
                {proofJobs.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCardCompact key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            </Section>

            {/* ── Trending ── */}
            <Section title="Trending Roles" icon={<TrendingUp size={14} className="text-blue-400" />}>
              <div className="grid grid-cols-4 gap-3">
                {trending.map(job => {
                  const score = JobMatchingEngine.overallMatchScore(user, job);
                  return <JobCardCompact key={job.id} job={job} score={score.overall} onNavigate={() => navigate(`/jobs/${job.id}`)} />;
                })}
              </div>
            </Section>
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, icon, badge, sub, children }: {
  title: string; icon: React.ReactNode; badge?: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {badge && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600/15 border border-indigo-500/25 text-[10px] text-indigo-300 font-semibold">
            <Sparkles size={9} /> {badge}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-500 mb-3 -mt-1">{sub}</p>}
      {children}
    </div>
  );
}

/* ── Featured Job Card (large) ── */
function JobCardFeatured({ job, score, onNavigate }: { job: Job; score: number; onNavigate: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(99,102,241,0.12)" }}
      onClick={onNavigate}
      className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:border-indigo-500/25"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900/60 to-violet-900/60 border border-white/10 flex items-center justify-center text-xl">
            {job.companyLogo}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{job.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
          </div>
        </div>
        <MatchBadge score={score} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <MetaChip icon={<DollarSign size={10} />} text={job.salary} />
        <MetaChip icon={<MapPin size={10} />} text={job.location} />
        {job.remote && <MetaChip icon={<Wifi size={10} />} text="Remote OK" accent />}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-4">{job.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><Eye size={9} /> {job.views}</span>
          <span className="flex items-center gap-1"><Users size={9} /> {job.applicants} applicants</span>
          <span className="flex items-center gap-1"><Clock size={9} /> {daysSince(job.postedDaysAgo)}</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onNavigate(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
        >
          Quick Apply <ChevronRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Standard Job Card ── */
function JobCard({ job, score, onNavigate }: { job: Job; score: number; onNavigate: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      onClick={onNavigate}
      className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-indigo-500/20"
    >
      <div className="flex items-start gap-3 mb-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-base shrink-0">
          {job.companyLogo}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{job.title}</p>
          <p className="text-[11px] text-slate-500 truncate">{job.company} · {job.location}</p>
        </div>
        <MatchBadge score={score} small />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <MetaChip icon={<DollarSign size={9} />} text={job.salary} />
        {job.remote && <MetaChip icon={<Wifi size={9} />} text="Remote" accent />}
        {job.proofRequired && <MetaChip icon={<CheckCircle2 size={9} />} text="Proof req." green />}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-600">{daysSince(job.postedDaysAgo)}</span>
        <ChevronRight size={12} className="text-slate-600" />
      </div>
    </motion.div>
  );
}

/* ── Compact Job Card ── */
function JobCardCompact({ job, score, onNavigate }: { job: Job; score: number; onNavigate: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      onClick={onNavigate}
      className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 cursor-pointer transition-all hover:border-indigo-500/20"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-sm shrink-0">
          {job.companyLogo}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">{job.title}</p>
          <p className="text-[10px] text-slate-500 truncate">{job.company}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{job.salary.split("–")[0].trim()}</span>
        <MatchBadge score={score} small />
      </div>
    </motion.div>
  );
}

/* ── Match Score Badge ── */
function MatchBadge({ score, small }: { score: number; small?: boolean }) {
  const color = JobMatchingEngine.getMatchColor(score);
  const bg    = JobMatchingEngine.getMatchBg(score);
  const label = JobMatchingEngine.getMatchLabel(score);
  if (small) {
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${bg} ${color}`}>
        {score}%
      </span>
    );
  }
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${bg}`}>
      <Zap size={10} className={color} />
      <span className={`text-[10px] font-bold ${color}`}>{score}% · {label}</span>
    </div>
  );
}

/* ── Meta chip ── */
function MetaChip({ icon, text, accent, green }: { icon: React.ReactNode; text: string; accent?: boolean; green?: boolean }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
      accent ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400" :
      green  ? "bg-green-600/10 border-green-500/20 text-green-400" :
               "bg-white/[0.04] border-white/[0.06] text-slate-400"
    }`}>
      {icon} {text}
    </span>
  );
}
