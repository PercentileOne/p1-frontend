/* ══════════════════════════════════════════════════════════════
   ENCOURAGEMENT STORE — Phase 10
   Parent-to-student messages. Local simulation.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface EncouragementMessage {
  id:        string;
  parentId:  string;
  parentName: string;
  studentId: string;
  message:   string;
  emoji:     string;
  date:      Date;
  seen:      boolean;
}

// ── Preset messages ────────────────────────────────────────────────

export const PRESET_MESSAGES: { text: string; emoji: string }[] = [
  { text: "I'm so proud of you! Keep it up 💪",                    emoji: "💪" },
  { text: "Great progress today — you're doing brilliantly!",       emoji: "⭐" },
  { text: "Keep going — every revision session adds up!",           emoji: "🚀" },
  { text: "You've got this! I believe in you.",                     emoji: "🌟" },
  { text: "Hard work now = great results in June. Love you! ❤️",   emoji: "❤️" },
  { text: "Don't forget to take a break too — you've earned it 😊", emoji: "😊" },
];

// ── Mock seed ──────────────────────────────────────────────────────

const SEED: EncouragementMessage[] = [
  {
    id:         "enc-001",
    parentId:   "parent-001",
    parentName: "Mum",
    studentId:  "u-francis",
    message:    "Great progress today — you're doing brilliantly!",
    emoji:      "⭐",
    date:       new Date(Date.now() - 86400000),
    seen:       true,
  },
  {
    id:         "enc-002",
    parentId:   "parent-001",
    parentName: "Mum",
    studentId:  "u-francis",
    message:    "I'm so proud of you! Keep it up 💪",
    emoji:      "💪",
    date:       new Date(Date.now() - 3 * 86400000),
    seen:       true,
  },
];

// ── Singleton ──────────────────────────────────────────────────────

let _messages: EncouragementMessage[] = [...SEED];
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function sendEncouragement(
  parentId:   string,
  parentName: string,
  studentId:  string,
  message:    string,
  emoji:      string,
): EncouragementMessage {
  const msg: EncouragementMessage = {
    id:   `enc-${Date.now()}`,
    parentId,
    parentName,
    studentId,
    message,
    emoji,
    date: new Date(),
    seen: false,
  };
  _messages = [msg, ..._messages];
  _notify();
  return msg;
}

export function markSeen(studentId: string): void {
  _messages = _messages.map(m =>
    m.studentId === studentId ? { ...m, seen: true } : m
  );
  _notify();
}

export function useEncouragementStore() {
  const [messages, setMessages] = useState(_messages);

  useEffect(() => {
    const sync = () => setMessages([..._messages]);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return {
    messages,
    unseen: messages.filter(m => !m.seen).length,
    sendEncouragement,
    markSeen,
  };
}

export type EncouragementStore = ReturnType<typeof useEncouragementStore>;
