# P1 Architecture Overview

## What is P1?

Percentile.One (P1) is a Life Operating System — a software platform that connects a person's deepest Vision to their daily actions through a structured execution engine. It is not a to-do app. It is not a habit tracker. It is a full-stack identity transformation platform.

## Core Philosophy

> You do not rise to the level of your goals. You fall to the level of your systems.

P1 is the system. Every screen, every agent, every proof request exists to close the gap between who you are and who you intend to become.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 8 (rolldown bundler) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Animation | Framer Motion v12 |
| Icons | lucide-react |
| Routing | React Router v7 |
| State | React `useState` / `useEffect` (no external store yet) |
| Data | In-memory (production: REST API + PostgreSQL) |
| Auth | Placeholder (production: JWT + refresh tokens) |

## Repository Structure

```
P1/
├── src/
│   └── frontend/
│       └── src/
│           ├── App.tsx                    # Route definitions
│           ├── pages/                     # Full-page route components
│           │   ├── CockpitShell.tsx       # Navigation shell + sidebar
│           │   ├── TodayPage.tsx          # Daily execution hub
│           │   ├── GoalsPage.tsx          # Goals dashboard
│           │   ├── GoalCreatePage.tsx     # 7-step goal creation wizard
│           │   ├── VisionPage.tsx         # Vision + legacy system
│           │   ├── CycleDashboard.tsx     # Active 12-week cycle
│           │   ├── CycleListPage.tsx      # Cycle archive
│           │   ├── WeeklyPlanningPage.tsx # Weekly planning wizard
│           │   ├── MidReviewPage.tsx      # Week 6 checkpoint
│           │   ├── EndReviewPage.tsx      # Week 12 wrap-up
│           │   ├── ProofPage.tsx          # User proof history
│           │   ├── AdminPage.tsx          # Admin proof dashboard
│           │   ├── ChatPage.tsx           # AI chat interface
│           │   ├── FeedPage.tsx           # Activity feed
│           │   ├── MessagesPage.tsx       # Inbox
│           │   └── LoginPage.tsx          # Authentication
│           ├── components/
│           │   └── ProofModal.tsx         # Proof submission overlay
│           ├── lib/
│           │   ├── proofEngine.ts         # Proof integrity engine
│           │   └── cycleEngine.ts         # 12-week cycle engine
│           ├── features/
│           │   └── auth/                  # Registration + login forms
│           └── Layouts/
│               └── AuthLayout.tsx         # Onboarding layout wrapper
├── docs/                                  # This documentation system
└── SharedKernel.Domain/                   # .NET domain layer (future backend)
```

## Architectural Layers

### Layer 1 — Identity (Vision)
The foundation. Who do you want to be in each life domain? What is your legacy? This layer is defined in `/vision` and feeds into every other layer.

### Layer 2 — Goals Engine
Structured goals with difficulty, impact, milestones, and proof requirements. Goals live in `/goals` and `/goals/create`. They are assigned to cycles and aligned to vision.

### Layer 3 — Cycle Engine (12 Weeks)
The performance engine. Goals are assigned to 12-week cycles. Each cycle has weekly plans, milestones, momentum scores, and agent oversight. Lives in `/cycle`, `/cycles`, and sub-routes.

### Layer 4 — Daily Execution (Today)
The daily interface. All Vision, Goal, and Cycle intelligence surfaces on the Today Screen (`/today`) as actionable cards. This is the most-used screen.

### Layer 5 — Proof Engine
The integrity layer. Ensures that claimed completions are real. Uses a probabilistic request system modulated by trust score, behaviour score, difficulty, streaks, and anomaly detection.

### Layer 6 — Agent Layer
AI intelligence woven throughout every layer. Agents generate insights, detect risk, suggest adjustments, analyse proofs, and score behaviour. Currently: rule-based simulation. Production: Claude API.

## Data Flow (Summary)

```
Vision ──► Goals ──► Cycle ──► Weekly Plan ──► Today Screen
                 ↓                                    ↓
            Milestones                          ProofEngine
                 ↓                                    ↓
            Proof Required ◄──────────────── Task Completed
                 ↓
            Trust Score Updated
                 ↓
            Agent Recalibrates
```

## Design System

- **Background**: `#0f1117` (deep near-black)
- **Card surface**: `#13151c`
- **Borders**: `border-white/[0.06]`
- **Primary accent**: Indigo (`#6366f1` / `#818cf8`)
- **Danger**: Red-400/500
- **Warning**: Amber-400
- **Success**: Green-400/500
- **Agent brand**: Indigo + Sparkles icon
- **Typography**: System sans-serif, tight tracking, small caps labels

## Scrollbar Architecture

Single scrollbar pattern: `overflow-hidden` on sidebars and fixed elements. The main content area uses `flex-1 overflow-y-auto` to create a single scrollable region per screen.

## Current Limitations (v0.1)

- All data is in-memory — refreshing the browser resets state
- No backend API connected
- Authentication is placeholder (no real session)
- Agent intelligence is rule-based simulation (not live Claude API)
- Media uploads use FileReader API (no cloud storage)
- No real-time sync between tabs

## Production Roadmap

1. Connect .NET backend (SharedKernel.Domain already scaffolded)
2. PostgreSQL for persistent storage
3. Claude API for real agent intelligence
4. S3/Cloudflare R2 for media storage
5. JWT authentication with refresh tokens
6. WebSocket for real-time Today Screen updates
