import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Plus, Trash2, Zap, LayoutGrid,
  AlertTriangle, ChevronRight, X,
} from "lucide-react";
import {
  DEMO_BLOCKS, PlanningEngine, DAY_LABELS, DAY_FULL,
  BLOCK_COLORS, BLOCK_ICONS, BLOCK_LABELS, BLOCK_DESCS,
} from "../lib/planningEngine";
import type { TimeBlock, BlockType } from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   TIME-BLOCKING ENGINE  /planning/timeblocks
   Full interactive drag + resize time-grid
   ══════════════════════════════════════════════════════════════ */

const START_HOUR   = 5;   // 5am
const END_HOUR     = 23;  // 11pm
const SLOT_PX      = 20;  // px per 15min
const MIN_DURATION = 15;

const minutesToPx  = (min: number)  => (min / 15) * SLOT_PX;
const pxToMinutes  = (px: number)   => Math.round(px / SLOT_PX) * 15;
const startOffset  = (b: TimeBlock) => b.startMinute - START_HOUR * 60;
const totalSlots   = (END_HOUR - START_HOUR) * 4;
const gridHeight   = totalSlots * SLOT_PX;

type View = "day" | "week";
type DragState  = { blockId: string; offsetPx: number };
type ResizeState = { blockId: string; startY: number; startDuration: number };

/* ── Block colour helpers ───────────────────────────────────── */
const blockBg   = (b: TimeBlock) => `${b.color}22`;
const blockBorder = (b: TimeBlock, active: boolean) => active ? `2px solid ${b.color}` : `1px solid ${b.color}55`;

/* ── Hours list ─────────────────────────────────────────────── */
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

/* ── New block defaults by type ─────────────────────────────── */
const NEW_BLOCK_DEFAULTS: Record<BlockType, { durationMinutes: number; title: string }> = {
  strategic: { durationMinutes: 90,  title: "Strategic Block"  },
  buffer:    { durationMinutes: 45,  title: "Buffer Block"     },
  breakout:  { durationMinutes: 30,  title: "Breakout Block"   },
  custom:    { durationMinutes: 60,  title: "Custom Block"     },
};

export default function TimeBlockingEngine() {
  const navigate = useNavigate();
  const [view,   setView]   = useState<View>("week");
  const [day,    setDay]    = useState(0);
  const [blocks, setBlocks] = useState<TimeBlock[]>(DEMO_BLOCKS);
  const [drag,   setDrag]   = useState<DragState  | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [newType, setNewType]   = useState<BlockType>("strategic");
  const [autoPlacing, setAutoPlacing] = useState(false);

  const gridRef  = useRef<HTMLDivElement>(null);
  const activeDay = view === "day" ? day : null;

  /* ── Drag handlers ──────────────────────────────────────────── */
  const onBlockPointerDown = useCallback((e: React.PointerEvent, blockId: string) => {
    if ((e.target as HTMLElement).dataset.resize) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({ blockId, offsetPx: e.clientY - rect.top });
    setSelected(blockId);
    e.preventDefault();
  }, []);

  const onGridPointerMove = useCallback((e: React.PointerEvent, colDayIndex: number) => {
    if (!gridRef.current) return;

    if (drag) {
      const gridRect  = gridRef.current.getBoundingClientRect();
      const colWidth  = gridRect.width / (view === "week" ? 7 : 1);
      const relY      = e.clientY - gridRect.top;
      const rawMin    = pxToMinutes(relY - drag.offsetPx);
      const clamped   = Math.max(0, Math.min(rawMin, (END_HOUR - START_HOUR) * 60 - 30));
      const newStart  = clamped + START_HOUR * 60;

      setBlocks(prev => prev.map(b =>
        b.id === drag.blockId
          ? { ...b, startMinute: newStart, dayIndex: colDayIndex }
          : b
      ));
    }

    if (resize) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const dy       = e.clientY - resize.startY;
      const deltaMins = pxToMinutes(dy);
      const newDur   = Math.max(MIN_DURATION, resize.startDuration + deltaMins);
      setBlocks(prev => prev.map(b =>
        b.id === resize.blockId ? { ...b, durationMinutes: newDur } : b
      ));
    }
  }, [drag, resize, view]);

  const onPointerUp = useCallback(() => {
    setDrag(null);
    setResize(null);
  }, []);

  const onResizeDown = useCallback((e: React.PointerEvent, block: TimeBlock) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResize({ blockId: block.id, startY: e.clientY, startDuration: block.durationMinutes });
    e.preventDefault();
  }, []);

  /* ── Block CRUD ─────────────────────────────────────────────── */
  const addBlock = () => {
    const defaults = NEW_BLOCK_DEFAULTS[newType];
    const newBlock: TimeBlock = {
      id:              `new-${Date.now()}`,
      title:           defaults.title,
      type:            newType,
      startMinute:     9 * 60,
      durationMinutes: defaults.durationMinutes,
      dayIndex:        activeDay ?? day,
      color:           BLOCK_COLORS[newType],
      icon:            BLOCK_ICONS[newType],
    };
    setBlocks(prev => [...prev, newBlock]);
    setShowAdd(false);
    setSelected(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setSelected(null);
  };

  const autoPlace = async () => {
    setAutoPlacing(true);
    await new Promise(r => setTimeout(r, 1400));
    const target  = activeDay ?? day;
    const placed  = PlanningEngine.autoPlace(blocks, target);
    setBlocks(prev => [...prev.filter(b => b.dayIndex !== target), ...placed]);
    setAutoPlacing(false);
  };

  /* ── Overlap detection ──────────────────────────────────────── */
  const overlapIds = (view === "day"
    ? PlanningEngine.detectOverlap(blocks, day)
    : DAY_LABELS.flatMap((_, i) => PlanningEngine.detectOverlap(blocks, i))
  );

  /* ── Render a single day column ─────────────────────────────── */
  const renderColumn = (colDayIndex: number, isNarrow = false) => {
    const colBlocks = PlanningEngine.blocksForDay(blocks, colDayIndex);
    return (
      <div key={colDayIndex}
        className="relative flex-1 min-w-0"
        style={{ height: gridHeight }}
        onPointerMove={e => onGridPointerMove(e, colDayIndex)}
        onPointerUp={onPointerUp}>
        {colBlocks.map(block => {
          const top    = minutesToPx(startOffset(block));
          const height = Math.max(minutesToPx(block.durationMinutes), SLOT_PX);
          const isActive  = block.id === selected || block.id === drag?.blockId || block.id === resize?.blockId;
          const hasOverlap = overlapIds.includes(block.id);
          return (
            <div key={block.id}
              onPointerDown={e => onBlockPointerDown(e, block.id)}
              onClick={() => setSelected(block.id === selected ? null : block.id)}
              style={{
                position: "absolute",
                top: `${top}px`,
                height: `${height}px`,
                left: "2px", right: "2px",
                backgroundColor: blockBg(block),
                border:          blockBorder(block, isActive),
                borderLeft:     `3px solid ${block.color}`,
                borderRadius:   "8px",
                cursor:          drag?.blockId === block.id ? "grabbing" : "grab",
                userSelect:      "none",
                zIndex:          isActive ? 20 : 10,
                outline:         hasOverlap ? `2px solid #f87171` : undefined,
                transition:      drag?.blockId === block.id || resize?.blockId === block.id ? "none" : "top 0.08s, height 0.08s",
              }}>
              <div className="px-1.5 pt-1 overflow-hidden" style={{ height: "calc(100% - 6px)" }}>
                <div className="flex items-start gap-1">
                  <span style={{ fontSize: height < 30 ? "9px" : "11px" }}>{block.icon}</span>
                  <p style={{
                    fontSize:    height < 30 ? "9px" : isNarrow ? "10px" : "11px",
                    fontWeight:  600,
                    color:       "white",
                    lineHeight:  1.2,
                    overflow:    "hidden",
                    display:     "-webkit-box",
                    WebkitLineClamp: height < 40 ? 1 : 2,
                    WebkitBoxOrient: "vertical",
                  }}>{block.title}</p>
                </div>
                {height >= 50 && (
                  <p style={{ fontSize: "9px", color: `${block.color}cc`, marginTop: "2px" }}>
                    {PlanningEngine.minuteToTime(block.startMinute)} · {block.durationMinutes}m
                  </p>
                )}
              </div>
              {/* Resize handle */}
              <div data-resize="true"
                onPointerDown={e => onResizeDown(e, block)}
                style={{
                  position:    "absolute",
                  bottom:      0, left: 0, right: 0,
                  height:      "8px",
                  cursor:      "ns-resize",
                  borderRadius: "0 0 8px 8px",
                  backgroundColor: isActive ? `${block.color}44` : "transparent",
                }} />
            </div>
          );
        })}
      </div>
    );
  };

  const selectedBlock = blocks.find(b => b.id === selected);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#13151c] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate("/planning")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
            <LayoutGrid size={13} className="text-indigo-400" /> Time-Blocking Engine
          </h1>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          {(["day","week"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                view === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
              }`}>{v}</button>
          ))}
        </div>

        {/* Day selector (day view) */}
        {view === "day" && (
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {DAY_LABELS.map((d, i) => (
              <button key={d} onClick={() => setDay(i)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  day === i ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                }`}>{d}</button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Auto-place */}
          <button onClick={autoPlace} disabled={autoPlacing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:bg-violet-600/30 transition-colors disabled:opacity-50">
            {autoPlacing
              ? <><div className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" /> Placing…</>
              : <><Sparkles size={12} /> AI Auto-Place</>
            }
          </button>
          {/* Add block */}
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            <Plus size={12} /> Add Block
          </button>
        </div>
      </div>

      {/* ── Add block panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/[0.06] bg-[#13151c]">
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Choose Block Type</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {(["strategic","buffer","breakout","custom"] as BlockType[]).map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      newType === t ? "border-2" : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                    style={newType === t ? { backgroundColor: `${BLOCK_COLORS[t]}18`, borderColor: BLOCK_COLORS[t] } : {}}>
                    <span className="text-lg">{BLOCK_ICONS[t]}</span>
                    <p className="text-[11px] font-bold" style={{ color: newType === t ? BLOCK_COLORS[t] : undefined }}>{BLOCK_LABELS[t]}</p>
                    <p className="text-[9px] text-slate-600 text-center leading-tight">{BLOCK_DESCS[t]}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-white/[0.05] text-slate-400 text-xs font-semibold">Cancel</button>
                <button onClick={addBlock} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">
                  Add {BLOCK_LABELS[newType]} Block
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Agent suggestions bar ───────────────────────────────── */}
      {overlapIds.length > 0 && (
        <div className="bg-red-600/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{overlapIds.length / 2} overlap detected — drag blocks to resolve.</p>
        </div>
      )}

      <div className="flex flex-1 min-h-0">

        {/* ── Time ruler ─────────────────────────────────────────── */}
        <div className="w-12 shrink-0 relative bg-[#0f1117] border-r border-white/[0.05]"
          style={{ height: gridHeight + 32, paddingTop: 32 }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: "absolute", top: `${minutesToPx((h - START_HOUR) * 60) + 32}px`, right: 4, transform: "translateY(-50%)" }}>
              <p className="text-[9px] text-slate-600 text-right">{h}:00</p>
            </div>
          ))}
          {/* Energy labels */}
          {[6, 9, 12, 14, 17].map(h => (
            <div key={`e${h}`} style={{ position: "absolute", top: `${minutesToPx((h - START_HOUR) * 60) + 32}px`, left: 2, right: 4 }}>
              <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.04)" }} />
            </div>
          ))}
        </div>

        {/* ── Grid ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto" ref={gridRef}>

          {/* Column headers */}
          <div className={`sticky top-0 z-20 flex bg-[#13151c] border-b border-white/[0.06] ${view === "week" ? "" : ""}`}>
            {(view === "week" ? DAY_LABELS : [DAY_FULL[day]]).map((label, i) => {
              const di = view === "week" ? i : day;
              const totalMins = PlanningEngine.blocksForDay(blocks, di).reduce((s, b) => s + b.durationMinutes, 0);
              const isOver = PlanningEngine.detectOverload(blocks, di);
              return (
                <div key={label} className="flex-1 px-2 py-2 text-center border-r border-white/[0.04] last:border-r-0">
                  <p className={`text-xs font-bold ${isOver ? "text-amber-400" : "text-white"}`}>{label}</p>
                  <p className="text-[9px] text-slate-600">{(totalMins/60).toFixed(1)}h{isOver ? " ⚠️" : ""}</p>
                </div>
              );
            })}
          </div>

          {/* Background slots */}
          <div className="relative flex" style={{ height: gridHeight }}>
            {/* Hour lines overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {HOURS.map(h => (
                <div key={h} style={{
                  position: "absolute",
                  top: `${minutesToPx((h - START_HOUR) * 60)}px`,
                  left: 0, right: 0,
                  borderTop: `1px solid rgba(255,255,255,${h % 2 === 0 ? "0.05" : "0.025"})`,
                }} />
              ))}
              {/* 15-min lines */}
              {Array.from({ length: totalSlots }).map((_, i) => (
                i % 4 !== 0 && (
                  <div key={i} style={{
                    position: "absolute",
                    top: `${i * SLOT_PX}px`,
                    left: 0, right: 0,
                    borderTop: "1px solid rgba(255,255,255,0.015)",
                  }} />
                )
              ))}
            </div>

            {/* Columns */}
            {view === "week"
              ? DAY_LABELS.map((_, i) => renderColumn(i, true))
              : renderColumn(day, false)
            }
          </div>
        </div>
      </div>

      {/* ── Selected block panel ────────────────────────────────── */}
      <AnimatePresence>
        {selectedBlock && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#1c1f2e] border-t-2 px-5 py-4"
            style={{ borderColor: selectedBlock.color }}>
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <span className="text-2xl">{selectedBlock.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{selectedBlock.title}</p>
                <p className="text-[11px] text-slate-400">
                  {DAY_FULL[selectedBlock.dayIndex]} · {PlanningEngine.minuteToTime(selectedBlock.startMinute)} — {PlanningEngine.minuteToTime(selectedBlock.startMinute + selectedBlock.durationMinutes)}
                  {" "}· {selectedBlock.durationMinutes}min
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Duration controls */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, durationMinutes: Math.max(15, b.durationMinutes - 15) } : b))}
                    className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold transition-colors">−</button>
                  <span className="text-xs text-white font-semibold w-10 text-center">{selectedBlock.durationMinutes}m</span>
                  <button onClick={() => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, durationMinutes: b.durationMinutes + 15 } : b))}
                    className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold transition-colors">+</button>
                </div>
                <button onClick={() => deleteBlock(selectedBlock.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-500/25 text-red-300 text-xs font-semibold hover:bg-red-600/25 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Suggestions sidebar strip ────────────────────────── */}
      <div className={`fixed right-0 top-[100px] z-20 w-56 space-y-2 px-2 pointer-events-none`}>
        {[
          { msg: "Place strategic blocks before noon", type: "action" },
          { msg: PlanningEngine.detectOverload(blocks, day) ? "Today is overloaded — remove 1 block" : "Today's load is balanced", type: PlanningEngine.detectOverload(blocks, day) ? "warning" : "success" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
            className={`pointer-events-auto p-2.5 rounded-xl border text-xs shadow-xl ${
              s.type === "warning" ? "bg-amber-950/80 border-amber-500/30 text-amber-200" :
              s.type === "success" ? "bg-green-950/80 border-green-500/30 text-green-200" :
              "bg-indigo-950/80 border-indigo-500/30 text-indigo-200"
            }`}>
            <div className="flex items-start gap-1.5">
              <Sparkles size={9} className="shrink-0 mt-0.5" />
              <p className="leading-snug">{s.msg}</p>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
