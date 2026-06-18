/* ══════════════════════════════════════════════════════════════
   P1 PROOF ENGINE  —  front-end module (no backend dependency)
   ══════════════════════════════════════════════════════════════ */

export type ProofType =
  | "photo" | "video" | "voice" | "screenshot"
  | "document" | "location" | "timestamp" | "behavioural"
  | "reflection" | "social";

export type ProofReason =
  | "random_check" | "behaviour_mismatch" | "streak_integrity"
  | "difficulty_weighted" | "mid_progress" | "high_value";

export type ProofStatus = "pending" | "approved" | "rejected" | "flagged";

export interface ProofTask {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard" | "epic";
  goalType?: string;
  streak?: number;
  progress?: number;
  isHabit?: boolean;
}

export interface ProofUser {
  id: string;
  name: string;
  trustScore: number;       // 0–100
  behaviourScore: number;   // 0–100
  proofCount: number;
  lastProofAt?: Date;
  mismatchCount: number;
}

export interface ProofSubmission {
  id: string;
  taskId: string;
  taskName: string;
  userId: string;
  userName: string;
  type: ProofType;
  reason: ProofReason;
  status: ProofStatus;
  mediaDataUrl?: string;    // data URL for images; undefined for other types
  mediaType?: string;       // MIME type
  fileName?: string;
  reflectionText?: string;
  timestamp: Date;
  trustScoreBefore: number;
  behaviourScore: number;
  agentAnalysis?: string;
  difficulty: string;
}

export interface ProofDecision {
  required: boolean;
  reason?: ProofReason;
  proofTypes: ProofType[];
  urgency: "low" | "medium" | "high";
  message: string;
}

/* ── In-memory store (front-end placeholder) ── */
let _proofStore: ProofSubmission[] = [];
let _idCounter = 100;

/* ══════════════════════════════════════════════════════════════
   BEHAVIOUR MONITOR
   ══════════════════════════════════════════════════════════════ */
export class BehaviourMonitor {
  /** Returns true when reported progress doesn't match expected behaviour */
  static detectMismatch(task: ProofTask, user: ProofUser): boolean {
    if (user.mismatchCount > 3)                                  return true;
    if ((task.streak ?? 0) > 30 && user.trustScore < 60)        return true;
    if (task.difficulty === "epic" && user.trustScore < 70)      return true;
    return Math.random() < 0.04;  // 4% random mismatch detection
  }

  /** 0–100: measures consistency, streak integrity, completion velocity */
  static behaviourScore(user: ProofUser): number {
    return user.behaviourScore;
  }

  /** 0–100: starts at 50, rises with good proof, falls with mismatches */
  static trustScore(user: ProofUser): number {
    return user.trustScore;
  }
}

/* ══════════════════════════════════════════════════════════════
   PROOF ENGINE
   ══════════════════════════════════════════════════════════════ */
export class ProofEngine {

  /** Core decision function: should we request proof for this completion? */
  static shouldRequestProof(task: ProofTask, user: ProofUser): ProofDecision {
    const trust = user.trustScore;

    // Behaviour mismatch → always require
    if (BehaviourMonitor.detectMismatch(task, user)) {
      return {
        required: true,
        reason: "behaviour_mismatch",
        proofTypes: this.proofTypesFor(task),
        urgency: "high",
        message:
          "Agent detected a behaviour pattern that doesn't match your reported progress. A quick proof keeps your record honest.",
      };
    }

    // Streak integrity check
    const streak = task.streak ?? 0;
    if (streak > 14) {
      const streakProb = Math.min(0.45, streak * 0.012);
      if (Math.random() < streakProb) {
        return {
          required: true,
          reason: "streak_integrity",
          proofTypes: this.proofTypesFor(task),
          urgency: "medium",
          message: `${streak}-day streak! Random integrity check to protect your record — and keep P1 honest for everyone.`,
        };
      }
    }

    // Mid-progress check
    if ((task.progress ?? 0) >= 40 && (task.progress ?? 0) <= 65) {
      if (Math.random() < 0.18) {
        return {
          required: true,
          reason: "mid_progress",
          proofTypes: this.proofTypesFor(task),
          urgency: "low",
          message: "You're halfway through. A quick proof submission locks in your progress.",
        };
      }
    }

    // Difficulty-weighted random probability
    const baseProbability: Record<string, number> = {
      easy: 0.04, medium: 0.12, hard: 0.28, epic: 0.48,
    };
    let p = baseProbability[task.difficulty] ?? 0.10;
    // High trust reduces frequency
    p *= Math.max(0.2, 1 - (trust - 50) / 180);

    if (Math.random() < p) {
      return {
        required: true,
        reason: task.difficulty === "hard" || task.difficulty === "epic"
          ? "difficulty_weighted"
          : "random_check",
        proofTypes: this.proofTypesFor(task),
        urgency: task.difficulty === "epic" ? "high" : "low",
        message:
          task.difficulty === "epic"
            ? "Epic goals require verified proof. This keeps your P1 Score meaningful."
            : "Random integrity check. These fire occasionally for everyone — it keeps the system honest.",
      };
    }

    return { required: false, proofTypes: [], urgency: "low", message: "" };
  }

  /** Which proof types make sense for this task? */
  static proofTypesFor(task: ProofTask): ProofType[] {
    const n = task.name.toLowerCase();
    if (n.includes("fast") || n.includes("water") || n.includes("omad"))
      return ["photo", "reflection", "timestamp"];
    if (n.includes("gym") || n.includes("exercise") || n.includes("run") || n.includes("workout"))
      return ["photo", "video", "reflection"];
    if (n.includes("read") || n.includes("book"))
      return ["photo", "screenshot", "reflection"];
    if (n.includes("meditat") || n.includes("pray") || n.includes("prayer"))
      return ["voice", "reflection", "timestamp"];
    if (n.includes("code") || n.includes("build") || n.includes("ship") || n.includes("feature"))
      return ["screenshot", "document", "photo"];
    if (n.includes("cold") || n.includes("shower"))
      return ["video", "photo", "timestamp"];
    if (task.isHabit)
      return ["photo", "reflection", "timestamp"];
    return ["photo", "reflection", "document"];
  }

  /** Add a proof to the in-memory store */
  static submitProof(
    submission: Omit<ProofSubmission, "id" | "timestamp" | "status">
  ): ProofSubmission {
    const proof: ProofSubmission = {
      ...submission,
      id: `proof_${_idCounter++}`,
      timestamp: new Date(),
      status: "pending",
      agentAnalysis: this._autoAnalyse(submission),
    };
    _proofStore.unshift(proof);
    this.logProof(proof);
    return proof;
  }

  static getProofs(): ProofSubmission[] {
    return [..._proofStore];
  }

  static updateStatus(id: string, status: ProofStatus): void {
    _proofStore = _proofStore.map(p => (p.id === id ? { ...p, status } : p));
  }

  /** Placeholder auto-analysis (production: send to AI) */
  static _autoAnalyse(s: Omit<ProofSubmission, "id" | "timestamp" | "status">): string {
    if (s.mediaDataUrl && s.reflectionText && s.reflectionText.length > 20)
      return "Media and detailed reflection both present. High confidence. Approved automatically.";
    if (s.mediaDataUrl)
      return "Media submitted. Reflection absent or brief. Queued for admin review.";
    if (s.reflectionText && s.reflectionText.length > 30)
      return "Text-only proof. Detailed enough to be credible. Trust score impact: neutral.";
    return "Minimal proof submitted. Flagged for admin review. Trust score may be affected.";
  }

  static logProof(proof: ProofSubmission): void {
    // Production: POST to backend
    console.info("[ProofEngine] Proof logged:", {
      id: proof.id, task: proof.taskName,
      type: proof.type, reason: proof.reason,
    });
  }

  /** Update trust score after verification */
  static verifyProof(proof: ProofSubmission): { approved: boolean; trustDelta: number; note: string } {
    const hasMedia = !!proof.mediaDataUrl;
    const hasReflection = (proof.reflectionText?.length ?? 0) > 10;
    if (hasMedia && hasReflection)
      return { approved: true,  trustDelta: +3, note: "Full proof accepted." };
    if (hasMedia || hasReflection)
      return { approved: true,  trustDelta: +1, note: "Partial proof accepted. Pending review." };
    return { approved: false, trustDelta: -4, note: "Insufficient proof. Trust score reduced." };
  }
}

/* ── Convenience: seed some demo data for admin view ── */
export function seedDemoProofs(): void {
  if (_proofStore.length > 0) return; // already seeded

  const now = Date.now();
  const hour = 3_600_000;

  const DEMO: Omit<ProofSubmission, "id">[] = [
    {
      taskName:"7-Day Water Fast — Day 3", taskId:"t1",
      userId:"u1", userName:"Francis Cobbinah",
      type:"reflection", reason:"random_check", status:"pending",
      reflectionText:"Still going strong. Energy dipping slightly mid-afternoon but mental clarity is very high. Electrolyte sachets helping a lot.",
      timestamp: new Date(now - 2 * hour),
      trustScoreBefore:78, behaviourScore:82, difficulty:"epic",
      agentAnalysis:"Text proof only. Credible detail level. Recommend admin spot-check.",
    },
    {
      taskName:"Morning Meditation — Day 22", taskId:"t2",
      userId:"u1", userName:"Francis Cobbinah",
      type:"reflection", reason:"streak_integrity", status:"approved",
      reflectionText:"Spent 12 minutes in focused breathing. Felt a real sense of peace this morning — probably the most centred I've been all week.",
      timestamp: new Date(now - 26 * hour),
      trustScoreBefore:75, behaviourScore:82, difficulty:"medium",
      agentAnalysis:"Detailed reflection with temporal specificity. Auto-approved. Trust +2.",
    },
    {
      taskName:"30-Day Fitness Challenge — Day 18", taskId:"t3",
      userId:"u2", userName:"Alex Turner",
      type:"photo", reason:"behaviour_mismatch", status:"flagged",
      timestamp: new Date(now - 4 * hour),
      trustScoreBefore:45, behaviourScore:38, difficulty:"hard",
      agentAnalysis:"Behaviour mismatch: completion velocity 3× faster than baseline. Image metadata inconsistent. Flagged for admin review.",
    },
    {
      taskName:"Read 24 Books — Book 9", taskId:"t4",
      userId:"u3", userName:"Sarah Mitchell",
      type:"screenshot", reason:"random_check", status:"approved",
      reflectionText:"Finished 'Atomic Habits'. The chapter on habit stacking was immediately actionable.",
      timestamp: new Date(now - 48 * hour),
      trustScoreBefore:92, behaviourScore:88, difficulty:"medium",
      agentAnalysis:"Screenshot + reflection. High-trust user. Auto-approved.",
    },
    {
      taskName:"Daily Code Habit — Day 11", taskId:"t5",
      userId:"u4", userName:"Marcus Webb",
      type:"screenshot", reason:"difficulty_weighted", status:"pending",
      reflectionText:"Built out the ProofEngine module today. Clean TypeScript, happy with the architecture.",
      timestamp: new Date(now - 1 * hour),
      trustScoreBefore:61, behaviourScore:65, difficulty:"hard",
      agentAnalysis:"Screenshot mentioned but not attached. Reflection credible. Queued for review.",
    },
    {
      taskName:"OMAD Challenge — Day 6", taskId:"t6",
      userId:"u2", userName:"Alex Turner",
      type:"reflection", reason:"behaviour_mismatch", status:"rejected",
      reflectionText:"Did it.",
      timestamp: new Date(now - 72 * hour),
      trustScoreBefore:48, behaviourScore:38, difficulty:"hard",
      agentAnalysis:"Minimal reflection. Behaviour mismatch confirmed. Previous flagged proofs from same user. Rejected. Trust -5.",
    },
    {
      taskName:"Cold Shower Streak — Day 5", taskId:"t7",
      userId:"u1", userName:"Francis Cobbinah",
      type:"voice", reason:"streak_integrity", status:"pending",
      reflectionText:"Voice note submitted via app. 48 seconds.",
      timestamp: new Date(now - 3 * hour),
      trustScoreBefore:80, behaviourScore:82, difficulty:"medium",
      agentAnalysis:"Voice note present. Transcript pending. In review queue.",
    },
    {
      taskName:"Journaling — Day 19 Streak", taskId:"t8",
      userId:"u3", userName:"Sarah Mitchell",
      type:"voice", reason:"streak_integrity", status:"approved",
      reflectionText:"2-minute voice journal. Tone consistent with typical entries. Auto-approved.",
      timestamp: new Date(now - 50 * hour),
      trustScoreBefore:91, behaviourScore:88, difficulty:"easy",
      agentAnalysis:"High-trust user. Voice note submitted. Auto-approved. Streak protected.",
    },
    {
      taskName:"AWS Certification — 50% Progress", taskId:"t9",
      userId:"u4", userName:"Marcus Webb",
      type:"document", reason:"mid_progress", status:"pending",
      reflectionText:"Attached practice exam results PDF — scored 74% on first mock. Need 80% to pass.",
      timestamp: new Date(now - 5 * hour),
      trustScoreBefore:62, behaviourScore:65, difficulty:"hard",
      agentAnalysis:"Document + detailed reflection. Practice exam context credible. In review.",
    },
    {
      taskName:"No Social Media Before 10am", taskId:"t10",
      userId:"u2", userName:"Alex Turner",
      type:"timestamp", reason:"behaviour_mismatch", status:"flagged",
      timestamp: new Date(now - 30 * hour),
      trustScoreBefore:43, behaviourScore:35, difficulty:"easy",
      agentAnalysis:"Timestamp submitted but device activity log shows social app opened at 8:14am. Flagged. Trust -3.",
    },
    {
      taskName:"Morning Exercise — Day 12", taskId:"t11",
      userId:"u1", userName:"Francis Cobbinah",
      type:"photo", reason:"random_check", status:"approved",
      reflectionText:"Post-workout selfie. 35 min strength session, felt strong.",
      timestamp: new Date(now - 96 * hour),
      trustScoreBefore:76, behaviourScore:80, difficulty:"medium",
      agentAnalysis:"Image + reflection. Consistent with previous workout proofs. Auto-approved. Trust +2.",
    },
    {
      taskName:"Evening Meditation — Day 14", taskId:"t12",
      userId:"u3", userName:"Sarah Mitchell",
      type:"reflection", reason:"streak_integrity", status:"approved",
      reflectionText:"14-minute guided meditation. Genuinely felt calmer after — the streak is building a real habit now.",
      timestamp: new Date(now - 52 * hour),
      trustScoreBefore:93, behaviourScore:89, difficulty:"easy",
      agentAnalysis:"Detailed, time-specific reflection. High-trust user. Auto-approved.",
    },
  ];

  _proofStore = DEMO.map((d, i) => ({ ...d, id: `proof_${i + 1}` }));
}
