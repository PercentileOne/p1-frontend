# Proof System Overview

The Proof System is P1's integrity layer. It ensures that completions mean something — that a "done" in P1 represents real action, not a clicked checkbox.

## Core Files

| File | Role |
|------|------|
| `src/frontend/src/lib/proofEngine.ts` | Engine logic, types, in-memory store |
| `src/frontend/src/components/ProofModal.tsx` | User-facing proof submission modal |
| `src/frontend/src/pages/ProofPage.tsx` | User's proof history (`/proof`) |
| `src/frontend/src/pages/AdminPage.tsx` | Admin review queue (`/admin`) |

## Proof Request Flow

```
1. User marks task/habit done on TodayPage
2. handleProofRequest() called: (name, difficulty, onApproved, streak?)
3. ProofEngine.shouldRequestProof(task, user) evaluates:
   - Epic difficulty: 48% base probability
   - Hard: 28%, Medium: 12%, Easy: 6%
   - Modifiers: trust score, streak, mismatch detection, high-value flag
4. If required: ProofDecision object returned (reason, proofTypes, urgency, message)
5. ProofModal opens with the decision context
6. User selects proof type, uploads media, writes reflection
7. ProofModal.handleSubmit():
   - Validates (type selected, reflection ≥ 10 chars if reflection type)
   - 1.4s simulated AI analysis
   - ProofEngine.submitProof() creates submission record
   - onSubmitted() callback → task/habit marked done
```

## ProofDecision Fields

```typescript
interface ProofDecision {
  required: boolean;
  reason: ProofReason;
  proofTypes: ProofType[];
  urgency: "low" | "medium" | "high";
  message: string;
}
```

## Trust Score Rules

| Event | Delta |
|-------|-------|
| Proof approved | +3 |
| Proof partially approved | +1 |
| Proof rejected | -4 |
| Behaviour mismatch detected | -2 |
| Streak milestone verified | +2 |

Trust score is clamped to [0, 100]. Users start at 50.

## BehaviourMonitor

`BehaviourMonitor.detectMismatch(user)` returns `true` when any of:
- `mismatchCount > 3`
- `behaviourScore < 40 && streak > 14`
- `difficulty === "epic" && trustScore < 50`
- 4% random detection (simulates anomaly detection)

## In-Memory Store

`_proofStore: ProofSubmission[]` — module-level array in `proofEngine.ts`. Seeded with 12 demo submissions via `seedDemoProofs()`. Resets on page refresh.

## Production Roadmap

- Store submissions in PostgreSQL (`proof_submissions` table)
- Real media upload to S3/Cloudflare R2
- Claude API for `agentAnalysis` (replace hardcoded strings)
- BehaviourMonitor powered by full activity log, not mismatch count
- Admin review queue with real user data and role-based access control
