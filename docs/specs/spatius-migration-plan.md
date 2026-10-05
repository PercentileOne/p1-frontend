# Moving the live interviewers from HeyGen to Spatius — plan (drafted 5 October 2026)

Why: cost. A free 3-question demo costs about 2.4 pence on Spatius against about 30 pence on HeyGen; a full recorded interview about 5 to 14 US cents on Spatius (avatar cut off after each question) against about 60 cents on HeyGen. Spatius also draws the face on the visitor's own device (no video stream), which suits phones and slow connections. Spatius (Fadi Abbas, Head of Business & Partnerships) has agreed to be credited and has offered to review a showcase.

This is a first-pass plan from reading the code. Estimates are rough and get firmer once Phase 1 starts.

## Where things stand today
- **Free demo (/try):** Spatius is already built in (`useSpatiusAvatarSession`). The admin page Live Avatar > "Avatar provider" decides what percentage of demo visitors get Spatius, with fallback Spatius > HeyGen > plain voice. iPhones and iPads skip Spatius (iOS will not start the audio outside a tap). Avatar ids set: Wayne dbb01388…, Amina 82d7dce9…, Michelle 8b86dda1…
- **Full interviews, My Talks and Michelle's welcome and debrief:** still HeyGen (`useLiveAvatarSession`, three seats: Amina, Wayne, Michelle, each drawn in a `<video>`).
- **Recording (desktop):** the room records the whole browser tab (`getDisplayMedia`, audio included), so a Spatius avatar drawn in the page is captured without extra work. **Recording (phones):** uses a separate path that needs the avatar audio fed into the recording bus (`liveAvatarRecordingBus`), so Spatius would need its audio fed there too (we already hold the PCM clip, so we can play a silent copy into the bus).
- **Spatius plan:** Builder, US$49 a month, 55,000 credits, 8 concurrent sessions, renews 29 October 2026.

## Phases
**Phase 0 — now (no code):** in admin > Live Avatar, set the demo share to the level you want (100% if you are happy with quality). Watch the funnel's demo completion for a few days. Check the iPhone fallback to HeyGen still works.

**Phase 1 — one interviewer abstraction (about 2 to 3 days):**
1. A `useInterviewerAvatar(role)` wrapper that returns the same shape for either provider (connect, speak, interrupt, disconnect, status, speaking), so the room does not care which one it has.
2. A token route for full interviews, guarded by the interview ticket (the demo's `spatius-token` is guarded by the demo ticket).
3. A second admin setting: "Share of full interviews on Spatius" (starts at 0%), independent of the demo share.
4. Render a Spatius stage `<div>` where each interviewer's `<video>` is now, for Amina, Wayne and Michelle.
5. Keep cutting the avatar off after each question so credits are only spent while the interviewer is speaking.
Acceptance: a full interview on desktop, start to finish, with Spatius for all three seats, including recording and playback.

**Phase 2 — recording and phones (about 1 to 2 days):**
- Desktop: check the tab recording captures Spatius video and audio cleanly and in sync.
- Phones: feed the PCM into the recording bus (silent copy) so the saved recording has the interviewers' voices.
- Real-device tests: iPhone (the "Begin Interview" tap may let Spatius start there, which would remove the iOS exception), mid-range Android, and a slow connection.

**Phase 3 — staged rollout:** 10% of full interviews, then 50%, then 100%, checking completion, error and fallback rates at each step. Rollback at any time is setting the share back to 0%.

**Phase 4 — the rest:** My Talks and Michelle everywhere, then custom interviewer faces (see decisions), refreshed hero preview, gallery images and banner, and a showcase for Spatius to review.

## Risks and how we handle them
- **Quality (about 80 to 90% of HeyGen's realism, by your own test):** staged rollout, fallback to HeyGen, your judgement at each step.
- **Concurrency:** Builder allows 8 live sessions at once. Launch-day spikes fall back to HeyGen automatically; upgrade the plan if it happens often.
- **Library avatars are shared with every Spatius customer.** Custom avatars (Builder includes 4) are exclusive to us. Do NOT make them from HeyGen's stock Amina and Wayne photos; use portraits we own or freshly generated ones.
- **Brand consistency:** Amina and Wayne will look different on Spatius from the hero video, gallery images and carousel (all HeyGen faces). Either choose Spatius faces that match closely, or refresh those assets after the switch.
- **iOS audio rule:** may need a "tap to meet your interviewer" moment; test before relying on it.
- **SDK telemetry:** the Spatius SDK sends its own usage data (PostHog/OTel). Check it against the privacy policy before full interviews go on it.

## Decisions for Francis
1. Library avatars first (fast), or wait for custom faces (more distinctive, a few days later)?
2. Roll out to all full interviews, or to paying subscribers first?
3. How long to keep HeyGen as the fallback, and when to reduce or end that subscription?
4. Is the 80 to 90% realism acceptable at the demo, given the cost saving?

## Status (5 October 2026, evening)
**Phase 1 built and pushed (commit 93bc2a6e), switched OFF (0%).** Decisions from Francis: library faces (Amina 82d7dce9…, Wayne dbb01388…, Michelle 8b86dda1…), all full interviews, clean sweep. Built: admin slider "Share of FULL interviews that get Spatius" (Admin > Live Avatar); server rolls once per interview in `/interviews/avatar-config`; `POST /interviews/spatius-token` (interview ticket or signed-in user, per-address daily cap); `useSpatiusSeat` adapter with the same shape as the HeyGen seat hook; Spatius stage boxes in the three interviewer tiles; a seat that fails to start drops back to HeyGen on its own (voice-only if that also fails). Phones stay on HeyGen until recording and iOS are tested (admin can force with `?force=spatius`). Not yet tested against live Spatius audio/video (cannot be done from the build machine). To test: sign in as admin, open an interview room with `?force=spatius` on the address. Framing of Michelle is untuned (starts on Amina's values); `?scale=&ax=&ay=` override for tuning.
Still to do: phone recording (feed PCM to the recording bus), real-device tests, staged rollout, My Talks, hero/gallery refresh, decide HeyGen fallback duration.
