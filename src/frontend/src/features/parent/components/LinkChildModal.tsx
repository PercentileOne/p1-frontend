/* ══════════════════════════════════════════════════════════════
   LINK CHILD MODAL — Phase 10
   Parent enters child's P1 code → link
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, CheckCircle, AlertCircle } from "lucide-react";
import { addChild } from "../parentStore";

interface Props {
  onClose: () => void;
}

// Simulate code validation — in prod, calls backend
async function validateCode(code: string): Promise<{
  valid:      boolean;
  studentId?: string;
  name?:      string;
  year?:      string;
  initials?:  string;
  accent?:    string;
}> {
  await new Promise(r => setTimeout(r, 900));
  // Mock: only "P1X7K2" is recognised in demo
  const KNOWN: Record<string, { studentId: string; name: string; year: string; initials: string; accent: string }> = {
    "P1DEMO": {
      studentId: "u-demo-2",
      name:      "Alex",
      year:      "Year 10",
      initials:  "AL",
      accent:    "bg-emerald-500",
    },
  };
  const found = KNOWN[code.toUpperCase()];
  if (found) return { valid: true, ...found };
  return { valid: false };
}

export default function LinkChildModal({ onClose }: Props) {
  const [code,    setCode]    = useState("");
  const [phase,   setPhase]   = useState<"input" | "loading" | "preview" | "error" | "done">("input");
  const [preview, setPreview] = useState<{ name: string; year: string; studentId: string; initials: string; accent: string } | null>(null);

  async function handleVerify() {
    if (code.trim().length < 4) return;
    setPhase("loading");
    const result = await validateCode(code.trim());
    if (result.valid && result.name) {
      setPreview({ name: result.name!, year: result.year!, studentId: result.studentId!, initials: result.initials!, accent: result.accent! });
      setPhase("preview");
    } else {
      setPhase("error");
    }
  }

  function handleLink() {
    if (!preview) return;
    addChild({
      name:            preview.name,
      year:            preview.year,
      initials:        preview.initials,
      accent:          preview.accent,
      linkedStudentId: preview.studentId,
      linkCode:        code.trim().toUpperCase(),
    });
    setPhase("done");
    setTimeout(onClose, 1600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.94, y: 12 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#13151c] p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
          >
            <Link2 size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Link a Child</p>
            <p className="text-[10px] text-slate-500">Enter their P1 student code</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Input */}
          {(phase === "input" || phase === "error") && (
            <motion.div key="input" className="flex flex-col gap-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ask your child to find their P1 code in <strong className="text-slate-300">Settings → My Code</strong> in their Student account.
              </p>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setPhase("input"); }}
                placeholder="e.g. P1DEMO"
                maxLength={10}
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[14px] font-mono text-center text-white tracking-widest placeholder-slate-600 focus:outline-none focus:border-indigo-500/40"
              />
              {phase === "error" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={12} className="text-red-400" />
                  <p className="text-[11px] text-red-400">Code not found. Try again or ask your child to check.</p>
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleVerify}
                disabled={code.trim().length < 4}
                className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  code.trim().length >= 4
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                }`}
              >
                Verify Code
              </motion.button>
            </motion.div>
          )}

          {/* Loading */}
          {phase === "loading" && (
            <motion.div key="loading" className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-slate-400">Looking up student…</p>
            </motion.div>
          )}

          {/* Preview */}
          {phase === "preview" && preview && (
            <motion.div key="preview" className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <div className={`w-10 h-10 rounded-full ${preview.accent} flex items-center justify-center text-[13px] font-bold text-white`}>
                  {preview.initials}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{preview.name}</p>
                  <p className="text-[11px] text-slate-500">{preview.year}</p>
                </div>
                <CheckCircle size={16} className="ml-auto text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400">Is this the right person?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPhase("input")}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white transition-colors"
                >
                  No, try again
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLink}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  Yes, link!
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Done */}
          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <span className="text-4xl">🔗</span>
              <p className="text-[13px] font-semibold text-white">Linked!</p>
              <p className="text-[11px] text-slate-500">You can now track {preview?.name}'s progress</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
