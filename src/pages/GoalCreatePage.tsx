import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, CheckCircle2, ChevronRight, Sparkles, Star, Trash2, Heart, Briefcase, Flame, FolderKanban,
  Target, TrendingUp, Trophy, Zap, Globe, Lock, Eye,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */
type Difficulty  = "easy" | "medium" | "hard" | "epic";
type Impact      = "low" | "moderate" | "high" | "transformational";
type Consistency = "one_off" | "habit" | "streak" | "multi_milestone";
type Visibility  = "public" | "private" | "password";

interface MilestoneItem {
  id: string; title: string; dueDate: string;
  effort: "low" | "medium" | "high"; points: number;
}

interface WizardData {
  goalType: string;
  title: string; description: string; whyMatters: string;
  visibility: Visibility; visibleToEmployers: boolean;
  mode: "life" | "work"; category: string;
  timeHorizon: string;
  milestones: MilestoneItem[];
  difficulty: Difficulty; impact: Impact; consistency: Consistency;
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */
const GOAL_TYPES = [
  { id:"life",     icon:<Heart size={18}/>,       label:"Life Goal",       desc:"Personal growth, health, relationships, or wellbeing.",       examples:["Get fit","Build savings","Improve sleep"],           agent:"Best for holistic life improvements." },
  { id:"work",     icon:<Briefcase size={18}/>,   label:"Work Goal",       desc:"Career, skills, projects, or professional development.",       examples:["Get promoted","Complete a course","Ship a feature"],  agent:"Great for career momentum." },
  { id:"habit",    icon:<Flame size={18}/>,       label:"Habit Goal",      desc:"Build or break a habit through consistent daily action.",      examples:["Meditate daily","No sugar","Read before bed"],       agent:"Pairs well with streak tracking." },
  { id:"streak",   icon:<Zap size={18}/>,         label:"Streak Goal",     desc:"Do something every single day for a defined number of days.", examples:["7-day fast","30 workouts","100 days of code"],       agent:"Highest points multiplier available." },
  { id:"project",  icon:<FolderKanban size={18}/>,label:"Project Goal",    desc:"Complete a multi-phase project with clear deliverables.",     examples:["Launch an app","Write a book","Build a website"],     agent:"Best broken into phases and sprints." },
  { id:"12week",   icon:<Target size={18}/>,      label:"12-Week Goal",    desc:"A focused goal within a 12-week performance cycle.",          examples:["Ship MVP","Lose 5kg","Read 6 books"],                 agent:"Recommended for most goals.", recommended:true },
  { id:"longterm", icon:<TrendingUp size={18}/>,  label:"Long-Term Goal",  desc:"A vision-level goal spanning 1–5 years.",                     examples:["Buy a house","Build a company","Financial freedom"],  agent:"Break into 12-week sub-goals." },
  { id:"challenge",icon:<Trophy size={18}/>,      label:"Challenge Goal",  desc:"A defined challenge: fasting, fitness, or discipline.",       examples:["7-day water fast","Cold showers 30 days","OMAD 14d"], agent:"Highest difficulty multiplier." },
] as const;

const LIFE_CATEGORIES = [
  "Health & Vitality","Friends & Family","Wealth","Fun & Relaxation",
  "Spirituality & Meaning","Life Admin","Projects & Planning","Continuous Learning",
];

const WORK_CATEGORIES = [
  "Career & Direction","Skills & Mastery","Workload & Productivity","Projects & Delivery",
  "Team & Collaboration","Money & Compensation","Reputation & Influence","Opportunities & Growth",
];

const TIME_HORIZONS = [
  { id:"12week",  label:"12-Week Cycle",    sub:"~84 days",   desc:"The optimal sprint for focused achievement.", recommended:true },
  { id:"short",   label:"Short Term",       sub:"1–3 months", desc:"Quick wins and immediate improvements." },
  { id:"medium",  label:"Medium Term",      sub:"3–12 months",desc:"Substantial goals requiring sustained effort." },
  { id:"long",    label:"Long Term",        sub:"1–3 years",  desc:"Career-level or life-changing goals." },
  { id:"vision",  label:"Vision-Aligned",   sub:"3–10 years", desc:"Your biggest, boldest ambitions." },
];

const DIFF_OPTIONS: { id: Difficulty; label: string; pts: number; cls: string }[] = [
  { id:"easy",  label:"Easy",   pts:100, cls:"text-green-400 border-green-400/30 bg-green-400/10"   },
  { id:"medium",label:"Medium", pts:250, cls:"text-blue-400 border-blue-400/30 bg-blue-400/10"     },
  { id:"hard",  label:"Hard",   pts:450, cls:"text-orange-400 border-orange-400/30 bg-orange-400/10"},
  { id:"epic",  label:"Epic",   pts:750, cls:"text-purple-400 border-purple-400/30 bg-purple-400/10"},
];

const IMPACT_OPTIONS: { id: Impact; label: string; mult: number }[] = [
  { id:"low",            label:"Low",            mult:1.0 },
  { id:"moderate",       label:"Moderate",       mult:1.2 },
  { id:"high",           label:"High",           mult:1.5 },
  { id:"transformational",label:"Transformational",mult:2.0},
];

const CONSISTENCY_OPTIONS: { id: Consistency; label: string; mult: number; desc: string }[] = [
  { id:"one_off",         label:"One-Off",         mult:1.0, desc:"A single achievement" },
  { id:"habit",           label:"Habit",           mult:1.1, desc:"Daily or weekly practice" },
  { id:"streak",          label:"Streak",          mult:1.3, desc:"Unbroken consecutive days" },
  { id:"multi_milestone", label:"Multi-Milestone", mult:1.2, desc:"Sequential progress steps" },
];

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function getSuggestions(title: string): string[] {
  const t = title.toLowerCase();
  if (t.includes("fast") || t.includes("intermittent") || t.includes("omad") || t.includes("water fast")) {
    return [
      "Complete a 7-Day Water Fast",
      "Do a 3-Day Reset Fast",
      "16:8 Intermittent Fasting — 30-Day Streak",
      "OMAD Challenge — 14 Days",
      "Complete a 5-Day Spiritual Fast",
    ];
  }
  if (t.includes("fitness") || t.includes("gym") || t.includes("run") || t.includes("workout")) {
    return [
      "Run a 5k Without Stopping",
      "Complete 30 Days of Strength Training",
      "Lose 5kg in 12 Weeks",
      "Do 100 Push-Ups a Day for 30 Days",
      "Complete a Half Marathon",
    ];
  }
  if (t.includes("career") || t.includes("promot") || t.includes("job")) {
    return [
      "Get Promoted to Senior Engineer",
      "Complete AWS Solutions Architect Certification",
      "Build a Professional Portfolio Website",
      "Land a Role at a Top-10 Tech Company",
    ];
  }
  if (t.includes("read") || t.includes("book")) {
    return [
      "Read 24 Books This Year",
      "Read 1 Book Per Week for 12 Weeks",
      "Complete the Stoic Reading List",
    ];
  }
  if (t.includes("save") || t.includes("money") || t.includes("invest")) {
    return [
      "Save £10,000 Emergency Fund",
      "Invest £500 Per Month for 12 Months",
      "Pay Off £5,000 in Debt",
    ];
  }
  return [];
}

function generateMilestones(title: string, goalType: string): MilestoneItem[] {
  const t = title.toLowerCase();
  const mkM = (id: string, mtitle: string, pts: number, effort: "low"|"medium"|"high" = "medium"): MilestoneItem =>
    ({ id, title: mtitle, dueDate: "", effort, points: pts });

  if (t.includes("7") && t.includes("fast")) {
    return Array.from({ length: 7 }, (_, i) => mkM(
      String(i+1),
      i===0 ? "Day 1 — First 24 hours complete" :
      i===3 ? "Day 4 — Halfway. Hardest part done." :
      i===6 ? "Day 7 — Goal complete ⭐" :
      `Day ${i+1} — Fast maintained`,
      i===0 ? 50 : i===6 ? 150 : 75,
      i===0 ? "low" : i>=5 ? "high" : "medium",
    ));
  }
  if (t.includes("intermittent") || t.includes("16:8") || t.includes("omad")) {
    return [
      mkM("1","Day 1 — First eating window maintained",30,"low"),
      mkM("2","Day 7 — One-week streak reached",60),
      mkM("3","Day 14 — Two-week consistency milestone",90),
      mkM("4","Day 21 — Habit locked in (21-day mark)",120,"high"),
      mkM("5","Day 30 — Full streak complete ⭐",200,"high"),
    ];
  }
  if (goalType === "project" || t.includes("launch") || t.includes("build") || t.includes("app")) {
    return [
      mkM("1","Phase 1 — Research & Planning",50,"low"),
      mkM("2","Phase 2 — First prototype complete",100),
      mkM("3","Phase 3 — Core features built",150,"high"),
      mkM("4","Phase 4 — Testing & refinement",75),
      mkM("5","Phase 5 — Launch ready ⭐",200,"high"),
    ];
  }
  return [
    mkM("1","Define success criteria clearly",25,"low"),
    mkM("2","First checkpoint — 25% complete",50),
    mkM("3","Midpoint review — 50% complete",75),
    mkM("4","Final push — 75% complete",100,"high"),
    mkM("5","Goal complete ⭐",150,"high"),
  ];
}

function calcPoints(d: Difficulty, i: Impact, c: Consistency, mCount: number): number {
  const base: Record<Difficulty, number>  = { easy:100, medium:250, hard:450, epic:750 };
  const iMul: Record<Impact, number>      = { low:1.0, moderate:1.2, high:1.5, transformational:2.0 };
  const cMul: Record<Consistency, number> = { one_off:1.0, habit:1.1, streak:1.3, multi_milestone:1.2 };
  return Math.round(base[d] * iMul[i] * cMul[c]) + mCount * 25;
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function GoalCreatePage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(1);
  const [launched, setLaunched] = useState(false);
  const [data, setData]       = useState<WizardData>({
    goalType:"", title:"", description:"", whyMatters:"",
    visibility:"private", visibleToEmployers:false,
    mode:"life", category:"", timeHorizon:"12week",
    milestones:[], difficulty:"medium", impact:"moderate", consistency:"multi_milestone",
  });

  const update = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData(prev => ({ ...prev, [key]: val }));

  const canAdvance = (): boolean => {
    if (step===1) return !!data.goalType;
    if (step===2) return data.title.trim().length > 2;
    if (step===3) return !!data.category;
    if (step===4) return !!data.timeHorizon;
    if (step===5) return data.milestones.length > 0;
    return true;
  };

  const totalPoints = calcPoints(data.difficulty, data.impact, data.consistency, data.milestones.length);
  const raffleEntries = Math.floor(totalPoints / 100);
  const streakBonus   = data.consistency === "streak" ? Math.round(totalPoints * 0.3) : 0;

  const STEP_LABELS = ["Goal Type","Define Goal","Category","Time Horizon","Milestones","Difficulty & Points","Review & Launch"];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06] flex items-center gap-3 px-6 h-14">
        <button onClick={() => navigate("/goals")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
          <ArrowLeft size={14}/> Goals Dashboard
        </button>
        <div className="w-px h-4 bg-white/10"/>
        <h1 className="text-sm font-semibold text-white">New Goal</h1>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => navigate("/vision")}
            className="text-xs text-slate-500 hover:text-indigo-300 transition-colors font-medium">
            Vision
          </button>
        <div className="flex items-center gap-1.5">
          {STEP_LABELS.map((_, i) => (
            <button key={i} onClick={() => i < step - 1 ? setStep(i+1) : undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                i+1 < step  ? "w-4 bg-indigo-400 cursor-pointer" :
                i+1 === step? "w-5 bg-indigo-500" :
                "w-2 bg-white/[0.1] cursor-default"
              }`}
              title={STEP_LABELS[i]}
            />
          ))}
          <span className="text-[11px] text-slate-500 ml-1 font-medium">{step}/7</span>
        </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6">

        {/* Completed step pills */}
        {step > 1 && (
          <div className="space-y-2 mb-4">
            {step>1 && <DoneStep num={1} label="Goal Type"        value={GOAL_TYPES.find(t=>t.id===data.goalType)?.label??""} onEdit={()=>setStep(1)}/>}
            {step>2 && <DoneStep num={2} label="Goal"             value={data.title}                                           onEdit={()=>setStep(2)}/>}
            {step>3 && <DoneStep num={3} label="Category"         value={data.category}                                        onEdit={()=>setStep(3)}/>}
            {step>4 && <DoneStep num={4} label="Time Horizon"     value={TIME_HORIZONS.find(h=>h.id===data.timeHorizon)?.label??""} onEdit={()=>setStep(4)}/>}
            {step>5 && <DoneStep num={5} label="Milestones"       value={`${data.milestones.length} milestones added`}         onEdit={()=>setStep(5)}/>}
            {step>6 && <DoneStep num={6} label="Difficulty"       value={`${data.difficulty.toUpperCase()} · ${totalPoints} pts`} onEdit={()=>setStep(6)}/>}
          </div>
        )}

        {/* Current step */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-14 }}
            transition={{ duration:0.2, ease:"easeOut" }}>
            {step===1 && <Step1 data={data} update={update}/>}
            {step===2 && <Step2 data={data} update={update}/>}
            {step===3 && <Step3 data={data} update={update}/>}
            {step===4 && <Step4 data={data} update={update}/>}
            {step===5 && <Step5 data={data} update={update}/>}
            {step===6 && <Step6 data={data} update={update} totalPoints={totalPoints} streakBonus={streakBonus} raffleEntries={raffleEntries}/>}
            {step===7 && <Step7 data={data} totalPoints={totalPoints} streakBonus={streakBonus} raffleEntries={raffleEntries} onLaunch={()=>setLaunched(true)}/>}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        {step < 7 && (
          <div className="flex items-center justify-between mt-4">
            {step > 1
              ? <button onClick={()=>setStep(s=>s-1)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium flex items-center gap-1"><ArrowLeft size={11}/>Back</button>
              : <div/>
            }
            <button onClick={()=>canAdvance()&&setStep(s=>s+1)} disabled={!canAdvance()}
              className={`flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 ${
                canAdvance()
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40"
                  : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
              }`}>
              Continue <ChevronRight size={14}/>
            </button>
          </div>
        )}
      </div>

      {/* Post-launch overlay */}
      <AnimatePresence>
        {launched && <LaunchSuccess data={data} totalPoints={totalPoints} raffleEntries={raffleEntries} navigate={navigate}/>}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 1 — CHOOSE GOAL TYPE
   ══════════════════════════════════════════════════════════════ */
function Step1({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k:K,v:WizardData[K])=>void }) {
  const setType = (id: string) => {
    update("goalType", id);
    if (id==="life") update("mode","life");
    if (id==="work") update("mode","work");
  };
  return (
    <StepCard num={1} title="Choose Goal Type" desc="What kind of goal is this?">
      <div className="grid grid-cols-2 gap-2.5">
        {GOAL_TYPES.map(t => (
          <button key={t.id} onClick={()=>setType(t.id)}
            className={`relative text-left p-4 rounded-xl border transition-all duration-150 group ${
              data.goalType===t.id
                ? "bg-indigo-600/15 border-indigo-500/50 shadow-[0_0_16px_rgba(99,102,241,0.12)]"
                : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]"
            }`}>
            {"recommended" in t && t.recommended && (
              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 uppercase tracking-wide">
                Recommended
              </span>
            )}
            <span className={`block mb-2 ${data.goalType===t.id?"text-indigo-400":"text-slate-500 group-hover:text-slate-300"} transition-colors`}>
              {t.icon}
            </span>
            <p className={`text-sm font-semibold mb-1 transition-colors ${data.goalType===t.id?"text-white":"text-slate-300"}`}>{t.label}</p>
            <p className="text-[11px] text-slate-500 leading-snug mb-2">{t.desc}</p>
            <div className="flex items-start gap-1.5 mt-auto">
              <Sparkles size={9} className="text-indigo-400/70 mt-0.5 shrink-0"/>
              <p className="text-[10px] text-indigo-400/70 leading-snug italic">{t.agent}</p>
            </div>
          </button>
        ))}
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 2 — DEFINE THE GOAL
   ══════════════════════════════════════════════════════════════ */
function Step2({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k:K,v:WizardData[K])=>void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const s = getSuggestions(data.title);
      setSuggestions(s);
      setShowSug(s.length > 0 && data.title.length > 2);
    }, 320);
    return () => clearTimeout(t);
  }, [data.title]);

  const isWork = data.mode === "work" || data.goalType === "work";

  return (
    <StepCard num={2} title="Define Your Goal" desc="Give your goal a clear, motivating name.">
      <div className="space-y-4">
        {/* Title */}
        <div className="relative">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Goal Title</label>
          <input
            value={data.title}
            onChange={e=>{update("title",e.target.value); setShowSug(false);}}
            onFocus={()=>suggestions.length>0&&setShowSug(true)}
            placeholder="e.g. Complete a 7-Day Water Fast"
            className="w-full bg-[#0f1117] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
          />
          <AnimatePresence>
            {showSug && (
              <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
                transition={{duration:0.15}}
                className="absolute z-10 left-0 right-0 top-full mt-1 bg-[#1c1f2e] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl shadow-black/40">
                {suggestions.map((s,i)=>(
                  <button key={i} onClick={()=>{update("title",s);setShowSug(false);}}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-indigo-600/10 hover:text-white transition-colors border-b border-white/[0.04] last:border-0">
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
          <textarea value={data.description} onChange={e=>update("description",e.target.value)} rows={3}
            placeholder="Describe what achieving this goal looks like…"
            className="w-full bg-[#0f1117] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all resize-none"/>
        </div>

        {/* Why it matters */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Why This Matters <span className="text-slate-700 font-normal normal-case">(optional)</span>
          </label>
          <textarea value={data.whyMatters} onChange={e=>update("whyMatters",e.target.value)} rows={2}
            placeholder="Your deep reason — your 'why'…"
            className="w-full bg-[#0f1117] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all resize-none"/>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Visibility</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id:"public",   icon:<Globe size={14}/>,  label:"Public"    },
              { id:"private",  icon:<Lock size={14}/>,   label:"Private"   },
              { id:"password", icon:<Eye size={14}/>,    label:"Protected" },
            ] as {id:Visibility;icon:React.ReactNode;label:string}[]).map(v=>(
              <button key={v.id} onClick={()=>update("visibility",v.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                  data.visibility===v.id
                    ?"bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                    :"bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-slate-200 hover:border-white/15"
                }`}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visible to employers (work goals) */}
        {isWork && (
          <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div>
              <p className="text-xs font-semibold text-slate-300">Visible to Employers</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Include this goal in your professional profile</p>
            </div>
            <button onClick={()=>update("visibleToEmployers",!data.visibleToEmployers)}
              className={`w-10 h-5.5 rounded-full border transition-all duration-200 relative ${
                data.visibleToEmployers?"bg-indigo-600 border-indigo-500":"bg-white/[0.08] border-white/15"
              }`}
              style={{height:"22px",width:"42px"}}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                data.visibleToEmployers?"left-[22px]":"left-[2px]"
              }`}/>
            </button>
          </div>
        )}

        {/* Agent tip */}
        {data.title.length > 5 && (
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
            className="flex items-start gap-2.5 p-3 bg-indigo-600/8 border border-indigo-500/20 rounded-xl">
            <Sparkles size={13} className="text-indigo-400 shrink-0 mt-0.5"/>
            <p className="text-[11px] text-indigo-300/80 leading-snug">
              {data.title.length < 15
                ? "Your title is short — a more specific goal is easier to track and 3× more likely to be achieved."
                : "Strong title. Make sure your 'why' is personal and emotionally meaningful — it's the fuel when motivation dips."}
            </p>
          </motion.div>
        )}
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 3 — CATEGORY
   ══════════════════════════════════════════════════════════════ */
function Step3({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k:K,v:WizardData[K])=>void }) {
  const cats = data.mode==="work" ? WORK_CATEGORIES : LIFE_CATEGORIES;
  return (
    <StepCard num={3} title="Choose Category" desc="Which area of your life or work does this goal belong to?">
      {/* Life / Work toggle */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 mb-4 w-fit">
        {(["life","work"] as const).map(m=>(
          <button key={m} onClick={()=>{update("mode",m);update("category","");}}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
              data.mode===m?"bg-indigo-600/25 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.18)]":"text-slate-500 hover:text-slate-300"
            }`}>
            {m==="life"?"My Life":"My Work"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cats.map(cat=>(
          <button key={cat} onClick={()=>update("category",cat)}
            className={`text-left px-4 py-3 rounded-xl border text-xs font-medium transition-all duration-150 ${
              data.category===cat
                ?"bg-indigo-600/15 border-indigo-500/40 text-indigo-200"
                :"bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 hover:border-white/[0.12]"
            }`}>
            {cat}
          </button>
        ))}
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 4 — TIME HORIZON
   ══════════════════════════════════════════════════════════════ */
function Step4({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k:K,v:WizardData[K])=>void }) {
  const isFasting = data.title.toLowerCase().includes("fast");
  return (
    <StepCard num={4} title="Set Time Horizon" desc="How long will this goal run?">
      <div className="space-y-2.5">
        {TIME_HORIZONS.map(h=>(
          <button key={h.id} onClick={()=>update("timeHorizon",h.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 ${
              data.timeHorizon===h.id
                ?"bg-indigo-600/15 border-indigo-500/40"
                :"bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]"
            }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold transition-colors ${data.timeHorizon===h.id?"text-indigo-200":"text-slate-300"}`}>{h.label}</span>
                {"recommended" in h && h.recommended && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 uppercase tracking-wide">Recommended</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{h.desc}</p>
            </div>
            <span className={`text-xs font-medium shrink-0 ${data.timeHorizon===h.id?"text-indigo-400":"text-slate-600"}`}>{h.sub}</span>
          </button>
        ))}
      </div>

      {/* Fasting-specific suggestions */}
      {isFasting && (
        <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
          className="mt-4 p-3.5 bg-orange-400/8 border border-orange-400/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-orange-400"/>
            <span className="text-[11px] font-semibold text-orange-300">Agent: Fasting Goal Detected</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug mb-2.5">For fasting goals, I recommend specific durations. Quick-select:</p>
          <div className="flex flex-wrap gap-2">
            {["3 days","5 days","7 days","10 days","30-day IF streak"].map(d=>(
              <button key={d} className="text-[10px] px-2.5 py-1 bg-orange-400/10 border border-orange-400/25 text-orange-300 rounded-lg font-medium hover:bg-orange-400/20 transition-colors">
                {d}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 5 — MILESTONES
   ══════════════════════════════════════════════════════════════ */
function Step5({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k:K,v:WizardData[K])=>void }) {
  const [generating, setGenerating] = useState(false);

  const autoGenerate = async () => {
    setGenerating(true);
    await new Promise(r=>setTimeout(r,1100));
    update("milestones", generateMilestones(data.title, data.goalType));
    setGenerating(false);
  };

  const addMilestone = () => {
    update("milestones", [...data.milestones, { id:Date.now().toString(), title:"", dueDate:"", effort:"medium", points:50 }]);
  };

  const updateM = (id: string, field: keyof MilestoneItem, val: string|number) =>
    update("milestones", data.milestones.map(m=>m.id===id?{...m,[field]:val}:m));

  const deleteM = (id: string) =>
    update("milestones", data.milestones.filter(m=>m.id!==id));

  return (
    <StepCard num={5} title="Break Into Milestones" desc="Define the stepping stones that lead to your goal.">
      {/* Auto-generate */}
      <button onClick={autoGenerate} disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border border-indigo-500/30 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 transition-colors text-sm font-medium disabled:opacity-60">
        {generating
          ? <><span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"/><span>P1 Agent is generating milestones…</span></>
          : <><Sparkles size={14}/><span>Auto-Generate with P1 Agent</span></>
        }
      </button>

      {/* Milestone list */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {data.milestones.map((m, idx) => (
            <motion.div key={m.id}
              initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              transition={{duration:0.18, delay:idx*0.04}}
              className="flex items-center gap-2 bg-[#0f1117] border border-white/[0.07] rounded-xl p-3">
              <span className="text-[11px] font-bold text-slate-600 w-5 shrink-0">{idx+1}</span>
              <input value={m.title} onChange={e=>updateM(m.id,"title",e.target.value)}
                placeholder={`Milestone ${idx+1} title`}
                className="flex-1 bg-transparent outline-none text-xs text-slate-300 placeholder-slate-600 min-w-0"/>
              <select value={m.effort} onChange={e=>updateM(m.id,"effort",e.target.value)}
                className="text-[10px] bg-[#1c1f2e] border border-white/[0.08] text-slate-400 rounded-lg px-2 py-1 outline-none shrink-0">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <div className="flex items-center gap-1 shrink-0">
                <Star size={9} className="text-indigo-400"/>
                <input type="number" value={m.points} onChange={e=>updateM(m.id,"points",Number(e.target.value))}
                  className="w-10 bg-transparent outline-none text-[10px] text-indigo-300 font-bold text-center"/>
              </div>
              <button onClick={()=>deleteM(m.id)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={12}/>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button onClick={addMilestone}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-slate-600 hover:text-slate-400 hover:border-white/[0.2] transition-colors text-xs font-medium">
        <Plus size={13}/> Add Milestone
      </button>

      {data.milestones.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>{data.milestones.length} milestones</span>
          <span className="flex items-center gap-1">
            <Star size={9} className="text-indigo-400"/>
            <span className="text-indigo-300 font-semibold">{data.milestones.reduce((a,m)=>a+m.points,0)} pts</span> from milestones
          </span>
        </div>
      )}
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 6 — DIFFICULTY, IMPACT & POINTS
   ══════════════════════════════════════════════════════════════ */
function Step6({ data, update, totalPoints, streakBonus, raffleEntries }: {
  data: WizardData;
  update: <K extends keyof WizardData>(k:K,v:WizardData[K])=>void;
  totalPoints: number; streakBonus: number; raffleEntries: number;
}) {
  return (
    <StepCard num={6} title="Difficulty, Impact & Points" desc="Help P1 calculate your goal's value and challenge level.">
      <div className="space-y-5">
        {/* Difficulty */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Difficulty</label>
          <div className="grid grid-cols-4 gap-2">
            {DIFF_OPTIONS.map(d=>(
              <button key={d.id} onClick={()=>update("difficulty",d.id)}
                className={`py-3 rounded-xl border text-center transition-all duration-150 ${
                  data.difficulty===d.id ? d.cls : "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:border-white/20"
                }`}>
                <p className={`text-sm font-bold ${data.difficulty===d.id?"":"text-slate-400"}`}>{d.label}</p>
                <p className={`text-[10px] mt-0.5 ${data.difficulty===d.id?"opacity-80":"text-slate-600"}`}>{d.pts} base pts</p>
              </button>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Impact on Your Life</label>
          <div className="grid grid-cols-2 gap-2">
            {IMPACT_OPTIONS.map(i=>(
              <button key={i.id} onClick={()=>update("impact",i.id)}
                className={`py-3 px-4 rounded-xl border text-left transition-all duration-150 ${
                  data.impact===i.id
                    ?"bg-violet-600/15 border-violet-500/40 text-violet-200"
                    :"bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/20"
                }`}>
                <p className="text-sm font-semibold">{i.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">×{i.mult} multiplier</p>
              </button>
            ))}
          </div>
        </div>

        {/* Consistency */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Consistency Type</label>
          <div className="grid grid-cols-2 gap-2">
            {CONSISTENCY_OPTIONS.map(c=>(
              <button key={c.id} onClick={()=>update("consistency",c.id)}
                className={`py-3 px-4 rounded-xl border text-left transition-all duration-150 ${
                  data.consistency===c.id
                    ?"bg-teal-600/15 border-teal-500/40 text-teal-200"
                    :"bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/20"
                }`}>
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Points breakdown */}
        <div className="bg-[#0f1117] border border-white/[0.07] rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Points Breakdown</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-indigo-300">{totalPoints}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">total points on completion</p>
            </div>
            <div className="text-right space-y-1">
              {streakBonus>0 && (
                <div className="flex items-center gap-1 text-orange-400 text-xs font-semibold justify-end">
                  <Zap size={10}/> +{streakBonus} streak bonus
                </div>
              )}
              <div className="flex items-center gap-1 text-indigo-400 text-xs justify-end">
                <Star size={9}/> {raffleEntries} raffle {raffleEntries===1?"entry":"entries"}
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              initial={{width:0}} animate={{width:`${Math.min((totalPoints/1500)*100,100)}%`}}
              transition={{duration:0.5,ease:"easeOut"}}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"/>
          </div>
          <div className="flex justify-between text-[9px] text-slate-700 mt-1">
            <span>0</span><span>750</span><span>1,500</span>
          </div>
        </div>
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 7 — REVIEW & LAUNCH
   ══════════════════════════════════════════════════════════════ */
function Step7({ data, totalPoints, streakBonus, raffleEntries, onLaunch }: {
  data: WizardData; totalPoints: number; streakBonus: number; raffleEntries: number;
  onLaunch: () => void;
}) {
  const gt       = GOAL_TYPES.find(t=>t.id===data.goalType);
  const diff     = DIFF_OPTIONS.find(d=>d.id===data.difficulty);
  const horizon  = TIME_HORIZONS.find(h=>h.id===data.timeHorizon);
  const isFasting = data.title.toLowerCase().includes("fast");

  return (
    <div className="space-y-3">
      {/* Mission briefing card */}
      <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3"
          style={{background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))"}}>
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            {gt?.icon ?? <Target size={18}/>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-0.5">Mission Briefing</p>
            <h2 className="text-lg font-bold text-white leading-tight">{data.title || "Untitled Goal"}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {data.description && (
            <p className="text-sm text-slate-400 leading-relaxed">{data.description}</p>
          )}
          {data.whyMatters && (
            <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">Why This Matters</p>
              <p className="text-sm text-slate-400 leading-relaxed italic">"{data.whyMatters}"</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label:"Type",       value:gt?.label ?? "—" },
              { label:"Category",   value:data.category || "—" },
              { label:"Horizon",    value:horizon?.label ?? "—" },
              { label:"Duration",   value:horizon?.sub ?? "—" },
              { label:"Difficulty", value:<span className={`font-bold ${diff?.cls.split(" ")[0]}`}>{data.difficulty.toUpperCase()}</span> },
              { label:"Visibility", value:data.visibility.charAt(0).toUpperCase()+data.visibility.slice(1) },
            ].map(r=>(
              <div key={r.label} className="bg-[#0f1117] border border-white/[0.05] rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">{r.label}</p>
                <p className="text-xs text-slate-300 font-medium">{r.value}</p>
              </div>
            ))}
          </div>

          {/* Milestones */}
          {data.milestones.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">{data.milestones.length} Milestones</p>
              <div className="space-y-1.5">
                {data.milestones.slice(0,5).map((m,i)=>(
                  <div key={m.id} className="flex items-center gap-2.5 text-xs text-slate-400">
                    <span className="w-4 h-4 rounded-full border border-white/[0.1] flex items-center justify-center text-[9px] text-slate-600 shrink-0">{i+1}</span>
                    <span className="flex-1 truncate">{m.title||`Milestone ${i+1}`}</span>
                    <span className="text-indigo-400 font-semibold shrink-0">{m.points}pts</span>
                  </div>
                ))}
                {data.milestones.length>5 && (
                  <p className="text-[10px] text-slate-600 pl-6">+{data.milestones.length-5} more milestones</p>
                )}
              </div>
            </div>
          )}

          {/* Points summary */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600/12 to-violet-600/8 border border-indigo-500/20 rounded-2xl">
            <div>
              <p className="text-3xl font-bold text-indigo-300">{totalPoints} <span className="text-sm font-normal text-slate-500">points</span></p>
              {streakBonus>0&&<p className="text-[11px] text-orange-400 mt-0.5">+{streakBonus} streak bonus</p>}
            </div>
            <div className="text-right space-y-1">
              <p className="text-[11px] text-slate-500">{raffleEntries} raffle {raffleEntries===1?"entry":"entries"}</p>
              <p className="text-[10px] text-slate-600">Black Card progress</p>
            </div>
          </div>

          {/* Agent insights */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">P1 Agent Insights</p>
            {[
              `Your goal has been classified as ${data.difficulty.toUpperCase()} difficulty — placing it in the top tier of tracked goals.`,
              isFasting ? "Hydration reminders and energy check-ins will be added to your Today screen automatically." :
                `${data.category} goals with ${data.consistency.replace("_"," ")} consistency have a 73% completion rate on P1.`,
              "Predicted completion probability: 81% — based on your current P1 score and momentum.",
              "Milestones will be added to your Goals Dashboard. Habits will appear in Today.",
            ].map((insight,i)=>(
              <div key={i} className="flex items-start gap-2.5">
                <Sparkles size={11} className="text-indigo-400/70 mt-0.5 shrink-0"/>
                <p className="text-[11px] text-slate-400 leading-snug">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Launch button */}
      <motion.button onClick={onLaunch} whileHover={{scale:1.01}} whileTap={{scale:0.98}}
        className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2.5 shadow-2xl shadow-indigo-900/50 transition-all duration-150"
        style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)"}}>
        <Zap size={18}/> Launch Goal
      </motion.button>

      <button onClick={()=>{}} className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors py-2">
        Save as Draft instead
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAUNCH SUCCESS OVERLAY
   ══════════════════════════════════════════════════════════════ */
function LaunchSuccess({ data, totalPoints, raffleEntries, navigate }: {
  data: WizardData; totalPoints: number; raffleEntries: number;
  navigate: (path: string) => void;
}) {
  const isFasting = data.title.toLowerCase().includes("fast");
  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{background:"rgba(8,10,18,0.96)",backdropFilter:"blur(16px)"}}>
      <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}}
        transition={{delay:0.1,duration:0.4,ease:[0.34,1.56,0.64,1]}}
        className="w-full max-w-md text-center">

        {/* Icon */}
        <motion.div initial={{scale:0}} animate={{scale:1}}
          transition={{delay:0.2,duration:0.5,ease:[0.34,1.56,0.64,1]}}
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)",boxShadow:"0 0 60px rgba(99,102,241,0.4)"}}>
          <Zap size={36} className="text-white"/>
        </motion.div>

        <motion.h1 initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.35}}
          className="text-3xl font-bold text-white mb-2">Goal Launched! 🎉</motion.h1>

        <motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.45}}
          className="text-slate-400 text-sm mb-6 leading-relaxed">
          <span className="text-white font-semibold">"{data.title}"</span> is now live.<br/>
          Your agent is setting everything up.
        </motion.p>

        {/* Points badge */}
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:0.55}}
          className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-5 py-2 mb-6">
          <Star size={14} className="text-indigo-400"/>
          <span className="text-indigo-300 font-bold">{totalPoints} points</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 text-xs">{raffleEntries} raffle {raffleEntries===1?"entry":"entries"}</span>
        </motion.div>

        {/* Agent actions */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.65}}
          className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4 mb-6 text-left space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">P1 Agent is now…</p>
          {[
            "Adding milestones to your Goals Dashboard",
            isFasting?"Adding hydration reminders to your Today screen":"Adding habits to your Today screen",
            "Starting streak tracking in the Momentum Engine",
            "Registering points & raffle entries on your Black Card",
            "Running analytics and predictions in the background",
          ].map((action,i)=>(
            <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
              transition={{delay:0.7+i*0.08}}
              className="flex items-center gap-2.5 text-xs text-slate-400">
              <CheckCircle2 size={12} className="text-green-400 shrink-0"/>
              {action}
            </motion.div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:1.1}}
          className="flex flex-col gap-2">
          <button onClick={()=>navigate("/goals")}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)"}}>
            View Goals Dashboard
          </button>
          <button onClick={()=>navigate("/cockpit")}
            className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-white/[0.06] hover:border-white/15 transition-colors font-medium">
            Return to Cockpit
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ══════════════════════════════════════════════════════════════ */
function StepCard({ num, title, desc, children }: { num:number; title:string; desc:string; children:React.ReactNode }) {
  return (
    <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.06]">
        <span className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-[11px] font-bold text-indigo-300 shrink-0 mt-0.5">
          {num}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DoneStep({ num, label, value, onEdit }: { num:number; label:string; value:string; onEdit:()=>void }) {
  return (
    <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} transition={{duration:0.2}}
      className="flex items-center gap-3 bg-[#13151c]/70 border border-white/[0.04] rounded-xl px-4 py-2.5">
      <CheckCircle2 size={13} className="text-green-400 shrink-0"/>
      <span className="text-[10px] text-slate-600 shrink-0">Step {num} · {label}</span>
      <span className="text-[11px] font-semibold text-slate-300 truncate flex-1">{value}</span>
      <button onClick={onEdit} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium shrink-0">Edit</button>
    </motion.div>
  );
}
