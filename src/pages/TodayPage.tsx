import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, ChevronDown, Star, Sparkles, CheckCircle2,
  Flame, Target, Trash2, Edit3, ChevronUp, Smile, Meh,
  Frown, Sun, Moon, Coffee, Utensils, ShoppingCart, Lightbulb, FileText,
  Heart, Zap, AlertTriangle, RefreshCw, RotateCcw, BookOpen, Droplets,
  Activity, Battery, Wind, Check, X,
  TrendingUp, Sunrise, Sunset, Compass, ChevronRight,
} from "lucide-react";
import { ProofEngine } from "../lib/proofEngine";
import type { ProofDecision } from "../lib/proofEngine";
import ProofModal from "../components/ProofModal";
import { getCurrentCycle } from "../lib/cycleEngine";

/* ══════════════════════════════════════════════════════════════
   DATE HELPERS
   ══════════════════════════════════════════════════════════════ */
const TODAY      = new Date();
const DAY_NAMES  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const dayName      = DAY_NAMES[TODAY.getDay()];
const dateStr      = `${dayName}, ${MONTH_NAMES[TODAY.getMonth()]} ${TODAY.getDate()}, ${TODAY.getFullYear()}`;
const isSunday     = TODAY.getDay() === 0;
const isMonday     = TODAY.getDay() === 1;
const isLastOfMonth = new Date(TODAY.getFullYear(), TODAY.getMonth()+1, 0).getDate() === TODAY.getDate();

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */
interface CheckItem { id: string; label: string; done: boolean; streak?: number }
interface TaskItem  { id: string; text: string; done: boolean; priority?: "high"|"normal" }
interface NoteItem  { id: string; text: string }
interface MealItem  { id: string; meal: "Breakfast"|"Lunch"|"Dinner"|"Snack"; desc: string; cals?: number }

/* ══════════════════════════════════════════════════════════════
   SYNTHETIC DATA
   ══════════════════════════════════════════════════════════════ */
const INIT_BLESSINGS = [
  "Every good and great thing will come true today.",
  "Great and amazing things are on their way to me right now.",
  "Lord protect me from evil, trouble and misfortune.",
  "I am focused, energised, and ready for this day.",
  "Abundance flows toward me from every direction.",
];

const INIT_MORNING_ROUTINE: CheckItem[] = [
  { id:"mr1", label:"Wake up & hydrate (500ml water)",   done:false, streak:14 },
  { id:"mr2", label:"Morning prayer / meditation (10 min)", done:false, streak:21 },
  { id:"mr3", label:"Review goals & intentions",         done:false, streak:7  },
  { id:"mr4", label:"Cold shower",                       done:false, streak:5  },
  { id:"mr5", label:"Exercise / movement (30 min)",      done:false, streak:12 },
  { id:"mr6", label:"Healthy breakfast",                 done:false, streak:18 },
  { id:"mr7", label:"Read / learn (15 min)",             done:false, streak:9  },
  { id:"mr8", label:"Review Today Screen",               done:false, streak:3  },
];

const INIT_HABITS: CheckItem[] = [
  { id:"h1", label:"Intermittent fasting window maintained", done:false, streak:22 },
  { id:"h2", label:"2L water intake",                        done:false, streak:8  },
  { id:"h3", label:"No social media before 10am",            done:false, streak:4  },
  { id:"h4", label:"Daily journaling",                       done:false, streak:11 },
  { id:"h5", label:"Gratitude practice",                     done:false, streak:19 },
  { id:"h6", label:"Screen-free last 30 min before bed",     done:false, streak:6  },
];

const INIT_ACTIONS: TaskItem[] = [
  { id:"t1", text:"Review P1 feature spec with team",       done:false, priority:"high" },
  { id:"t2", text:"Send invoice to client",                  done:false, priority:"high" },
  { id:"t3", text:"Book GP appointment",                     done:false },
  { id:"t4", text:"Respond to LinkedIn messages",            done:false },
  { id:"t5", text:"Update Goals Dashboard progress",         done:false },
];

const INIT_FOCUS = [
  { id:"f1", text:"Ship the Today Screen feature",           why:"Critical milestone — 3 days overdue",                icon:<Zap size={13}/>,    accent:"text-red-400"    },
  { id:"f2", text:"Maintain IF window — Day 22 streak at risk", why:"You usually break after 9pm. Stay strong.",      icon:<Flame size={13}/>,  accent:"text-orange-400" },
  { id:"f3", text:"Review quarterly goals alignment",        why:"Q2 review due end of week",                          icon:<Target size={13}/>, accent:"text-indigo-400" },
];

const INIT_AT_RISK = [
  { id:"r1", label:"7-Day Water Fast Goal",      issue:"Pacing behind. Day 3 of 7 — streak at risk tonight.",  severity:"red"   as const },
  { id:"r2", label:"Read 24 Books This Year",    issue:"6 books behind target. Need to read 2 this week.",     severity:"amber" as const },
  { id:"r3", label:"Cold Shower Streak",         issue:"Missed yesterday. Streak resets if missed today.",      severity:"amber" as const },
];

const INIT_SHOPPING: NoteItem[] = [
  { id:"s1", text:"Sparkling water ×6"  },
  { id:"s2", text:"Salmon fillets"       },
  { id:"s3", text:"Greek yoghurt"        },
  { id:"s4", text:"Avocados ×4"          },
  { id:"s5", text:"Electrolyte sachets"  },
];

const INIT_GRATITUDE  = [
  "I am grateful for the ability to build something meaningful.",
  "I am grateful for my health and the energy I have today.",
  "I am grateful for the support of people who believe in me.",
];

const INIT_GRATITUDE2 = [
  "I am grateful for making it through today.",
  "I am grateful for the progress I made, however small.",
];

const INIT_MEALS: MealItem[] = [
  { id:"m1", meal:"Breakfast", desc:"Skipped (IF window)",                         cals:0   },
  { id:"m2", meal:"Lunch",     desc:"Grilled salmon + steamed broccoli + rice",    cals:520 },
];

const INIT_AFTERNOON: CheckItem[] = [
  { id:"a1", label:"Review morning's work",              done:false              },
  { id:"a2", label:"Clear inbox",                        done:false, streak:3    },
  { id:"a3", label:"Afternoon walk (20 min)",            done:false, streak:7    },
  { id:"a4", label:"Healthy snack / hydration check",   done:false              },
  { id:"a5", label:"Update task list",                   done:false              },
];

const INIT_EVENING: CheckItem[] = [
  { id:"e1", label:"Review what I accomplished today",  done:false              },
  { id:"e2", label:"Prepare tomorrow's skeleton plan",  done:false              },
  { id:"e3", label:"Evening prayer / reflection",       done:false, streak:14   },
  { id:"e4", label:"Prepare clothes for tomorrow",      done:false              },
  { id:"e5", label:"Lights out by 10:30pm",             done:false              },
];

const SELF_CARE = [
  "Take a 20-min walk in fresh air",
  "Listen to a motivating podcast",
  "Call someone who energises me",
  "Hot bath with Epsom salts",
  "10-min breathwork session",
  "Cook a nourishing meal",
];

const AI_BLESSINGS = [
  "Today I walk in purpose, clarity, and divine favour.",
  "Every challenge today is a doorway to my growth.",
  "I attract opportunity, wisdom, and joy into my life.",
  "I am exactly where I need to be, becoming who I am meant to be.",
];

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
const MOCK_USER = { id:"u1", name:"Francis", trustScore:78, behaviourScore:82, proofCount:23, mismatchCount:0 };

interface ProofModalState {
  taskName: string;
  taskId: string;
  difficulty: "easy"|"medium"|"hard"|"epic";
  streak?: number;
  decision: ProofDecision;
  onApproved: () => void;
}

export default function TodayPage() {
  const navigate = useNavigate();
  const [proofModal, setProofModal] = useState<ProofModalState | null>(null);
  const [cardOrder, setCardOrder] = useState<string[]>([
    "cycleEngine","visionAlign","blessing","yesterday","gratitude","morning","focus","actions",
    "habits","atrisk","energy","meals","shopping","retrospective",
    "ifdaythen","afternoon","feel","makegreat","expectations",
    "ideas","notes","evening","tomorrow","gratitude2",
  ]);
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const toggle   = (id:string) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const moveCard = (id:string, dir:-1|1) => {
    setCardOrder(prev=>{
      const i=prev.indexOf(id), j=i+dir;
      if(j<0||j>=prev.length) return prev;
      const n=[...prev]; [n[i],n[j]]=[n[j],n[i]]; return n;
    });
  };

  const CARD_META: Record<string,{title:string;icon:React.ReactNode;accent?:string;agent?:boolean}> = {
    cycleEngine:   { title:"12-Week Cycle",                     icon:<Zap size={14}/>,           accent:"text-violet-400",  agent:true  },
    visionAlign:   { title:"Vision Alignment",                 icon:<Compass size={14}/>,       accent:"text-indigo-400",  agent:true  },
    blessing:      { title:"Morning Blessing",                   icon:<Sun size={14}/>,          accent:"text-amber-400",   agent:true  },
    yesterday:     { title:"Thoughts From Yesterday",            icon:<RotateCcw size={14}/>,    accent:"text-slate-400"               },
    gratitude:     { title:"Morning Gratitude",                  icon:<Heart size={14}/>,         accent:"text-pink-400"                },
    morning:       { title:"Morning Routine",                    icon:<Sunrise size={14}/>,       accent:"text-orange-400"              },
    focus:         { title:"Focus For Today",                    icon:<Target size={14}/>,        accent:"text-indigo-400",  agent:true  },
    actions:       { title:"Today's Actions",                    icon:<CheckCircle2 size={14}/>,  accent:"text-green-400",   agent:true  },
    habits:        { title:"Habits For Today",                   icon:<Flame size={14}/>,         accent:"text-orange-400",  agent:true  },
    atrisk:        { title:"At Risk · Predicted To Slip",        icon:<AlertTriangle size={14}/>, accent:"text-red-400",     agent:true  },
    energy:        { title:"Energy & Wellbeing",                 icon:<Battery size={14}/>,       accent:"text-teal-400",    agent:true  },
    meals:         { title:"Meals & Nutrition",                  icon:<Utensils size={14}/>,      accent:"text-green-400"               },
    shopping:      { title:"Shopping List",                      icon:<ShoppingCart size={14}/>,  accent:"text-sky-400"                 },
    retrospective: { title:"Retrospective",                      icon:<BookOpen size={14}/>,      accent:"text-violet-400",  agent:true  },
    ifdaythen:     { title:"If Day · Then Do",                   icon:<Zap size={14}/>,           accent:"text-yellow-400",  agent:true  },
    afternoon:     { title:"Afternoon Routine",                  icon:<Coffee size={14}/>,        accent:"text-amber-400"               },
    feel:          { title:"How Do I Feel Right Now",            icon:<Smile size={14}/>,         accent:"text-pink-400",    agent:true  },
    makegreat:     { title:"How Will I Make Myself Feel Great",  icon:<Sparkles size={14}/>,      accent:"text-indigo-400",  agent:true  },
    expectations:  { title:"Today's Expectations",              icon:<Star size={14}/>,          accent:"text-yellow-400"              },
    ideas:         { title:"Ideas & Inspiration",                icon:<Lightbulb size={14}/>,     accent:"text-yellow-400",  agent:true  },
    notes:         { title:"Important Notes",                    icon:<FileText size={14}/>,      accent:"text-slate-300"               },
    evening:       { title:"Evening Routine",                    icon:<Sunset size={14}/>,        accent:"text-violet-400"              },
    tomorrow:      { title:"Skeleton Plan For Tomorrow",         icon:<TrendingUp size={14}/>,    accent:"text-indigo-400",  agent:true  },
    gratitude2:    { title:"Evening Gratitude",                  icon:<Moon size={14}/>,          accent:"text-indigo-400"              },
  };

  const handleProofRequest = (
    taskName: string,
    difficulty: "easy"|"medium"|"hard"|"epic",
    onApproved: () => void,
    streak?: number,
  ) => {
    const task = { id: Date.now().toString(), name: taskName, difficulty, streak: streak ?? 0, isHabit: false };
    const decision = ProofEngine.shouldRequestProof(task, MOCK_USER);
    if (decision.required) {
      setProofModal({ taskName, taskId: task.id, difficulty, streak, decision, onApproved });
    } else {
      onApproved();
    }
  };

  const CARDS: Record<string, React.ReactNode> = {
    cycleEngine:   <CycleTodayCard />,
    visionAlign:   <VisionAlignCard />,
    blessing:      <BlessingCard />,
    yesterday:     <YesterdayCard />,
    gratitude:     <GratitudeCard />,
    morning:       <MorningRoutineCard />,
    focus:         <FocusCard />,
    actions:       <ActionsCard onProofRequest={handleProofRequest}/>,
    habits:        <HabitsCard  onProofRequest={handleProofRequest}/>,
    atrisk:        <AtRiskCard />,
    energy:        <EnergyCard />,
    meals:         <MealsCard />,
    shopping:      <ShoppingCard />,
    retrospective: <RetrospectiveCard />,
    ifdaythen:     <IfDayThenCard />,
    afternoon:     <AfternoonCard />,
    feel:          <FeelCard />,
    makegreat:     <MakeGreatCard />,
    expectations:  <ExpectationsCard />,
    ideas:         <IdeasCard />,
    notes:         <NotesCard />,
    evening:       <EveningCard />,
    tomorrow:      <TomorrowCard />,
    gratitude2:    <Gratitude2Card />,
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={()=>navigate("/cockpit")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cockpit
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Today</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{dateStr}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <Activity size={10} className="text-green-400"/>
              <span className="text-[10px] font-semibold text-green-400">High Energy</span>
            </div>
            <button onClick={()=>navigate("/goals")}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
              Goals
            </button>
          </div>
        </div>
      </header>

      {/* ── Card stack ── */}
      <div className="max-w-3xl mx-auto px-6 py-5 space-y-3">
        {cardOrder.map((id, idx) => {
          const meta = CARD_META[id];
          if (!meta) return null;
          return (
            <TodayCard key={id} id={id} title={meta.title} icon={meta.icon}
              accent={meta.accent} agent={meta.agent}
              collapsed={collapsed[id]??false} onToggle={()=>toggle(id)}
              onMoveUp={idx>0?()=>moveCard(id,-1):undefined}
              onMoveDown={idx<cardOrder.length-1?()=>moveCard(id,1):undefined}>
              {CARDS[id]}
            </TodayCard>
          );
        })}
        <button className="w-full py-4 rounded-2xl border border-dashed border-white/[0.08] text-slate-600 hover:text-slate-400 hover:border-white/[0.15] transition-colors text-xs font-medium flex items-center justify-center gap-2">
          <Plus size={13}/> Add Card
        </button>
      </div>

      {/* ── Proof Modal ── */}
      {proofModal && (
        <ProofModal
          taskName={proofModal.taskName}
          taskId={proofModal.taskId}
          difficulty={proofModal.difficulty}
          streak={proofModal.streak ?? 0}
          reason={proofModal.decision.reason!}
          message={proofModal.decision.message}
          proofTypes={proofModal.decision.proofTypes}
          urgency={proofModal.decision.urgency}
          user={MOCK_USER}
          onClose={() => setProofModal(null)}
          onSubmitted={() => {
            proofModal.onApproved();
            setProofModal(null);
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TODAY CARD WRAPPER
   ══════════════════════════════════════════════════════════════ */
function TodayCard({ title, icon, accent="text-slate-400", agent, collapsed, onToggle,
  onMoveUp, onMoveDown, children }: {
  id: string; title: string; icon: React.ReactNode; accent?: string;
  agent?: boolean; collapsed: boolean; onToggle: ()=>void;
  onMoveUp?: ()=>void; onMoveDown?: ()=>void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div layout className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden"
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]">
        <span className={`shrink-0 ${accent}`}>{icon}</span>
        <span className="text-sm font-semibold text-slate-200 flex-1">{title}</span>
        {agent && (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-indigo-400/70 bg-indigo-600/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            <Sparkles size={8}/> Agent
          </span>
        )}
        <AnimatePresence>
          {hovered && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.12}}
              className="flex items-center gap-0.5">
              <button onClick={onMoveUp} disabled={!onMoveUp}
                className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors rounded">
                <ChevronUp size={12}/>
              </button>
              <button onClick={onMoveDown} disabled={!onMoveDown}
                className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors rounded">
                <ChevronDown size={12}/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={onToggle} className="p-1 text-slate-600 hover:text-slate-300 transition-colors rounded">
          <motion.span animate={{rotate:collapsed?-90:0}} transition={{duration:0.2}} style={{display:"block"}}>
            <ChevronDown size={14}/>
          </motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.2,ease:"easeInOut"}} style={{overflow:"hidden"}}>
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   0a. CYCLE ENGINE MICRO-CARD
   ══════════════════════════════════════════════════════════════ */
function CycleTodayCard() {
  const navigate = useNavigate();
  const cycle    = getCurrentCycle();
  const upcoming = cycle.goals.flatMap(g => g.milestones)
    .filter(m => m.status !== "completed" && m.dueWeek <= cycle.currentWeek + 1);
  const currentPlan = cycle.weeklyPlans[cycle.currentWeek - 1];

  return (
    <div className="space-y-3">
      {/* Cycle progress summary */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">{cycle.name} · Week {cycle.currentWeek}/12</span>
            <span className="text-[10px] font-bold text-violet-400">{cycle.overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
              style={{ width:`${cycle.overallProgress}%` }}/>
          </div>
        </div>
        <div className="text-center shrink-0">
          <p className="text-lg font-bold text-violet-400 leading-none">{cycle.momentumScore}</p>
          <p className="text-[8px] text-slate-700 uppercase">Momentum</p>
        </div>
      </div>

      {/* This week's priorities */}
      {currentPlan.priorities.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">This Week's Priorities</p>
          <div className="space-y-1">
            {currentPlan.priorities.slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-violet-600/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[7px] font-bold text-violet-400">{i+1}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming milestones */}
      {upcoming.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          <AlertTriangle size={10} className="text-amber-400 shrink-0 mt-0.5"/>
          <p className="text-[10px] text-amber-300 leading-snug">
            {upcoming.length} milestone{upcoming.length>1?"s":""} due this week — {upcoming.map(m=>m.title).join(", ")}
          </p>
        </div>
      )}

      {/* Agent insight */}
      <div className="flex items-start gap-2 p-2.5 bg-violet-600/8 border border-violet-500/15 rounded-xl">
        <Sparkles size={10} className="text-violet-400 shrink-0 mt-0.5"/>
        <p className="text-[10px] text-slate-400 leading-snug">{currentPlan.agentNotes}</p>
      </div>

      <button onClick={() => navigate("/cycle")}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400 hover:bg-violet-600/20 transition-colors">
        <Zap size={10}/> Open Cycle Dashboard <ChevronRight size={10}/>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   0. VISION ALIGNMENT MICRO-CARD
   ══════════════════════════════════════════════════════════════ */
function VisionAlignCard() {
  const navigate = useNavigate();
  const SCORE = 74;
  const INSIGHTS = [
    { icon:<Flame size={11}/>,  text:"IF habit is strengthening your Health & Strength vision (Day 22).",   color:"text-orange-400" },
    { icon:<Target size={11}/>, text:"Today Screen feature directly advances 'Build P1 into a Global Platform'.", color:"text-indigo-400" },
    { icon:<Heart size={11}/>,  text:"Morning prayer streak supports your Spirituality & Faith identity.",   color:"text-violet-400" },
  ];
  const LEGACY = "\"I am a builder — I create things that outlast me.\"";
  return (
    <div className="space-y-3">
      {/* Score + arc */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="4"/>
            <motion.circle cx="32" cy="32" r="26" fill="none" stroke="#818cf8" strokeWidth="4"
              strokeLinecap="round"
              initial={{strokeDasharray:"0 163.4"}}
              animate={{strokeDasharray:`${(SCORE/100)*163.4} 163.4`}}
              transition={{duration:0.9,ease:"easeOut",delay:0.2}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-indigo-300 leading-none">{SCORE}%</span>
            <span className="text-[8px] text-slate-600 uppercase tracking-wider">aligned</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-300 mb-0.5">Today is <span className="text-indigo-300">74% Vision-Aligned</span></p>
          <p className="text-[11px] text-slate-500 leading-snug">3 of today's actions directly support your long-term vision. Complete your Focus goals to reach 90%+.</p>
        </div>
      </div>

      {/* Agent insights */}
      <div className="space-y-1.5">
        {INSIGHTS.map((ins, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className={`shrink-0 mt-0.5 ${ins.color}`}>{ins.icon}</span>
            <p className="text-[11px] text-slate-400 leading-snug">{ins.text}</p>
          </div>
        ))}
      </div>

      {/* Legacy reminder */}
      <div className="p-3 bg-amber-500/6 border border-amber-500/15 rounded-xl">
        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70 mb-1">Legacy Reminder</p>
        <p className="text-[11px] text-amber-200/70 italic leading-snug">{LEGACY}</p>
      </div>

      {/* Link to Vision */}
      <button onClick={() => navigate("/vision")}
        className="flex items-center gap-1.5 text-[11px] text-indigo-400/70 hover:text-indigo-300 transition-colors font-medium">
        <Compass size={10}/> Open Vision System <ChevronRight size={10}/>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. MORNING BLESSING
   ══════════════════════════════════════════════════════════════ */
function BlessingCard() {
  const [blessings, setBlessings] = useState<string[]>(INIT_BLESSINGS);
  const [pinned,    setPinned]    = useState(0);
  const [editing,   setEditing]   = useState<number|null>(null);
  const [editText,  setEditText]  = useState("");
  const [newText,   setNewText]   = useState("");
  const [adding,    setAdding]    = useState(false);
  const [generating,setGenerating]= useState(false);

  const generate = async () => {
    setGenerating(true);
    await new Promise(r=>setTimeout(r,800));
    const b = AI_BLESSINGS[Math.floor(Math.random()*AI_BLESSINGS.length)];
    if (!blessings.includes(b)) setBlessings(p=>[...p,b]);
    setGenerating(false);
  };
  const del = (i:number) => { setBlessings(p=>p.filter((_,j)=>j!==i)); if(pinned>=i&&pinned>0) setPinned(p=>p-1); };

  return (
    <div>
      <div className="relative mb-4 p-5 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/8 to-transparent">
        <p className="text-base font-medium text-amber-100/90 leading-relaxed italic text-center">
          "{blessings[pinned]}"
        </p>
        <div className="flex justify-center gap-1.5 mt-3">
          {blessings.map((_,i)=>(
            <button key={i} onClick={()=>setPinned(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i===pinned?"bg-amber-400":"bg-white/[0.15] hover:bg-white/30"}`}/>
          ))}
        </div>
      </div>
      <div className="space-y-1.5 mb-3">
        {blessings.map((b,i)=>(
          <div key={i} className="group flex items-start gap-2.5">
            <button onClick={()=>setPinned(i)}
              className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                i===pinned?"bg-amber-400/20 border-amber-400/50":"border-white/[0.1] hover:border-amber-400/30"
              }`}>
              {i===pinned&&<span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>}
            </button>
            {editing===i
              ? <input value={editText} onChange={e=>setEditText(e.target.value)} autoFocus
                  onBlur={()=>{setBlessings(p=>p.map((x,j)=>j===i?editText:x));setEditing(null);}}
                  onKeyDown={e=>{if(e.key==="Enter"){setBlessings(p=>p.map((x,j)=>j===i?editText:x));setEditing(null);}}}
                  className="flex-1 bg-transparent outline-none text-xs text-slate-300 border-b border-indigo-500/40 pb-0.5"/>
              : <p className="flex-1 text-xs text-slate-400 leading-relaxed">{b}</p>
            }
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
              <button onClick={()=>{setEditing(i);setEditText(b);}} className="p-0.5 text-slate-600 hover:text-slate-300 transition-colors"><Edit3 size={10}/></button>
              <button onClick={()=>del(i)} className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={10}/></button>
            </div>
          </div>
        ))}
      </div>
      {adding
        ? <div className="flex gap-2">
            <input value={newText} onChange={e=>setNewText(e.target.value)} autoFocus placeholder="Type a blessing…"
              onKeyDown={e=>{if(e.key==="Enter"&&newText.trim()){setBlessings(p=>[...p,newText.trim()]);setNewText("");setAdding(false);}if(e.key==="Escape")setAdding(false);}}
              className="flex-1 bg-[#0f1117] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40"/>
            <button onClick={()=>{if(newText.trim()){setBlessings(p=>[...p,newText.trim()]);setNewText("");setAdding(false);}}}
              className="px-3 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 hover:bg-indigo-600/30 transition-colors">Add</button>
            <button onClick={()=>setAdding(false)} className="text-slate-600 hover:text-slate-300 text-xs transition-colors">✕</button>
          </div>
        : <div className="flex items-center gap-4">
            <button onClick={()=>setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
              <Plus size={11}/> Add blessing
            </button>
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors font-medium ml-auto disabled:opacity-60">
              {generating
                ? <><span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"/><span>Generating…</span></>
                : <><Sparkles size={10}/> Generate with Agent</>}
            </button>
          </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. THOUGHTS FROM YESTERDAY
   ══════════════════════════════════════════════════════════════ */
function YesterdayCard() {
  const [text, setText]     = useState("");
  const [summarising, setSummarising] = useState(false);
  const [summary, setSummary] = useState<string|null>(null);
  const summarise = async () => {
    if (!text.trim()) return;
    setSummarising(true);
    await new Promise(r=>setTimeout(r,1000));
    setSummary("Yesterday was a focused day with good energy in the morning. You completed key tasks and maintained your IF window. Some tension around unfinished emails — carry forward to today.");
    setSummarising(false);
  };
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={4}
        placeholder="What's on your mind from yesterday? Thoughts, wins, regrets, unfinished business…"
        className="w-full bg-[#0f1117] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 resize-none leading-relaxed"/>
      <AnimatePresence>
        {summary&&(
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="flex items-start gap-2.5 p-3 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
            <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">Agent Summary</p>
              <p className="text-xs text-slate-400 leading-relaxed">{summary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={summarise} disabled={!text.trim()||summarising}
        className="flex items-center gap-1.5 text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors disabled:opacity-40 font-medium">
        {summarising
          ? <><span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"/><span>Reflecting…</span></>
          : <><Sparkles size={10}/> Agent Reflect</>}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. GRATITUDE (MORNING)
   ══════════════════════════════════════════════════════════════ */
function GratitudeCard() {
  const [entries, setEntries] = useState<string[]>(INIT_GRATITUDE);
  const [newText, setNewText] = useState("");
  const [adding,  setAdding]  = useState(false);
  const del = (i:number) => setEntries(p=>p.filter((_,j)=>j!==i));
  const add  = () => { if(newText.trim()){setEntries(p=>[...p,newText.trim()]);setNewText("");setAdding(false);} };
  return (
    <div className="space-y-2">
      {entries.map((e,i)=>(
        <motion.div key={i} layout initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
          className="group flex items-start gap-3">
          <Heart size={12} className="text-pink-400/70 shrink-0 mt-0.5"/>
          <p className="flex-1 text-xs text-slate-300 leading-relaxed italic">"{e}"</p>
          <button onClick={()=>del(i)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
        </motion.div>
      ))}
      {adding
        ? <div className="flex gap-2 mt-1">
            <input value={newText} onChange={e=>setNewText(e.target.value)} autoFocus placeholder="I am grateful for…"
              onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setAdding(false);}}
              className="flex-1 bg-[#0f1117] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-pink-500/40"/>
            <button onClick={add} className="px-3 py-2 bg-pink-600/15 border border-pink-500/25 rounded-xl text-xs text-pink-300 hover:bg-pink-600/25 transition-colors">Add</button>
            <button onClick={()=>setAdding(false)} className="text-slate-600 hover:text-slate-300 text-xs transition-colors">✕</button>
          </div>
        : <button onClick={()=>setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-pink-400 transition-colors font-medium mt-1">
            <Plus size={11}/> Add gratitude
          </button>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. MORNING ROUTINE
   ══════════════════════════════════════════════════════════════ */
function MorningRoutineCard() {
  const [items,   setItems]   = useState<CheckItem[]>(INIT_MORNING_ROUTINE);
  const [newText, setNewText] = useState("");
  const [adding,  setAdding]  = useState(false);
  const toggle = (id:string) => setItems(p=>p.map(m=>m.id===id?{...m,done:!m.done}:m));
  const del    = (id:string) => setItems(p=>p.filter(m=>m.id!==id));
  const add    = () => { if(newText.trim()){setItems(p=>[...p,{id:Date.now().toString(),label:newText.trim(),done:false}]);setNewText("");setAdding(false);} };
  const done   = items.filter(m=>m.done).length;
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div animate={{width:`${items.length?(done/items.length)*100:0}%`}} transition={{duration:0.5,ease:"easeOut"}}
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"/>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">{done}/{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map(m=>(
          <div key={m.id} className="group flex items-center gap-3">
            <button onClick={()=>toggle(m.id)}
              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                m.done?"bg-orange-500/20 border-orange-400/50":"border-white/[0.12] hover:border-orange-400/40"
              }`}>
              {m.done&&<Check size={10} className="text-orange-400"/>}
            </button>
            <span className={`flex-1 text-xs transition-colors ${m.done?"text-slate-600 line-through":"text-slate-300"}`}>{m.label}</span>
            {m.streak&&m.streak>0&&(
              <div className="flex items-center gap-0.5 shrink-0">
                <Flame size={9} className="text-orange-400"/>
                <span className="text-[9px] font-bold text-orange-400">{m.streak}</span>
              </div>
            )}
            <button onClick={()=>del(m.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
          </div>
        ))}
      </div>
      {adding
        ? <div className="flex gap-2 mt-3">
            <input value={newText} onChange={e=>setNewText(e.target.value)} autoFocus placeholder="New routine step…"
              onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setAdding(false);}}
              className="flex-1 bg-[#0f1117] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-orange-500/40"/>
            <button onClick={add} className="px-3 py-2 bg-orange-600/15 border border-orange-500/25 rounded-xl text-xs text-orange-300 hover:bg-orange-600/25 transition-colors">Add</button>
            <button onClick={()=>setAdding(false)} className="text-slate-600 hover:text-slate-300 text-xs transition-colors">✕</button>
          </div>
        : <button onClick={()=>setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium mt-3">
            <Plus size={11}/> Add step
          </button>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. FOCUS FOR TODAY (AGENT-SELECTED)
   ══════════════════════════════════════════════════════════════ */
function FocusCard() {
  const [items, setItems]       = useState(INIT_FOCUS);
  const [refreshing,setRefreshing] = useState(false);
  const refresh = async () => { setRefreshing(true); await new Promise(r=>setTimeout(r,900)); setRefreshing(false); };
  const del     = (id:string) => setItems(p=>p.filter(f=>f.id!==id));
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-400/70 bg-indigo-600/8 border border-indigo-500/15 rounded-full px-2.5 py-1">
          <Sparkles size={9}/> Agent-curated based on your goals, streaks, and patterns
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="ml-auto p-1.5 text-slate-600 hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-600/10 disabled:opacity-50">
          <RefreshCw size={12} className={refreshing?"animate-spin":""}/>
        </button>
      </div>
      <div className="space-y-2.5">
        {items.map((f,i)=>(
          <motion.div key={f.id} layout
            className="group flex items-start gap-3 p-3.5 bg-[#0f1117] border border-white/[0.06] rounded-xl">
            <div className={`mt-0.5 shrink-0 ${f.accent}`}>{f.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200">{f.text}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{f.why}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-600">#{i+1}</span>
              <button onClick={()=>del(f.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"><X size={11}/></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. TODAY'S ACTIONS
   ══════════════════════════════════════════════════════════════ */
function ActionsCard({ onProofRequest }: {
  onProofRequest?: (name:string, diff:"easy"|"medium"|"hard"|"epic", onApproved:()=>void) => void;
}) {
  const [tasks,   setTasks]   = useState<TaskItem[]>(INIT_ACTIONS);
  const [newText, setNewText] = useState("");
  const toggle = (id:string) => {
    const task = tasks.find(t=>t.id===id);
    if (!task) return;
    if (!task.done && onProofRequest) {
      const diff = task.priority === "high" ? "hard" : "medium";
      onProofRequest(task.text, diff, () => setTasks(p=>p.map(t=>t.id===id?{...t,done:true}:t)));
    } else {
      setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
    }
  };
  const del    = (id:string) => setTasks(p=>p.filter(t=>t.id!==id));
  const add    = () => { if(newText.trim()){setTasks(p=>[...p,{id:Date.now().toString(),text:newText.trim(),done:false}]);setNewText("");} };
  const done   = tasks.filter(t=>t.done).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-slate-500">{done} of {tasks.length} complete</span>
        <span className="flex items-center gap-1 text-[10px] text-indigo-400/60"><Sparkles size={9}/> Agent can prioritise</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <AnimatePresence>
          {tasks.map(t=>(
            <motion.div key={t.id} layout initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}}
              className="group flex items-center gap-3">
              <button onClick={()=>toggle(t.id)}
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                  t.done?"bg-green-500/20 border-green-400/50":"border-white/[0.12] hover:border-green-400/40"
                }`}>
                {t.done&&<Check size={10} className="text-green-400"/>}
              </button>
              <span className={`flex-1 text-xs transition-colors ${t.done?"text-slate-600 line-through":"text-slate-300"}`}>{t.text}</span>
              {t.priority==="high"&&!t.done&&<span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full shrink-0">Priority</span>}
              <button onClick={()=>del(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Add a task…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-green-500/40"/>
        <button onClick={add} className="px-3 py-2 bg-green-600/15 border border-green-500/25 rounded-xl text-xs text-green-300 hover:bg-green-600/25 transition-colors"><Plus size={13}/></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   7. HABITS FOR TODAY
   ══════════════════════════════════════════════════════════════ */
function HabitsCard({ onProofRequest }: {
  onProofRequest?: (name:string, diff:"easy"|"medium"|"hard"|"epic", onApproved:()=>void, streak?:number) => void;
}) {
  const [habits, setHabits] = useState<CheckItem[]>(INIT_HABITS);
  const toggle = (id:string) => {
    const habit = habits.find(h=>h.id===id);
    if (!habit) return;
    if (!habit.done && onProofRequest) {
      onProofRequest(habit.label, "medium", () => setHabits(p=>p.map(h=>h.id===id?{...h,done:true}:h)), habit.streak);
    } else {
      setHabits(p=>p.map(h=>h.id===id?{...h,done:!h.done}:h));
    }
  };
  return (
    <div className="space-y-2">
      {habits.map(h=>(
        <div key={h.id} className="flex items-center gap-3">
          <button onClick={()=>toggle(h.id)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              h.done?"bg-orange-500/20 border-orange-400/50":"border-white/[0.12] hover:border-orange-400/40"
            }`}>
            {h.done&&<Flame size={10} className="text-orange-400"/>}
          </button>
          <span className={`flex-1 text-xs transition-colors ${h.done?"text-slate-600 line-through":"text-slate-300"}`}>{h.label}</span>
          {h.streak&&h.streak>0&&(
            <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
              h.streak>=20?"text-orange-300 bg-orange-400/10 border-orange-400/20":
              h.streak>=10?"text-amber-300 bg-amber-400/10 border-amber-400/20":
              "text-slate-500 bg-white/[0.04] border-white/[0.08]"
            }`}>
              <Flame size={8}/>&nbsp;{h.streak}d
            </div>
          )}
        </div>
      ))}
      <p className="text-[10px] text-indigo-400/60 flex items-center gap-1.5 pt-1">
        <Sparkles size={9}/> Agent is tracking {habits.length} habits across your goals
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   8. AT RISK
   ══════════════════════════════════════════════════════════════ */
function AtRiskCard() {
  const [items, setItems] = useState(INIT_AT_RISK);
  const dismiss = (id:string) => setItems(p=>p.filter(r=>r.id!==id));
  if (items.length===0) return (
    <div className="flex items-center gap-2.5 py-3">
      <CheckCircle2 size={14} className="text-green-400"/>
      <p className="text-xs text-slate-400">All goals are on track. Great work.</p>
    </div>
  );
  return (
    <div className="space-y-2.5">
      {items.map(r=>(
        <div key={r.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${
          r.severity==="red"?"bg-red-500/8 border-red-500/20":"bg-amber-500/8 border-amber-500/20"
        }`}>
          <AlertTriangle size={13} className={r.severity==="red"?"text-red-400":"text-amber-400"}/>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200">{r.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{r.issue}</p>
          </div>
          <button onClick={()=>dismiss(r.id)} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-0.5"><X size={11}/></button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   9. ENERGY & WELLBEING
   ══════════════════════════════════════════════════════════════ */
function EnergyCard() {
  const [energy, setEnergy] = useState(4);
  const LABELS = ["Very Low","Low","Moderate","Good","High","Peak"];
  const COLORS  = ["text-red-400","text-orange-400","text-amber-400","text-yellow-400","text-green-400","text-teal-400"];
  const SUGGESTIONS = [
    "You're in peak form — front-load your hardest cognitive work before 2pm.",
    "Good energy. Start with the 2–3 highest-priority actions, then reassess after lunch.",
    "Moderate energy detected. Prioritise habits and easy wins first to build momentum.",
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Energy Level</span>
          <span className={`text-xs font-bold ${COLORS[energy]}`}>{LABELS[energy]}</span>
        </div>
        <input type="range" min={0} max={5} value={energy} onChange={e=>setEnergy(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer" style={{height:"6px"}}/>
        <div className="flex justify-between mt-1">
          {LABELS.map((_l,i)=><span key={i} className="text-[9px] text-slate-700">{i}</span>)}
        </div>
      </div>
      <div className="flex items-start gap-2.5 p-3 bg-teal-500/8 border border-teal-500/15 rounded-xl">
        <Sparkles size={12} className="text-teal-400 shrink-0 mt-0.5"/>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/80 mb-1">Agent Recommendation</p>
          <p className="text-xs text-slate-400 leading-relaxed">{SUGGESTIONS[Math.min(Math.floor((5-energy)/2),2)]}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label:"Sleep",      value:"7h 20m", icon:<CheckCircle2 size={11}/>, color:"text-indigo-400" },
          { label:"Steps",      value:"3,240",  icon:<Activity size={11}/>,     color:"text-green-400"  },
          { label:"Hydration",  value:"1.2L",   icon:<Droplets size={11}/>,     color:"text-sky-400"    },
        ].map(s=>(
          <div key={s.label} className="bg-[#0f1117] border border-white/[0.05] rounded-xl p-3 text-center">
            <span className={`${s.color} block mb-1`}>{s.icon}</span>
            <p className="text-sm font-bold text-slate-200">{s.value}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   10. MEALS & NUTRITION
   ══════════════════════════════════════════════════════════════ */
function MealsCard() {
  const [meals,  setMeals]  = useState<MealItem[]>(INIT_MEALS);
  const [adding, setAdding] = useState(false);
  const [newMeal,setNewMeal]= useState<{meal:string;desc:string;cals:string}>({meal:"Lunch",desc:"",cals:""});
  const del  = (id:string) => setMeals(p=>p.filter(m=>m.id!==id));
  const add  = () => { if(newMeal.desc.trim()){setMeals(p=>[...p,{id:Date.now().toString(),meal:newMeal.meal as MealItem["meal"],desc:newMeal.desc,cals:Number(newMeal.cals)||undefined}]);setNewMeal({meal:"Snack",desc:"",cals:""});setAdding(false);} };
  const totalCals = meals.reduce((a,m)=>a+(m.cals??0),0);
  return (
    <div className="space-y-2.5">
      {meals.map(m=>(
        <div key={m.id} className="group flex items-center gap-3 p-3 bg-[#0f1117] border border-white/[0.05] rounded-xl">
          <span className="text-[10px] font-bold text-slate-600 w-14 shrink-0">{m.meal}</span>
          <span className="flex-1 text-xs text-slate-300">{m.desc}</span>
          {m.cals!=null&&m.cals>0&&<span className="text-[10px] text-green-400 font-semibold shrink-0">{m.cals} kcal</span>}
          <button onClick={()=>del(m.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
        </div>
      ))}
      {totalCals>0&&<p className="text-[10px] text-slate-500 text-right">Total: <span className="font-bold text-slate-300">{totalCals} kcal</span></p>}
      {adding
        ? <div className="space-y-2 p-3 bg-[#0f1117] border border-white/[0.08] rounded-xl">
            <div className="flex gap-2">
              <select value={newMeal.meal} onChange={e=>setNewMeal(p=>({...p,meal:e.target.value}))}
                className="bg-[#13151c] border border-white/[0.08] text-xs text-slate-300 rounded-lg px-2 py-1.5 outline-none">
                {["Breakfast","Lunch","Dinner","Snack"].map(o=><option key={o}>{o}</option>)}
              </select>
              <input value={newMeal.cals} onChange={e=>setNewMeal(p=>({...p,cals:e.target.value}))} placeholder="kcal"
                className="w-16 bg-[#13151c] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none text-center"/>
            </div>
            <input value={newMeal.desc} onChange={e=>setNewMeal(p=>({...p,desc:e.target.value}))} placeholder="What did you eat?"
              onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setAdding(false);}}
              className="w-full bg-[#13151c] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-green-500/40"/>
            <div className="flex gap-2">
              <button onClick={add} className="px-3 py-1.5 bg-green-600/15 border border-green-500/25 rounded-lg text-xs text-green-300 hover:bg-green-600/25 transition-colors">Save</button>
              <button onClick={()=>setAdding(false)} className="text-slate-600 hover:text-slate-300 text-xs transition-colors">Cancel</button>
            </div>
          </div>
        : <button onClick={()=>setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"><Plus size={11}/> Log meal</button>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   11. SHOPPING LIST
   ══════════════════════════════════════════════════════════════ */
function ShoppingCard() {
  const [items,   setItems]   = useState<NoteItem[]>(INIT_SHOPPING);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [newText, setNewText] = useState("");
  const toggle = (id:string) => setChecked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const del    = (id:string) => setItems(p=>p.filter(i=>i.id!==id));
  const add    = () => { if(newText.trim()){setItems(p=>[...p,{id:Date.now().toString(),text:newText.trim()}]);setNewText("");} };
  return (
    <div className="space-y-1.5">
      {items.map(item=>(
        <div key={item.id} className="group flex items-center gap-3">
          <button onClick={()=>toggle(item.id)}
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
              checked.has(item.id)?"bg-sky-500/20 border-sky-400/50":"border-white/[0.12] hover:border-sky-400/40"
            }`}>
            {checked.has(item.id)&&<Check size={9} className="text-sky-400"/>}
          </button>
          <span className={`flex-1 text-xs transition-colors ${checked.has(item.id)?"text-slate-600 line-through":"text-slate-300"}`}>{item.text}</span>
          <button onClick={()=>del(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Add item…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-sky-500/40"/>
        <button onClick={add} className="px-3 py-2 bg-sky-600/10 border border-sky-500/20 rounded-xl text-xs text-sky-300 hover:bg-sky-600/20 transition-colors"><Plus size={13}/></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   12. RETROSPECTIVE
   ══════════════════════════════════════════════════════════════ */
function RetrospectiveCard() {
  const PROMPTS = [
    "What went well today so far?",
    "What would I do differently?",
    "What did I learn?",
    "Where did I lose energy or focus?",
  ];
  const [texts, setTexts] = useState<string[]>(PROMPTS.map(()=>""));
  return (
    <div className="space-y-3">
      {PROMPTS.map((p,i)=>(
        <div key={i}>
          <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">{p}</label>
          <textarea value={texts[i]} onChange={e=>setTexts(prev=>prev.map((t,j)=>j===i?e.target.value:t))} rows={2}
            className="w-full bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-violet-500/40 resize-none"/>
        </div>
      ))}
      <p className="text-[10px] text-indigo-400/60 flex items-center gap-1.5"><Sparkles size={9}/> Agent will surface patterns across your retrospectives weekly</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   13. IF DAY THEN DO
   ══════════════════════════════════════════════════════════════ */
interface IfRule { id:string; condition:string; action:string; active:boolean }

function IfDayThenCard() {
  const [rules, setRules] = useState<IfRule[]>([
    { id:"r1", condition:"Sunday",             action:"Weekly review + plan the coming week",       active:isSunday      },
    { id:"r2", condition:"Monday",             action:"Set weekly priorities in Goals Dashboard",   active:isMonday      },
    { id:"r3", condition:"Last day of month",  action:"Monthly planning and goal review session",   active:isLastOfMonth },
    { id:"r4", condition:"Dialysis day",       action:"Send blood results to consultant. Rest plan activated.", active:false },
    { id:"r5", condition:"Fasting day",        action:"Hydration check every 2h. Light activity only.",         active:true  },
  ]);
  const [adding, setAdding] = useState(false);
  const [newCond,setNewCond]= useState("");
  const [newAct, setNewAct] = useState("");
  const del = (id:string) => setRules(p=>p.filter(r=>r.id!==id));
  const add  = () => {
    if(newCond.trim()&&newAct.trim()){
      setRules(p=>[...p,{id:Date.now().toString(),condition:newCond.trim(),action:newAct.trim(),active:false}]);
      setNewCond("");setNewAct("");setAdding(false);
    }
  };
  return (
    <div className="space-y-2">
      {rules.map(r=>(
        <div key={r.id} className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
          r.active?"bg-yellow-400/8 border-yellow-400/20":"bg-white/[0.02] border-white/[0.06]"
        }`}>
          <Zap size={12} className={r.active?"text-yellow-400":"text-slate-600"}/>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">If {r.condition}</p>
            <p className={`text-xs leading-snug ${r.active?"text-yellow-200 font-medium":"text-slate-400"}`}>{r.action}</p>
            {r.active&&<span className="inline-block mt-1 text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Active Today</span>}
          </div>
          <button onClick={()=>del(r.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0 mt-0.5"><Trash2 size={10}/></button>
        </div>
      ))}
      {adding
        ? <div className="space-y-2 p-3 bg-[#0f1117] border border-white/[0.08] rounded-xl">
            <input value={newCond} onChange={e=>setNewCond(e.target.value)} placeholder="Condition (e.g. Sunday, dialysis day…)"
              className="w-full bg-[#13151c] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none"/>
            <input value={newAct} onChange={e=>setNewAct(e.target.value)} placeholder="Action to take…"
              onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setAdding(false);}}
              className="w-full bg-[#13151c] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none"/>
            <div className="flex gap-2">
              <button onClick={add} className="px-3 py-1.5 bg-yellow-600/15 border border-yellow-500/25 rounded-lg text-xs text-yellow-300 hover:bg-yellow-600/25 transition-colors">Add Rule</button>
              <button onClick={()=>setAdding(false)} className="text-slate-600 hover:text-slate-300 text-xs transition-colors">Cancel</button>
            </div>
          </div>
        : <button onClick={()=>setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"><Plus size={11}/> Add rule</button>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   14. AFTERNOON ROUTINE
   ══════════════════════════════════════════════════════════════ */
function AfternoonCard() {
  const [items, setItems] = useState<CheckItem[]>(INIT_AFTERNOON);
  const toggle = (id:string) => setItems(p=>p.map(m=>m.id===id?{...m,done:!m.done}:m));
  const done   = items.filter(m=>m.done).length;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div animate={{width:`${items.length?(done/items.length)*100:0}%`}} transition={{duration:0.5}}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"/>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">{done}/{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map(m=>(
          <div key={m.id} className="flex items-center gap-3">
            <button onClick={()=>toggle(m.id)}
              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                m.done?"bg-amber-500/20 border-amber-400/50":"border-white/[0.12] hover:border-amber-400/40"
              }`}>
              {m.done&&<Check size={10} className="text-amber-400"/>}
            </button>
            <span className={`flex-1 text-xs transition-colors ${m.done?"text-slate-600 line-through":"text-slate-300"}`}>{m.label}</span>
            {m.streak&&m.streak>0&&<div className="flex items-center gap-0.5 shrink-0"><Flame size={9} className="text-amber-400"/><span className="text-[9px] font-bold text-amber-400">{m.streak}</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   15. HOW DO I FEEL RIGHT NOW
   ══════════════════════════════════════════════════════════════ */
function FeelCard() {
  const [mood,  setMood]  = useState<string|null>(null);
  const [notes, setNotes] = useState("");
  const MOODS = [
    { id:"great",  label:"Great",   icon:<Smile size={16}/>,  color:"text-green-400  bg-green-400/10  border-green-400/30"   },
    { id:"ok",     label:"OK",      icon:<Meh size={16}/>,    color:"text-yellow-400 bg-yellow-400/10 border-yellow-400/30"  },
    { id:"low",    label:"Low",     icon:<Frown size={16}/>,  color:"text-blue-400   bg-blue-400/10   border-blue-400/30"    },
    { id:"anxious",label:"Anxious", icon:<Wind size={16}/>,   color:"text-orange-400 bg-orange-400/10 border-orange-400/30"  },
    { id:"tired",  label:"Tired",   icon:<CheckCircle2 size={16}/>, color:"text-violet-400 bg-violet-400/10 border-violet-400/30" },
  ];
  const SUGGESTIONS: Record<string,string> = {
    great:  "You're in a positive state — ideal for deep work, challenging goals, and connecting with others.",
    ok:     "Steady energy. Focus on your top priorities. Take a 5-min walk between tasks.",
    low:    "Gentle day recommended. Focus on habits, hydration, and one meaningful action.",
    anxious:"Ground yourself first. 4-7-8 breathing (4s in, 7s hold, 8s out). Then simplify your task list.",
    tired:  "Rest is part of the process. Prioritise sleep tonight. Do only the essentials today.",
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {MOODS.map(m=>(
          <button key={m.id} onClick={()=>setMood(m.id)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
              mood===m.id ? m.color : "bg-white/[0.02] border-white/[0.07] text-slate-500 hover:border-white/20 hover:text-slate-300"
            }`}>
            {m.icon}
            <span className="text-[10px] font-semibold">{m.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {mood&&(
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="flex items-start gap-2.5 p-3 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
            <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5"/>
            <p className="text-xs text-slate-400 leading-relaxed">{SUGGESTIONS[mood]}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
        placeholder="Expand on how you're feeling…"
        className="w-full bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-pink-500/30 resize-none"/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   16. HOW WILL I MAKE MYSELF FEEL GREAT
   ══════════════════════════════════════════════════════════════ */
function MakeGreatCard() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom,   setCustom]   = useState<string[]>([]);
  const [newText,  setNewText]  = useState("");
  const toggle = (s:string) => setSelected(p=>{const n=new Set(p);n.has(s)?n.delete(s):n.add(s);return n;});
  const add    = () => { if(newText.trim()){setCustom(p=>[...p,newText.trim()]);setNewText("");} };
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {[...SELF_CARE,...custom].map(s=>(
          <button key={s} onClick={()=>toggle(s)}
            className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              selected.has(s)
                ?"bg-indigo-600/15 border-indigo-500/35 text-indigo-200"
                :"bg-white/[0.02] border-white/[0.07] text-slate-400 hover:border-white/20 hover:text-slate-300"
            }`}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Add your own…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/30"/>
        <button onClick={add} className="px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors"><Plus size={13}/></button>
      </div>
      {selected.size>0&&(
        <p className="text-[11px] text-indigo-400/80 flex items-center gap-1.5">
          <CheckCircle2 size={10}/> {selected.size} action{selected.size>1?"s":""} selected for today
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   17. TODAY'S EXPECTATIONS
   ══════════════════════════════════════════════════════════════ */
function ExpectationsCard() {
  const [items,   setItems]   = useState<string[]>([
    "I will complete my 3 Focus goals before 4pm.",
    "I will maintain my IF window until 6pm.",
    "I will be present and energetic in today's meetings.",
  ]);
  const [newText, setNewText] = useState("");
  const del = (i:number) => setItems(p=>p.filter((_,j)=>j!==i));
  const add  = () => { if(newText.trim()){setItems(p=>[...p,newText.trim()]);setNewText("");} };
  return (
    <div className="space-y-2">
      {items.map((e,i)=>(
        <div key={i} className="group flex items-start gap-2.5">
          <Star size={11} className="text-yellow-400/70 shrink-0 mt-0.5"/>
          <p className="flex-1 text-xs text-slate-300 leading-relaxed">{e}</p>
          <button onClick={()=>del(i)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Add an expectation for today…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-yellow-500/30"/>
        <button onClick={add} className="px-3 py-2 bg-yellow-600/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300 hover:bg-yellow-600/20 transition-colors"><Plus size={13}/></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   18. IDEAS & INSPIRATION
   ══════════════════════════════════════════════════════════════ */
function IdeasCard() {
  const [ideas,   setIdeas]   = useState<{id:string;text:string;tag:string}[]>([
    { id:"i1", text:"Build a 'life score' radar chart showing all 8 life areas", tag:"P1 Feature" },
    { id:"i2", text:"White-label version of P1 for corporate wellness programmes", tag:"Business"   },
    { id:"i3", text:"Voice journaling integration — agent transcribes & categorises", tag:"Feature"  },
  ]);
  const [newText, setNewText] = useState("");
  const [newTag,  setNewTag]  = useState("General");
  const TAGS = ["General","P1 Feature","Business","Personal","Health","Finance","Creative"];
  const del  = (id:string) => setIdeas(p=>p.filter(i=>i.id!==id));
  const add  = () => { if(newText.trim()){setIdeas(p=>[...p,{id:Date.now().toString(),text:newText.trim(),tag:newTag}]);setNewText("");} };
  return (
    <div className="space-y-2">
      {ideas.map(idea=>(
        <div key={idea.id} className="group flex items-start gap-2.5 p-3 bg-[#0f1117] border border-white/[0.05] rounded-xl">
          <Lightbulb size={11} className="text-yellow-400/70 shrink-0 mt-0.5"/>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 leading-relaxed">{idea.text}</p>
            <span className="inline-block mt-1.5 text-[9px] font-bold text-slate-500 bg-white/[0.04] border border-white/[0.07] px-1.5 py-0.5 rounded-full">{idea.tag}</span>
          </div>
          <button onClick={()=>del(idea.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0 mt-0.5"><Trash2 size={10}/></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Capture an idea…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-yellow-500/30"/>
        <select value={newTag} onChange={e=>setNewTag(e.target.value)}
          className="bg-[#0f1117] border border-white/[0.08] text-xs text-slate-400 rounded-xl px-2 py-2 outline-none">
          {TAGS.map(t=><option key={t}>{t}</option>)}
        </select>
        <button onClick={add} className="px-3 py-2 bg-yellow-600/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300 hover:bg-yellow-600/20 transition-colors"><Plus size={13}/></button>
      </div>
      <p className="text-[10px] text-indigo-400/60 flex items-center gap-1.5 mt-1"><Sparkles size={9}/> Agent will categorise and connect ideas to your goals weekly</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   19. IMPORTANT NOTES
   ══════════════════════════════════════════════════════════════ */
function NotesCard() {
  const [notes,   setNotes]   = useState<{id:string;text:string;pinned:boolean}[]>([
    { id:"n1", text:"Dialysis appointment — Friday 2pm. Confirm transport Thursday.", pinned:true  },
    { id:"n2", text:"P1 investor deck must be ready for review by EOW.",              pinned:true  },
    { id:"n3", text:"Call Marcus re: partnership proposal before end of week.",        pinned:false },
  ]);
  const [newText, setNewText] = useState("");
  const del  = (id:string) => setNotes(p=>p.filter(n=>n.id!==id));
  const pin  = (id:string) => setNotes(p=>p.map(n=>n.id===id?{...n,pinned:!n.pinned}:n));
  const add  = () => { if(newText.trim()){setNotes(p=>[...p,{id:Date.now().toString(),text:newText.trim(),pinned:false}]);setNewText("");} };
  const sorted = [...notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned));
  return (
    <div className="space-y-2">
      {sorted.map(n=>(
        <div key={n.id} className={`group flex items-start gap-2.5 p-3 rounded-xl border ${
          n.pinned?"bg-indigo-600/8 border-indigo-500/20":"bg-white/[0.02] border-white/[0.05]"
        }`}>
          <button onClick={()=>pin(n.id)}><Star size={11} className={n.pinned?"text-indigo-400":"text-slate-700 hover:text-slate-400 transition-colors"}/></button>
          <p className="flex-1 text-xs text-slate-300 leading-relaxed">{n.text}</p>
          <button onClick={()=>del(n.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Add an important note…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500/40"/>
        <button onClick={add} className="px-3 py-2 bg-white/[0.04] border border-white/[0.10] rounded-xl text-xs text-slate-300 hover:bg-white/[0.08] transition-colors"><Plus size={13}/></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   20. EVENING ROUTINE
   ══════════════════════════════════════════════════════════════ */
function EveningCard() {
  const [items, setItems] = useState<CheckItem[]>(INIT_EVENING);
  const toggle = (id:string) => setItems(p=>p.map(m=>m.id===id?{...m,done:!m.done}:m));
  const done   = items.filter(m=>m.done).length;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div animate={{width:`${items.length?(done/items.length)*100:0}%`}} transition={{duration:0.5}}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"/>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">{done}/{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map(m=>(
          <div key={m.id} className="flex items-center gap-3">
            <button onClick={()=>toggle(m.id)}
              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                m.done?"bg-violet-500/20 border-violet-400/50":"border-white/[0.12] hover:border-violet-400/40"
              }`}>
              {m.done&&<Moon size={10} className="text-violet-400"/>}
            </button>
            <span className={`flex-1 text-xs transition-colors ${m.done?"text-slate-600 line-through":"text-slate-300"}`}>{m.label}</span>
            {m.streak&&m.streak>0&&<div className="flex items-center gap-0.5 shrink-0"><Flame size={9} className="text-violet-400"/><span className="text-[9px] font-bold text-violet-400">{m.streak}</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   21. SKELETON PLAN FOR TOMORROW
   ══════════════════════════════════════════════════════════════ */
function TomorrowCard() {
  const [slots, setSlots] = useState([
    { id:"s1", time:"Morning",       note:"" },
    { id:"s2", time:"Mid-morning",   note:"" },
    { id:"s3", time:"Afternoon",     note:"" },
    { id:"s4", time:"Late afternoon",note:"" },
    { id:"s5", time:"Evening",       note:"" },
  ]);
  const [generating, setGenerating] = useState(false);
  const update = (id:string, val:string) => setSlots(p=>p.map(s=>s.id===id?{...s,note:val}:s));
  const autoPlan = async () => {
    setGenerating(true);
    await new Promise(r=>setTimeout(r,1100));
    setSlots([
      { id:"s1", time:"Morning",       note:"Morning routine + deep work block (Today Screen feature)"  },
      { id:"s2", time:"Mid-morning",   note:"Team sync + review At Risk goals"                          },
      { id:"s3", time:"Afternoon",     note:"IF break (6pm) + catch up on emails + Goals review"        },
      { id:"s4", time:"Late afternoon",note:"Exercise session + 20-min walk"                            },
      { id:"s5", time:"Evening",       note:"Reading + Evening routine + Lights out by 10:30pm"         },
    ]);
    setGenerating(false);
  };
  return (
    <div>
      <button onClick={autoPlan} disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-xl border border-indigo-500/25 bg-indigo-600/8 text-indigo-300 hover:bg-indigo-600/15 transition-colors text-xs font-medium disabled:opacity-60">
        {generating
          ? <><span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"/><span>Planning tomorrow…</span></>
          : <><Sparkles size={12}/> Auto-plan with P1 Agent</>}
      </button>
      <div className="space-y-2">
        {slots.map(s=>(
          <div key={s.id} className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-600 w-24 shrink-0">{s.time}</span>
            <input value={s.note} onChange={e=>update(s.id,e.target.value)} placeholder="What's planned…"
              className="flex-1 bg-[#0f1117] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/30"/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   22. EVENING GRATITUDE
   ══════════════════════════════════════════════════════════════ */
function Gratitude2Card() {
  const [entries, setEntries] = useState<string[]>(INIT_GRATITUDE2);
  const [newText, setNewText] = useState("");
  const del = (i:number) => setEntries(p=>p.filter((_,j)=>j!==i));
  const add  = () => { if(newText.trim()){setEntries(p=>[...p,newText.trim()]);setNewText("");} };
  return (
    <div className="space-y-2">
      {entries.map((e,i)=>(
        <div key={i} className="group flex items-start gap-3">
          <Moon size={11} className="text-indigo-400/70 shrink-0 mt-0.5"/>
          <p className="flex-1 text-xs text-slate-300 leading-relaxed italic">"{e}"</p>
          <button onClick={()=>del(i)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"><Trash2 size={10}/></button>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input value={newText} onChange={e=>setNewText(e.target.value)} placeholder="I am grateful for…"
          onKeyDown={e=>{if(e.key==="Enter")add();}}
          className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/30"/>
        <button onClick={add} className="px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors"><Plus size={13}/></button>
      </div>
      <p className="text-[10px] text-slate-600 italic text-center pt-1">End every day with a grateful heart. 🌙</p>
    </div>
  );
}