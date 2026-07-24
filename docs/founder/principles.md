# P1 Design & Engineering Principles

These principles govern every decision made in the P1 product — design, engineering, agent behaviour, and growth strategy.

---

## Product Principles

### 1. Systems Over Willpower
Design P1 to reduce the need for willpower, not to demand more of it. Friction in the wrong places kills behaviour change. Friction in the right places (proof, commitment) protects integrity.

### 2. Identity Before Achievement
Every feature should reinforce who the user is becoming, not just what they're completing. The Vision System is upstream of everything. If a feature doesn't connect to identity, question its existence.

### 3. Honest Intelligence
The agent must never tell users what they want to hear. It tells them what they need to hear. An AI that flatters is not a coach — it's a mirror that lies.

### 4. Completions Must Be Earned
A completion in P1 means something. The Proof Engine protects this meaning. Never compromise the integrity of the achievement record for engagement metrics.

### 5. The 12-Week Frame
All execution thinking inside P1 is structured in 12-week cycles. Features that operate at the "year" level (annual goals, yearly reviews) should be broken into cycle-sized chunks.

### 6. Streaks Are Sacred
The habit streak is the most powerful behavioural mechanism in P1. Every design and engineering decision that touches streaks must prioritise protection of near-milestone streaks above all else.

### 7. One Daily Hub
The Today Screen is the single daily interface. Every other system in P1 serves the Today Screen. Data, insights, and actions converge there. The Today Screen must remain fast, scannable, and frictionless.

---

## Engineering Principles

### 8. Type-First Development
All new features must define TypeScript types before implementation. Types are the contract between the data layer and the UI. Shared types live in `lib/`.

### 9. `import type` for Types
Vite 8 (rolldown bundler) requires type-only imports to use `import type { ... }`. Mixing value imports with type imports will break the build. Always use `import type` for TypeScript interface/type imports.

### 10. Simulation Before API
Build all agent features with rule-based simulation first. The UI/UX can be fully developed and tested without API dependency. Agent surfaces are wired — swapping simulation for real AI is a single-layer change.

### 11. No Global Store Yet
v0.1 uses component-local state + module-level in-memory stores. Do not introduce a global state manager (Redux, Zustand) until the complexity genuinely requires it. The current pattern works for the current scale.

### 12. Build Fails Are Build Fails
A broken Vite build is a P0 issue. Run `npx vite build` before every commit. Never ship a broken build.

### 13. In-Memory Is Honest
Do not fake persistence. If data resets on refresh, that is acceptable for v0.1 and should be documented. Do not add localStorage hacks that give false impressions of persistence. Fix it properly when the API is connected.

### 14. Duplicate Imports Break Builds
When adding new icons or modules, check existing imports first. Rolldown throws a hard error on duplicate identifiers. `Grep` before adding.

---

## Design Principles

### 15. Dark and Premium
P1's visual identity is dark, dense, and premium. `#0f1117` background. Indigo/violet accents. Tight typography. No pastel colours, no bubbly UI. This is a serious platform for serious people.

### 16. Every Pixel Must Earn Its Place
P1 screens are information-dense. Do not add decorative elements that don't carry data or meaning. Whitespace is used for hierarchy, not decoration.

### 17. Framer Motion for Transitions
All state transitions (collapse/expand, step changes, success states) use Framer Motion. No CSS transitions for complex state changes. `AnimatePresence` wraps every conditional render.

### 18. Single Scrollbar Rule
Only one scrollable region per screen. Sidebars use `overflow-hidden`. The main content area is the only scroll container. This prevents confusing nested scrolling on all device sizes.

### 19. Sticky Headers
Every page has a sticky header with: back navigation, page title, and contextual CTAs. The header must remain visible at all scroll positions.

### 20. Agent Brand Consistency
The agent always uses: `<Sparkles size={12}/>`, indigo text, `bg-indigo-600/8 border border-indigo-500/15` background. This visual language must be consistent across all 15+ agent appearances.

---

## Growth Principles

### 21. Earn Trust Before Expanding
P1 must work perfectly for one user before it works for many. Build depth before breadth.

### 22. Proof Before Network
The proof integrity system must be robust and trusted before any social/network features are developed. A community built on unverified achievements is worthless.

### 23. Cycles Before Subscriptions
Prove the 12-week cycle model works for real users before monetising. The core product must demonstrably change lives. The subscription follows from value, not the other way around.

### 24. The First 1,000 Users Are Everything
The first 1,000 users of P1 will define the product. Recruit them carefully. Engage them personally. Use their feedback to shape every roadmap decision. They are not users — they are co-founders.
