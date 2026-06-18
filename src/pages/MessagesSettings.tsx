import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, Eye, MessageCircle, Sparkles, Camera, Shield,
  Target, RefreshCw, Mic, ChevronRight,
} from "lucide-react";
import { DEFAULT_SETTINGS } from "../lib/messagesEngine";
import type { MessagingSettings } from "../lib/messagesEngine";

/* ══════════════════════════════════════════════════════════════
   MESSAGING SETTINGS  /messages/settings
   ══════════════════════════════════════════════════════════════ */

const fade = (d = 0) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: d } });

export default function MessagesSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<MessagingSettings>({ ...DEFAULT_SETTINGS });

  const toggle = (key: keyof MessagingSettings) =>
    setSettings(s => ({ ...s, [key]: !s[key] }));

  const SECTIONS: {
    label: string;
    icon: React.ReactNode;
    color: string;
    items: { key: keyof MessagingSettings; label: string; desc: string }[];
  }[] = [
    {
      label: "Notifications", icon: <Bell size={13} />, color: "text-amber-400",
      items: [
        { key: "notifications",     label: "Push Notifications",     desc: "Receive alerts for new messages" },
        { key: "readReceipts",      label: "Read Receipts",          desc: "Show when you've read a message" },
        { key: "typingIndicators",  label: "Typing Indicators",      desc: "Show when someone is typing"     },
      ],
    },
    {
      label: "AI & Agent", icon: <Sparkles size={13} />, color: "text-green-400",
      items: [
        { key: "agentParticipation", label: "Agent Participation",   desc: "P1 Agent joins and analyses conversations" },
        { key: "autoIngest",         label: "Auto Ingest Media",     desc: "Process images and audio automatically"     },
        { key: "voiceTranscription", label: "Voice Transcription",   desc: "Transcribe voice notes to text"             },
      ],
    },
    {
      label: "Auto-Linking", icon: <Target size={13} />, color: "text-indigo-400",
      items: [
        { key: "autoProof",         label: "Auto-Proof Generation",  desc: "Create proof entries from media you send" },
        { key: "autoGoalLinking",   label: "Auto Goal Linking",      desc: "Link proof to your active goals"          },
        { key: "autoCycleLinking",  label: "Auto Cycle Linking",     desc: "Link proof to your current cycle week"    },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-bold text-white">Messaging Preferences</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Agent insight */}
        <motion.div {...fade(0)} className="flex items-start gap-3 p-4 bg-indigo-600/8 border border-indigo-500/15 rounded-2xl">
          <Sparkles size={13} className="text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            Your messaging settings are optimised for proof capture and accountability. Agent participation is recommended for
            maximum insight from your conversations.
          </p>
        </motion.div>

        {/* Settings sections */}
        {SECTIONS.map((section, si) => (
          <motion.div key={section.label} {...fade(0.05 + si * 0.05)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <span className={section.color}>{section.icon}</span>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{section.label}</p>
            </div>
            <div>
              {section.items.map((item, i) => (
                <div key={item.key}
                  className={`flex items-center justify-between px-5 py-4 ${i < section.items.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button onClick={() => toggle(item.key)}
                    className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${settings[item.key] ? "bg-indigo-600" : "bg-white/10"}`}>
                    <motion.div
                      animate={{ x: settings[item.key] ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Danger zone */}
        <motion.div {...fade(0.2)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
            <Shield size={13} className="text-red-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Data & Privacy</p>
          </div>
          {[
            { label: "Clear Message Cache",    desc: "Remove cached messages from this device",     color: "text-amber-400" },
            { label: "Export Conversations",   desc: "Download all your messages as a file",        color: "text-blue-400"  },
            { label: "Delete All Messages",    desc: "Permanently remove all conversation history", color: "text-red-400"   },
          ].map((a, i) => (
            <button key={a.label}
              className={`w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors ${i < 2 ? "border-b border-white/[0.04]" : ""}`}>
              <div>
                <p className={`text-sm font-semibold ${a.color}`}>{a.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{a.desc}</p>
              </div>
              <ChevronRight size={14} className="text-slate-600 shrink-0" />
            </button>
          ))}
        </motion.div>

        {/* Save */}
        <motion.button {...fade(0.25)}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => navigate("/messages")}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
          Save Preferences
        </motion.button>

      </div>
      <div className="h-4" />
    </div>
  );
}
