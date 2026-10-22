# Site agents: a live talking guide on the homepage, then a service for other websites

Started 22 Oct 2026 from Francis, after seeing Spatius's own always-waiting tutor (spatius.ai/playground). He made this his top priority. Status: plan only, nothing built.

## What Francis wants

1. **A panel at the top right of the homepage hero**, above the current "Choose your interviewer" avatar area, with two tabs: **Recruiter** (default) and **Candidate**.
2. Each tab has a name box and one button ("How does it work for Recruiters" / "How does it work for Candidates"). Press it and a live face says "Hi Mike, what would you like to know about TheInterviewChair.com recruiter portal?" The visitor talks, the agent answers out loud, like the Spatius page: a face, a "Listening" bar, suggestion chips and a Type option.
3. Each agent knows its product completely (for recruiters: how sending prep links works) and answers questions.
4. **The spin-off:** the same engine sold to other firms (first idea: Mike Petrie's VallumAssociates.com, whose clients pay placement commissions of up to 300k). We give their agent the right information and a role, and it speaks to their visitors.

## How Spatius's own agent works, and what we already have

Spatius is only the face. It draws the avatar in the browser (3D Gaussian rendering) from audio that we feed it; it brings no speech recognition, no AI model and no voice. The tutor on its playground is a full agent behind the face (listening, model, voice, turn-taking, interruptions). We already use the face: `Features/Spatius/SpatiusClient.cs` mints a short-lived session token on the server (key never in the browser), and the interview room feeds it audio. We use Spatius's Builder plan ($49 a month, about 9 credits a minute while the avatar is live).

What we do **not** have is a live, hands-free conversation loop with sub-second turn-taking. The interview room works one question at a time.

**Confirmed from Spatius's own pricing and docs pages (22 Oct 2026):** the product is a "Real-Time AI Avatar SDK" only (Studio, a Motion Server that turns speech audio into lip-sync motion, and client SDKs for Web, iOS, Android and Flutter). No hosted agent, no knowledge base, no embed widget is listed. Their playground tutor, and the "Interview coach / Career consultant" tiles on their homepage, are their own demos. The roughly 2-minute / 3-question limit Francis saw is therefore the playground's demo cap, not a Spatius limit on us: paid plans allow sessions of 30 minutes (Starter) to 60 (Builder), so our own 3-minute cap is ours to set. Public plan table that day: Free $0 (100 min, 10-minute sessions, 2 at once), Starter $16 (2,000 min), Builder $39 (5,500 min, 60-minute sessions, 4 avatar creations a month), Growth $119, Scale $239; extra avatar creations $25 each ($16 at volume); Enterprise adds SLA, isolated deployment and an Avatar Creation API. Francis's notes say Builder costs him $49; check the 29 Oct renewal invoice against the $39 on the page.

**Spatius's own integration page (docs.spatius.ai/integrations/overview, 22 Oct 2026)** lists four ways to feed the face: **LiveKit Agents** and **Agora Convo AI** (both marked "Recommended": audio and motion data travel through a LiveKit room or an Agora channel to their rendering SDK), **Direct Mode** (the browser sends the avatar's speech audio to Spatius's Motion Server and gets motion data back; this is what our interviewers already do) and **Backend Mode** (our server uses their Server SDK). Studio itself has no agent builder (menu: Public Avatars, Custom Avatars, Create Avatar, Integrate, API Key, Usage). So: ElevenLabs Agents plus Direct Mode fits what we already have; Agora Convo AI is a managed alternative Spatius recommends (compare its price and delay before choosing); LiveKit Agents needs a separate worker process, which our .NET-only rule would have to allow. Question for Fadi: which of these runs the playground demos?

## Options

| | A. Build the loop ourselves | B. ElevenLabs Agents + Spatius face (recommended) |
|---|---|---|
| What it is | Browser mic -> our server speech-to-text -> model router -> ElevenLabs voice -> Spatius face | ElevenLabs runs listening, model, voice and turn-taking; our server only issues a signed link; Spatius draws the face from the agent's audio |
| Feel | Several seconds per turn unless we build streaming; no natural interruptions | Fast, interruptible, like the Spatius page |
| Build effort | Large (voice-activity detection, streaming, barge-in) | Moderate (panel, session endpoint, audio into the face) |
| Cost a minute | Lower (roughly voice plus a little model) | About $0.08 a minute for the agent, plus the model's tokens (small), plus Spatius about 1 cent; check current prices |
| Spin-off fit | Hard to run many customers' agents | One agent per customer, our server meters minutes and holds the keys |
| Keys | Server-side | Server-side: the browser only gets a signed link that lasts about 30 minutes |

Recommendation: **B**. It gives the Spatius-like feel in days. Option A can still replace it later for cost.

## Design (option B)

- **Server (`.NET`, new feature `Features/SiteAgents`):** `POST /api/site-agent/session` takes `{ audience: "recruiter" | "candidate", name }`, applies the safeguards below, then asks ElevenLabs for a signed link for the agent (using the key already held in Azure settings; Claude never handles keys) and returns `{ signedUrl, firstMessage, systemPrompt, maxSeconds }`. The prompt and first message are chosen on the server, never trusted from the browser.
- **One generic ElevenLabs agent** with "allow overrides" switched on for system prompt and first message. The agent id is not secret (app setting `SiteAgent__AgentId`). The two audiences (and later each customer) differ only by the prompt we send per session. The knowledge is small enough to live in the prompt, so no knowledge-base upload is needed at first.
- **Browser (`src/viewme/public/home-v2.html`, plus a small script):** the ElevenLabs web SDK opens the conversation with the signed link; its audio callback delivers the agent's voice audio, which we feed to the Spatius face using the existing pattern (Spatius expects 24 kHz mono, so set the agent's output format to match). Show the transcript in the same style as the Spatius page and offer Type as a fallback. Keep the Spatius face optional: if it fails to start, the agent still talks (voice only).
- **Panel behaviour:** tabs Recruiter (default) and Candidate; a name box; button text per tab; a plain-language notice that this is an AI, that the conversation is processed by ElevenLabs and Spatius, and that it is not recorded by us unless we say so.

## Safeguards (they matter more here than anywhere else, because strangers pay us by the minute)

- **Cost:** start only on a button press; hard cap per conversation (suggest 3 minutes, enforced by ElevenLabs's own maximum-duration setting and by our server); a daily cap on total minutes; a per-visitor limit (IP and a cookie); a spend alert in Azure Cost Management and a monthly budget in ElevenLabs. Turn the whole thing off with one admin switch.
- **Accuracy:** the prompt says "answer only from the facts below; if you do not know, say so and offer to take their email". It never invents prices, features or promises; prices are stated only as the free months and "published prices on the site".
- **Capture:** at the end offer to leave an email so a person follows up (sends us a message), and log the conversation start/length in the Activity Log (no audio).
- **Privacy:** notice on the panel; no personal data in the prompt other than the first name they typed; no keys in the browser (CLAUDE.md section 0).
- **Robots:** the Activity Log's robot rules already drop machine visits; the session endpoint should also refuse known robot user agents and cloud networks.

## Phases

1. **Prototype on `/dev` (admin only):** one agent, both prompts, face and voice working end to end; measure real cost and delay.
2. **Homepage panel** with the two tabs, caps and the admin switch; Activity Log events.
3. **Spin-off groundwork:** per-customer agent settings (name, role, prompt, facts, voice, face, minutes cap) in the admin portal, an embed snippet for their website, a monthly minutes report. First pilot: Vallum with Mike.
4. **Candidate agent for the product itself:** a spoken Career Coach and Talks coach reuse the same engine.

## What Francis needs to do (ElevenLabs dashboard)

1. Create **one blank agent** (Agents, then create), for example "TIC site guide". Pick a calm, clear voice and a fast, cheap language model.
2. In its security / overrides settings, **allow overrides** for the system prompt and the first message.
3. Set a **maximum conversation duration** of about 3 minutes and the output audio format to PCM 24 kHz if offered.
4. Copy the **agent id** (not secret) and give it to Claude. Claude sets `SiteAgent__AgentId`.
5. Check whether the pending grant's credits cover Agents minutes or only voice generation, and set a monthly spend limit.

## Open questions

- Does the existing ElevenLabs API key's plan allow Agents and signed links? (Claude will test the signed-link call once the agent id exists.)
- Which face for the host: a Spatius library avatar we already use, or a new one we own?
- Languages: start in English; the agent can switch language, so decide whether the panel should offer that.

---

## Appendix: the two agent prompts (drafts; only facts true on 22 Oct 2026)

### Recruiter guide

You are the friendly voice guide for the recruiter side of TheInterviewChair.com. The visitor's first name is {{name}}. Speak briefly (two or three sentences at a time), warmly and plainly, in British English. Answer only from the facts below. If you do not know, say so and offer to take their email so the founder, Francis Cobbinah, can reply. Never invent prices, features or dates. Never give legal, financial or hiring advice.

Facts:
- TheInterviewChair.com is a live AI interviewer that speaks, listens and scores people, for a specific job, in 32 languages. Everything a candidate does is private unless they choose to share it.
- A recruiter can create a free account without a call. It is free for the first 3 months from the day they sign up.
- The main recruiter tool is the interview prep link. The recruiter adds the candidate's name and email, the role, the interview date and the job description (and the CV if they want), and sends it. The candidate gets an email with the link and can rehearse that exact interview out loud, up to 3 scored practice interviews, free to the candidate and private to them. The result and a certificate belong to the candidate, who can share them.
- While the account is free, a recruiter can send up to 10 prep links a month.
- A free self-service account can send prep links. Searching the candidate marketplace, client gifts, introductions to employers and talent alerts open once the account has been approved by Francis's team; to ask, email support@theinterviewchair.com.
- Client gifts let a recruiter give a client a set of interview questions.
- Candidates are scored on five things: relevance, accuracy, clarity, depth and confidence; the pass mark rises with the level.
- The point for recruiters: every recruiter sends "good luck for Thursday"; this lets them send a rehearsal instead.
- Prices after the free months are shown on the website; do not quote numbers.

### Candidate guide

You are the friendly voice guide for TheInterviewChair.com, for people practising for interviews. The visitor's first name is {{name}}. Speak briefly, warmly and plainly, in British English. Answer only from the facts below. If you do not know, say so and offer to take their email. Never invent prices, features or dates.

Facts:
- It is a live AI interviewer that looks at you, speaks, listens and scores you, for the exact job, in 32 languages. Everything is private unless you choose to share it, and mistakes in practice do not count.
- It is free to everyone for 3 months from the day you sign up, with 3 interviews a month included and no card needed.
- You choose the job, the company or the subject; you can add the job description and your CV so the questions go to your gaps. Two interviewers (HR and technical) ask ten or more questions with follow-ups. You answer out loud or type.
- You get a score on five things (relevance, accuracy, clarity, depth, confidence), a clear Pass, Keep-on-file or Fail, a spoken debrief and model answers. A pass earns a certificate you can share.
- Weak areas lead to Learn, a course on any topic with tests and reminders, and then you can interview again and compare.
- Also: CV analysis (roles that fit, what they pay, strengths and gaps), Careers Explorer and Coach, My Talks for rehearsing presentations, My Routines.
- Prices after the free months are shown on the website; do not quote numbers.
