# Admin System Overview

The Admin System is the operator's interface for the Proof Engine. It provides a proof review queue, user trust management, media review, and system health monitoring.

## Core File

`src/frontend/src/pages/AdminPage.tsx`

## Access

In v0.1: accessible to all users via the sidebar footer "Admin / Proof Integrity" link.  
In production: restricted to platform admins via role-based access control.

## 4 Admin Tabs

### 1. Queue
The primary tab. Shows all pending proof submissions for manual review.

Per submission card:
- User name + avatar
- Task name + difficulty badge
- Proof type + reason
- Submission timestamp
- Expandable: media preview, reflection text, agent analysis
- 3 action buttons: Approve (green) | Reject (red) | Flag (amber)

Action flow:
```
doAction(submissionId, newStatus)
→ isProcessing.add(id)        // show spinner
→ await 420ms                 // simulated AI processing
→ ProofEngine.updateStatus()  // mutate store
→ ProofEngine.updateTrustScore() // +3 approve / -4 reject / 0 flag
→ refreshProofs()             // reload list
→ isProcessing.delete(id)     // hide spinner
```

### 2. Users
All users with their trust and behaviour scores.

| Column | Source |
|--------|--------|
| Name | `DEMO_USERS[i].name` |
| Trust Score | `ProofUser.trustScore` (animated bar) |
| Behaviour Score | `ProofUser.behaviourScore` (animated bar) |
| Proof Count | `ProofUser.proofCount` |
| Mismatch Count | `ProofUser.mismatchCount` |

### 3. Media
Grid of submitted media files. Placeholder in v0.1 — shows "Media review coming soon."

### 4. System
Platform health metrics + agent module status.

Metrics shown:
- Total submissions (all time)
- Average trust score across users
- Auto-approval rate
- Flagged submission rate

Agent module status table:
| Module | Status |
|--------|--------|
| BehaviourMonitor | Active (Simulated) |
| ProofAnalyser | Active (Simulated) |
| TrustEngine | Active |
| MismatchDetector | Active (Simulated) |

## KPI Cards (Header)

| KPI | Calculation |
|-----|-------------|
| Pending | `submissions.filter(s => s.status === "pending").length` |
| Approved Today | `submissions.filter(s => s.status === "approved" && today).length` |
| Flagged | `submissions.filter(s => s.status === "flagged").length` |
| Avg Trust | `DEMO_USERS.reduce((sum, u) => sum + u.trustScore, 0) / DEMO_USERS.length` |

## Demo Users

| ID | Name | Trust | Behaviour | Proofs | Mismatches |
|----|------|-------|-----------|--------|------------|
| u1 | Francis C. | 78 | 82 | 23 | 0 |
| u2 | Sarah M. | 91 | 88 | 47 | 1 |
| u3 | James K. | 54 | 61 | 12 | 3 |
| u4 | Amara D. | 67 | 74 | 31 | 2 |

## Production Roadmap

- Role-based access control (admin vs. user)
- Real user data from database
- Media stored in and served from object storage
- Bulk approve/reject actions
- Export proof records as CSV
- Automated flagging threshold configuration
- Audit log for all admin actions
