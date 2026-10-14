# Launch metrics log

One row a day, same time each day (morning is easiest). The point is to be able to say "on this date it was X, a week later it was Y". LinkedIn only shows "500+" for connections, so **followers** is the number to track.

Where to find each number
- LinkedIn followers: profile header.
- Latest post impressions / profile viewers: the post's analytics (or the notification).
- Site visits, people who tried the demo, register clicks: admin portal → Activity Log → Visitor funnel (use "Last 1 day" for the day, "All time" for the running total).
- Registrations: admin portal → Users / Recruiters (count of real accounts, not testers).

| Date | LinkedIn followers | Latest post: impressions / profile viewers | Site visits (funnel) | Tried the demo | Register clicks | New real sign-ups | Notes |
|---|---|---|---|---|---|---|---|
| Mon 5 Oct 2026 | 4,741 | 208 / 1 (dialysis-chair post, first hours) | | | | | Day before launch. New headline and 4-slide banner carousel are live. About 50 more connections than before the weekend (Friday's figure was not recorded). |
| Tue 6 Oct 2026 | 4,788 morning, 4,802 evening (+61 on Mon) | Top post (dialysis chair) 208 impressions / 5 engagements; 7-day totals: 487 profile views, 165 post impressions, 81 search appearances | | | | | **Product Hunt launch day.** Other recent posts: 25-questions 72 / 1, "where you stand" 53 / 2. Funnel numbers still to add. |
| Wed 7 Oct 2026 | 4,813 (+11 overnight) | 7-day: 491 profile views, 156 post impressions, 81 search appearances | | | | | Profile banner/carousel still shows the old Amina and the HeyGen Wayne; v2 slides ready in docs/ProductHunt/linkedin-carousel-v2/. Funnel now counts everyone except robots we are sure of. |
| Thu 8 Oct 2026 | 4,853 (+40 since Wed morning) | 7-day: 496 profile views, 153 post impressions, 33 search appearances | 30 visits, 28 not robots, 10 interacted (as at ~16:00, last 1 day) | 6 (21% of people; 5 of them UK) | 0 on the marketing site; 1 on the demo results screen (UK visitor, score 78, did not finish signing up) | 0 (still 4 candidate accounts, all testers) | Busy day. Sources: direct 18, LinkedIn 5, Product Hunt 3, l.wl.co 3. 15 mobile / 15 desktop. Interviewer picker, Say hi and the six-interviewer section live on the homepage. |
| Fri 9 Oct 2026 | 4,865 (+12 since Thu morning) | 7-day: 494 profile views, 98 post impressions, 33 search appearances | | | | | |
| Sat 10 and Sun 11 Oct 2026 | not recorded | | | | | | Weekend, no screenshot. |
| Mon 12 Oct 2026 | 4,887 (+22 over the weekend, from Fri) | 7-day: 481 profile views, 42 post impressions, 33 search appearances | | | | | |
| Tue 13 Oct 2026 | 4,937 (+50 since Mon morning) | 7-day: 494 profile views, 29 post impressions, 33 search appearances | | | | | Biggest one-day gain since launch week (Thu 8 Oct was +40). +124 since Wed 7 Oct morning, +196 since Mon 5 Oct. |
| Wed 14 Oct 2026 | 4,961 (+24 since Tue morning) | 7-day: 495 profile views, 36 post impressions, 33 search appearances | | | | | Profile views and search appearances flat against yesterday (494 and 33); post impressions up 29 to 36. +148 since Wed 7 Oct morning, +220 since Mon 5 Oct. Search appearances has read 33 on every check since Thu 8 Oct, so it may only refresh weekly. |

## Post experiments

One row per post. Give every link its own `utm_campaign` so the admin funnel (Sources / Activity Log) shows which post brought the visitors. Change one thing per test (hook, picture or length), and judge after 48 to 72 hours.

| Date and time posted | Short name (= utm_campaign) | The one thing tested | Impressions (after 72h) | Real website visits from this tag | Tried the demo | Sign-ups | What I learned |
|---|---|---|---|---|---|---|---|
| Mon 5 Oct 2026, afternoon | `mistakes` | Hook: "Make your mistakes here, not in the real interview" with the "practice answers are supposed to have mistakes" graphic | | | | | |


## Native ad campaigns

One row per ad (or per audience, if the ad stays the same). Ads land on the homepage itself, so people see Try it live and every other feature in one place. Build every ad's link like this, so the admin funnel can tell the ads apart:

`https://theinterviewchair.com/?utm_source=NETWORK&utm_medium=native&utm_campaign=SHORTNAME`

- `utm_source` is the network (up to 40 characters), `utm_medium` is always `native` (up to 30), `utm_campaign` is the short name in the first column (up to 40). Lower case, no spaces.
- Change one thing per ad (headline, picture or audience) so a difference in results has one possible cause.
- Fill the network's own columns (spend, clicks) from the network dashboard, and the rest from admin portal → Activity Log → Visitor funnel, filtered to the tag. Judge after 48 to 72 hours, not after the first morning.
- Clicks the network charges for are never the same as real visits: some are robots or people who leave at once. The gap is worth tracking.

| Campaign (= utm_campaign) | Network (= utm_source) | The ad (headline and picture) | Started (date, time) | Spend so far | Clicks (network) | Cost per click | Real visits (funnel, this tag) | Tried the demo | Register clicks | New sign-ups | Cost per sign-up | What I learned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | |
