/* ══════════════════════════════════════════════════════════════
   UNIVERSITY STORE — Phase 11
   Programmes, cohorts, student refs. Local simulation.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface UniversityStudentRef {
  studentId:         string;
  name:              string;
  avatar:            string; // initials
  accent:            string; // tailwind bg class
  permissionGranted: boolean;
}

export interface Programme {
  id:           string;
  name:         string;
  description:  string;
  requirements: string[];
  cohortIds:    string[];
}

export interface Cohort {
  id:       string;
  name:     string;
  year:     number;
  students: UniversityStudentRef[];
}

export interface UniversityProfile {
  id:         string;
  name:       string;
  logo:       string | null;
  programmes: Programme[];
  cohorts:    Cohort[];
}

// ── Mock seed ──────────────────────────────────────────────────────

const COHORT_CS_2025: Cohort = {
  id: "cohort-cs-2025", name: "Computer Science 2025", year: 2025,
  students: [
    { studentId: "u-001", name: "Aisha Patel",      avatar: "AP", accent: "bg-violet-500",  permissionGranted: true  },
    { studentId: "u-002", name: "Ben Clarke",        avatar: "BC", accent: "bg-indigo-500",  permissionGranted: true  },
    { studentId: "u-003", name: "Chloe Davies",      avatar: "CD", accent: "bg-sky-500",     permissionGranted: false },
    { studentId: "u-004", name: "Daniel Osei",       avatar: "DO", accent: "bg-emerald-500", permissionGranted: true  },
    { studentId: "u-005", name: "Emma Thompson",     avatar: "ET", accent: "bg-rose-500",    permissionGranted: true  },
    { studentId: "u-006", name: "Femi Adeyemi",      avatar: "FA", accent: "bg-amber-500",   permissionGranted: false },
    { studentId: "u-007", name: "Grace Li",          avatar: "GL", accent: "bg-teal-500",    permissionGranted: true  },
    { studentId: "u-008", name: "Hassan Al-Farouk",  avatar: "HA", accent: "bg-orange-500",  permissionGranted: true  },
    { studentId: "u-009", name: "Isla Stewart",      avatar: "IS", accent: "bg-pink-500",    permissionGranted: false },
    { studentId: "u-010", name: "Jake Morris",       avatar: "JM", accent: "bg-blue-500",    permissionGranted: true  },
    { studentId: "u-011", name: "Kira Novak",        avatar: "KN", accent: "bg-cyan-500",    permissionGranted: true  },
    { studentId: "u-012", name: "Liam Walker",       avatar: "LW", accent: "bg-lime-500",    permissionGranted: false },
  ],
};

const COHORT_MATHS_2025: Cohort = {
  id: "cohort-maths-2025", name: "Mathematics 2025", year: 2025,
  students: [
    { studentId: "u-013", name: "Maya Singh",       avatar: "MS", accent: "bg-fuchsia-500", permissionGranted: true  },
    { studentId: "u-014", name: "Noah Kim",         avatar: "NK", accent: "bg-blue-500",    permissionGranted: true  },
    { studentId: "u-015", name: "Olivia Chen",      avatar: "OC", accent: "bg-rose-400",    permissionGranted: false },
    { studentId: "u-016", name: "Priya Sharma",     avatar: "PS", accent: "bg-amber-400",   permissionGranted: true  },
    { studentId: "u-017", name: "Quentin James",    avatar: "QJ", accent: "bg-sky-400",     permissionGranted: true  },
    { studentId: "u-018", name: "Rhea Okonkwo",     avatar: "RO", accent: "bg-emerald-400", permissionGranted: false },
    { studentId: "u-019", name: "Sam Yusuf",        avatar: "SY", accent: "bg-violet-400",  permissionGranted: true  },
    { studentId: "u-020", name: "Tara Jennings",    avatar: "TJ", accent: "bg-indigo-400",  permissionGranted: true  },
  ],
};

const COHORT_CS_2026: Cohort = {
  id: "cohort-cs-2026", name: "Computer Science 2026", year: 2026,
  students: [
    { studentId: "u-021", name: "Uma Blackwood",    avatar: "UB", accent: "bg-pink-400",    permissionGranted: true  },
    { studentId: "u-022", name: "Victor Asante",    avatar: "VA", accent: "bg-teal-400",    permissionGranted: false },
    { studentId: "u-023", name: "Wendy Fowler",     avatar: "WF", accent: "bg-orange-400",  permissionGranted: true  },
    { studentId: "u-024", name: "Xander Petrov",    avatar: "XP", accent: "bg-blue-400",    permissionGranted: true  },
  ],
};

const SEED_PROFILE: UniversityProfile = {
  id:   "uni-001",
  name: "Meridian University",
  logo: null,
  programmes: [
    {
      id:          "prog-cs",
      name:        "BSc Computer Science",
      description: "Three-year programme covering algorithms, systems, AI, and software engineering.",
      requirements: [
        "A-Level Computer Science grade A",
        "A-Level Mathematics grade B",
        "Strong algorithmic reasoning",
        "Consistent study record",
      ],
      cohortIds: ["cohort-cs-2025", "cohort-cs-2026"],
    },
    {
      id:          "prog-maths",
      name:        "BSc Mathematics",
      description: "Pure and applied mathematics, statistics, and mathematical modelling.",
      requirements: [
        "A-Level Mathematics grade A*",
        "A-Level Further Mathematics grade A",
        "High problem-solving consistency",
      ],
      cohortIds: ["cohort-maths-2025"],
    },
  ],
  cohorts: [COHORT_CS_2025, COHORT_MATHS_2025, COHORT_CS_2026],
};

// ── Singleton ──────────────────────────────────────────────────────

let _profile: UniversityProfile = { ...SEED_PROFILE };
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function grantPermission(cohortId: string, studentId: string, granted: boolean): void {
  _profile = {
    ..._profile,
    cohorts: _profile.cohorts.map(c =>
      c.id !== cohortId ? c : {
        ...c,
        students: c.students.map(s =>
          s.studentId !== studentId ? s : { ...s, permissionGranted: granted }
        ),
      }
    ),
  };
  _notify();
}

export function useUniversityStore() {
  const [profile, setProfile] = useState(_profile);
  useEffect(() => {
    const sync = () => setProfile({ ..._profile });
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);
  return { profile, grantPermission };
}

export type UniversityStore = ReturnType<typeof useUniversityStore>;
