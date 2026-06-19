/* ══════════════════════════════════════════════════════════════
   PARENT STORE — Phase 10
   Parent profiles and child links. Mock-only until Phase 11 backend.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface ChildProfile {
  id:              string;
  name:            string;
  year:            string;          // e.g. "Year 11", "Year 13"
  initials:        string;
  accent:          string;
  linkedStudentId: string;
  linkCode:        string;          // 6-char code for linking
  linkedAt:        Date;
}

export interface ParentProfile {
  id:       string;
  name:     string;
  initials: string;
  children: ChildProfile[];
}

// ── Mock seed ──────────────────────────────────────────────────────

const SEED_PROFILE: ParentProfile = {
  id:       "parent-001",
  name:     "Sarah",
  initials: "SA",
  children: [
    {
      id:              "child-001",
      name:            "Jamie",
      year:            "Year 11",
      initials:        "JM",
      accent:          "bg-indigo-500",
      linkedStudentId: "u-francis",
      linkCode:        "P1X7K2",
      linkedAt:        new Date("2025-09-01"),
    },
  ],
};

// ── Store singleton ────────────────────────────────────────────────

let _profile: ParentProfile = { ...SEED_PROFILE };
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function addChild(child: Omit<ChildProfile, "id" | "linkedAt">): ChildProfile {
  const next: ChildProfile = {
    ...child,
    id:       `child-${Date.now()}`,
    linkedAt: new Date(),
  };
  _profile = { ..._profile, children: [..._profile.children, next] };
  _notify();
  return next;
}

export function removeChild(childId: string): void {
  _profile = { ..._profile, children: _profile.children.filter(c => c.id !== childId) };
  _notify();
}

export function useParentStore() {
  const [profile, setProfile] = useState(_profile);

  useEffect(() => {
    const sync = () => setProfile({ ..._profile });
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return { profile, addChild, removeChild };
}

export type ParentStore = ReturnType<typeof useParentStore>;
