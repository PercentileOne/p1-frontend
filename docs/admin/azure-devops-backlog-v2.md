# Azure DevOps Backlog — TalkToLearn & Percentile.One
*Generated: 2026-07-08 · Ready to copy into Azure DevOps*

---

## How to use this file

Each **Epic** maps to an Azure DevOps Epic.
Each **Story** maps to a User Story under that Epic.
Each **AC** item is an Acceptance Criterion on that story.
Status labels: ✅ Done · 🔄 In Progress · ⬜ Not Started

---

## EPIC 1 — Authentication & Identity
**Status:** ✅ Done (backend) · ⬜ Profile completion pending
**Description:** Secure user registration, login, session management and profile setup across all TalkToLearn surfaces.

---

### Story 1.1 — User Registration
**As a** new user, **I want to** create an account with my email and password **so that** I can access TalkToLearn.
**Status:** ✅ Done

**AC:**
- [ ] POST `/auth/register` accepts email + password
- [ ] Password minimum 8 characters, validated server-side
- [ ] Duplicate email returns 409 Conflict
- [ ] Invalid email format returns 400
- [ ] Successful registration returns JWT token + user object
- [ ] User document stored in Cosmos DB with correct partition key (`pk: "user"`)
- [ ] Password hashed with BCrypt before storage
- [ ] Integration test: register valid → 200, duplicate → 409, invalid email → 400, short password → 400

---

### Story 1.2 — User Login
**As a** returning user, **I want to** log in with my email and password **so that** I can continue learning.
**Status:** ✅ Done

**AC:**
- [ ] POST `/auth/login` accepts email + password
- [ ] Wrong password returns 401
- [ ] Unknown email returns 401
- [ ] Successful login returns JWT token + user object
- [ ] Integration test: correct credentials → 200, wrong password → 401, unknown email → 401

---

### Story 1.3 — Session Verification
**As an** authenticated user, **I want** my session to be validated automatically **so that** I stay logged in across app restarts.
**Status:** ✅ Done

**AC:**
- [ ] GET `/auth/me` reads Bearer token from Authorization header or `ttl_session` cookie
- [ ] Valid token returns userId, email, name, role
- [ ] Missing/invalid token returns 401
- [ ] JWT claim names preserved exactly (no URI remapping)
- [ ] Integration test: valid token → 200 with email, no token → 401

---

### Story 1.4 — Magic Link Login
**As a** user, **I want to** log in via a link sent to my email **so that** I don't have to remember a password.
**Status:** ⬜ Not Started

**AC:**
- [ ] POST `/auth/magic-link` accepts email, sends link via email provider
- [ ] GET `/auth/verify?token=xxx` validates token, returns session JWT
- [ ] Magic link expires after 15 minutes
- [ ] Used links cannot be reused (one-time use)
- [ ] Unknown email silently succeeds (no user enumeration)

---

### Story 1.5 — User Profile Setup
**As a** new user, **I want to** set my name, profession, and learning goals during onboarding **so that** lessons and FlashTalk are tailored to me.
**Status:** ⬜ Not Started

**AC:**
- [ ] PATCH `/api/users/me` accepts name, username, profession, bio, goals
- [ ] Profile saved to Cosmos DB user document
- [ ] Mobile onboarding screen collects name + profession minimum
- [ ] Profile accessible from HomeScreen
- [ ] Profession used as default in FlashTalk Profession Mode

---

### Story 1.6 — Logout
**As a** user, **I want to** log out **so that** my session is cleared on this device.
**Status:** ⬜ Not Started

**AC:**
- [ ] POST `/auth/logout` clears `ttl_session` cookie
- [ ] Mobile app clears JWT from secure storage on logout
- [ ] User redirected to login screen

---

## EPIC 2 — FlashTalk — Core Experience
**Status:** 🔄 Phase 1 live in mobile app · Game modes pending
**Description:** The speed-based vocabulary game where users explain terms out loud under time pressure, scored by AI.

---

### Story 2.1 — FlashTalk Setup Screen
**As a** user, **I want to** choose my subject and game mode before starting a FlashTalk session **so that** the terms are relevant to me.
**Status:** ✅ Done (basic version)

**AC:**
- [ ] Subject/micro-subject input field
- [ ] Game mode selector: Profession / General / Blitz / Challenge
- [ ] Profession auto-populated from user profile
- [ ] Start button navigates to FlashTalk screen with config passed through
- [ ] Back button returns to HomeScreen

---

### Story 2.2 — FlashTalk Game Screen
**As a** user, **I want to** see a term and record my spoken definition before the timer runs out **so that** I can practise explaining concepts under pressure.
**Status:** ✅ Done (core)

**AC:**
- [ ] Term card displayed prominently
- [ ] Countdown timer visible (60s default)
- [ ] Timer bar turns red in final 10 seconds
- [ ] Wrong/correct score counters in top corners
- [ ] Hold-to-record mic button
- [ ] Skip option available
- [ ] Back button returns to setup
- [ ] All text legible (min 14px, opacity ≥ 0.60)

---

### Story 2.3 — AI Scoring of FlashTalk Answers
**As a** user, **I want** my spoken answer scored by AI **so that** I know how well I explained the term.
**Status:** ⬜ Not Started (currently mock scores)

**AC:**
- [ ] Audio recording sent to backend POST `/flashtalk/score`
- [ ] Backend calls AI (Anthropic Claude) with term + transcript
- [ ] Returns score 0–10 with dimension breakdown (accuracy, speed, depth)
- [ ] Score displayed on card before next term loads
- [ ] Scoring happens within 2 seconds of answer submission
- [ ] Anthropic API key is server-side only — never exposed to client

---

### Story 2.4 — FlashTalk Game Over Screen
**As a** user, **I want to** see my final results after a FlashTalk session **so that** I know how I performed.
**Status:** ✅ Done (basic)

**AC:**
- [ ] Total score displayed
- [ ] Correct / incorrect counts shown
- [ ] Overall verdict displayed
- [ ] "Play Again" and "Back to Home" options
- [ ] Results shareable (Phase 3)

---

### Story 2.5 — Blitz Mode (60 Seconds)
**As a** user, **I want to** do a 60-second blitz round where I answer as many terms as possible **so that** I can compete on volume and speed.
**Status:** ⬜ Not Started

**AC:**
- [ ] 60-second countdown from start
- [ ] New term loads immediately after each answer (no waiting)
- [ ] Skip counts as wrong
- [ ] Final score = total terms attempted vs correct
- [ ] Blitz leaderboard entry created on completion

---

### Story 2.6 — Challenge Mode (Send a Term)
**As a** user, **I want to** challenge a friend to define a specific term **so that** we can compete with each other.
**Status:** ⬜ Not Started

**AC:**
- [ ] User selects a term and sends a challenge link/notification
- [ ] Recipient opens challenge, sees the same term, records answer
- [ ] Both scores compared and winner shown
- [ ] Share result to social / WhatsApp

---

## EPIC 3 — Lesson Generation & Learn Mode
**Status:** ⬜ In progress (AI call currently on mobile client — must move to backend)
**Description:** AI-generated lessons, flashcards, and practice questions for any subject or micro-subject.

---

### Story 3.1 — Move Lesson Generation to Backend
**As a** developer, **I want** the Anthropic API call to happen server-side **so that** the API key is never exposed on the client.
**Status:** ⬜ Not Started — HIGH PRIORITY SECURITY

**AC:**
- [ ] POST `/lessons/generate` accepts `{ subject: string, userId: string }`
- [ ] Backend calls Anthropic Claude with subject → returns structured lesson
- [ ] Lesson stored in Cosmos DB linked to userId
- [ ] Mobile app calls backend endpoint — no direct Anthropic call from app
- [ ] Anthropic API key in Azure Key Vault / environment variable only
- [ ] Response includes: title, summary, flashcards[], questions[], keyTerms[]

---

### Story 3.2 — Micro-Subject Suggestions
**As a** user, **I want to** enter a broad subject and see 10 specific micro-subjects **so that** I can choose exactly what to study.
**Status:** ⬜ Not Started

**AC:**
- [ ] POST `/subjects/suggest` accepts broad subject string
- [ ] Returns array of 10 micro-subjects (e.g. "AWS" → "IAM Policies", "S3 Lifecycle Rules"…)
- [ ] Mobile shows micro-subject list for user to pick from
- [ ] Selected micro-subject passed to lesson generation

---

### Story 3.3 — Save and View Lesson History
**As a** user, **I want to** see all my past lessons **so that** I can revisit them and continue studying.
**Status:** ⬜ Not Started

**AC:**
- [ ] GET `/lessons?userId=xxx` returns all lessons for user, newest first
- [ ] Each lesson shows subject, date created, score (if taken)
- [ ] Tap lesson → opens lesson detail screen
- [ ] Lessons stored in Cosmos DB

---

## EPIC 4 — Mock Interview Suite
**Status:** ⬜ Not Started (Phase 2)
**Description:** Full AI-powered interview simulation — HR, technical, and scenario questions — with detailed scoring and feedback.

---

### Story 4.1 — Interview Setup Screen
**As a** user, **I want to** configure my mock interview before it starts **so that** the questions match my target role and level.
**Status:** ⬜ Not Started

**AC:**
- [ ] Role input field (e.g. "Senior .NET Architect")
- [ ] Difficulty selector: Graduate / Mid / Senior
- [ ] Question count: 10 / 20 / 30
- [ ] Question type toggles: Technical / Scenario / HR & Behavioural
- [ ] Start Interview button
- [ ] Config persisted between sessions

---

### Story 4.2 — AI Interview Panel Screen
**As a** user, **I want to** face an AI interview panel that asks me questions and listens to my answers **so that** I experience real interview pressure.
**Status:** ⬜ Not Started

**AC:**
- [ ] Panel shows 3 distinct AI personas (names + roles)
- [ ] Question displayed and read aloud by AI voice
- [ ] User records spoken answer
- [ ] AI responds with brief follow-up or acknowledgement
- [ ] Progress indicator (Q3 of 10)
- [ ] "Pass" option available per question
- [ ] Timer per question (configurable, default 2 minutes)

---

### Story 4.3 — Interview Scoring & Feedback
**As a** user, **I want to** receive a detailed score and feedback after my interview **so that** I know exactly what to improve.
**Status:** ⬜ Not Started

**AC:**
- [ ] Overall score (0–100) with pass/fail verdict
- [ ] Per-question scores: relevance, depth, structure, confidence
- [ ] Written feedback per answer ("Your answer on X was strong but missed Y")
- [ ] Strongest and weakest question highlighted
- [ ] Option to retry the full interview or individual questions
- [ ] Interview result saved to history

---

### Story 4.4 — Interview History
**As a** user, **I want to** view my past interview attempts **so that** I can track my improvement over time.
**Status:** ⬜ Not Started

**AC:**
- [ ] List of past interviews with role, date, score
- [ ] Tap to view full transcript + scores
- [ ] Score trend shown if 2+ attempts for same role

---

## EPIC 5 — Leaderboard & Competitions
**Status:** ⬜ Not Started (Phase 3)
**Description:** Weekly and monthly competitions where learners compete by subject, with real prizes and shareable scores.

---

### Story 5.1 — Global Leaderboard
**As a** user, **I want to** see how I rank against other learners **so that** I'm motivated to keep practising.
**Status:** ⬜ Not Started

**AC:**
- [ ] GET `/leaderboard?period=weekly&subject=aws` returns ranked list
- [ ] Shows rank, name, score, avatar
- [ ] User's own position highlighted (even if outside top 10)
- [ ] Filterable by: Weekly / Monthly / All Time
- [ ] Filterable by subject

---

### Story 5.2 — Subject Competitions
**As a** user, **I want to** enter a timed competition on a specific subject **so that** I can win prizes for top performance.
**Status:** ⬜ Not Started

**AC:**
- [ ] Competition has defined start/end date, subject, prize
- [ ] User joins competition (free or paid entry)
- [ ] Top 3 positions shown with prize details
- [ ] Winner announced at competition close
- [ ] Result shareable to LinkedIn / social

---

### Story 5.3 — Shareable Score Card
**As a** user, **I want to** share my FlashTalk or interview score as a visual card **so that** I can show employers and friends my progress.
**Status:** ⬜ Not Started

**AC:**
- [ ] Score card generated as image (PNG)
- [ ] Shows: name, subject, score, date, TalkToLearn branding
- [ ] One-tap share to WhatsApp, LinkedIn, Instagram
- [ ] Unique URL per score card for link sharing

---

## EPIC 6 — TalkToLearn Product Page (talktolearn.app)
**Status:** ✅ Core done · Minor polish pending
**Description:** The public-facing product and marketing page at talktolearn.app.

---

### Story 6.1 — Core Product Page
**As a** visitor, **I want to** understand what TalkToLearn does in under 10 seconds **so that** I decide whether to sign up.
**Status:** ✅ Done

**AC:**
- [ ] Hero with headline, tagline, 3-step flow
- [ ] Comprehension guarantee line visible
- [ ] Phone + Watch mockup in hero
- [ ] "Start for Free" and "Watch Demo" CTAs
- [ ] Deploys automatically to talktolearn.app on push to main

---

### Story 6.2 — Roadmap Section
**As a** visitor, **I want to** see what features are coming **so that** I understand the product vision and commit to early access.
**Status:** ✅ Done

**AC:**
- [ ] FlashTalk (Phase 1 — Live) card
- [ ] Mock Interview Suite (Phase 2 — In Development) card
- [ ] Leaderboard & Competitions (Phase 3 — Coming Soon) card
- [ ] "Get Early Access" CTA
- [ ] Phase badges with live indicator on Phase 1

---

### Story 6.3 — iPad Walkthrough — Text Overlap Fix
**As a** visitor, **I want** the iPad mockup on the product page to display cleanly **so that** I can read the content it shows.
**Status:** ⬜ Not Started (non-urgent)

**AC:**
- [ ] No text overlapping between phase labels and content
- [ ] Content not squashed near top of tablet frame
- [ ] Readable at both desktop and mobile viewport widths

---

### Story 6.4 — B2B Landing Section
**As a** Job Centre / University / Recruitment firm, **I want to** understand how TalkToLearn applies to my organisation **so that** I consider a partnership or bulk licence.
**Status:** ✅ Done (cards added to Who It's For)

**AC:**
- [ ] Job Centres card
- [ ] Universities & Colleges card
- [ ] Recruitment Firms card
- [ ] B2B contact route available (Contact modal)

---

## EPIC 7 — Infrastructure & DevOps
**Status:** 🔄 Partial
**Description:** CI/CD pipelines, Azure infrastructure, security, monitoring, and environment management.

---

### Story 7.1 — Backend CI/CD Pipeline
**As a** developer, **I want** every push to main to automatically build, test, and deploy the .NET API **so that** deployments are safe and consistent.
**Status:** ⬜ Not Started

**AC:**
- [ ] GitHub Actions workflow: build → test → deploy to Azure App Service
- [ ] Integration tests run against real Cosmos DB before deploy
- [ ] Failed tests block deployment
- [ ] Deployment environment: Development / Staging / Production
- [ ] Secrets managed via Azure Key Vault

---

### Story 7.2 — Cosmos DB Security
**As a** team, **I want** the Cosmos DB primary key rotated **so that** the key that appeared in session logs is no longer valid.
**Status:** ⬜ Not Started — SECURITY

**AC:**
- [ ] Primary key regenerated in Azure Portal
- [ ] New key updated in all app configuration (API, tests)
- [ ] Old key confirmed invalid
- [ ] Keys stored in environment variables / Key Vault only — never in code

---

### Story 7.3 — Environment Configuration
**As a** developer, **I want** clean separation of Dev / Staging / Prod environments **so that** test data never touches production.
**Status:** ⬜ Not Started

**AC:**
- [ ] `appsettings.Development.json` — local Cosmos DB + dev secrets
- [ ] `appsettings.Staging.json` — Azure Staging App Service
- [ ] `appsettings.Production.json` — Production, Key Vault bound
- [ ] Separate Cosmos DB containers per environment

---

### Story 7.4 — Azure App Service Deployment
**As a** team, **I want** the TalkToLearn API hosted on Azure App Service **so that** the mobile app can call it from anywhere.
**Status:** ⬜ Not Started

**AC:**
- [ ] API deployed to Azure App Service (Linux, .NET 10)
- [ ] Custom domain or Azure-provided URL
- [ ] HTTPS enforced
- [ ] Health check endpoint `/health` returns 200
- [ ] CORS configured for mobile app and talktolearn.app

---

### Story 7.5 — Monitoring & Alerting
**As a** developer, **I want** structured logs and alerts set up **so that** I know immediately if the API goes down or errors spike.
**Status:** ⬜ Not Started

**AC:**
- [ ] Azure Application Insights connected to API
- [ ] Structured logs from all MediatR handlers flowing to App Insights
- [ ] Alert rule: error rate > 5% in 5 minutes → email notification
- [ ] Dashboard showing: request rate, error rate, response times, Cosmos DB reads/writes

---

## EPIC 8 — TalkToLearn Watch App
**Status:** ⬜ Not Started (queued)
**Description:** Apple Watch companion app for TalkToLearn — quick FlashTalk rounds from the wrist.

---

### Story 8.1 — Watch FlashTalk Quick Round
**As a** Watch user, **I want to** do a 3-term FlashTalk round from my watch **so that** I can learn during downtime without my phone.
**Status:** ⬜ Not Started

**AC:**
- [ ] Complication launches FlashTalk directly
- [ ] Term displayed on watch face
- [ ] Tap to record answer via watch microphone
- [ ] Score shown after each term
- [ ] Result syncs to iPhone app

---

## Summary

| Epic | Stories | Done | Remaining |
|---|---|---|---|
| 1 — Auth & Identity | 6 | 3 | 3 |
| 2 — FlashTalk | 6 | 3 | 3 |
| 3 — Lesson Generation | 3 | 0 | 3 |
| 4 — Mock Interview Suite | 4 | 0 | 4 |
| 5 — Leaderboard | 3 | 0 | 3 |
| 6 — Product Page | 4 | 3 | 1 |
| 7 — Infrastructure | 5 | 0 | 5 |
| 8 — Watch App | 1 | 0 | 1 |
| **Total** | **32** | **9** | **23** |

---

## Suggested Order for Next Sprint

1. **Story 3.1** — Move lesson generation to backend (security risk while on client)
2. **Story 7.2** — Rotate Cosmos DB key (security)
3. **Story 1.5** — User profile setup / PATCH /api/users/me
4. **Story 7.1** — Backend CI/CD pipeline
5. **Story 2.3** — Real AI scoring for FlashTalk answers
6. **Story 7.4** — Deploy API to Azure App Service
