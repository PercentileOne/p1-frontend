# Pricing costing: free, £1, £3 (20 Oct 2026)

Francis and Mike Petrie both lean towards a very low price (free, £1 or £3 a month, and £3 per recruiter seat) so that adoption becomes automatic and viral. This is the costing from real numbers. The interactive calculator is a private page (link in the chat); everything below is what it is built from.

## 1. What the business really costs each month

**Azure, from the Azure cost report (read-only query, 20 Oct 2026):**

| | September (whole month) | October 1 to 20 | Pace for a 31-day month |
|---|---|---|---|
| SQL Database | £108.63 | £87.73 | about £136 |
| App Service (web plans) | £82.03 | £47.53 | about £74 |
| Microsoft Defender for Cloud | £10.69 | £7.11 | about £11 |
| Foundry Models (all AI text) | £3.95 | £4.95 | about £8 |
| Everything else (storage, Cosmos, email, bandwidth) | about £1.0 | about £0.5 | about £1 |
| **Total** | **£206.35** | **£147.84** | **about £229** |

The September cuts aimed at a bill of about £100. It is now running at more than double that.

**Other fixed costs:** Spatius Builder plan $49 a month (about £37, renews 29 Oct). Domains, email and tools are small and unmeasured.

**The AI is the cheap part.** All AI text (interview questions, scoring, Learn, Career Coach, CV analysis) cost about £8 a month. It is not what drives the price.

## 2. The big finding: the database

The SQL database holds **38 MB of data** and runs at **about 1% of one CPU**. It is on Azure's serverless tier (`GP_S_Gen5`, 0.5 to 1 vCore, pauses after 60 minutes idle), which charges per second of compute. It is billed for about 18 active hours a day, because a few connections arrive every few hours (5 to 17 an hour at busy times, scattered single ones overnight), so it keeps waking and staying awake for the 60-minute idle wait. That is why it costs about £136 a month, far above the £46 noted in September.

**A fixed small tier fits comfortably:** Azure SQL Basic (5 DTU, 2 GB) is about £4 a month, and Standard S0 (10 DTU, 250 GB) is about £11 to £12. Either holds 38 MB easily. S0 is the safer choice for headroom. As a bonus, a fixed tier never pauses, so there is no one-minute wake-up delay for the first visitor after a quiet spell (that delay is one cause of "Failed to fetch" on login).

- Saving: about **£120 to £125 a month** (about £1,450 a year).
- It is a change to the live database, so it needs Francis's go-ahead. It can be reversed (scale back to serverless).
- Command, for reference: `az sql db update -g p1-core -s explain-global-db -n explain-global-sql --edition Standard --service-objective S0 --max-size 2GB`. The connection drops briefly at the end of the change.

**Two smaller options (not tested, not yet recommended):**
- Web plan: the API runs on a Standard S1 plan (about £74 a month in total for the App Service line, which also includes the small Linux Basic plan for TalkToLearn and some function plans). Memory notes say it averages under 1% CPU. A Basic B1 plan costs much less. It needs a test first (memory use, always-on, deployment).
- Defender for Cloud (about £11 a month): security monitoring. Switching it off saves that money but removes the protection. Francis's decision.

If the database and the web plan are both fixed and Defender is kept or dropped, Azure falls from about £229 to somewhere between about £65 and £111 a month.

## 3. What one interview costs

| Part | Per full interview | How we know |
|---|---|---|
| Avatar face (Spatius) | about £0.05 | Agreed planning figure (11 Oct). A 3-question demo measured 2.4p. Not yet measured on a full interview. |
| Voice (ElevenLabs, `eleven_flash_v2_5`) | about £0.15 | **Estimate** from roughly 3,000 to 3,500 characters spoken. Not measured. |
| Listening (OpenAI Whisper) | about £0.05 | **Estimate**: $0.006 a minute, about 10 minutes of speech. |
| AI text and scoring | about £0.02 | From the Azure bill (all AI is about £8 a month). |
| **Total** | **about £0.27** | The old figure was £0.44 (when HeyGen did the face). |

Voice and listening, not the avatar, are now the biggest costs per interview, and they are the two I could not measure from here. Both dashboards show real usage: **ElevenLabs** (characters or credits used this month, and your plan) and **OpenAI** (Whisper minutes this month). Dividing by the number of interviews gives the true figure.

A public demo costs about £0.09 (2.4p avatar plus voice and listening, estimated).

## 4. What a candidate leaves you at each price

These per-candidate figures do not depend on how many users there are. They assume three full interviews a month, £0.27 each, and £0.10 a month of other AI use, with Stripe's standard UK card fee (1.5% plus 20p; check yours in the Stripe dashboard).

| Candidate price | Card fee | You keep | Three interviews and other AI cost | Left per candidate |
|---|---|---|---|---|
| £4.99 | 27p | £4.72 | £0.91 | **+£3.81** |
| £3 | 24.5p | £2.76 | £0.91 | **+£1.84** |
| £1 | 21.5p | £0.79 | £0.91 | **−£0.12** |
| Free | none | £0 | £0.91 | **−£0.91** |

What this says:
- **£1 is the weakest option.** The fixed 20p card fee takes about a fifth of every £1 payment, and the remainder does not cover even three interviews. It only works with a cap of about two interviews a month.
- **£3 works.** A candidate stops costing you money only above about nine interviews a month, so a cap of six leaves a comfortable margin.
- **Free costs about 90p per candidate per month** with nothing coming in, plus the fixed costs. It only works if recruiters, prep links and affiliate commission fund it, and the cap is low.
- **The cap is the real safety lever, more than the price.** Today's rule is 10 a month and 3 a day.

## 5. Recruiter seats

Moving a seat from £49 to £3 loses £46 of income per seat, and the seat is the part of the business with real money in it. A £3 seat makes sense only if the goal is to spread through recruiters, with money made on prep links (99p each, covering up to three candidate sessions at about 27p each, so about 18p left before card fees) and on candidates they bring in. This needs real numbers: how many recruiter seats exist now, and how many links they send.

## 6. Early read (to confirm with real volumes)

1. **Cut the fixed costs first.** The database change alone saves about £120 a month and carries no product risk.
2. **If the aim is wide adoption, £3 a month for candidates with a cap of about six interviews beats both £1 and free.** It keeps a margin on every candidate, which is what makes growth safe. Keep one free taster interview as the "try it" step (that already exists).
3. **Do not go to £1.** Do not go fully free yet. Revisit free once recruiters, affiliate income or another buyer pays for it.
4. **Keep the recruiter seat price high until you have decided to use recruiters as the growth route.** Dropping it to £3 gives up the main income.

What would change this: the real ElevenLabs and Whisper figures (they could move the interview cost between about £0.15 and £0.40), the real number of active candidates and recruiter seats, and how much cheaper pricing really raises sign-ups.

## 7. Numbers to read off the dashboards

Francis can fill these in (no keys needed, only reading the pages):
1. ElevenLabs: plan, and characters or credits used in the last 30 days.
2. OpenAI: Whisper (audio) minutes in the last 30 days.
3. Spatius: credits used in the last 30 days (Subscriptions page).
4. Admin portal: active candidates, subscribers, recruiter seats, interviews started in the last 30 days (Access page, recent starts), and public demos in the last 30 days (Activity Log, "tried the demo").
