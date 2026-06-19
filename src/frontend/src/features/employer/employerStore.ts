/* ══════════════════════════════════════════════════════════════
   EMPLOYER STORE — Phase 8
   Module-level singleton. Mock-only until Phase 9 backend.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import type { Concept, DifficultyLevel } from "../cards/types";

// ── Types ──────────────────────────────────────────────────────────

export interface TeamMember {
  userId:   string;
  name:     string;
  initials: string;
  accent:   string;
  role:     "admin" | "member" | "candidate";
  joinedAt: Date;
}

export interface Team {
  id:      string;
  name:    string;
  members: TeamMember[];
}

export type AssessmentSectionSourceType = "card" | "chapter" | "note" | "custom";
export type AssessmentConceptMode = "auto" | "manual" | "difficulty" | "fixed";

export interface AssessmentSection {
  id:               string;
  title:            string;
  sourceType:       AssessmentSectionSourceType;
  sourceId:         string;
  conceptCountMode?: AssessmentConceptMode;
  conceptCount?:    number;
  difficulty?:      DifficultyLevel;
  // Seed concepts — populated from linked card / generated for custom
  concepts:         Concept[];
}

export interface AssessmentResult {
  userId:         string;
  userName:       string;
  userInitials:   string;
  userAccent:     string;
  score:          number;          // 0–100
  sectionScores:  { sectionId: string; score: number }[];
  timeUsed:       number;          // seconds
  weakConcepts:   Concept[];
  strongConcepts: Concept[];
  date:           Date;
}

export interface Assessment {
  id:          string;
  title:       string;
  description: string;
  createdBy:   string;
  certId?:     string;             // optional certification link
  sections:    AssessmentSection[];
  assignedTo:  string[];           // userIds
  results:     AssessmentResult[];
  createdAt:   Date;
}

export interface Employer {
  id:          string;
  name:        string;
  logo:        string | null;
  industry:    string;
  teams:       Team[];
  assessments: Assessment[];
}

// ── Mock concepts seed ─────────────────────────────────────────────

function mkConcept(id: string, text: string, kws: string[], diff = 3, weight = 1): Concept {
  return { id, text, keywords: kws, difficulty: diff, weight, aiGenerated: true, order: 0 };
}

const REACT_CONCEPTS: Concept[] = [
  mkConcept("rc-1", "Component composition patterns and reusability", ["component","composition","reuse","props"], 3, 1.2),
  mkConcept("rc-2", "useState hook manages local component state", ["useState","state","hook","local"], 2, 1.0),
  mkConcept("rc-3", "useEffect synchronises with external systems", ["useEffect","effect","sync","cleanup"], 3, 1.2),
  mkConcept("rc-4", "Virtual DOM diffing minimises real DOM mutations", ["virtual","dom","diffing","reconciliation"], 4, 1.4),
  mkConcept("rc-5", "Context API avoids prop-drilling across trees", ["context","provider","consumer","prop-drilling"], 3, 1.0),
];

const TS_CONCEPTS: Concept[] = [
  mkConcept("ts-1", "Generic types parameterise over unknown types at call site", ["generic","type","parameter","T"], 4, 1.4),
  mkConcept("ts-2", "Union types allow a value to be one of several types", ["union","pipe","type","or"], 2, 1.0),
  mkConcept("ts-3", "Type narrowing refines types within conditional branches", ["narrowing","typeof","instanceof","guard"], 3, 1.2),
  mkConcept("ts-4", "Utility types like Partial and Pick transform existing types", ["Partial","Pick","Omit","utility"], 3, 1.0),
];

const SYS_DESIGN_CONCEPTS: Concept[] = [
  mkConcept("sd-1", "Horizontal scaling adds nodes; vertical scaling adds resources to one node", ["horizontal","vertical","scaling","nodes"], 3, 1.2),
  mkConcept("sd-2", "CAP theorem: consistency, availability, partition tolerance — pick two", ["CAP","consistency","availability","partition"], 4, 1.5),
  mkConcept("sd-3", "Load balancers distribute requests across server pools", ["load balancer","distribute","round-robin","health"], 2, 1.0),
  mkConcept("sd-4", "Cache invalidation is one of the two hard problems in computer science", ["cache","invalidation","TTL","stale"], 3, 1.0),
  mkConcept("sd-5", "Message queues decouple producers from consumers asynchronously", ["queue","message","producer","consumer","async"], 3, 1.2),
];

export const PYTHON_CONCEPTS: Concept[] = [
  mkConcept("py-1", "List comprehensions create lists concisely from iterables", ["list","comprehension","iterable","filter"], 2, 1.0),
  mkConcept("py-2", "Decorators wrap functions to add behaviour without modifying source", ["decorator","@","wrap","function"], 3, 1.2),
  mkConcept("py-3", "GIL prevents true multi-threaded CPU parallelism in CPython", ["GIL","thread","CPython","parallel"], 4, 1.4),
  mkConcept("py-4", "Context managers handle resource acquisition and release via with", ["context","with","__enter__","__exit__"], 3, 1.0),
];

const CLINICAL_CONCEPTS: Concept[] = [
  mkConcept("cl-1", "SOAP notes structure clinical documentation: Subjective, Objective, Assessment, Plan", ["SOAP","subjective","objective","assessment","plan"], 3, 1.2),
  mkConcept("cl-2", "Triage priority assigns GREEN, YELLOW, RED, BLACK based on severity", ["triage","priority","green","red","black"], 2, 1.0),
  mkConcept("cl-3", "Differential diagnosis lists conditions consistent with presenting symptoms", ["differential","diagnosis","symptoms","list"], 4, 1.4),
  mkConcept("cl-4", "Informed consent requires disclosure, comprehension, and voluntary agreement", ["consent","informed","voluntary","disclosure"], 3, 1.0),
  mkConcept("cl-5", "HIPAA protects patient health information from unauthorised disclosure", ["HIPAA","PHI","privacy","disclosure"], 3, 1.0),
];

// ── Seed data ──────────────────────────────────────────────────────

const TECHCORP_MEMBERS: TeamMember[] = [
  { userId: "tc-01", name: "Alice Park",    initials: "AP", accent: "bg-indigo-500",  role: "admin",     joinedAt: new Date("2025-09-01") },
  { userId: "tc-02", name: "Ben Torres",    initials: "BT", accent: "bg-sky-500",     role: "member",    joinedAt: new Date("2025-09-05") },
  { userId: "tc-03", name: "Cara Liu",      initials: "CL", accent: "bg-violet-500",  role: "member",    joinedAt: new Date("2025-09-10") },
  { userId: "tc-04", name: "Dan Okafor",    initials: "DO", accent: "bg-emerald-500", role: "candidate", joinedAt: new Date("2025-10-01") },
  { userId: "tc-05", name: "Elena Vasquez", initials: "EV", accent: "bg-amber-500",   role: "candidate", joinedAt: new Date("2025-10-03") },
  { userId: "tc-06", name: "Felix Huang",   initials: "FH", accent: "bg-rose-500",    role: "candidate", joinedAt: new Date("2025-10-05") },
];

const HP_MEMBERS: TeamMember[] = [
  { userId: "hp-01", name: "Grace Kim",     initials: "GK", accent: "bg-teal-500",    role: "admin",     joinedAt: new Date("2025-10-15") },
  { userId: "hp-02", name: "Hiro Tanaka",   initials: "HT", accent: "bg-indigo-500",  role: "member",    joinedAt: new Date("2025-10-20") },
  { userId: "hp-03", name: "Isla Nwosu",    initials: "IN", accent: "bg-pink-500",    role: "candidate", joinedAt: new Date("2025-11-01") },
  { userId: "hp-04", name: "James Osei",    initials: "JO", accent: "bg-sky-500",     role: "candidate", joinedAt: new Date("2025-11-02") },
];

function mockResult(userId: string, name: string, initials: string, accent: string, score: number, seconds: number, concepts: Concept[]): AssessmentResult {
  const threshold = 68;
  return {
    userId, userName: name, userInitials: initials, userAccent: accent,
    score,
    sectionScores: [],
    timeUsed:      seconds,
    weakConcepts:   concepts.filter((_, i) => (score < threshold ? i < 2 : i === 0)),
    strongConcepts: concepts.filter((_, i) => (score >= threshold ? i >= 1 : i >= 3)),
    date:          new Date(Date.now() - Math.random() * 7 * 86400000),
  };
}

const SEED: Employer[] = [
  {
    id:       "emp-techcorp",
    name:     "TechCorp",
    logo:     "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
    industry: "Software Engineering",
    teams: [
      {
        id:      "tc-team-frontend",
        name:    "Frontend Squad",
        members: TECHCORP_MEMBERS.filter(m => ["tc-01","tc-02","tc-03"].includes(m.userId)),
      },
      {
        id:      "tc-team-candidates",
        name:    "2026 Candidates",
        members: TECHCORP_MEMBERS.filter(m => m.role === "candidate"),
      },
    ],
    assessments: [
      {
        id:          "tc-assess-react",
        title:       "React Developer Screen",
        description: "Tests core React knowledge required for mid-level frontend roles. Covers component patterns, hooks, and rendering behaviour.",
        createdBy:   "tc-01",
        assignedTo:  ["tc-04","tc-05","tc-06"],
        sections: [
          { id: "tc-s1", title: "Component Patterns",  sourceType: "card", sourceId: "card-react-components",       concepts: REACT_CONCEPTS.slice(0, 3), difficulty: "medium" },
          { id: "tc-s2", title: "React Hooks",          sourceType: "card", sourceId: "card-react-hooks", concepts: REACT_CONCEPTS.slice(2),    difficulty: "medium" },
          { id: "tc-s3", title: "TypeScript Essentials", sourceType: "card", sourceId: "card-typescript-generics",  concepts: TS_CONCEPTS,                 conceptCount: 3, difficulty: "hard" },
        ],
        results: [
          mockResult("tc-04", "Dan Okafor",    "DO", "bg-emerald-500", 82, 1140, [...REACT_CONCEPTS, ...TS_CONCEPTS]),
          mockResult("tc-05", "Elena Vasquez", "EV", "bg-amber-500",   67, 1380, [...REACT_CONCEPTS, ...TS_CONCEPTS]),
          mockResult("tc-06", "Felix Huang",   "FH", "bg-rose-500",    91, 980,  [...REACT_CONCEPTS, ...TS_CONCEPTS]),
        ],
        createdAt: new Date("2025-11-01"),
      },
      {
        id:          "tc-assess-sysdesign",
        title:       "System Design Fundamentals",
        description: "Evaluates candidate ability to reason about scalability, distributed systems, and trade-offs at the architectural level.",
        createdBy:   "tc-01",
        assignedTo:  ["tc-04","tc-05"],
        sections: [
          { id: "sd-s1", title: "Scalability Concepts",  sourceType: "custom", sourceId: "custom-sd-1",  concepts: SYS_DESIGN_CONCEPTS.slice(0, 3), difficulty: "hard"   },
          { id: "sd-s2", title: "Distributed Patterns",  sourceType: "custom", sourceId: "custom-sd-2", concepts: SYS_DESIGN_CONCEPTS.slice(2),    difficulty: "expert", conceptCount: 3 },
        ],
        results: [
          mockResult("tc-04", "Dan Okafor",    "DO", "bg-emerald-500", 58, 1620, SYS_DESIGN_CONCEPTS),
          mockResult("tc-05", "Elena Vasquez", "EV", "bg-amber-500",   44, 1800, SYS_DESIGN_CONCEPTS),
        ],
        createdAt: new Date("2025-11-15"),
      },
    ],
  },

  {
    id:       "emp-healthplus",
    name:     "HealthPlus",
    logo:     "linear-gradient(135deg, #0d4d4d 0%, #062e2e 100%)",
    industry: "Health Science",
    teams: [
      {
        id:      "hp-team-clinical",
        name:    "Clinical Team",
        members: HP_MEMBERS.filter(m => m.role !== "candidate"),
      },
      {
        id:      "hp-team-candidates",
        name:    "Nursing Candidates",
        members: HP_MEMBERS.filter(m => m.role === "candidate"),
      },
    ],
    assessments: [
      {
        id:          "hp-assess-clinical",
        title:       "Clinical Foundations Screen",
        description: "Validates core clinical knowledge for nursing and allied health candidates: documentation, triage, consent, and privacy.",
        createdBy:   "hp-01",
        assignedTo:  ["hp-03","hp-04"],
        sections: [
          { id: "hp-s1", title: "Clinical Documentation", sourceType: "custom", sourceId: "custom-hp-1",  concepts: CLINICAL_CONCEPTS.slice(0, 3), difficulty: "medium" },
          { id: "hp-s2", title: "Legal & Ethical",         sourceType: "custom", sourceId: "custom-hp-2", concepts: CLINICAL_CONCEPTS.slice(3),    difficulty: "hard",   conceptCount: 2 },
        ],
        results: [
          mockResult("hp-03", "Isla Nwosu",  "IN", "bg-pink-500", 74, 1200, CLINICAL_CONCEPTS),
          mockResult("hp-04", "James Osei",  "JO", "bg-sky-500",  88, 1050, CLINICAL_CONCEPTS),
        ],
        createdAt: new Date("2025-12-01"),
      },
    ],
  },
];

// ── Store singleton ────────────────────────────────────────────────

let _employers: Employer[] = [...SEED];
const _listeners = new Set<() => void>();

function _notify() { _listeners.forEach(l => l()); }

export function getEmployer(id: string): Employer | undefined {
  return _employers.find(e => e.id === id);
}

export function addAssessment(
  employerId: string,
  draft: Omit<Assessment, "id" | "results" | "createdAt">,
): Assessment {
  const next: Assessment = {
    ...draft,
    id:        `assess-${Date.now()}`,
    results:   [],
    createdAt: new Date(),
  };
  _employers = _employers.map(emp =>
    emp.id === employerId
      ? { ...emp, assessments: [...emp.assessments, next] }
      : emp
  );
  _notify();
  return next;
}

export function addResult(
  employerId:   string,
  assessmentId: string,
  result:       AssessmentResult,
): void {
  _employers = _employers.map(emp => {
    if (emp.id !== employerId) return emp;
    return {
      ...emp,
      assessments: emp.assessments.map(a =>
        a.id !== assessmentId
          ? a
          : { ...a, results: [...a.results.filter(r => r.userId !== result.userId), result] }
      ),
    };
  });
  _notify();
}

export function addTeamMember(employerId: string, teamId: string, member: TeamMember): void {
  _employers = _employers.map(emp => {
    if (emp.id !== employerId) return emp;
    return {
      ...emp,
      teams: emp.teams.map(t =>
        t.id !== teamId ? t : { ...t, members: [...t.members, member] }
      ),
    };
  });
  _notify();
}

export function useEmployerStore() {
  const [employers, setEmployers] = useState(_employers);

  useEffect(() => {
    const sync = () => setEmployers([..._employers]);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return {
    employers,
    getEmployer,
    addAssessment,
    addResult,
    addTeamMember,
  };
}

export type EmployerStore = ReturnType<typeof useEmployerStore>;
