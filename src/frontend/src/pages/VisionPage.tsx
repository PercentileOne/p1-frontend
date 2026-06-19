import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, ChevronDown, ChevronUp, Sparkles, Edit3, Trash2,
  Check, X, Heart, Wallet, Briefcase, BookOpen,
  Home, Globe, Compass, Star, Activity, Award, Eye, Mountain, ChevronRight,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */
interface IdentityStatement { id: string; text: string; }
interface AreaOutcome       { id: string; text: string; done: boolean; }
interface AreaVision {
  id: string; area: string; icon: React.ReactNode; bg: string; border: string;
  accent: string; textAccent: string;
  description: string; why: string; outcomes: AreaOutcome[];
  linkedGoals: number; progress: number; agentInsight: string;
}
interface YearVision {
  id: string; title: string; horizon: string; horizonLabel: string;
  description: string; why: string; progress: number; agentPrediction: string;
  accent: string; border: string;
}
interface LegacyField { id: string; prompt: string; text: string; }

/* ══════════════════════════════════════════════════════════════
   SYNTHETIC DATA
   ══════════════════════════════════════════════════════════════ */
const INIT_IDENTITY: IdentityStatement[] = [
  { id:"i1", text:"I am disciplined — I do what I say, when I say it, no matter how I feel." },
  { id:"i2", text:"I am strong — physically, mentally, and spiritually." },
  { id:"i3", text:"I am a builder — I create things that outlast me." },
  { id:"i4", text:"I am a devoted father — my boys will know they are loved, guided, and provided for." },
  { id:"i5", text:"I am a man of faith — I trust God in every season." },
  { id:"i6", text:"I am generous — I give freely from abundance." },
  { id:"i7", text:"I am focused — I protect my time and energy fiercely." },
];

const INIT_IDENTITY_WHY =
  "Because the man I become determines everything — the legacy I leave, the life my boys inherit, and the impact my work has on the world. Identity is the foundation.";

const INIT_AREA_VISIONS: AreaVision[] = [
  {
    id:"a1", area:"Health & Strength",
    icon:<Activity size={16}/>, bg:"bg-emerald-500/8", border:"border-emerald-500/20",
    accent:"bg-emerald-500", textAccent:"text-emerald-400",
    description:"By 45 I am in the best physical condition of my life — strong, lean, energetic, and fully in control of my health.",
    why:"My health is the engine of everything else. Without it, nothing else functions.",
    outcomes:[
      { id:"o1", text:"Elite physical strength and cardiovascular fitness", done:false },
      { id:"o2", text:"Reversed illness effects through nutrition and discipline", done:false },
      { id:"o3", text:"Optimal sleep, recovery, and energy management", done:true  },
    ],
    linkedGoals:4, progress:42, agentInsight:"7-Day Fast goal is directly aligned. 3 health habits are on track.",
  },
  {
    id:"a2", area:"Wealth & Finances",
    icon:<Wallet size={16}/>, bg:"bg-amber-500/8", border:"border-amber-500/20",
    accent:"bg-amber-500", textAccent:"text-amber-400",
    description:"I am financially free — money works for me. I have built generational wealth and have no consumer debt.",
    why:"Financial freedom gives my family security and gives me the freedom to pursue purpose over profit.",
    outcomes:[
      { id:"o4", text:"Zero consumer debt", done:false },
      { id:"o5", text:"Generational wealth foundation for my boys", done:false },
      { id:"o6", text:"P1 generating significant recurring revenue", done:false },
    ],
    linkedGoals:2, progress:18, agentInsight:"Save £10k goal is in progress. P1 revenue goal at risk — no recent updates.",
  },
  {
    id:"a3", area:"Career & Mastery",
    icon:<Briefcase size={16}/>, bg:"bg-blue-500/8", border:"border-blue-500/20",
    accent:"bg-blue-500", textAccent:"text-blue-400",
    description:"Percentile.One is a global Life OS used by millions. I am recognised as a leader in human performance technology.",
    why:"My work is my greatest contribution to the world outside my family. It must be excellent.",
    outcomes:[
      { id:"o7", text:"P1 reaches 1M+ active users", done:false },
      { id:"o8", text:"I am a recognised voice in human performance", done:false },
      { id:"o9", text:"I have mastered product, engineering, and leadership", done:false },
    ],
    linkedGoals:6, progress:31, agentInsight:"Today Screen feature directly advances this vision. Momentum is building.",
  },
  {
    id:"a4", area:"Spirituality & Faith",
    icon:<Star size={16}/>, bg:"bg-violet-500/8", border:"border-violet-500/20",
    accent:"bg-violet-500", textAccent:"text-violet-400",
    description:"My faith is the foundation of every decision I make. I live in daily communion with God.",
    why:"Faith is the source of my peace, clarity, and direction. Without it I am just a man chasing things.",
    outcomes:[
      { id:"o10", text:"Daily prayer and meditation practice", done:true  },
      { id:"o11", text:"Every major decision passed through prayer first", done:false },
      { id:"o12", text:"Living life that reflects my values consistently", done:false },
    ],
    linkedGoals:2, progress:67, agentInsight:"Morning Blessing and meditation habit streaks are strong. 21-day streak active.",
  },
  {
    id:"a5", area:"Fatherhood & Family",
    icon:<Heart size={16}/>, bg:"bg-rose-500/8", border:"border-rose-500/20",
    accent:"bg-rose-500", textAccent:"text-rose-400",
    description:"My boys are confident, kind, and purpose-driven. I am present, engaged, and the father they deserve.",
    why:"Everything else I build is secondary to who my sons become. They are my greatest legacy.",
    outcomes:[
      { id:"o13", text:"Present and engaged daily — not just financially", done:false },
      { id:"o14", text:"My boys have strong values and know they are loved", done:false },
      { id:"o15", text:"Strong family traditions and shared experiences", done:false },
    ],
    linkedGoals:1, progress:55, agentInsight:"No active family goals detected. Consider adding one — this area is important.",
  },
  {
    id:"a6", area:"Lifestyle & Environment",
    icon:<Home size={16}/>, bg:"bg-teal-500/8", border:"border-teal-500/20",
    accent:"bg-teal-500", textAccent:"text-teal-400",
    description:"I live in a home that is peaceful, beautiful, and organised. My environment reflects my values and aspirations.",
    why:"Environment shapes behaviour. A calm, ordered home produces calm, ordered thinking.",
    outcomes:[
      { id:"o16", text:"Home environment is intentional, beautiful, and calm", done:false },
      { id:"o17", text:"Travel meaningfully with family each year", done:false },
      { id:"o18", text:"No clutter — physical or digital", done:false },
    ],
    linkedGoals:0, progress:22, agentInsight:"No linked goals. Consider adding a lifestyle goal to build momentum here.",
  },
  {
    id:"a7", area:"Learning & Growth",
    icon:<BookOpen size={16}/>, bg:"bg-cyan-500/8", border:"border-cyan-500/20",
    accent:"bg-cyan-500", textAccent:"text-cyan-400",
    description:"I am a lifelong learner — curious, hungry, and humble. I read 24 books per year and invest in continuous education.",
    why:"The day I stop growing is the day I start declining. Learning is how I stay sharp and relevant.",
    outcomes:[
      { id:"o19", text:"24 books read per year", done:false },
      { id:"o20", text:"At least one major course or certification per year", done:false },
      { id:"o21", text:"Mentors and coaches in key areas of life", done:false },
    ],
    linkedGoals:3, progress:38, agentInsight:"Read 24 Books goal is 6 behind target. Recovery possible with 2 books this week.",
  },
  {
    id:"a8", area:"Contribution & Service",
    icon:<Globe size={16}/>, bg:"bg-orange-500/8", border:"border-orange-500/20",
    accent:"bg-orange-500", textAccent:"text-orange-400",
    description:"I contribute to my community in meaningful ways. P1 has improved the lives of millions. I mentor the next generation.",
    why:"A life lived only for oneself is a small life. I am called to something bigger.",
    outcomes:[
      { id:"o22", text:"P1 has genuinely improved 1M+ lives", done:false },
      { id:"o23", text:"I mentor at least 5 entrepreneurs per year", done:false },
      { id:"o24", text:"Giving financially to causes aligned with my faith", done:false },
    ],
    linkedGoals:1, progress:12, agentInsight:"Contribution is the least developed area. This is worth scheduling time for.",
  },
];

const INIT_YEAR_VISIONS: YearVision[] = [
  {
    id:"y1", title:"Build Percentile.One into a Global Platform",
    horizon:"3–5", horizonLabel:"3–5 Year Arc",
    description:"P1 becomes the leading Life OS for ambitious people who want to live with intention, track what matters, and reach their potential.",
    why:"This is my calling. I have the vision, the lived experience of adversity, and the technical skill to build something that genuinely changes lives.",
    progress:31,
    agentPrediction:"On current trajectory, MVP with 1k users is achievable in 8–12 months. Funding milestone needed by Q4.",
    accent:"from-indigo-600/20 to-violet-600/10", border:"border-indigo-500/20",
  },
  {
    id:"y2", title:"Achieve Elite Health & Physical Strength",
    horizon:"1–2", horizonLabel:"1–2 Year Arc",
    description:"I am in the best physical condition of my life — strong, lean, full of energy, and free from illness complications.",
    why:"My health is not optional. It is the infrastructure of my entire life and legacy.",
    progress:42,
    agentPrediction:"Fasting goal and fitness habits are aligned. Projected to hit primary health targets within 14 months at current pace.",
    accent:"from-emerald-600/15 to-teal-600/8", border:"border-emerald-500/20",
  },
  {
    id:"y3", title:"Achieve Financial Independence",
    horizon:"2–3", horizonLabel:"2–3 Year Arc",
    description:"I am fully financially free. No consumer debt. P1 is generating significant income. Generational wealth is being built.",
    why:"Financial freedom removes fear from every decision and lets me operate from abundance, not scarcity.",
    progress:18,
    agentPrediction:"Current pace falls short of 3-year target. Needs P1 revenue milestone and debt reduction plan activated.",
    accent:"from-amber-600/15 to-yellow-600/8", border:"border-amber-500/20",
  },
  {
    id:"y4", title:"Become a Published Author",
    horizon:"1–2", horizonLabel:"1–2 Year Arc",
    description:"I have written and published a book on living a fully optimised, purpose-driven life — drawing on my journey, faith, and the P1 framework.",
    why:"A book is leverage — it reaches people I will never meet and creates a lasting artifact of what I believe.",
    progress:8,
    agentPrediction:"No active writing goals detected. To hit a 1-year a writing habit goal needs to start this month.",
    accent:"from-blue-600/15 to-sky-600/8", border:"border-blue-500/20",
  },
  {
    id:"y5", title:"Build an Unshakeable Family Foundation",
    horizon:"Ongoing", horizonLabel:"Ongoing",
    description:"My boys grow up knowing they are loved, provided for, and guided. My family is a unit of strength, faith, and warmth.",
    why:"The most important legacy I leave is not a company or a book. It is who my sons become.",
    progress:55,
    agentPrediction:"Fatherhood area is progressing. Daily presence habits could be formalised as a goal to strengthen this arc.",
    accent:"from-rose-600/15 to-pink-600/8", border:"border-rose-500/20",
  },
];

const INIT_LEGACY_FIELDS: LegacyField[] = [
  { id:"l1", prompt:"What I want to leave behind",
    text:"A family who knew they were loved. A product that changed how people live. A life that proved what's possible with faith, discipline, and purpose." },
  { id:"l2", prompt:"What I want my boys to inherit",
    text:"Faith, work ethic, financial intelligence, emotional resilience, and the knowledge that they are capable of anything they commit to." },
  { id:"l3", prompt:"What my work stands for",
    text:"P1 stands for the belief that every person deserves to live a fully optimised, purposeful, and meaningful life — regardless of where they started." },
  { id:"l4", prompt:"What my life represents",
    text:"That it is possible to overcome adversity, build something extraordinary, raise a family with integrity, and remain a man of faith — all at the same time." },
  { id:"l5", prompt:"Values I want to embody",
    text:"Faith. Discipline. Love. Excellence. Generosity. Courage. Presence." },
  { id:"l6", prompt:"Contributions I want to make",
    text:"Inspire 10 million people to live more intentionally through Percentile.One. Give back financially to causes aligned with my faith. Mentor 100 entrepreneurs." },
];

const VISION_ALIGNMENT = 74; // agent-calculated score

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function VisionPage() {
  const navigate = useNavigate();
  const [sectionOrder, setSectionOrder] = useState(["identity","areas","yeararc","legacy"]);
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const [areaVisions, setAreaVisions] = useState<AreaVision[]>(INIT_AREA_VISIONS);

  const toggle   = (id:string) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const moveSection = (id:string, dir:-1|1) => {
    setSectionOrder(prev=>{
      const i=prev.indexOf(id), j=i+dir;
      if(j<0||j>=prev.length) return prev;
      const n=[...prev]; [n[i],n[j]]=[n[j],n[i]]; return n;
    });
  };

  const SECTION_META: Record<string,{title:string;icon:React.ReactNode;accent:string}> = {
    identity: { title:"Identity Vision",   icon:<Eye size={14}/>,         accent:"text-indigo-400"  },
    areas:    { title:"Area Visions",      icon:<Compass size={14}/>,     accent:"text-teal-400"    },
    yeararc:  { title:"1–5 Year Arcs",     icon:<Mountain size={14}/>,    accent:"text-violet-400"  },
    legacy:   { title:"Legacy",            icon:<Award size={14}/>,       accent:"text-amber-400"   },
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={()=>navigate("/cockpit")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cockpit
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-indigo-400"/>
            <h1 className="text-sm font-bold text-white">Your Vision</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Vision Alignment Score */}
            <div className="flex items-center gap-2 bg-indigo-600/15 border border-indigo-500/25 rounded-full px-3 py-1.5">
              <div className="relative w-5 h-5">
                <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="2"/>
                  <circle cx="10" cy="10" r="7" fill="none" stroke="#818cf8" strokeWidth="2"
                    strokeDasharray={`${(VISION_ALIGNMENT/100)*43.98} 43.98`}/>
                </svg>
              </div>
              <span className="text-[11px] font-bold text-indigo-300">{VISION_ALIGNMENT}%</span>
              <span className="text-[10px] text-indigo-400/60 font-medium">Vision Aligned</span>
            </div>
            <button onClick={()=>navigate("/goals")} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Goals</button>
            <button onClick={()=>navigate("/today")} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Today</button>
          </div>
        </div>
      </header>

      {/* ── Agent header insight ── */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-violet-600/6">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-indigo-400"/>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-1">P1 Agent · Vision Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              You are building toward a life of <span className="text-indigo-300 font-semibold">faith, health, family, and impact</span>. Your strongest area is <span className="text-violet-300 font-semibold">Spirituality & Faith</span> (67% complete). Your fastest-growing arc is <span className="text-emerald-300 font-semibold">Health & Strength</span>. Greatest opportunity: your <span className="text-amber-300 font-semibold">Contribution & Service</span> vision has no linked goals — this is the gap between who you want to be and what you're currently doing.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="max-w-4xl mx-auto px-6 pb-8 space-y-4">
        {sectionOrder.map((id, idx) => {
          const meta = SECTION_META[id];
          return (
            <VisionSection key={id} id={id} title={meta.title} icon={meta.icon} accent={meta.accent}
              collapsed={collapsed[id]??false} onToggle={()=>toggle(id)}
              onMoveUp={idx>0?()=>moveSection(id,-1):undefined}
              onMoveDown={idx<sectionOrder.length-1?()=>moveSection(id,1):undefined}>
              {id==="identity" && <IdentityContent/>}
              {id==="areas"    && <AreaVisionsContent areaVisions={areaVisions} setAreaVisions={setAreaVisions}/>}
              {id==="yeararc"  && <YearArcsContent/>}
              {id==="legacy"   && <LegacyContent/>}
            </VisionSection>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION WRAPPER
   ══════════════════════════════════════════════════════════════ */
function VisionSection({ title, icon, accent, collapsed, onToggle, onMoveUp, onMoveDown, children }: {
  id?:string; title:string; icon:React.ReactNode; accent:string;
  collapsed:boolean; onToggle:()=>void; onMoveUp?:()=>void; onMoveDown?:()=>void;
  children:React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div layout className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden"
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.05]">
        <span className={`shrink-0 ${accent}`}>{icon}</span>
        <span className="text-base font-bold text-white flex-1">{title}</span>
        <AnimatePresence>
          {hovered && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.12}}
              className="flex items-center gap-0.5">
              <button onClick={onMoveUp} disabled={!onMoveUp}
                className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors rounded">
                <ChevronUp size={13}/>
              </button>
              <button onClick={onMoveDown} disabled={!onMoveDown}
                className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors rounded">
                <ChevronDown size={13}/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={onToggle} className="p-1 text-slate-600 hover:text-slate-300 transition-colors rounded">
          <motion.span animate={{rotate:collapsed?-90:0}} transition={{duration:0.2}} style={{display:"block"}}>
            <ChevronDown size={15}/>
          </motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.22,ease:"easeInOut"}} style={{overflow:"hidden"}}>
            <div className="p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. IDENTITY CONTENT
   ══════════════════════════════════════════════════════════════ */
function IdentityContent() {
  const [statements, setStatements] = useState<IdentityStatement[]>(INIT_IDENTITY);
  const [why,        setWhy]        = useState(INIT_IDENTITY_WHY);
  const [editWhy,    setEditWhy]    = useState(false);
  const [newText,    setNewText]    = useState("");
  const [adding,     setAdding]     = useState(false);
  const [editId,     setEditId]     = useState<string|null>(null);
  const [editText,   setEditText]   = useState("");
  const [generating, setGenerating] = useState(false);

  const AI_STATEMENTS = [
    "I am patient — I build for decades, not days.",
    "I am a learner — I grow from every experience, good and bad.",
    "I am an investor — in people, ideas, and my own potential.",
    "I am present — I give my full attention to what matters most.",
    "I am resilient — I bend but I do not break.",
  ];

  const generate = async () => {
    setGenerating(true);
    await new Promise(r=>setTimeout(r,900));
    const s = AI_STATEMENTS[Math.floor(Math.random()*AI_STATEMENTS.length)];
    if (!statements.find(st=>st.text===s))
      setStatements(p=>[...p,{id:Date.now().toString(),text:s}]);
    setGenerating(false);
  };

  const del    = (id:string) => setStatements(p=>p.filter(s=>s.id!==id));
  const saveEdit = (id:string) => {
    setStatements(p=>p.map(s=>s.id===id?{...s,text:editText}:s));
    setEditId(null);
  };
  const add = () => {
    if(newText.trim()){setStatements(p=>[...p,{id:Date.now().toString(),text:newText.trim()}]);setNewText("");setAdding(false);}
  };

  return (
    <div className="space-y-6">
      {/* Large identity headline */}
      <div className="text-center py-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400/70 mb-3">The Man I Am Becoming</p>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent mx-auto mb-3"/>
      </div>

      {/* Identity statements */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {statements.map((s,i)=>(
            <motion.div key={s.id} layout initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}}
              transition={{duration:0.18,delay:i*0.03}}
              className="group flex items-start gap-3.5 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117] hover:border-indigo-500/20 transition-colors">
              <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-indigo-300">{i+1}</span>
              </div>
              {editId===s.id
                ? <div className="flex-1 flex gap-2">
                    <input value={editText} onChange={e=>setEditText(e.target.value)} autoFocus
                      onKeyDown={e=>{if(e.key==="Enter")saveEdit(s.id);if(e.key==="Escape")setEditId(null);}}
                      className="flex-1 bg-transparent border-b border-indigo-500/40 outline-none text-sm text-slate-200 pb-1"/>
                    <button onClick={()=>saveEdit(s.id)} className="text-green-400 hover:text-green-300 transition-colors"><Check size={13}/></button>
                    <button onClick={()=>setEditId(null)} className="text-slate-600 hover:text-slate-400 transition-colors"><X size={13}/></button>
                  </div>
                : <>
                    <p className="flex-1 text-sm text-slate-300 leading-relaxed font-medium italic">"{s.text}"</p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0 mt-0.5">
                      <button onClick={()=>{setEditId(s.id);setEditText(s.text);}} className="p-1 text-slate-600 hover:text-indigo-400 transition-colors"><Edit3 size={11}/></button>
                      <button onClick={()=>del(s.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={11}/></button>
                    </div>
                  </>
              }
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add / generate */}
      {adding
        ? <div className="flex gap-2">
            <input value={newText} onChange={e=>setNewText(e.target.value)} autoFocus placeholder="I am…"
              onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setAdding(false);}}
              className="flex-1 bg-[#0f1117] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 italic"/>
            <button onClick={add} className="px-4 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 hover:bg-indigo-600/30 transition-colors font-medium">Add</button>
            <button onClick={()=>setAdding(false)} className="text-slate-600 hover:text-slate-300 text-xs transition-colors px-2">✕</button>
          </div>
        : <div className="flex items-center gap-4">
            <button onClick={()=>setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
              <Plus size={11}/> Add identity statement
            </button>
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors font-medium ml-auto disabled:opacity-60">
              {generating
                ? <><span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"/><span>Suggesting…</span></>
                : <><Sparkles size={10}/> Agent Suggest</>}
            </button>
          </div>
      }

      <div className="w-full h-px bg-white/[0.04]"/>

      {/* Why this identity matters */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Why This Identity Matters</p>
        {editWhy
          ? <div>
              <textarea value={why} onChange={e=>setWhy(e.target.value)} rows={3} autoFocus
                className="w-full bg-[#0f1117] border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none resize-none leading-relaxed"/>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>setEditWhy(false)} className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-medium"><Check size={11}/> Save</button>
                <button onClick={()=>setEditWhy(false)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Cancel</button>
              </div>
            </div>
          : <div className="group relative">
              <p className="text-sm text-slate-400 leading-relaxed">{why}</p>
              <button onClick={()=>setEditWhy(true)}
                className="opacity-0 group-hover:opacity-100 absolute top-0 right-0 p-1 text-slate-600 hover:text-indigo-400 transition-all">
                <Edit3 size={11}/>
              </button>
            </div>
        }
      </div>

      {/* Agent insight */}
      <div className="flex items-start gap-2.5 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
        <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5"/>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">Agent Insight</p>
          <p className="text-xs text-slate-400 leading-relaxed">Your identity statements are strong and consistent. Statement #4 (Fatherhood) aligns with your highest-priority vision area. No contradictions detected. Consider adding an identity around <em>generosity</em> — it's central to your Legacy but missing from Identity.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Identity Strength</span>
            <span className="text-xs font-bold text-indigo-300">68%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div initial={{width:0}} animate={{width:"68%"}} transition={{duration:0.8,delay:0.2,ease:"easeOut"}}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"/>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-600">Linked goals</p>
          <p className="text-sm font-bold text-slate-300">12</p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. AREA VISIONS CONTENT
   ══════════════════════════════════════════════════════════════ */
function AreaVisionsContent({ areaVisions, setAreaVisions }: {
  areaVisions: AreaVision[];
  setAreaVisions: React.Dispatch<React.SetStateAction<AreaVision[]>>;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleArea = (id:string) => setCollapsed(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const updateOutcome = (areaId:string, outId:string, done:boolean) =>
    setAreaVisions(p=>p.map(a=>a.id===areaId?{...a,outcomes:a.outcomes.map(o=>o.id===outId?{...o,done}:o)}:a));
  const addOutcome = (areaId:string, text:string) =>
    setAreaVisions(p=>p.map(a=>a.id===areaId?{...a,outcomes:[...a.outcomes,{id:Date.now().toString(),text,done:false}]}:a));
  const delOutcome = (areaId:string, outId:string) =>
    setAreaVisions(p=>p.map(a=>a.id===areaId?{...a,outcomes:a.outcomes.filter(o=>o.id!==outId)}:a));

  const neglected = areaVisions.filter(a=>a.linkedGoals===0);

  return (
    <div>
      {neglected.length>0&&(
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-xl mb-5">
          <Sparkles size={12} className="text-amber-400 shrink-0 mt-0.5"/>
          <p className="text-xs text-slate-400 leading-snug">
            <span className="text-amber-300 font-semibold">{neglected.length} area{neglected.length>1?"s":""}</span> have no linked goals: <span className="text-amber-300">{neglected.map(a=>a.area).join(", ")}</span>. Agent recommends adding at least one goal per vision area.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {areaVisions.map(a=>(
          <AreaCard key={a.id} area={a}
            collapsed={collapsed.has(a.id)} onToggle={()=>toggleArea(a.id)}
            onUpdateOutcome={(outId,done)=>updateOutcome(a.id,outId,done)}
            onAddOutcome={(text)=>addOutcome(a.id,text)}
            onDelOutcome={(outId)=>delOutcome(a.id,outId)}
          />
        ))}
      </div>
    </div>
  );
}

function AreaCard({ area, collapsed, onToggle, onUpdateOutcome, onAddOutcome, onDelOutcome }: {
  area: AreaVision; collapsed: boolean; onToggle: ()=>void;
  onUpdateOutcome:(outId:string,done:boolean)=>void;
  onAddOutcome:(text:string)=>void;
  onDelOutcome:(outId:string)=>void;
}) {
  const [newOutcome, setNewOutcome] = useState("");
  const [addingOut, setAddingOut]   = useState(false);
  const doneCount = area.outcomes.filter(o=>o.done).length;
  const add = () => { if(newOutcome.trim()){onAddOutcome(newOutcome.trim());setNewOutcome("");setAddingOut(false);} };

  return (
    <div className={`rounded-2xl border overflow-hidden ${area.border} ${area.bg}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className={area.textAccent}>{area.icon}</span>
        <span className="flex-1 text-sm font-semibold text-slate-200">{area.area}</span>
        {/* Mini progress ring */}
        <div className="relative w-8 h-8 shrink-0">
          <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
            <circle cx="16" cy="16" r="11" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
            <motion.circle cx="16" cy="16" r="11" fill="none" className={`stroke-current ${area.textAccent}`} strokeWidth="2.5"
              strokeLinecap="round"
              initial={{strokeDasharray:"0 69.12"}}
              animate={{strokeDasharray:`${(area.progress/100)*69.12} 69.12`}}
              transition={{duration:0.8,ease:"easeOut"}}/>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-400">
            {area.progress}%
          </span>
        </div>
        <motion.span animate={{rotate:collapsed?-90:0}} transition={{duration:0.18}} style={{display:"block"}}>
          <ChevronDown size={13} className="text-slate-600"/>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:"hidden"}}>
            <div className="px-4 pb-4 space-y-3.5">
              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed">{area.description}</p>

              {/* Why */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Why This Matters</p>
                <p className="text-xs text-slate-500 leading-relaxed italic">"{area.why}"</p>
              </div>

              {/* Outcomes */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Long-Term Outcomes ({doneCount}/{area.outcomes.length})</p>
                <div className="space-y-1.5">
                  {area.outcomes.map(o=>(
                    <div key={o.id} className="group flex items-center gap-2.5">
                      <button onClick={()=>onUpdateOutcome(o.id,!o.done)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                          o.done?`border-current ${area.textAccent} bg-current/10`:"border-white/[0.12] hover:border-white/25"
                        }`}>
                        {o.done&&<Check size={9} className={area.textAccent}/>}
                      </button>
                      <span className={`flex-1 text-xs ${o.done?"text-slate-600 line-through":"text-slate-300"}`}>{o.text}</span>
                      <button onClick={()=>onDelOutcome(o.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all shrink-0"><Trash2 size={9}/></button>
                    </div>
                  ))}
                  {addingOut
                    ? <div className="flex gap-1.5 mt-1">
                        <input value={newOutcome} onChange={e=>setNewOutcome(e.target.value)} autoFocus placeholder="New outcome…"
                          onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setAddingOut(false);}}
                          className="flex-1 bg-black/20 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none"/>
                        <button onClick={add} className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium px-1"><Check size={11}/></button>
                        <button onClick={()=>setAddingOut(false)} className="text-xs text-slate-600 hover:text-slate-400 px-1"><X size={11}/></button>
                      </div>
                    : <button onClick={()=>setAddingOut(true)} className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors mt-1">
                        <Plus size={9}/> Add outcome
                      </button>
                  }
                </div>
              </div>

              {/* Agent insight */}
              <div className="flex items-start gap-2 p-2.5 bg-black/20 border border-white/[0.05] rounded-xl">
                <Sparkles size={10} className="text-indigo-400/70 shrink-0 mt-0.5"/>
                <p className="text-[10px] text-slate-500 leading-snug">{area.agentInsight}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>{area.linkedGoals} linked goal{area.linkedGoals!==1?"s":""}</span>
                <button onClick={()=>{}} className="flex items-center gap-1 text-indigo-400/60 hover:text-indigo-300 transition-colors">
                  <ChevronRight size={9}/> Link a goal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. 1–5 YEAR ARCS CONTENT
   ══════════════════════════════════════════════════════════════ */
function YearArcsContent() {
  const [arcs, setArcs] = useState<YearVision[]>(INIT_YEAR_VISIONS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding]       = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [newHorizon, setNewHorizon] = useState("3–5");
  const [newWhy, setNewWhy]       = useState("");

  const toggle = (id:string) => setCollapsed(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const del    = (id:string) => setArcs(p=>p.filter(a=>a.id!==id));
  const add    = () => {
    if(newTitle.trim()){
      setArcs(p=>[...p,{
        id:Date.now().toString(), title:newTitle.trim(),
        horizon:newHorizon, horizonLabel:`${newHorizon} Year Arc`,
        description:"", why:newWhy.trim(), progress:0,
        agentPrediction:"Set milestones and link goals to enable predictions.",
        accent:"from-slate-600/15 to-slate-700/8", border:"border-white/[0.10]",
      }]);
      setNewTitle("");setNewWhy("");setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      {arcs.map(arc=>(
        <div key={arc.id} className={`rounded-2xl border overflow-hidden bg-gradient-to-br ${arc.accent} ${arc.border}`}>
          <button onClick={()=>toggle(arc.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{arc.horizonLabel}</span>
              </div>
              <p className="text-sm font-bold text-white truncate">{arc.title}</p>
            </div>
            {/* Progress */}
            <div className="shrink-0 text-right">
              <p className="text-base font-bold text-slate-200">{arc.progress}%</p>
              <p className="text-[9px] text-slate-600">complete</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={e=>{e.stopPropagation();del(arc.id);}}
                className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all p-1"><Trash2 size={11}/></button>
              <motion.span animate={{rotate:collapsed.has(arc.id)?-90:0}} transition={{duration:0.18}} style={{display:"block"}}>
                <ChevronDown size={14} className="text-slate-600"/>
              </motion.span>
            </div>
          </button>

          {/* Progress bar */}
          <div className="px-5 pb-0">
            <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${arc.progress}%`}} transition={{duration:0.8,ease:"easeOut"}}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500/60 to-violet-500/60"/>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed.has(arc.id)&&(
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                exit={{height:0,opacity:0}} transition={{duration:0.2}} style={{overflow:"hidden"}}>
                <div className="px-5 py-4 space-y-3">
                  {arc.description&&<p className="text-sm text-slate-400 leading-relaxed">{arc.description}</p>}
                  {arc.why&&(
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Why This Matters</p>
                      <p className="text-xs text-slate-500 italic leading-relaxed">"{arc.why}"</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-3 bg-black/20 border border-white/[0.05] rounded-xl">
                    <Sparkles size={10} className="text-indigo-400/70 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/60 mb-0.5">Agent Prediction</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{arc.agentPrediction}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-[10px] text-indigo-400/60 hover:text-indigo-300 transition-colors">
                    <ChevronRight size={9}/> Link goals to this arc
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {adding
        ? <div className="p-4 bg-[#0f1117] border border-white/[0.08] rounded-2xl space-y-3">
            <p className="text-xs font-semibold text-slate-400">New Long-Term Arc</p>
            <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus placeholder="Vision title…"
              className="w-full bg-[#13151c] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40"/>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-500">Time horizon:</span>
              {["1–2","2–3","3–5","5+","Ongoing"].map(h=>(
                <button key={h} onClick={()=>setNewHorizon(h)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    newHorizon===h?"bg-indigo-600/20 border-indigo-500/40 text-indigo-300":"border-white/[0.08] text-slate-500 hover:text-slate-300"
                  }`}>{h} yr</button>
              ))}
            </div>
            <textarea value={newWhy} onChange={e=>setNewWhy(e.target.value)} rows={2} placeholder="Why this matters to you…"
              className="w-full bg-[#13151c] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none resize-none"/>
            <div className="flex gap-2">
              <button onClick={add} className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 hover:bg-indigo-600/30 transition-colors font-medium">Add Arc</button>
              <button onClick={()=>setAdding(false)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2">Cancel</button>
            </div>
          </div>
        : <button onClick={()=>setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/[0.08] text-slate-600 hover:text-slate-400 hover:border-white/[0.15] transition-colors text-xs font-medium">
            <Plus size={12}/> Add Long-Term Arc
          </button>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. LEGACY CONTENT
   ══════════════════════════════════════════════════════════════ */
function LegacyContent() {
  const [fields,     setFields]     = useState<LegacyField[]>(INIT_LEGACY_FIELDS);
  const [editId,     setEditId]     = useState<string|null>(null);
  const [editText,   setEditText]   = useState("");
  const [reflecting, setReflecting] = useState(false);
  const [reflection, setReflection] = useState<string|null>(null);

  const saveEdit = (id:string) => {
    setFields(p=>p.map(f=>f.id===id?{...f,text:editText}:f));
    setEditId(null);
  };

  const reflect = async () => {
    setReflecting(true);
    await new Promise(r=>setTimeout(r,1200));
    setReflection("Your legacy themes are consistent and powerful: faith, family, impact, and integrity. The thread running through everything is a desire to prove that it's possible to build something extraordinary while remaining deeply human. Your boys appear in nearly every section — they are the heart of your legacy. The gap: your Contribution section is aspirational but has no active goals. Agent recommends: make 'Mentor 5 entrepreneurs this year' an active goal this week.");
    setReflecting(false);
  };

  return (
    <div className="space-y-5">
      {/* Legacy header */}
      <div className="text-center py-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/70 mb-2">What I Will Leave Behind</p>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto"/>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {fields.map((f,i)=>(
          <motion.div key={f.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.05,duration:0.2}}
            className="group">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">{f.prompt}</p>
            {editId===f.id
              ? <div>
                  <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={3} autoFocus
                    className="w-full bg-[#0f1117] border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none resize-none leading-relaxed focus:border-amber-500/50"/>
                  <div className="flex gap-2 mt-2">
                    <button onClick={()=>saveEdit(f.id)} className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-medium"><Check size={11}/> Save</button>
                    <button onClick={()=>setEditId(null)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Cancel</button>
                  </div>
                </div>
              : <div className="relative p-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 rounded-xl">
                  <p className="text-sm text-slate-300 leading-relaxed">{f.text}</p>
                  <button onClick={()=>{setEditId(f.id);setEditText(f.text);}}
                    className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1 text-slate-600 hover:text-amber-400 transition-all">
                    <Edit3 size={11}/>
                  </button>
                </div>
            }
          </motion.div>
        ))}
      </div>

      <div className="w-full h-px bg-white/[0.04]"/>

      {/* Agent reflection */}
      <AnimatePresence>
        {reflection&&(
          <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-amber-400"/>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">Agent Legacy Reflection</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{reflection}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={reflect} disabled={reflecting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/20 bg-amber-500/6 text-amber-400/80 hover:bg-amber-500/12 transition-colors text-xs font-medium disabled:opacity-60">
        {reflecting
          ? <><span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"/><span>Agent is reflecting on your legacy…</span></>
          : <><Sparkles size={11}/> Agent Reflect on My Legacy</>}
      </button>

      {/* Closing statement */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-slate-700 italic leading-relaxed max-w-lg mx-auto">
          "The purpose of life is not to be happy. It is to be useful, to be honourable, to be compassionate, to have it make some difference that you have lived and lived well."
        </p>
        <p className="text-[10px] text-slate-700 mt-1">— Ralph Waldo Emerson</p>
      </div>
    </div>
  );
}