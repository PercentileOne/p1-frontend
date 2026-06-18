import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, User, Image, Zap, Shield,
  Send, Sparkles, Trophy, Clock, Star,
} from "lucide-react";
import { getJobById, CURRENT_JOB_USER, JobMatchingEngine } from "../lib/jobsEngine";

/* ══════════════════════════════════════════════════════════════
   APPLICATION FLOW  /jobs/:id/apply
   5-step wizard
   ══════════════════════════════════════════════════════════════ */

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { n: 1 as Step, label: "Your Profile",    icon: <User size={13} /> },
  { n: 2 as Step, label: "Add Proof",       icon: <Image size={13} /> },
  { n: 3 as Step, label: "Cycle History",   icon: <Zap size={13} /> },
  { n: 4 as Step, label: "Trust Score",     icon: <Shield size={13} /> },
  { n: 5 as Step, label: "Submit",          icon: <Send size={13} /> },
];

export default function JobApplyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [attachProof, setAttachProof] = useState(true);
  const [attachCycles, setAttachCycles] = useState(true);
  const [attachTrust, setAttachTrust] = useState(true);
  const [selectedProofTypes, setSelectedProofTypes] = useState<Set<string>>(new Set(["portfolio", "case study"]));

  const job  = getJobById(id ?? "");
  const user = CURRENT_JOB_USER;

  if (!job) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Job not found. <button onClick={() => navigate("/jobs")} className="ml-2 text-indigo-400 hover:underline">Back</button>
    </div>
  );

  const match = JobMatchingEngine.overallMatchScore(user, job);

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1800));
    setSubmitting(false);
    setSubmitted(true);
  };

  const toggleProofType = (t: string) => {
    setSelectedProofTypes(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  if (submitted) return <SuccessScreen job={job} match={match.overall} onDone={() => navigate("/jobs")} />;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate(`/jobs/${id}`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white">Applying — {job.title}</h1>
          <p className="text-[11px] text-slate-500">{job.company}</p>
        </div>
        <div className="ml-auto">
          <span className={`text-sm font-bold ${JobMatchingEngine.getMatchColor(match.overall)}`}>
            {match.overall}% match
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* ── Step progress ── */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-1 flex-1 ${i > 0 ? "relative" : ""}`}>
                {i > 0 && (
                  <div className={`absolute top-[13px] right-1/2 w-full h-px ${step > s.n - 1 ? "bg-indigo-500/50" : "bg-white/[0.06]"}`} />
                )}
                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border text-[11px] transition-all ${
                  step === s.n ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50" :
                  step > s.n   ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400" :
                                 "bg-[#1c1f2e] border-white/[0.08] text-slate-600"
                }`}>
                  {step > s.n ? <CheckCircle2 size={11} /> : s.icon}
                </div>
                <span className={`text-[9px] font-semibold whitespace-nowrap ${
                  step === s.n ? "text-indigo-300" : step > s.n ? "text-slate-500" : "text-slate-700"
                }`}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Step content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >

            {/* Step 1: Profile */}
            {step === 1 && (
              <StepCard title="Your P1 Profile" subtitle="This is your auto-generated CV based on your P1 data">
                <div className="space-y-4">
                  <ProfileSection label="About You">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                        FC
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">Founder · Percentile.One</p>
                        <p className="text-xs text-slate-500">United Kingdom</p>
                      </div>
                    </div>
                  </ProfileSection>
                  <ProfileSection label="Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 text-[11px]">{s}</span>
                      ))}
                    </div>
                  </ProfileSection>
                  <ProfileSection label="Active Goals">
                    <ul className="space-y-1.5">
                      {user.activeGoalTitles.map(g => (
                        <li key={g} className="flex items-center gap-2 text-xs text-slate-300">
                          <Trophy size={10} className="text-amber-400 shrink-0" /> {g}
                        </li>
                      ))}
                    </ul>
                  </ProfileSection>
                  <ProfileSection label="Vision Areas">
                    <div className="flex flex-wrap gap-1.5">
                      {user.visionAreas.map(a => (
                        <span key={a} className="px-2 py-0.5 rounded-md bg-violet-600/10 border border-violet-500/20 text-violet-300 text-[11px]">{a}</span>
                      ))}
                    </div>
                  </ProfileSection>
                  <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-xl p-3">
                    <p className="text-[11px] text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={11} /> This profile is automatically built from your P1 Goals, Vision, Skills, and Cycle history.
                    </p>
                  </div>
                </div>
              </StepCard>
            )}

            {/* Step 2: Add Proof */}
            {step === 2 && (
              <StepCard title="Add Proof" subtitle="Verified proof dramatically increases your application strength">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.05]">
                    <div>
                      <p className="text-sm font-semibold text-white">Attach Proof to Application</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">You have {user.proofCount} verified submissions</p>
                    </div>
                    <Toggle value={attachProof} onChange={setAttachProof} />
                  </div>

                  {attachProof && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Select proof types to include:</p>
                      {["Portfolio / project", "Case study", "Video demo", "GitHub", "Certificate", "Client testimonial", "Photo evidence"].map(t => (
                        <label key={t} className="flex items-center gap-3 p-3 bg-[#0f1117] rounded-xl border border-white/[0.05] cursor-pointer hover:border-indigo-500/20 transition-colors">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            selectedProofTypes.has(t) ? "bg-indigo-600 border-indigo-500" : "border-white/20"
                          }`} onClick={() => toggleProofType(t)}>
                            {selectedProofTypes.has(t) && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className="text-sm text-slate-300">{t}</span>
                          {selectedProofTypes.has(t) && <span className="ml-auto text-[10px] text-green-400 font-semibold">Included</span>}
                        </label>
                      ))}
                      <div className="bg-green-600/5 border border-green-500/15 rounded-xl p-3">
                        <p className="text-[11px] text-green-400">
                          <CheckCircle2 size={11} className="inline mr-1" />
                          Including {selectedProofTypes.size} proof types gives you a {Math.min(match.overall + 8, 100)}% match score boost.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </StepCard>
            )}

            {/* Step 3: Cycle History */}
            {step === 3 && (
              <StepCard title="Add Cycle History" subtitle="Your 12-week cycles demonstrate structured commitment">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.05]">
                    <div>
                      <p className="text-sm font-semibold text-white">Include Cycle History</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{user.cyclesCompleted} completed cycles</p>
                    </div>
                    <Toggle value={attachCycles} onChange={setAttachCycles} />
                  </div>

                  {attachCycles && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {[
                        { name: "Cycle 3 — Summer 2026", weeks: "Week 1–6 (In Progress)", momentum: 72, goals: 5 },
                        { name: "Cycle 2 — Spring 2026", weeks: "12 Weeks Complete", momentum: 84, goals: 4 },
                        { name: "Cycle 1 — Winter 2025", weeks: "12 Weeks Complete", momentum: 68, goals: 3 },
                      ].map((c, i) => (
                        <div key={c.name} className={`p-4 rounded-xl border ${i === 0 ? "bg-indigo-600/5 border-indigo-500/20" : "bg-[#0f1117] border-white/[0.06]"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-white">{c.name}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              c.momentum >= 80 ? "text-green-400 bg-green-600/10 border-green-500/20" :
                              c.momentum >= 60 ? "text-amber-400 bg-amber-600/10 border-amber-500/20" :
                              "text-slate-400 bg-slate-600/10 border-slate-500/20"
                            }`}>{c.momentum}% momentum</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{c.weeks} · {c.goals} goals</p>
                          {i === 0 && <p className="text-[10px] text-indigo-400 mt-1.5">Current cycle — included automatically</p>}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </StepCard>
            )}

            {/* Step 4: Trust Score */}
            {step === 4 && (
              <StepCard title="Add Trust Score" subtitle="Your P1 Trust Score demonstrates behavioural integrity">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.05]">
                    <div>
                      <p className="text-sm font-semibold text-white">Share Trust Score</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">This is optional but powerful</p>
                    </div>
                    <Toggle value={attachTrust} onChange={setAttachTrust} />
                  </div>

                  {attachTrust && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <ScoreCard label="Trust Score" value={user.trustScore} desc="Verified completions" color="text-indigo-400" />
                        <ScoreCard label="Behaviour Score" value={user.behaviourScore} desc="Consistency & velocity" color="text-violet-400" />
                      </div>
                      <div className="p-3 bg-[#0f1117] rounded-xl border border-white/[0.05]">
                        <p className="text-xs text-slate-400">
                          <Star size={11} className="inline text-yellow-400 mr-1" />
                          <span className="font-semibold text-white">{user.proofCount} verified completions</span> — all submissions that recruiters can view with your permission.
                        </p>
                      </div>
                      <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-xl p-3">
                        <p className="text-[11px] text-indigo-300">
                          <Sparkles size={11} className="inline mr-1" />
                          Sharing your Trust Score tells recruiters that your achievements are verified — not just self-reported. This is a significant differentiator.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Cover note */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2">Cover Note (optional)</p>
                    <textarea
                      value={coverNote}
                      onChange={e => setCoverNote(e.target.value)}
                      placeholder="Add a short note to the recruiter…"
                      rows={3}
                      className="w-full bg-[#0f1117] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
                    />
                  </div>
                </div>
              </StepCard>
            )}

            {/* Step 5: Confirm & Submit */}
            {step === 5 && (
              <StepCard title="Review & Submit" subtitle="Check your application before sending">
                <div className="space-y-4">
                  <SummaryRow label="Applying for" value={`${job.title} at ${job.company}`} />
                  <SummaryRow label="Match Score" value={`${match.overall}% — ${JobMatchingEngine.getMatchLabel(match.overall)}`} />
                  <SummaryRow label="Profile" value="Auto-generated from P1 data" check />
                  <SummaryRow label="Proof" value={attachProof ? `${selectedProofTypes.size} proof types included` : "Not included"} check={attachProof} />
                  <SummaryRow label="Cycle History" value={attachCycles ? `${user.cyclesCompleted} cycles included` : "Not included"} check={attachCycles} />
                  <SummaryRow label="Trust Score" value={attachTrust ? `${user.trustScore}/100 shared` : "Not included"} check={attachTrust} />
                  {coverNote && <SummaryRow label="Cover Note" value={coverNote.slice(0, 60) + (coverNote.length > 60 ? "…" : "")} check />}

                  <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={12} className="text-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-300">Application Strength</span>
                    </div>
                    <div className="w-full bg-white/[0.05] rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${Math.min(match.overall + (attachProof ? 5 : 0) + (attachCycles ? 5 : 0) + (attachTrust ? 5 : 0), 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Your application is stronger than most. The recruiter will see your verified proof and cycle history.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <><Send size={14} /> Submit Application</>
                    )}
                  </button>
                </div>
              </StepCard>
            )}

          </motion.div>
        </AnimatePresence>

        {/* ── Nav buttons ── */}
        {step < 5 && (
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as Step)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={() => setStep((step + 1) as Step)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              {step === 4 ? "Review Application" : "Continue"} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Success screen ── */
function SuccessScreen({ job, onDone }: { job: any; match?: number; onDone: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-900/60"
      >
        <CheckCircle2 size={36} className="text-white" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center max-w-sm"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Application Sent!</h2>
        <p className="text-slate-400 text-sm mb-1">
          Your P1-powered application for <span className="text-white font-semibold">{job.title}</span> at <span className="text-white font-semibold">{job.company}</span> has been submitted.
        </p>
        <p className="text-slate-500 text-[12px] mb-6">Your verified proof and cycle history are attached. The recruiter has been notified.</p>
        <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-4 mb-6 text-left">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">What happens next</p>
          {[
            "Recruiter reviews your P1 application within 5 working days",
            "You'll receive a notification if shortlisted",
            "Your Trust Score is shared with your permission",
            "Track application status in your Jobs dashboard",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-[9px] text-indigo-400 font-bold shrink-0">{i + 1}</div>
              <p className="text-[12px] text-slate-400 leading-snug">{s}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onDone} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
            Browse More Jobs
          </button>
          <button onClick={() => window.history.back()} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors">
            <Clock size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Sub-components ── */
function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-6">
      <h2 className="text-base font-bold text-white mb-1">{title}</h2>
      <p className="text-[12px] text-slate-500 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function ProfileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${value ? "bg-indigo-600" : "bg-slate-700"}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4.5" : ""}`} />
    </button>
  );
}

function ScoreCard({ label, value, desc, color }: { label: string; value: number; desc: string; color: string }) {
  return (
    <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-3.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold mb-0.5 ${color}`}>{value}<span className="text-base text-slate-600">/100</span></p>
      <div className="w-full bg-white/[0.05] rounded-full h-1 mb-1">
        <div className={`h-1 rounded-full bg-current ${color}`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-[10px] text-slate-600">{desc}</p>
    </div>
  );
}

function SummaryRow({ label, value, check }: { label: string; value: string; check?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
      <p className="text-xs text-slate-500 w-28 shrink-0">{label}</p>
      <div className="flex items-center gap-1.5 flex-1">
        {check && <CheckCircle2 size={11} className="text-green-400 shrink-0" />}
        <p className="text-xs text-slate-300">{value}</p>
      </div>
    </div>
  );
}