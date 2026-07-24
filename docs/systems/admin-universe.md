# Admin Universe

## Purpose

The Admin Universe is the operator view of P1's integrity system. It gives platform administrators full visibility into proof submissions, user trust scores, behaviour patterns, and system health. It is the backstage of the Proof Engine.

## Routes

- `/admin` → `AdminPage.tsx` — Admin proof integrity dashboard
- `/proof` → `ProofPage.tsx` — User-facing personal proof history

## Access

Currently accessible by anyone (dev mode). In production: role-based access control. Admin role required for `/admin`. Regular users see only their own data at `/proof`.

## AdminPage — Four Tabs

### Tab 1: Proof Queue
The primary admin workflow. Shows all proof submissions across all users.

**Filters**: all | pending | approved | flagged | rejected

**Per-proof card**:
- Task name + status badge
- User name, proof type, timestamp, reason (formatted)
- Expandable detail: media preview, reflection text, agent analysis, meta grid
- Action buttons (pending only): Approve ✓ | Flag 🚩 | Reject ✗

**Action flow**:
```
Click Approve/Flag/Reject
→ setActing(proofId)
→ 420ms simulated delay
→ ProofEngine.updateStatus(id, status)
→ refreshProofs() (re-reads _proofStore)
→ setActing(null)
```

### Tab 2: Users
User integrity panel. All users shown in a table.

**Columns**: User name/ID | Trust Score (bar) | Behaviour Score (bar) | Proofs submitted | Mismatches | Risk Level

**Risk Level logic**: Trust < 50 → "High", 50–70 → "Medium", ≥70 → "Low"

**Flagged user callouts**: Users with trustScore < 55 get a red alert below the table with mismatch count and suspension recommendation.

### Tab 3: Media
Grid of all proof submissions that include `mediaDataUrl`.

Shows: image preview, task name, user name, status badge.

In v0.1: only shows media that was uploaded during the current session (no persistence).

### Tab 4: System
Health metrics and agent module status.

**Metrics**:
- Proof Requests / Day (avg)
- Auto-Approval Rate (%)
- Manual Review Rate (%)
- Rejection Rate (%)
- Flagged Users count
- Mismatch Detections count

**Agent module status table**:
| Module | Status |
|--------|--------|
| BehaviourMonitor | Running |
| ProofEngine | Running |
| Auto-Analysis Module | Running |
| Backend Sync | Offline (in-memory mode) |
| Media Storage | In-Memory |

## ProofPage — User View

The user's personal proof history at `/proof`.

**Components**:
1. **Trust Score card** — Large number, colour-coded bar (green ≥75, amber 55–74, red <55)
2. **Behaviour Score card** — Large number, indigo bar
3. **Stats row** — Total, Approved, Pending, Flagged counts
4. **Agent Integrity Summary** — Indigo insight banner
5. **Filter tabs** — all | pending | approved | flagged | rejected
6. **Proof list** — Expandable cards

**Expandable proof card**:
- Type icon (Camera, Video, etc.)
- Task name + timestamp
- Status badge
- Expanded: media preview, reflection, agent analysis, meta grid (reason/difficulty/trust at submission)

## KPI Cards (AdminPage Hero)

| KPI | Data Source |
|-----|------------|
| Total Proofs | `_proofStore.length` |
| Pending | `filter(status==="pending").length` |
| Approved | `filter(status==="approved").length` |
| Flagged/Rejected | `filter(s==="flagged" OR s==="rejected").length` |

## Demo Users

| User | ID | Trust | Behaviour | Risk |
|------|----|-------|-----------|------|
| Francis Cobbinah | u1 | 78 | 82 | Low |
| Alex Turner | u2 | 43 | 35 | High |
| Sarah Mitchell | u3 | 92 | 88 | Low |
| Marcus Webb | u4 | 62 | 65 | Medium |

Alex Turner is the "bad actor" demo: 4 mismatches, trust 43, multiple flagged/rejected proofs.

## Sidebar Navigation

Admin and Proof links are added to the CockpitShell sidebar footer:
- **Admin** (Shield icon, indigo) → `/admin`
- **My Proofs** (CheckCircle2 icon) → `/proof`

Both appear above the Settings button.

## Notes for Engineers

- `ProofEngine.updateStatus(id, status)` mutates `_proofStore` in place. In production, PATCH to `/api/proofs/{id}`.
- The 420ms action delay is cosmetic. In production, replace with actual API latency handling.
- `refreshProofs()` in AdminPage re-reads from `_proofStore` via `ProofEngine.getProofs()`. In production, this should be a refetch, not a local array read.
- Demo users (DEMO_USERS in AdminPage.tsx) are hardcoded. In production, fetch from `/api/users?role=member`.
- Media in the Media tab is only images submitted during the current session. In production, query media by date range from S3/R2.
- Role-based routing guard: add a `<ProtectedRoute requireRole="admin">` wrapper around `/admin` in production.

## Notes for Designers

- The AdminPage should feel clinical and powerful — it is not a consumer screen. High data density is appropriate.
- The Proof Queue is the primary workflow. It should be the default tab.
- Action buttons (Approve/Flag/Reject) should have clear visual hierarchy: Approve = green, Flag = orange, Reject = red.
- The "acting" loading state (spinner on the action button) should replace the button content, not add to it.
- The User Integrity Panel table should highlight the "Risk Level" column — it is the most actionable column.
- Trust score bars should animate on page load. This gives the admin a quick visual "health check" before reading the numbers.
- Consider a dark-red header/accent for the Admin page to visually distinguish it from user-facing screens.
