import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Eye, Users, CheckCircle2, Zap, ChevronRight,
  Pause, Play, Archive, Sparkles,
} from "lucide-react";
import {
  getJobById, getApplicationsByJob, DEMO_RECRUITER_POSTS, JobMatchingEngine,
} from "../lib/jobsEngine";
import type { JobApplication } from "../lib/jobsEngine";

/* ══════════════════════════════════════════════════════════════
   MANAGE JOB POSTING  /recruiter/jobs/:id
   ══════════════════════════════════════════════════════════════ */

export default function RecruiterJobPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [status, setStatus] = useState<"active" | "paused" | "closed">(
    DEMO_RECRUITER_POSTS.find(p => p.jobId === id)?.status ?? "active"
  );

  const job   = getJobById(id ?? "");
  const post  = DEMO_RECRUITER_POSTS.find(p => p.jobId === id);
  const apps  = getApplicationsByJob(id ?? "");

  if (!job || !post) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Job not found. <button onClick={() => navigate("/recruiter")} className="ml-2 text-indigo-400 hover:underline">Back</button>
    </div>
  );

  const shortlisted = apps.filter(a => a.status === "shortlisted");
  const pending     = apps.filter(a => a.status === "pending");

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/recruiter")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{job.companyLogo}</span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{job.title}</h1>
            <p className="text-[11px] text-slate-500">{job.company}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {status === "active" && (
            <button onClick={() => setStatus("paused")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/10 border border-amber-500/25 text-amber-300 text-xs font-medium hover:bg-amber-600/20 transition-colors">
              <Pause size={12} /> Pause
            </button>
          )}
          {status === "paused" && (
            <button onClick={() => setStatus("active")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-500/25 text-green-300 text-xs font-medium hover:bg-green-600/20 transition-colors">
              <Play size={12} /> Resume
            </button>
          )}
          <button onClick={() => setStatus("closed")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/25 text-red-300 text-xs font-medium hover:bg-red-600/20 transition-colors">
            <Archive size={12} /> Close Role
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Status banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          status === "active" ? "bg-green-600/8 border-green-500/20" :
          status === "paused" ? "bg-amber-600/8 border-amber-500/20" :
          "bg-red-600/8 border-red-500/20"
        }`}>
          <div className={`w-2 h-2 rounded-full ${status === "active" ? "bg-green-400 animate-pulse" : status === "paused" ? "bg-amber-400" : "bg-red-400"}`} />
          <p className={`text-sm font-semibold capitalize ${status === "active" ? "text-green-300" : status === "paused" ? "text-amber-300" : "text-red-300"}`}>
            {status} — {job.location}
          </p>
          {status === "active" && <span className="text-[11px] text-slate-500">AI matching is running</span>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <Eye size={16} />, label: "Views", value: post.views, color: "text-blue-400", bg: "bg-blue-600/10 border-blue-500/20" },
            { icon: <Users size={16} />, label: "Applicants", value: post.applicants, color: "text-indigo-400", bg: "bg-indigo-600/10 border-indigo-500/20" },
            { icon: <Zap size={16} />, label: "AI Matches", value: post.matches, color: "text-violet-400", bg: "bg-violet-600/10 border-violet-500/20" },
            { icon: <CheckCircle2 size={16} />, label: "Proof Subs", value: post.proofSubmissions, color: "text-green-400", bg: "bg-green-600/10 border-green-500/20" },
          ].map(s => (
            <div key={s.label} className={`bg-[#1c1f2e] border rounded-2xl p-4 ${s.bg}`}>
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Agent insight */}
        <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Agent Analysis</span>
          </div>
          <p className="text-sm text-slate-300">
            You have <span className="text-white font-semibold">{shortlisted.length} shortlisted</span> and <span className="text-white font-semibold">{pending.length} pending</span> applicants.
            {" "}{shortlisted[0] ? `${shortlisted[0].userName} is your highest-match candidate at ${shortlisted[0].matchScore}%.` : ""}
            {" "}Consider requiring proof — it filters for quality over volume.
          </p>
        </div>

        {/* Applicants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Applicants ({apps.length})</p>
            <button onClick={() => navigate("/recruiter")} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View all in dashboard
            </button>
          </div>
          <div className="space-y-3">
            {apps.length === 0 ? (
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-6 text-center">
                <p className="text-slate-500 text-sm">No applications yet. Share your job link to attract candidates.</p>
              </div>
            ) : apps.map(app => (
              <MiniApplicantCard key={app.id} app={app} onView={() => navigate(`/recruiter/applicants/${app.id}`)} />
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

function MiniApplicantCard({ app, onView }: { app: JobApplication; onView: () => void }) {
  return (
    <motion.div whileHover={{ y: -1 }}
      className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {app.userName.split(" ").map(n => n[0]).join("")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{app.userName}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
            app.status === "shortlisted" ? "bg-green-600/10 border-green-500/20 text-green-400" :
            app.status === "reviewed"    ? "bg-blue-600/10 border-blue-500/20 text-blue-400" :
            "bg-amber-600/10 border-amber-500/20 text-amber-400"
          } capitalize`}>{app.status}</span>
          {app.proofAttached        && <span className="text-[10px] text-green-400">✓ Proof</span>}
          {app.cycleHistoryAttached && <span className="text-[10px] text-blue-400">✓ Cycles</span>}
          {app.trustScoreAttached   && <span className="text-[10px] text-indigo-400">✓ Trust</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-base font-bold ${JobMatchingEngine.getMatchColor(app.matchScore)}`}>{app.matchScore}%</p>
        <p className="text-[10px] text-slate-600">match</p>
      </div>
      <button onClick={onView}
        className="flex items-center gap-1 text-xs text-indigo-400 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors shrink-0">
        View <ChevronRight size={11} />
      </button>
    </motion.div>
  );
}
