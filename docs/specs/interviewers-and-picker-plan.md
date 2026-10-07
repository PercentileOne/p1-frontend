# Interviewers, the picker, and the interactive hero: plan (drafted 7 October 2026)

Francis's idea (7 Oct): a page where interviewers (Spatius avatars) are added, edited and removed; a "Choose your interviewers" step at intake showing each one's personality; and, to show off the product, a widget in the marketing page's hero where a first-time visitor picks one of five or six interviewers, types a role and a language, and starts the 3-question demo straight away. The widget would replace the static picture of Wayne in the hero.

## What already exists
- Spatius faces in the full interview room (three seats: Amina = Nadia, Wayne = Julian, Michelle = Camille), each on a 16:9 stage with its own background image (`src/frontend/public/images/spatius/<name>-background.<ext>`).
- Spatius avatar IDs for each seat are stored in the admin "Live Avatar" page (platform setting), not per interviewer.
- Haruto (a new custom avatar, ID 17dcea17-a918-4963-ad1b-742bc0e82d10) is created; 2 of 4 custom creations remain.
- The demo (/try) chooses its interviewer on the server (Amina or Wayne) and uses the same avatar settings.

## Phase 1: Interviewers registry and admin page
Data (Cosmos, one document per interviewer): id, display name, role (hr | technical | briefing), Spatius avatar ID, background image (uploaded through admin to blob storage, not committed to the repo), voice (ElevenLabs voice ID), one-line description, personality settings, active, sort order, languages.
Admin page: list, add, edit, hide, delete; upload a background; preview with the live face.
Personality settings (1 to 5 each): knowledge depth, strictness, warmth, humour, pace.
Acceptance: the room reads interviewers from the registry instead of the three-box admin setting; backgrounds come from uploads.

## Phase 2: Picker on the full-interview intake screen
Replace the "Questions: 9 / Amina & Wayne" row (and the soft chair photo) with "Your interviewers": a card per interviewer (face, name, description, personality bars). The candidate picks one HR and one technical, with a default ticked. The choice is saved with the interview.
Personality is applied for real: the settings feed the instructions that write questions and feedback (a strict, deep interviewer asks sharper follow-ups; a warm, humorous one eases in). Each interviewer has their own voice.

## Phase 3: The demo accepts a chosen interviewer
`/api/tryout/start` takes an interviewer ID, validates it against the registry (active, allowed for the demo) and returns that interviewer's avatar and background. Same limits as today (per-visitor caps, ticket).

## Phase 4: The interactive hero
A widget in the hero: default interviewer's picture (Haruto or Amina) with a small row of other faces; the visitor types a role, picks a language, presses go; the demo starts in place.
- Stills until "go": the live face and its software are only loaded when the visitor starts, so the landing stays fast.
- Phones: stills plus the current fallback until iPhone audio rules are tested.
- Capacity: the Spatius plan allows 8 concurrent live faces; if one cannot start, fall back to a still picture with voice (as now).
- Test it against the current hero (utm or a flag) before replacing it.

## Needs from Francis
- Which interviewers, and how each should differ (HR vs technical, warm vs strict, male vs female). Two creations remain; he intends to generate two more faces.
- A voice for each interviewer.
- Personality settings to expose to candidates (proposed: knowledge depth, strictness, warmth, humour, pace).
- Sharp still pictures of each interviewer for the picker and hero (screenshots of the live room at large size, or the Spatius covers).

## Open questions for Spatius (Fadi)
- Are library avatars free to use without a limit on our plan? What does it cost to add custom avatars beyond the four included?
- Is a custom avatar exclusive to us? Rights to use the original images in marketing?
- Concurrent session limit, and the cost of raising it.
