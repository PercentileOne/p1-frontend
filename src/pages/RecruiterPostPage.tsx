import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, FileText, DollarSign,
  MapPin, Zap, Sparkles, Send, Plus, X,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   JOB POSTING FLOW  /recruiter/post
   7-step wizard
   ══════════════════════════════════════════════════════════════ */

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS = [
  { n: 1 as Step, label: "Job Title" },
  { n: 2 as Step, label: "Description" },
  { n: 3 as Step, label: "Requirements" },
  { n: 4 as Step, label: "Salary" },
  { n: 5 as Step, label: "Location" },
  { n: 6 as Step, label: "Skills & Proof" },
  { n: 7 as Step, label: "Publish" },
];

const PROOF_TYPES = ["Portfolio", "Case study", "Code sample", "Video demo", "Certificate", "Client testimonial", "Photo evidence", "Reference letter"];
const SKILL_SUGGESTIONS = ["Leadership", "Product Strategy", "Data Analysis", "TypeScript", "React", "SQL", "Project Management", "Communication", "Figma", "Python", "Machine Learning", "Sales"];

export default function RecruiterPostPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form state
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [requirements, setReqs]   = useState<string[]>(["", "", ""]);
  const [salaryMin, setSalMin]     = useState("60000");
  const [salaryMax, setSalMax]     = useState("80000");
  const [location, setLocation]   = useState("");
  const [remote, setRemote]       = useState(true);
  const [jobType, setJobType]     = useState("full-time");
  const [skills, setSkills]       = useState<string[]>([]);
  const [proofRequired, setProofReq] = useState(false);
  const [proofTypes, setProofTypes]  = useState<string[]>([]);
  const [autoMatch, setAutoMatch]    = useState(true);
  const [visionMatch, setVisionMatch] = useState(true);
  const [cycleMatch, setCycleMatch]   = useState(true);

  const updateReq = (i: number, val: string) => {
    setReqs(prev => { const n = [...prev]; n[i] = val; return n; });
  };

  const toggleSkill = (s: string) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleProofType = (p: string) => {
    setProofTypes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handlePublish = async () => {
    setPublishing(true);
    await new Promise(r => setTimeout(r, 1600));
    setPublishing(false);
    setPublished(true);
  };

  if (published) return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-6 text-slate-200">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mb-6 shadow-2xl shadow-green-900/50">
        <CheckCircle2 size={36} className="text-white" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center max-w-sm">
        <h2 className="text-2xl font-bold text-white mb-2">Job Published!</h2>
        <p className="text-slate-400 text-sm mb-6">
          <span className="text-white font-semibold">{title || "Your role"}</span> is now live. P1's AI is already finding matches.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate("/recruiter")} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
            Go to Dashboard
          </button>
          <button onClick={() => navigate("/jobs")} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors">
            View as Candidate
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate("/recruiter")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold text-white">Post a Job</h1>
        <div className="ml-auto text-xs text-slate-500">Step {step} of {STEPS.length}</div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">

        {/* Step pills */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
          {STEPS.map(s => (
            <div key={s.n} className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
              step === s.n ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300" :
              step > s.n   ? "bg-green-600/10 border border-green-500/20 text-green-400" :
              "bg-white/[0.03] border border-white/[0.06] text-slate-600"
            }`}>
              {step > s.n ? "✓ " : ""}{s.label}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}>

            {/* Step 1: Title */}
            {step === 1 && (
              <PostCard title="What's the job title?" subtitle="Be specific — 'Senior Product Manager' beats 'PM Needed'">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Product Manager"
                  className="w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white text-lg font-semibold placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                <div className="mt-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Job Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {["full-time","part-time","contract","freelance","remote"].map(t => (
                      <button key={t} onClick={() => setJobType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          jobType === t ? "bg-indigo-600/20 border border-indigo-500/25 text-indigo-300" : "bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200"
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
              </PostCard>
            )}

            {/* Step 2: Description */}
            {step === 2 && (
              <PostCard title="Describe the role" subtitle="Explain the opportunity in plain language. Be honest about the challenge.">
                <textarea value={description} onChange={e => setDesc(e.target.value)}
                  placeholder="We're looking for a… You'll be responsible for… This role is for someone who…"
                  rows={8}
                  className="w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none" />
                <p className="text-[11px] text-slate-600 mt-2">{description.length}/2000 characters</p>
              </PostCard>
            )}

            {/* Step 3: Requirements */}
            {step === 3 && (
              <PostCard title="What do you require?" subtitle="List the non-negotiable requirements for this role">
                <div className="space-y-2.5">
                  {requirements.map((r, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-[10px] text-indigo-400 font-bold shrink-0">{i + 1}</div>
                      <input value={r} onChange={e => updateReq(i, e.target.value)}
                        placeholder={`Requirement ${i + 1}…`}
                        className="flex-1 px-3 py-2 bg-[#0f1117] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                      {requirements.length > 1 && (
                        <button onClick={() => setReqs(prev => prev.filter((_, j) => j !== i))}
                          className="text-slate-600 hover:text-red-400 transition-colors"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setReqs(prev => [...prev, ""])}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                    <Plus size={12} /> Add requirement
                  </button>
                </div>
              </PostCard>
            )}

            {/* Step 4: Salary */}
            {step === 4 && (
              <PostCard title="What's the salary?" subtitle="Transparency attracts better candidates">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Minimum (£)</p>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="number" value={salaryMin} onChange={e => setSalMin(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-[#0f1117] border border-white/[0.08] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Maximum (£)</p>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="number" value={salaryMax} onChange={e => setSalMax(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-[#0f1117] border border-white/[0.08] rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                    </div>
                  </div>
                </div>
                {salaryMin && salaryMax && (
                  <div className="mt-4 p-3 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
                    <p className="text-sm text-indigo-300 font-semibold">
                      £{Number(salaryMin).toLocaleString()} – £{Number(salaryMax).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">This will be shown to candidates</p>
                  </div>
                )}
              </PostCard>
            )}

            {/* Step 5: Location */}
            {step === 5 && (
              <PostCard title="Where is this role?" subtitle="Location and remote options affect your candidate pool significantly">
                <div className="space-y-4">
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={location} onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. London, UK / Remote (UK) / Manchester"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#0f1117] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.05]">
                    <div>
                      <p className="text-sm font-semibold text-white">Remote OK?</p>
                      <p className="text-[11px] text-slate-500">Candidates can work remotely</p>
                    </div>
                    <button onClick={() => setRemote(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${remote ? "bg-indigo-600" : "bg-slate-700"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${remote ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                </div>
              </PostCard>
            )}

            {/* Step 6: Skills & Proof */}
            {step === 6 && (
              <PostCard title="Skills & Proof Requirements" subtitle="Select required skills and whether proof is needed">
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => toggleSkill(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            skills.includes(s) ? "bg-indigo-600/20 border border-indigo-500/25 text-indigo-300" : "bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200"
                          }`}>{skills.includes(s) ? "✓ " : ""}{s}</button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">{skills.length} selected</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.05]">
                    <div>
                      <p className="text-sm font-semibold text-white">Require Proof?</p>
                      <p className="text-[11px] text-slate-500">Candidates must attach verified proof</p>
                    </div>
                    <button onClick={() => setProofReq(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${proofRequired ? "bg-indigo-600" : "bg-slate-700"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${proofRequired ? "translate-x-4" : ""}`} />
                    </button>
                  </div>

                  {proofRequired && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Accepted Proof Types</p>
                      <div className="flex flex-wrap gap-2">
                        {PROOF_TYPES.map(p => (
                          <button key={p} onClick={() => toggleProofType(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              proofTypes.includes(p) ? "bg-green-600/10 border border-green-500/20 text-green-400" : "bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200"
                            }`}>{proofTypes.includes(p) ? "✓ " : ""}{p}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Auto-match settings */}
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Auto-Match Settings</p>
                    {[
                      { label: "Match by Vision Alignment", sub: "Surface candidates whose Vision aligns with this role", val: visionMatch, set: setVisionMatch },
                      { label: "Match by Cycle History", sub: "Prioritise candidates with active 12-week cycles", val: cycleMatch, set: setCycleMatch },
                      { label: "Auto-Match Enabled", sub: "Automatically rank applicants by AI match score", val: autoMatch, set: setAutoMatch },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-white/[0.05] mb-2">
                        <div>
                          <p className="text-xs font-semibold text-white">{row.label}</p>
                          <p className="text-[10px] text-slate-500">{row.sub}</p>
                        </div>
                        <button onClick={() => row.set(v => !v)}
                          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${row.val ? "bg-indigo-600" : "bg-slate-700"}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${row.val ? "translate-x-4" : ""}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </PostCard>
            )}

            {/* Step 7: Review & Publish */}
            {step === 7 && (
              <PostCard title="Ready to publish?" subtitle="Review your job post before going live">
                <div className="space-y-3">
                  <ReviewRow label="Title"        value={title || "—"} />
                  <ReviewRow label="Type"         value={jobType} />
                  <ReviewRow label="Salary"       value={salaryMin && salaryMax ? `£${Number(salaryMin).toLocaleString()} – £${Number(salaryMax).toLocaleString()}` : "—"} />
                  <ReviewRow label="Location"     value={`${location || "—"}${remote ? " (Remote OK)" : ""}`} />
                  <ReviewRow label="Skills"       value={skills.length ? skills.join(", ") : "None selected"} />
                  <ReviewRow label="Proof Req"    value={proofRequired ? `Yes (${proofTypes.length} types)` : "Not required"} />
                  <ReviewRow label="Auto-Match"   value={autoMatch ? "Enabled" : "Disabled"} />

                  <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles size={11} className="text-indigo-400" />
                      <span className="text-[11px] text-indigo-300 font-semibold">AI Matching Active</span>
                    </div>
                    <p className="text-[11px] text-slate-400">P1 will automatically surface matched candidates based on Vision, Goals, Skills, Proof, Cycles, and Behaviour scores.</p>
                  </div>

                  <button onClick={handlePublish} disabled={publishing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-900/40 disabled:opacity-60">
                    {publishing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</>
                    ) : (
                      <><Send size={14} /> Publish Job</>
                    )}
                  </button>
                </div>
              </PostCard>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        {step < 7 && (
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => setStep((step - 1) as Step)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button onClick={() => setStep((step + 1) as Step)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
              {step === 6 ? "Review Post" : "Continue"} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-6">
      <h2 className="text-base font-bold text-white mb-1">{title}</h2>
      <p className="text-[12px] text-slate-500 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-2 border-b border-white/[0.04]">
      <p className="text-xs text-slate-500 w-24 shrink-0">{label}</p>
      <p className="text-xs text-slate-300 flex-1">{value}</p>
    </div>
  );
}
