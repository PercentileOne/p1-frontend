# P1 — Percentile.One / Explain / InterviewMe ecosystem

This file is read automatically by every Claude Code session working in this repo. These rules override default behavior. If you are a different AI tool or a human contributor, read this before touching anything — it exists because rules that only lived in one person's head or one session's memory got silently dropped and cost real money (see **Security** below).

## 0. The one rule that matters most

**No third-party API key (OpenAI, ElevenLabs, Anthropic, etc.) is ever shipped to the browser — not as a primary path, not as a "resilience fallback."** Every call to an external AI/API provider goes through the `.NET` backend (`src/backend/Explain.Api`), which holds the key server-side and proxies the request. A key baked into a Vite build is visible to anyone via view-source or devtools, full stop — this has already happened once (see incident below) and cost real money.

**Incident, 2026-08-17:** `src/frontend`'s `LearnPanel.tsx` and `ProfileVideoPage.tsx` called OpenAI directly from the browser using `VITE_OPENAI_API_KEY`, exposed in the public JS bundle. Separately, most of the app's `/api/ai-proxy` calls used a **relative path** (`fetch('/api/ai-proxy')`), which silently 404'd because this specific Static Web App has its own integrated Functions runtime with no `ai-proxy` function of its own — so the client-key fallback was doing more work than anyone realized. Fixed by routing every AI call through an absolute URL (`${VITE_EXPLAIN_API_URL}/api/ai-proxy`) and deleting the client-key path entirely. **If any AI feature in this app misbehaves or silently degrades, check for a relative `/api/*` path first** — that's the recurring failure mode.

**A second, separate incident found the same day:** a prior agent session had created its own generically-named OpenAI API key and used it directly for its own agentic work (calling models like `gpt-5.6-sol`, `gpt-5.3-codex` that this codebase never references — every AI call here hardcodes `gpt-4o-mini`), racking up $84.61 in charges on Francis's personal account over about three weeks. **No Claude Code session should ever create or use its own third-party API key (OpenAI, Anthropic, etc.) for its own work billed to the user.** A project's API key exists only for that project's own server-side backend code to call, never for an agent to use directly for anything else.

## 1. Portal map — where to actually work

| Portal | Codebase | Live domain | Notes |
|---|---|---|---|
| Candidate portal | `src/frontend/` | `candidate.explain.global`, `candidate.interviewme.global` | PRIMARY — Learn Engine, Careers, Interview Room, My Interviews, Profile all live here |
| Recruiter portal | `src/recruiter-portal/` | `recruiter.explain.global` | Job posts, screen candidates, league table |
| InterviewMe hub / marketing | `src/viewme/public/` | `product.interviewme.global` | **Not** `src/interviewme/` — that folder is a disconnected sibling with its own unused dev server. Check the `paths:` trigger in `.github/workflows/deploy-*.yml` if unsure which folder actually backs a domain. |
| Explain hub | `src/explain-global/` | `explain.global` | Public hub — login, register, jobs, learn, community |
| .NET backend | `src/backend/Explain.Api/` | `api.explain.global` / `localhost:5000` | Shared backend for every portal above |

Before creating any new file, confirm which portal it belongs in. New candidate-facing features go in `src/frontend/`, not `src/recruiter-portal/`, even if a staging version was prototyped there.

## 2. Mandatory tech stack — no substitutions

- **Backend:** .NET 10 Minimal APIs only. ASP.NET Core, EF Core, Azure Functions as C# isolated worker. **Never** Node.js/Express for API, auth, or business logic. Vertical-slice architecture, CQRS-style handlers, MediatR where the codebase already uses it.
  - The one sanctioned exception: `src/frontend/api/share-meta` is a small Node.js Azure Function that patches Open Graph meta tags into the static HTML shell for social-share crawlers, because Azure Static Web Apps route rewrites can't proxy to an external `.NET` domain. This was an explicit, one-off, user-approved exception — not a precedent. Don't add more Node functions without asking first.
- **Frontend:** React 19 + TypeScript + Vite 8 (rolldown bundler) + Tailwind CSS v4 (`@import "tailwindcss"`) + Framer Motion v12 + lucide-react + React Router v7.
  - **Always** use `import type { ... }` for type-only imports. Vite 8's rolldown bundler throws `[MISSING_EXPORT]` on a blank screen if a type is imported with a regular `import { }`.
  - Before adding any `lucide-react` icon import, grep the file first — rolldown throws a hard `[PARSE_ERROR]` on a duplicate identifier if it's already imported.
  - No global state library. Component-local `useState` + module-level in-memory stores.
- **Data:**
  - **Azure SQL** (via EF Core) — users, accounts, subscriptions, billing, permissions, audit logs. Relational, transactional.
  - **Azure Cosmos DB** — profiles, interviews, lessons, alerts, real-time/document-shaped data.
  - **Azure Blob Storage** — audio/video uploads, always via private container + per-request SAS URL, never public access.
  - **Data Lake Gen2** — analytics, AI training data (later phase).

## 3. Known gotchas — check these first

- **JWT auth 401s despite a valid token:** ASP.NET's JWT bearer handler remaps short claim names (`sub`, `email`, `role`) to legacy XML-namespace URIs by default, so `ctx.User.FindFirst("sub")` silently returns `null`. Fix is `opt.MapInboundClaims = false;` in the `.AddJwtBearer(...)` config in `Program.cs` — check this is still set if a new auth-protected endpoint mysteriously can't read claims.
- **Cosmos documents keyed by `id = someOtherField` (userId, candidateId, etc.):** C# property initializers like `public string Id { get; set; } = Guid.NewGuid().ToString();` re-evaluate on every `new` call — they don't share state. Every construction path (including "create if missing" fallbacks) must explicitly set `Id = userId` or the document becomes permanently unreadable by anything that fetches by that id. This exact bug orphaned every user's profile from registration onward until fixed 2026-08-17.
- **`src/frontend/.git`:** this folder has its own leftover nested git repo, pointing at the same remote as the outer `P1` repo but with a diverged history. Running git commands from inside `src/frontend` shows alarming, wrong diffs. Always run git from the outer `P1` root.
- **Relative `/api/*` paths in `src/frontend`:** this SWA has its own integrated Azure Functions (`get-lesson`, `save-lesson`, `share-meta`, etc.) living at `src/frontend/api/`. A relative fetch to a route that only exists on the `.NET` backend (like `/api/ai-proxy`) silently 404s against the SWA's own Functions runtime instead. Any call meant for the real backend must use an absolute URL: `` `${import.meta.env.VITE_EXPLAIN_API_URL}/api/...` ``.

## 4. Workflow rules

- **Verify before claiming done.** For backend changes: `dotnet build`. For frontend changes: `npx tsc -b --noEmit`. For anything UI-visible: run the local dev server and actually look at it in a browser before saying it's fixed — don't rely on types passing alone.
- **Commit, then push, immediately.** Never leave a commit sitting unpushed — CI/CD (GitHub Actions → Azure) is how everything actually goes live, so an unpushed commit isn't a fix yet.
- **When porting a module between portals, copy every file it depends on** — pages, components, utils, api files, assets — recursively. No partial copies, no "this one's probably the same." Run the type-check clean before committing.
- Don't ask for confirmation on routine tool calls (Bash, Read, Write, Edit, Grep, git commit/push) — proceed. Do still flag genuinely destructive or irreversible actions (force-push, `git reset --hard`, deleting a `.git` directory, dropping data) before doing them.
