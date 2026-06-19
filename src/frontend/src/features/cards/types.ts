/* ══════════════════════════════════════════════════════════════
   COGNITIVE CARDS — TYPES
   Document 3 data model + UI-layer display types
   ══════════════════════════════════════════════════════════════ */

export type Difficulty        = 1 | 2 | 3 | 4 | 5;
export type CardState         = "study" | "test" | "score" | "multiplayer";
export type InputMode         = "typing" | "voice" | "video";
export type RoomMode          = "study" | "battle" | "exam" | "tournament";
export type ConceptCountMode  = "auto" | "manual" | "difficulty" | "group";
export type DifficultyLevel   = "easy" | "medium" | "hard" | "expert";

// ── ConceptCountConfig ──────────────────────────────────────────
export interface ConceptCountConfig {
  mode:               ConceptCountMode;
  selectedIds?:       string[];        // manual
  difficultyLevel?:   DifficultyLevel; // difficulty
  groupConceptCount?: number;          // group / room host
}

// ── Concept ─────────────────────────────────────────────────────
export interface Concept {
  id: string;
  text: string;
  keywords: string[];      // runtime-only: used for concept detection
  difficulty: number;
  weight: number;
  aiGenerated: boolean;
  order: number;
}

// ── TestConfig ──────────────────────────────────────────────────
export interface TestConfig {
  timeLimitSeconds: number;
  allowVoice: boolean;
  allowVideo: boolean;
  allowTyping: boolean;
  revealMode: "blur" | "fade";
  scoringMode: "standard" | "strict" | "speed";
}

// ── AttemptRecord ───────────────────────────────────────────────
export interface AttemptRecord {
  timestamp: Date;
  score: number;
  conceptsHit: string[];
  conceptsMissed: string[];
  timeUsed: number;
}

// ── MasteryData ─────────────────────────────────────────────────
export interface MasteryData {
  score: number;
  lastTested: Date | null;
  streak: number;
  attempts: number;
  history: AttemptRecord[];
}

// ── CardAI ──────────────────────────────────────────────────────
export interface CardAI {
  generatedFrom: string | null;
  modelVersion: string | null;
  autoImprove: boolean;
  suggestions: string[];
}

// ── CognitiveCardData ───────────────────────────────────────────
export interface CognitiveCardData {
  id: string;
  userId: string;

  // Identity
  title: string;
  category: string;
  subject: string;
  difficulty: Difficulty;
  tags: string[];

  // Content
  description: string;
  examples: string[];
  notesLink: string | null;

  // Concepts
  concepts: Concept[];

  // Concept Count Mode (persisted per card; overridable per session)
  conceptCountMode?:   ConceptCountMode;
  selectedConceptIds?: string[];
  difficultyLevel?:    DifficultyLevel;
  groupConceptCount?:  number;

  // Testing
  testConfig: TestConfig;

  // Scoring
  mastery: MasteryData;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: "manual" | "ai" | "notes" | "import";
  version: number;

  // AI
  ai: CardAI;

  // Display-only (assigned by UI layer, not persisted)
  accent: string;
  gradientBg: string;
  textAccent: string;
}

// ── Learn Content (Document 1B) ─────────────────────────────────
export interface LearnDef {
  term: string;
  def: string;
}

export interface LearnEg {
  label: string;
  text: string;
}

export interface LearnContent {
  summary: string;
  definitions: LearnDef[];
  principles: string[];
  examples: LearnEg[];
  mistakes: string[];
  whyMatters: string;
  connections: string[];
}

// ── Scoring ─────────────────────────────────────────────────────
export interface ScoreBreakdown {
  weightedHits: number;
  totalWeight: number;
  rawPct: number;
  diffMultiplier: number;
  speedBonus: number;
  accuracyBonus: number;
  streakBonus: number;
  misconceptionPenalty: number;
  finalScore: number;
  grade: "S" | "A" | "B" | "C" | "D";
  gradeAccent: string;
  verdict: string;
}

// ── Multiplayer ─────────────────────────────────────────────────
export interface MPPlayer {
  id: string;
  name: string;
  initials: string;
  accent: string;
  you: boolean;
  speed: number;
  ready: boolean;
}

export interface MPPlayerState {
  id: string;
  score: number;
  conceptsHit: string[];
  accuracy: number;
  active: boolean;
  lastHitLabel: string | null;
}

export interface BroadcastEvent {
  uid: string;
  playerId: string;
  playerName: string;
  accent: string;
  conceptText: string;
  scoreDelta: number;
}

// ── Room (Document 5) ───────────────────────────────────────────
export interface Room {
  roomId: string;
  hostId: string;
  participants: MPPlayer[];
  cardSet: string[];       // card IDs
  mode: RoomMode;
  maxPlayers: number;
  status: "waiting" | "active" | "finished";
}
