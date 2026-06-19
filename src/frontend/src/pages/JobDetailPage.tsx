import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Briefcase, MapPin, DollarSign, Clock, Users, Eye,
  Sparkles, CheckCircle2, AlertCircle, Zap, Target, ChevronRight,
  Wifi, Building2, Star, Trophy, Shield,
} from "lucide-react";
import {
  getJobById, CURRENT_JOB_USER, JobMatchingEngine,
  daysSince, DEMO_JOBS,
} from "../lib/jobsEngine";

/* ══════════════════════════════════════════════════════════════
   JOB DETAIL PAGE  /jobs/:id
   ══════════════════════════════════════════════════════════════ */

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "company" | "match" | "cycle">("overview");

  const job  = getJobById(id ?? "");
  const user = CURRENT_JOB_USER;

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-3">Job not found.</p>
          <button onClick={() => navigate("/jobs")} className="text-indigo-400 text-sm hover:underline">Back to Jobs</button>
        </div>
      </div>
    );
  }

  const match = JobMatchingEngine.overallMatchScore(user, job);

  // Proof user has: based on count
  const proofHave = job.proofTypes.slice(0, Math.min(Math.ceil(user.proofCount / 8), job.proofTypes.length));
  const proofNeed = job.proofTypes.filter(p => !proofHave.includes(p));

  // Cycle plan to prepare (12-week)
  const CYCLE_PLAN = [
    { week: "1–2",  focus: "Skills Audit", desc: `Map your current skills against the ${job.title} requirements. Identify the top 3 gaps.` },
    { week: "3–4",  focus: "Targeted Learning", desc: `Begin structured learning for: ${job.skills.slice(0, 2).join(", ")}.` },
    { week: "5–6",  focus: "Proof Building", desc: `Complete at least 2 proof submissions in your current goals aligned to this role.` },
    { week: "7–8",  focus: "Portfolio Creation", desc: `Create or update your P1 portfolio. Add ${job.proofRequired ? "verified proof assets" : "project examples"}.` },
    { week: "9–10", focus: "Network & Research", desc: `Connect with 3 people at ${job.company} or in the ${job.industry} space. Research the role deeply.` },
    { week: "11",   focus: "Application Prep", desc: `Finalise your P1 application profile, attach cycle history and proof, write your cover note.` },
    { week: "12",   focus: "Submit & Follow Up", desc: `Submit application via P1. Follow up in 5 working days. Debrief and iterate.` },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/jobs")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{job.companyLogo}</span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{job.title}</h1>
            <p className="text-[11px] text-slate-500">{job.company}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate(`/jobs/${job.id}/apply`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/40"
          >
            Apply Now <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ── Hero ── */}
        <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-violet-900/60 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                {job.companyLogo}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{job.title}</h2>
                <p className="text-sm text-slate-400">{job.company} · {job.industry}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Chip icon={<DollarSign size={11} />} text={job.salary} />
                  <Chip icon={<MapPin size={11} />} text={job.location} />
                  <Chip icon={<Briefcase size={11} />} text={job.type} />
                  {job.remote && <Chip icon={<Wifi size={11} />} text="Remote OK" accent />}
                  <Chip icon={<Clock size={11} />} text={`Posted ${daysSince(job.postedDaysAgo)}`} />
                </div>
              </div>
            </div>

            {/* Match ring */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <MatchRing score={match.overall} size={72} />
              <p className={`text-[11px] font-bold ${JobMatchingEngine.getMatchColor(match.overall)}`}>
                {JobMatchingEngine.getMatchLabel(match.overall)}
              </p>
            </div>
          </div>

          <div className="flex gap-6 mt-4 pt-4 border-t border-white/[0.06] text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><Eye size={11} /> {job.views} views</span>
            <span className="flex items-center gap-1.5"><Users size={11} /> {job.applicants} applicants</span>
            <span className="flex items-center gap-1.5"><Star size={11} /> {job.difficulty} level</span>
            {job.proofRequired && <span className="flex items-center gap-1.5 text-amber-400"><CheckCircle2 size={11} /> Proof required</span>}
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-0">
          {(["overview","company","match","cycle"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "match" ? "Why You Match" : tab === "cycle" ? "12-Week Plan" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Section title="About the Role">
              <p className="text-sm text-slate-300 leading-relaxed">{job.description}</p>
            </Section>
            <Section title="Responsibilities">
              <ul className="space-y-2">
                {job.responsibilities.map(r => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 mt-2 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Requirements">
              <ul className="space-y-2">
                {job.requirements.map(r => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 size={13} className="text-indigo-400 mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {job.skills.map(s => (
                  <span key={s} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    user.skills.some(us => us.toLowerCase().includes(s.toLowerCase().split(" ")[0]))
                      ? "bg-green-600/10 border-green-500/25 text-green-400"
                      : "bg-white/[0.04] border-white/[0.06] text-slate-400"
                  }`}>
                    {user.skills.some(us => us.toLowerCase().includes(s.toLowerCase().split(" ")[0])) && "✓ "}
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-600 mt-2">Green = you already have this skill</p>
            </Section>
          </motion.div>
        )}

        {/* ── Tab: Company ── */}
        {activeTab === "company" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-2xl">
                  {job.companyLogo}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{job.company}</h3>
                  <p className="text-xs text-slate-500">{job.industry} · {job.companySize}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">{job.companySummary}</p>
              <div className="grid grid-cols-3 gap-3">
                <CompanyMeta icon={<Building2 size={12} />} label="Industry" value={job.industry} />
                <CompanyMeta icon={<Users size={12} />} label="Size" value={job.companySize} />
                <CompanyMeta icon={<MapPin size={12} />} label="Location" value={job.location} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Why You Match ── */}
        {activeTab === "match" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Agent summary */}
            <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-300">AI Match Analysis</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                You are a <span className={`font-bold ${JobMatchingEngine.getMatchColor(match.overall)}`}>{match.overall}% match</span> for this role.
                {match.breakdown.length > 0 && ` ${match.breakdown.join(". ")}.`}
                {" "}Your {user.cyclesCompleted} completed cycles and {user.proofCount} verified proof submissions strengthen your application significantly.
              </p>
            </div>

            {/* Match dimensions */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Vision Alignment", value: match.vision, icon: <Target size={13} />, desc: "Your vision areas match this role's domain" },
                { label: "Goals Match", value: match.goals, icon: <Trophy size={13} />, desc: "Your active goals build required skills" },
                { label: "Skills Match", value: match.skills, icon: <Zap size={13} />, desc: "Overlap between your skills and requirements" },
                { label: "Proof Record", value: match.proof, icon: <CheckCircle2 size={13} />, desc: `${user.proofCount} verified submissions on file` },
                { label: "Cycle Progress", value: match.cycle, icon: <Zap size={13} />, desc: `${user.cyclesCompleted} cycles completed, ${user.currentCycleProgress}% through current` },
                { label: "Behaviour Score", value: match.behaviour, icon: <Shield size={13} />, desc: `Trust ${user.trustScore} · Behaviour ${user.behaviourScore}` },
              ].map(d => (
                <div key={d.label} className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={JobMatchingEngine.getMatchColor(d.value)}>{d.icon}</span>
                    <span className="text-[11px] font-semibold text-slate-300">{d.label}</span>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className={`text-2xl font-bold ${JobMatchingEngine.getMatchColor(d.value)}`}>{d.value}</span>
                    <span className="text-slate-600 text-sm mb-0.5">%</span>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-1 mb-2">
                    <div className={`h-1 rounded-full bg-current ${JobMatchingEngine.getMatchColor(d.value)}`} style={{ width: `${d.value}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-600 leading-snug">{d.desc}</p>
                </div>
              ))}
            </div>

            {/* Proof you have / need */}
            {job.proofRequired && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-600/5 border border-green-500/15 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Proof You Already Have
                  </p>
                  {proofHave.length > 0 ? (
                    <ul className="space-y-1.5">
                      {proofHave.map(p => (
                        <li key={p} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 size={11} className="text-green-400 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-slate-500">No matching proof yet.</p>}
                </div>
                <div className="bg-amber-600/5 border border-amber-500/15 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                    <AlertCircle size={12} /> Proof You Still Need
                  </p>
                  {proofNeed.length > 0 ? (
                    <ul className="space-y-1.5">
                      {proofNeed.map(p => (
                        <li key={p} className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="w-2.5 h-2.5 rounded-full border border-amber-500/40 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-green-400">You have all required proof types! 🎉</p>}
                </div>
              </div>
            )}

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3">Your Strengths for This Role</p>
                {match.strengths.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {match.strengths.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-green-600/10 border border-green-500/20 text-green-400 text-[11px]">✓ {s}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-500">Build more skills in this area.</p>}
              </div>
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3">Skills to Develop</p>
                {match.gaps.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {match.gaps.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[11px]">{s}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-green-400">You have all required skills!</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: 12-Week Cycle Plan ── */}
        {activeTab === "cycle" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-300">Auto-Generated 12-Week Preparation Plan</span>
              </div>
              <p className="text-[11px] text-slate-400">
                This plan was built specifically to make you job-ready for <span className="text-white font-medium">{job.title} at {job.company}</span>.
                Start a new cycle with this as your theme to track your progress.
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[22px] top-4 bottom-4 w-px bg-indigo-500/20" />
              <div className="space-y-3">
                {CYCLE_PLAN.map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-11 h-11 rounded-full bg-indigo-600/15 border border-indigo-500/25 flex flex-col items-center justify-center shrink-0 z-10">
                      <span className="text-[9px] text-indigo-400 font-semibold leading-none">Wk</span>
                      <span className="text-[11px] text-indigo-300 font-bold leading-none">{step.week}</span>
                    </div>
                    <div className="flex-1 bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5">
                      <p className="text-sm font-semibold text-white mb-1">{step.focus}</p>
                      <p className="text-[12px] text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate("/cycle/weekly-planning")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-sm font-semibold hover:bg-indigo-600/25 transition-colors"
            >
              <Zap size={14} /> Start This Cycle Plan
            </button>
          </motion.div>
        )}

        {/* ── Apply CTA ── */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => navigate(`/jobs/${job.id}/apply`)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-900/40"
          >
            Apply with P1 Profile <ChevronRight size={14} />
          </button>
          <button
            onClick={() => navigate("/jobs")}
            className="px-5 py-3.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Save
          </button>
        </div>

        {/* Related jobs */}
        <div className="mt-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Similar Roles</p>
          <div className="grid grid-cols-3 gap-3">
            {DEMO_JOBS.filter(j => j.id !== job.id && j.industry === job.industry).slice(0, 3).map(j => {
              const s = JobMatchingEngine.overallMatchScore(user, j);
              return (
                <div key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}
                  className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:border-indigo-500/20 transition-colors">
                  <p className="text-xs font-semibold text-white truncate mb-1">{j.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{j.company}</p>
                  <p className={`text-[10px] font-bold mt-1.5 ${JobMatchingEngine.getMatchColor(s.overall)}`}>{s.overall}% match</p>
                </div>
              );
            })}
            {DEMO_JOBS.filter(j => j.id !== job.id && j.industry === job.industry).length === 0 &&
              DEMO_JOBS.filter(j => j.id !== job.id).slice(0, 3).map(j => {
                const s = JobMatchingEngine.overallMatchScore(user, j);
                return (
                  <div key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}
                    className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:border-indigo-500/20 transition-colors">
                    <p className="text-xs font-semibold text-white truncate mb-1">{j.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{j.company}</p>
                    <p className={`text-[10px] font-bold mt-1.5 ${JobMatchingEngine.getMatchColor(s.overall)}`}>{s.overall}% match</p>
                  </div>
                );
              })
            }
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</p>
      {children}
    </div>
  );
}

function Chip({ icon, text, accent }: { icon: React.ReactNode; text: string; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
      accent
        ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400"
        : "bg-white/[0.04] border-white/[0.06] text-slate-400"
    }`}>
      {icon} {text}
    </span>
  );
}

function CompanyMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1 text-slate-500">{icon}<span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span></div>
      <p className="text-xs text-slate-300">{value}</p>
    </div>
  );
}

function MatchRing({ score, size }: { score: number; size: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 85 ? "#4ade80" : score >= 70 ? "#34d399" : score >= 55 ? "#60a5fa" : score >= 40 ? "#fbbf24" : "#94a3b8";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="bold" fill={color}>{score}%</text>
    </svg>
  );
}
