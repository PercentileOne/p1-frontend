/* ══════════════════════════════════════════════════════════════
   PARENT CONTROLS — Phase 10
   Safety and study settings per child
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Clock, Moon, Users, MessageCircle, Focus,
  Bell, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { useParentControlsStore } from "../parentControlsStore";
import type { ChildProfile } from "../parentStore";

interface Props {
  child: ChildProfile;
}

function Toggle({
  label, description, icon, value, onChange
}: {
  label: string; description: string; icon: React.ReactNode;
  value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="shrink-0 text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${value ? "bg-indigo-600" : "bg-white/[0.1]"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export default function ParentControls({ child }: Props) {
  const { getControls, updateControls } = useParentControlsStore();
  const ctrl = getControls(child.id);
  const [limitExpanded, setLimitExpanded] = useState(false);

  function patch(p: Parameters<typeof updateControls>[1]) {
    updateControls(child.id, p);
  }

  const limitLabel = ctrl.dailyStudyLimitMins === 0
    ? "No limit"
    : `${ctrl.dailyStudyLimitMins} min / day`;

  return (
    <div className="flex flex-col gap-4">
      {/* Child badge */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className={`w-10 h-10 rounded-full ${child.accent} flex items-center justify-center text-[13px] font-bold text-white`}>
          {child.initials}
        </div>
        <div>
          <p className="text-[13px] font-bold text-white">{child.name}</p>
          <p className="text-[11px] text-slate-500">{child.year} · Safety controls</p>
        </div>
        <div className="ml-auto">
          <Shield size={16} className="text-indigo-400" />
        </div>
      </div>

      {/* Daily study limit */}
      <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-500" />
          <p className="text-[12px] font-medium text-slate-200 flex-1">Daily Study Limit</p>
          <button
            onClick={() => setLimitExpanded(e => !e)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] text-slate-300"
          >
            {limitLabel}
            {limitExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>

        {limitExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="flex flex-col gap-2 mt-1"
          >
            <p className="text-[10px] text-slate-500">Maximum minutes of study per day (0 = unlimited)</p>
            <input
              type="range"
              min={0}
              max={240}
              step={15}
              value={ctrl.dailyStudyLimitMins}
              onChange={e => patch({ dailyStudyLimitMins: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[9px] text-slate-600">
              <span>No limit</span>
              <span className="text-indigo-400 font-bold">{limitLabel}</span>
              <span>4 hrs</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bedtime lock */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <Moon size={14} className="shrink-0 text-slate-500" />
        <div className="flex-1">
          <p className="text-[12px] font-medium text-slate-200">Bedtime Lock</p>
          <p className="text-[10px] text-slate-500">Block access after this time</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={ctrl.bedtimeLock ?? "21:30"}
            onChange={e => patch({ bedtimeLock: e.target.value || null })}
            className="bg-white/[0.06] border border-white/[0.09] rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500/40"
          />
          <button
            onClick={() => patch({ bedtimeLock: ctrl.bedtimeLock ? null : "21:30" })}
            className={`w-8 h-4 rounded-full relative transition-colors ${ctrl.bedtimeLock ? "bg-indigo-600" : "bg-white/[0.1]"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${ctrl.bedtimeLock ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Toggle settings */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Content &amp; safety</p>

        <Toggle
          label="School-Safe Mode"
          description="Hides non-academic content and adult topics"
          icon={<Shield size={13} />}
          value={ctrl.schoolSafeMode}
          onChange={v => patch({ schoolSafeMode: v })}
        />
        <Toggle
          label="Disable Multiplayer"
          description="Prevents joining competitive study rooms"
          icon={<Users size={13} />}
          value={ctrl.multiplayerDisabled}
          onChange={v => patch({ multiplayerDisabled: v })}
        />
        <Toggle
          label="Disable Chat"
          description="Removes in-app messaging with other students"
          icon={<MessageCircle size={13} />}
          value={ctrl.chatDisabled}
          onChange={v => patch({ chatDisabled: v })}
        />
        <Toggle
          label="Focus Mode Only"
          description="Restricts to study tools — no social features"
          icon={<Focus size={13} />}
          value={ctrl.focusModeOnly}
          onChange={v => patch({ focusModeOnly: v })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Parent notifications</p>

        <Toggle
          label="Alert on Low Readiness"
          description="Notify me if readiness drops below 40%"
          icon={<Bell size={13} />}
          value={ctrl.notifyOnLowReadiness}
          onChange={v => patch({ notifyOnLowReadiness: v })}
        />
        <Toggle
          label="Weekly Progress Report"
          description="Email me a summary every Sunday"
          icon={<FileText size={13} />}
          value={ctrl.weeklyReportEnabled}
          onChange={v => patch({ weeklyReportEnabled: v })}
        />
      </div>
    </div>
  );
}
