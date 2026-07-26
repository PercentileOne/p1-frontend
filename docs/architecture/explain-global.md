# Explain.global — Platform Architecture

> Living document. Last updated: 2026-07-26.

## Overview

Explain.global is the Supremo platform — the public hub of the Explain ecosystem. It is the home of interviewees: a single destination for job discovery, interview preparation, social learning, career development, and community.

Unlike the Recruiter, Client, and Candidate portals (which serve specific workflow actors), Explain.global is the brand-facing, consumer-facing surface. It is what candidates share, what employers discover, and what the public indexes.

---

## Positioning

**"Home of Interviewees"**

- Social + Jobs + Learning + Interview Packs in one place
- Open to anyone — no recruiter needed to begin
- Backed by the full Explain ecosystem behind the scenes

---

## Navigation Structure

```
Home | Jobs | Learn | Community | My Interviews
```

| Tab | Description | Auth required |
|-----|-------------|---------------|
| Home | Landing, social feed preview, featured jobs | No |
| Jobs | Job board with "Get Interview Pack" | No |
| Learn | LEARN modules, roadmaps, skill gaps | Yes (for progress tracking) |
| Community | Discussion, stories, advice | Yes (to post) |
| My Interviews | Interview history, scores, playback | Yes |

---

## Page Definitions

### Home (Landing Page)

**Hero**: "Home of Interviewees" — bold statement of purpose.

**Below fold:**
- Social feed preview (latest interview stories, wins, lessons)
- Featured jobs (3–6 roles with "Prepare" buttons)
- LEARN spotlight (one featured module)
- Stats: interviews run, jobs filled, modules completed (live counters eventually)

### Jobs Tab

**Job listings** — static/mock initially, live recruiter data later.

Each listing card shows:
- Job title and company
- Location, salary, job type
- "Prepare for this interview" button → routes to Interview Pack flow
- "Save" button (authenticated)

**Magic Button** — prominent CTA: "Upload a job spec → Get your Interview Pack in 60 seconds"

Integration points:
- "Get Interview Pack" → `recruiter.explain.global/demo/vallum-job-paid` (interim)
- Future: deep link with `?jobId=` into Candidate Portal or Pack Builder

### Learn Tab (Phase 2)

- LEARN module cards by category
- Skill gap assessment entry point
- Roadmap view (personalised for authenticated users)
- Industry and role filters

### Community Tab (Phase 2)

- Post and read interview stories
- Upvote advice and lessons learned
- Topic tags: #firstjob #techjob #rejection #offer #prep

### My Interviews Tab (Phase 2)

- Session history from Explain API
- Q-by-Q scores and feedback
- LEARN recommendations
- Playback (where consented)
- Re-interview prep button

---

## Integration Points

| Feature | Integration |
|---------|-------------|
| Job listings | Recruiter Portal job store / Explain API |
| Interview Pack CTA | Candidate Portal or Recruiter Portal demo flows |
| LEARN modules | LEARN Engine via Explain API `/learn/recommend` |
| Interview history | Explain API `/session/:id` |
| Social feed | User-generated content (Phase 2, moderated) |
| Profile | Cosmos DB `CVProfiles` + `LearnPlans` |

---

## Technical Specification

### Stack
- React 19 + Vite 8 + Tailwind v4 (matches rest of ecosystem)
- React Router v7
- Framer Motion for animations
- TypeScript throughout

### Location
- Source: `src/explain-global/`
- Served at: `explain.global`
- Azure Static Web Apps deployment (future)
- Dev port: `5175`

### Key Files
```
src/explain-global/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Home.tsx          ← Landing page
│   │   ├── Jobs.tsx          ← Job board
│   │   ├── Learn.tsx         ← Placeholder
│   │   ├── Community.tsx     ← Placeholder
│   │   └── MyInterviews.tsx  ← Placeholder
│   ├── components/
│   │   ├── Nav.tsx           ← Global navigation
│   │   ├── JobCard.tsx       ← Job listing card
│   │   └── SocialPreview.tsx ← Feed preview widget
│   └── data/
│       └── mockJobs.ts       ← Mock job listings
├── public/
│   └── assets/
│       └── explain-logo.svg
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Future Phases

| Phase | Features |
|-------|---------|
| 1 (now) | Landing page, Jobs tab (mock), placeholders |
| 2 | Auth, social feed, LEARN modules |
| 3 | Interview Hub (live API data) |
| 4 | Marketplace, full profile, community posting |
| 5 | Live job board (recruiter-sourced), employer profiles |

---

## See Also

- [Ecosystem Architecture 2026](ecosystem-2026.md)
- [Recruiter Portal](../../src/recruiter-portal/)
- [Explain API](../../src/recruiter-portal/api/)
