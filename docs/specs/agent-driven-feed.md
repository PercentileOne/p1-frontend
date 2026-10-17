# Agent-driven feed: spec (draft 1)

Written 17 Oct 2026 from a conversation with Francis. A design, not a build: nothing here exists yet except the building blocks listed in section 3.

## 1. What it is

A personal feed on the candidate portal's **WORK** tab (with a small "From your feed" card on the pinned Dashboard) that shows each person success-driven content for their own career and skills: books, courses, videos, articles and real success stories. Agents find, check and write the content. A ranker orders it for each person. Likes, saves, clicks and hides teach the system what works.

The feed solves the cold start. With no users there are no user posts, so the first content has to come from outside the platform, curated and honestly labelled.

## 2. The one rule: curated, not made up

- The agents **find, verify and summarise real things**. They never invent people, quotes, stories or reviews.
- Every agent-written item is labelled as curated by TheInterviewChair.
- Real user success posts (for example a shared Pass certificate) join the feed later, only with the user's opt-in.
- Reason: a feed seeded with fake success stories would break trust the first time someone spotted it, and UK consumer rules on fake reviews and testimonials are strict.

## 3. What already exists

| Building block | Where |
|---|---|
| Cosmos DB containers pattern | `Infrastructure/Cosmos/CosmosService.cs` |
| Timed agents on Azure Functions | `src/agents/P1.CareersAgent` (discovery twice daily, weekly salary update, quarterly re-enrichment) |
| Careers and salary data | Careers agent and the Careers Explorer |
| Reactions and Comments | `Features/Reactions`, `Features/Comments` in the API |
| A news tile component | `NewsTileCluster.tsx` in the candidate portal |
| Model Router for AI calls | `/api/ai-proxy` (every AI call goes through the backend) |
| Admin portal | for the approval queue and dashboard |
| Video feed idea (Aug 2026) | YouTube no-cookie embeds in a custom player, per-portal playlists |
| Profile skills and career | candidate profile in Cosmos |
| Question engine | Learn Alerts: a timer in the API writes a multiple-choice question per person, emails it with a secure answer link, records the result and spaces repeats |
| What people practise on | Admin portal Subjects page (finished demos and full interviews per job title) |

## 4. Content types and sources

| Type | Source | How it is kept honest |
|---|---|---|
| Question of the Day | The Learn Alerts engine, topic taken from the person's career and skills | Questions come from our own generator and are labelled as ours |
| Books | A book database (title, author, ISBN, cover) | The verifier confirms each book exists, so none are invented |
| Courses | Real links (for example Microsoft Learn and free courses) | Links checked; affiliate links disclosed if ever used |
| Videos | Official channels via embeds (see section 5) | Embed only where the owner allows it; never re-host |
| News and articles | RSS feeds of reputable sources | Short summary plus a link; no copied text |
| Career success | Careers data (salary, growth, skills) turned into short posts | Figures come from the careers data, not the model |
| "Skipped, then succeeded" stories | Reputable articles and official clips | The verifier checks every claim against a named source |
| Platform content | Question of the day, Learn lessons, interview tips | Labelled as ours |
| User success posts | Real users, opted in | Later phase |

### Question of the Day (the first content type)

It reuses the Learn Alerts engine, so most of it is already built. Needing no outside sources and no rights checks, it works on day one with no users.

| | Learn Alerts today | Question of the Day |
|---|---|---|
| Topic | The person creates it | Picked from their career, their skills and their weak spots |
| Where it appears | Email | A card in the feed on WORK, with an optional email |
| How often | On the person's schedule | One a day |
| Answering | Click a link in the email | Tap in the feed card |

Ideas to add: a **streak** ("7 days in a row", tied to My Routines), and a **spoken version**, an interview question of the day answered out loud to one of the interviewers and scored.

### Subject map: the list everything is built from

A ranked list of the best subjects for each profession. Questions of the day, posts, books, courses and videos are all made from this list, so the feed is never random and the cost per subject is known.

1. **Professions** come from the careers catalogue and from the job titles people actually practise on.
2. **AI proposes** the top subjects for each profession: core skills and the topics interviewers ask about.
3. **Real data weights them:** what our users practise on (the admin Subjects page), and public occupational skills datasets, which are candidates to check for licence and fit (for example O*NET and ESCO).
4. **A person reviews the first lists.** Francis can judge software and cloud; other professions need a reviewer or a trusted source. After that, an agent proposes a monthly refresh for approval.
5. **Stored** as a `subjects` container: profession, subject, weight, why it matters, sources, last reviewed.
6. **Looping:** the curator agent works down each profession's subjects in turn, so every profession gets coverage and the most valuable subjects get the most content.

This also fits the micro-subjects idea: people search for and share narrow subjects, and each subject becomes a thing the feed can show.

### General subjects (not tied to a profession)

Success and learning content that suits everyone matters as much as profession content, so it has its own list. Starter set:

- pitching and funding stories (the Shark Tank and Dragons' Den kind): pitch moments, how deals get made, what investors ask
- "turned down, then built a huge company": stories of rejection and persistence
- founder and builder stories
- interview confidence and nerves
- habits, routines and focus (ties to My Routines)
- learning how to learn
- public speaking and storytelling
- changing career

These are shown to everyone, ranked by each person's own likes and saves and not by their profession, and they take a share of every feed. The same pipeline applies: official clips by embed, facts checked against named sources, everything labelled.

**Software and Cloud is the first profession.** Draft 1 of its subject map is in `subject-map-software-and-cloud.md`.

## 5. Videos

**What LinkedIn does, and why it looks different.** Most videos on LinkedIn are uploaded directly to LinkedIn by people, pages and media brands. They are played in LinkedIn's own player: autoplay on scroll, muted, captioned, cropped for the feed. That look is a player and layout choice, not a different source. LinkedIn does not offer a library of its videos for other sites to use, and copying from it is against its terms, so we cannot take videos "from where LinkedIn gets them".

**What we can do legitimately.**
- Embed videos from **official channels** (a show's or a talk organiser's own channel) through the official player, where the owner allows embedding. Views and credit then go to the owner.
- Build our own player look (card, progress bar, autoplay on scroll) **around** the embed, following the platform's embed rules: do not hide or cover the player's own controls or branding, and never download or re-host.
- Use **platform-native videos**: real users' shared results and recordings, with consent.
- Where a clip has no official embed, link out to it and show our summary.
- Consider licensing later if a particular source becomes important.

**Topics that suit the feed.** Pitch moments, "turned down, then built a huge company" stories, interview advice, career talks. The agents tag these by theme so each person's ranking can learn what they respond to.

**Checks before building.** Read the current embed terms of each video source, and confirm per channel that embedding is enabled.

## 6. Architecture

```
Curator agent   -> finds candidate items per topic (timer, Azure Functions)
Verifier agent  -> checks links, books, claims, duplicates, safety
Writer agent    -> drafts the short post and labels it
Ranker          -> orders each person's feed from their profile and behaviour
Admin queue     -> Francis approves in batches (later: auto-publish for safe types)
Events          -> view, like, save, click, hide per person per item
Learning loop   -> topic and type weights move with the events
```

**Content per topic, ranking per person.** Generate content for a few hundred topics a few times a day, then rank it for each user. A person's feed feels personal, and the model cost stays small and predictable. Generating separately for every user would multiply cost with no real gain.

**Ranking, first version.** Score = match to the person's skills and career, plus freshness, plus how well the item has done with similar people, plus a small amount of variety and exploration so the feed does not narrow. Add model re-ranking later.

### Data

`feed-items` (Cosmos): id, type, title, summary, url, source, topic tags, skill tags, career tags, created by agent, model used, tokens, cost, verification result, status (draft, approved, published, retired), created and published times.

`feed-events` (Cosmos, per user): user id, item id, event (view, like, save, click, hide), time spent, time.

`agent-runs` and `agent-messages` (Cosmos): every run's input, tools used, output, tokens and cost, and every message one agent sends another.

## 7. Agent dashboard

For staff, extending the Activity Log:
- runs per agent, items created, approval rate, errors
- tokens and cost per agent and per item type, against a daily budget
- engagement by item type and by source (what people like, save and hide)
- source health (dead links, rejected items)
- **the agent message log**: agents pass work through a queue and every message is logged, for example "Curator sent 12 items to Verifier; Verifier rejected 3 for dead links"
- what the system has learned: current topic and type weights
- a pause switch per agent and for all agents

## 8. Rules the agents run under

1. Agents use tools (existing endpoints and the data stores), they do not own systems.
2. No agent holds a provider key. AI calls go through the Model Router on the backend.
3. Every run is logged with its cost, and every agent has a daily budget and a kill switch.
4. Nothing is published without verification, and anything uncertain waits in the approval queue.
5. Personalisation uses only profile and in-product behaviour, is explained to the user, and can be switched off.
6. Everything agent-made is labelled.

## 9. Tiers (a starting idea for the Standard / Premium discussion)

- **Standard:** the curated feed, ranked by career and skills.
- **Premium:** a personal agent that saves reading lists, makes weekly digests tied to interview dates, and adds deeper personalisation.

## 10. Build order

1. **Small start:** the Question of the Day, the subject map starting with Software and Cloud plus a starter set of general subjects, books and courses for those subjects, the approval queue, and a simple feed on WORK.
2. **Add:** videos and news.
3. **Add:** per-person ranking and the learning loop.
4. **Add:** the agent dashboard and the agent message log, then auto-publish for safe types.
5. **Add:** real user success posts, once there are users.

## 11. Open questions

- Who reviews the subject lists for professions outside software?
- Software and Cloud is first (decided 17 Oct 2026). Which two professions next? (Suggestion: software and cloud, since Francis can judge the quality.)
- Which book database and which video sources, after reading their terms.
- Where the feed sits in the WORK tab, and the exact Dashboard card.
- Daily budget for the agents.
- Which content types may auto-publish, and when.
- Whether Mukesh's go-to-market work should feed it (for example for recruiter-side content).
