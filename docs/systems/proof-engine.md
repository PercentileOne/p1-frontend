# Proof Engine

## Purpose

The Proof Engine is P1's integrity system. It ensures that task and goal completions are genuine, not just button-clicks. It uses probabilistic verification requests, behaviour monitoring, and trust scoring to protect the meaning of every achievement recorded in P1.

The core philosophy: **A completion only means something if it's real. P1 protects your record.**

## Module Location

`src/frontend/src/lib/proofEngine.ts`
`src/frontend/src/components/ProofModal.tsx`

## Core Types

### ProofType (10 variants)
| Type | Use Case |
|------|---------|
| `photo` | Physical evidence (gym, food, workspace) |
| `video` | Activity in progress (workout, cold shower) |
| `voice` | Audio journal, verbal commitment |
| `screenshot` | Digital completions (exam score, code shipped) |
| `document` | PDFs, reports, certificates |
| `location` | GPS-verified presence (gym, office) |
| `timestamp` | Time-anchored completion |
| `behavioural` | Inferred from patterns (no manual submission) |
| `reflection` | Written reflection (journaling, meditation) |
| `social` | Third-party witness or post |

### ProofReason (6 variants)
| Reason | When Triggered |
|--------|---------------|
| `random_check` | Random probability across all users |
| `behaviour_mismatch` | BehaviourMonitor.detectMismatch() returns true |
| `streak_integrity` | Streak > 14 days, probabilistic check |
| `difficulty_weighted` | Hard/epic goals have higher base probability |
| `mid_progress` | Task progress between 40–65% |
| `high_value` | High-point milestones (reserved for future use) |

### ProofStatus
`pending → approved | rejected | flagged`

## BehaviourMonitor

```ts
detectMismatch(task, user): boolean
  → true if: user.mismatchCount > 3
  → true if: streak > 30 AND trustScore < 60
  → true if: difficulty === "epic" AND trustScore < 70
  → true at: 4% random probability

behaviourScore(user): number  // delegates to user.behaviourScore
trustScore(user): number      // delegates to user.trustScore
```

## ProofEngine.shouldRequestProof()

The core decision function. Called every time a task or habit is marked complete.

```
Priority order:
1. BehaviourMonitor.detectMismatch() → if true, ALWAYS require proof (reason: behaviour_mismatch)
2. Streak check: streak > 14 → probability = min(0.45, streak × 0.012)
3. Mid-progress check: progress 40–65% → 18% probability
4. Difficulty-weighted random:
   easy: 4%  medium: 12%  hard: 28%  epic: 48%
   All probabilities reduced by: (1 - (trustScore - 50) / 180)
   (High trust reduces frequency; low trust increases it)
5. None triggered → required: false (task completes immediately)
```

Returns `ProofDecision`:
```ts
{
  required: boolean,
  reason?: ProofReason,
  proofTypes: ProofType[],
  urgency: "low" | "medium" | "high",
  message: string,
}
```

## ProofEngine.proofTypesFor()

Maps task name keywords to appropriate proof types:
```
fast/water/omad    → [photo, reflection, timestamp]
gym/run/workout    → [photo, video, reflection]
read/book          → [photo, screenshot, reflection]
meditation/prayer  → [voice, reflection, timestamp]
code/build/ship    → [screenshot, document, photo]
cold/shower        → [video, photo, timestamp]
habit (isHabit)    → [photo, reflection, timestamp]
default            → [photo, reflection, document]
```

## ProofEngine.submitProof()

```
1. Assign id (proof_{counter++})
2. Set timestamp = new Date()
3. Set status = "pending"
4. Call _autoAnalyse(submission) → set agentAnalysis
5. Prepend to _proofStore
6. Call logProof() (console.info placeholder)
7. Return ProofSubmission
```

## Auto-Analysis Rules

```
mediaDataUrl AND reflectionText.length > 20 → "Approved automatically" (status → approved)
mediaDataUrl only                            → "Queued for admin review" (status → pending)
reflectionText.length > 30                   → "Credible text proof" (status → pending)
minimal submission                           → "Flagged" (status → flagged)
```

## Trust Score Impact

```ts
verifyProof(proof):
  hasMedia + hasReflection → approved, trustDelta: +3
  hasMedia OR hasReflection → approved, trustDelta: +1
  neither                  → rejected, trustDelta: -4
```

## ProofModal Component

### Props
```ts
{
  taskName: string,
  taskId: string,
  difficulty: "easy"|"medium"|"hard"|"epic",
  streak: number,
  reason: ProofReason,
  message: string,
  proofTypes: ProofType[],
  urgency: "low"|"medium"|"high",
  user: ProofUser,
  onClose: () => void,
  onSubmitted: () => void,
}
```

### State
```ts
selectedType: ProofType    // which tab is active
mediaFile: File | null     // uploaded file
mediaPreview: string | null // data URL for image preview
reflection: string         // textarea content
submitting: boolean        // 1.2s delay active
done: boolean              // success state
```

### Validation (canSubmit)
```
reflection-only types: reflection.length > 10
file types: mediaFile !== null OR reflection.length > 5
```

### Submit Flow
```
1. setSubmitting(true)
2. await 1.2 seconds (simulated delay)
3. ProofEngine.submitProof({...all fields})
4. setDone(true)
5. await 0.9 seconds (show success state)
6. onSubmitted() → closes modal + marks task done
```

### ESC Key
`useEffect` on mount adds `keydown` listener. ESC fires `onClose()`.

## Today Screen Integration

```
handleProofRequest(taskName, difficulty, onApproved, streak?)
  → ProofEngine.shouldRequestProof(task, MOCK_USER)
  → if required: setProofModal({...state, onApproved})
  → if not required: onApproved() immediately
  → ProofModal opens with onSubmitted = () => { onApproved(); setProofModal(null); }
```

`ActionsCard` and `HabitsCard` both pass `onProofRequest` prop from `TodayPage`.

## Admin Integration

AdminPage Proof Queue tab:
- Shows all proofs from all users
- Filter by status
- Approve/Flag/Reject actions → `ProofEngine.updateStatus(id, status)`
- User Integrity Panel — trust/behaviour scores per user
- Media Browser — grid of all `mediaDataUrl` submissions

## Demo Data

`seedDemoProofs()` creates 12 synthetic submissions across 4 users:
- **Francis Cobbinah** (u1) — trust 78, behaviour 82 — 4 proofs
- **Alex Turner** (u2) — trust 43, behaviour 35 — 4 proofs (multiple mismatches)
- **Sarah Mitchell** (u3) — trust 92, behaviour 88 — 3 proofs
- **Marcus Webb** (u4) — trust 62, behaviour 65 — 2 proofs

Called on mount of both ProofPage and AdminPage. Guard: `if (_proofStore.length > 0) return`.

## Notes for Engineers

- `_proofStore` is a module-level array. All components share the same in-memory store. Production: replace with API.
- `_idCounter` starts at 100. Demo proofs use IDs `proof_1` through `proof_12`. New submissions start at `proof_100`.
- `seedDemoProofs()` is idempotent due to the early return guard.
- The 4% random mismatch in `detectMismatch` is deliberately noisy to simulate real behaviour detection. In production, replace with real ML signals.
- `ProofModal` uses `useRef` for the file input (hidden, triggered by the upload zone click).
- The `FileReader` API for image preview only handles images. Other file types show a filename chip, not a preview.
- In production, upload media to S3/R2 and store the URL, not the base64 data URL.

## Notes for Designers

- The ProofModal is a high-stakes moment. The design should communicate: "This matters. We're protecting your record."
- The "Reason" chip (behaviour_mismatch, streak_integrity, etc.) should have distinct colours per reason to communicate urgency at a glance.
- The upload zone should accept drag-and-drop in addition to click-to-upload.
- The success state (checkmark animation) should feel earned — not a simple flash. Consider a brief delay before dismissing.
- The "Honesty Notice" at the bottom of the modal should be small but legible — it reinforces the trust contract without feeling threatening.
- ProofPage trust/behaviour score cards should use animated fill bars on first render to make the numbers feel alive.
