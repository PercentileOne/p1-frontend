import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Sparkles, Shield,
  Zap, Star,
} from "lucide-react";
import {
  getApplicationById, getJobById, JobMatchingEngine,
} from "../lib/jobsEngine";
import type { AppStatus } from "../lib/jobsEngine";

/* ══════════════════════════════════════════════════════════════
   APPLICANT REVIEW PAGE  /recruiter/applicants/:id
   ══════════════════════════════════════════════════════════════ */

export default function RecruiterApplicantPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus]     = useState<AppStatus | null>(null);
  const [processing, setProcessing] = useState(false);

  const app = getApplicationById(id ?? "");
  const job = app ? getJobById(app.jobId) : null;

  if (!app || !job) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Applicant not found. <button onClick={() => navigate("/recruiter")} className="ml-2 text-indigo-400 hover:underline">Back</button>
    </div>
  );

  const currentStatus = status ?? app.status;

  const doAction = async (newStatus: AppStatus) => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 600));
    setStatus(newStatus);
    setProcessing(false);
  };

  const matchScore = app.matchScore;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate(`/recruiter/jobs/${job.id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white">{app.userName}</h1>
          <p className="text-[11px] text-slate-500">Applied for {job.title}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {currentStatus !== "shortlisted" && (
            <button onClick={() => doAction("shortlisted")} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/15 border border-green-500/25 text-green-300 text-xs font-semibold hover:bg-green-600/25 transition-colors disabled:opacity-50">
              <CheckCircle2 size={12} /> Shortlist
            </button>
          )}
          {currentStatus !== "rejected" && (
            <button onClick={() => doAction("rejected")} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-600/20 transition-colors disabled:opacity-50">
              <XCircle size={12} /> Reject
            </button>
          )}
          {currentStatus !== "offered" && currentStatus === "shortlisted" && (
            <button onClick={() => doAction("offered")} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
              <Star size={12} /> Make Offer
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Status */}
        {processing ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600/8 border border-indigo-500/20">
            <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            <p className="text-sm text-indigo-300">Processing…</p>
          </div>
        ) : (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            currentStatus === "shortlisted" ? "bg-green-600/8 border-green-500/20" :
            currentStatus === "offered"     ? "bg-violet-600/8 border-violet-500/20" :
            currentStatus === "rejected"    ? "bg-red-600/8 border-red-500/20" :
            currentStatus === "reviewed"    ? "bg-blue-600/8 border-blue-500/20" :
            "bg-amber-600/8 border-amber-500/20"
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              currentStatus === "shortlisted" ? "bg-green-400" :
              currentStatus === "offered"     ? "bg-violet-400 animate-pulse" :
              currentStatus === "rejected"    ? "bg-red-400" :
              "bg-amber-400"
            }`} />
            <p className={`text-sm font-semibold capitalize ${
              currentStatus === "shortlisted" ? "text-green-300" :
              currentStatus === "offered"     ? "text-violet-300" :
              currentStatus === "rejected"    ? "text-red-300" :
              "text-amber-300"
            }`}>Status: {currentStatus}</p>
            <span className="text-[11px] text-slate-500 ml-1">· Applied {app.submittedAt.toLocaleDateString("en-GB", { day:"numeric", month:"short" })}</span>
          </div>
        )}

        {/* Hero card */}
        <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl">
                {app.userName.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{app.userName}</h2>
                <p className="text-xs text-slate-400">P1 Verified Candidate</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {app.proofAttached        && <Chip color="text-green-400 bg-green-600/10 border-green-500/20" icon={<CheckCircle2 size={9} />} text="Proof attached" />}
                  {app.cycleHistoryAttached && <Chip color="text-blue-400 bg-blue-600/10 border-blue-500/20" icon={<Zap size={9} />} text="Cycle history" />}
                  {app.trustScoreAttached   && <Chip color="text-indigo-400 bg-indigo-600/10 border-indigo-500/20" icon={<Shield size={9} />} text="Trust shared" />}
                </div>
              </div>
            </div>

            {/* Match ring */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="6" />
                <circle cx="36" cy="36" r="30" fill="none"
                  stroke={matchScore >= 85 ? "#4ade80" : matchScore >= 70 ? "#34d399" : matchScore >= 55 ? "#60a5fa" : "#fbbf24"}
                  strokeWidth="6" strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - matchScore / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 36 36)" />
                <text x="36" y="37" textAnchor="middle" dominantBaseline="middle"
                  fontSize="15" fontWeight="bold"
                  fill={matchScore >= 85 ? "#4ade80" : matchScore >= 70 ? "#34d399" : "#60a5fa"}>{matchScore}%</text>
              </svg>
              <p className={`text-[11px] font-bold ${JobMatchingEngine.getMatchColor(matchScore)}`}>
                {JobMatchingEngine.getMatchLabel(matchScore)}
              </p>
            </div>
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreBlock label="Trust Score" value={app.userTrustScore} color="text-indigo-400" desc="Verified completions record" />
            <ScoreBlock label="Behaviour Score" value={app.userBehaviourScore} color="text-violet-400" desc="Consistency & velocity" />
          </div>
        </div>

        {/* Agent analysis */}
        <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">AI Candidate Analysis</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {app.userName} is a <span className={`font-bold ${JobMatchingEngine.getMatchColor(matchScore)}`}>{matchScore}% match</span> for the {job.title} role.
            {" "}They have completed <span className="text-white font-semibold">{app.cyclesCompleted} 12-week cycles</span> — demonstrating sustained execution ability.
            {app.proofAttached ? " Their application includes verified proof." : " They have not included proof — consider requesting before decision."}
            {" "}Trust Score of <span className="text-indigo-300 font-semibold">{app.userTrustScore}/100</span> suggests a {app.userTrustScore >= 75 ? "high-integrity candidate with a strong verification record." : "developing track record — worth discussing in interview."}
          </p>
        </div>

        {/* Skills */}
        <SectionCard title="Skills">
          <div className="flex flex-wrap gap-2">
            {app.skills.map(s => {
              const matched = job.skills.some(js => js.toLowerCase().includes(s.toLowerCase().split(" ")[0]) || s.toLowerCase().includes(js.toLowerCase().split(" ")[0]));
              return (
                <span key={s} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  matched ? "bg-green-600/10 border-green-500/20 text-green-400" : "bg-white/[0.04] border-white/[0.06] text-slate-400"
                }`}>{matched ? "✓ " : ""}{s}</span>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-600 mt-2">Green = matches job requirements</p>
        </SectionCard>

        {/* Cycle history */}
        {app.cycleHistoryAttached && (
          <SectionCard title="Cycle History">
            <div className="space-y-2">
              {[
                { name: "Cycle 3 — Summer 2026", status: "In Progress", momentum: 72 },
                { name: "Cycle 2 — Spring 2026",  status: "Completed",   momentum: 84 },
                { name: "Cycle 1 — Winter 2025",  status: "Completed",   momentum: 68 },
              ].slice(0, app.cyclesCompleted + 1).map(c => (
                <div key={c.name} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.06]">
                  <div>
                    <p className="text-xs font-semibold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.status}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.momentum >= 80 ? "bg-green-600/10 border-green-500/20 text-green-400" :
                    c.momentum >= 60 ? "bg-amber-600/10 border-amber-500/20 text-amber-400" :
                    "bg-slate-600/10 border-slate-500/20 text-slate-400"
                  }`}>{c.momentum}% momentum</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Proof types */}
        {app.proofAttached && app.topProofTypes.length > 0 && (
          <SectionCard title="Proof Submitted">
            <div className="flex flex-wrap gap-2">
              {app.topProofTypes.map(p => (
                <span key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-500/20 text-green-400 text-xs">
                  <CheckCircle2 size={10} /> {p}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Cover note */}
        {app.coverNote && (
          <SectionCard title="Cover Note">
            <p className="text-sm text-slate-300 leading-relaxed italic">"{app.coverNote}"</p>
          </SectionCard>
        )}

        {/* Action bar */}
        <div className="flex gap-3 pt-2">
          {currentStatus !== "shortlisted" && currentStatus !== "offered" && (
            <button onClick={() => doAction("shortlisted")} disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600/15 border border-green-500/25 text-green-300 text-sm font-semibold hover:bg-green-600/25 transition-colors disabled:opacity-50">
              <CheckCircle2 size={14} /> Shortlist Candidate
            </button>
          )}
          {currentStatus === "shortlisted" && (
            <button onClick={() => doAction("offered")} disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
              <Star size={14} /> Make Offer
            </button>
          )}
          {currentStatus !== "rejected" && (
            <button onClick={() => doAction("rejected")} disabled={processing}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-300 text-sm font-semibold hover:bg-red-600/20 transition-colors disabled:opacity-50">
              <XCircle size={14} /> Reject
            </button>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Helpers ── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</p>
      {children}
    </div>
  );
}

function ScoreBlock({ label, value, color, desc }: { label: string; value: number; color: string; desc: string }) {
  return (
    <div className="bg-[#0f1117]/60 border border-white/[0.04] rounded-xl p-3.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end gap-1 mb-1.5">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-slate-600 text-sm mb-0.5">/100</span>
      </div>
      <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-1">
        <div className={`h-1.5 rounded-full bg-current ${color}`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-[10px] text-slate-600">{desc}</p>
    </div>
  );
}

function Chip({ color, icon, text }: { color: string; icon: React.ReactNode; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${color}`}>
      {icon} {text}
    </span>
  );
}
