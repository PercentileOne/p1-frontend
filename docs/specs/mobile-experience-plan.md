# Mobile experience: plan (11 Oct 2026)

Written after Francis tested the full interview room on an iPhone. The technology works (tap-to-start face, camera, recording); the layouts do not. This is a plan to agree before anything big is built.

## What the phone test told us

- The **free demo at `/try` already works well on phones** ("the experience was perfect"). It is one column, one interviewer, one big button. That layout is the proven starting point.
- The **portal and the full interview room are laptop layouts**: wide, two avatars plus the camera side by side, tables and lists that scroll sideways.
- People reach us on phones mostly from **links** (emails, LinkedIn, Learning Alerts), so the first thing they hit is a portal page, not the demo.

## What already exists

| Asset | State | Use for mobile |
|---|---|---|
| `/try` page layout | Works on phones, live | Base for a portrait interview room |
| Learning Alerts (email, MCQ) | Live | Best phone use there is: a 30-second job |
| Introductions / messages | Live (portal) | Needs a phone inbox view |
| `talktolearn-mobile` (Expo, own repo) | Old TalkToLearn app: Learn / Games / Social / Me tabs, login, lessons, FlashTalk, WordUp, profile. **No interview room, messages or alerts.** Working recorder (expo-av + Whisper via backend) | Reusable: shell, login, tab pattern, EAS config. Not the interview |
| Spatius face | Web SDK, drawn on the device, needs a tap to start on iPhone/Safari | A native app would still host the room in a web view unless Spatius has a native SDK (ask Fadi) |

## Recommendation: web phone shell first, native app second

**Step 1 (soon): a phone layout inside the existing candidate portal.** Same codebase, same deploy, no App Store review, and links from emails keep working. It switches on by screen width.

**Step 2 (second MVP, when usage justifies it): a native wrapper or app.** The real reasons to go native are push notifications, an icon on the home screen, and store presence. A wrapper around the phone shell (or the retrofitted Expo app hosting it) gets those without rebuilding every screen.

Why not native first: the interview room is a web SDK anyway, so a native app would embed it in a web view; two code bases to keep in step is costly for a one-person team; and the thing that is broken today is layout, which step 1 fixes directly.

## Minimum mobile experience (v0)

Five tabs along the bottom, one job per screen, cards instead of tables, no sideways scrolling anywhere.

| Tab | What it shows |
|---|---|
| **Today** | One next action ("Practise your weak area", "Your alert is ready"), last score, streak |
| **Inbox** | Messages and introductions as a simple thread list |
| **Learn** | Learning Alerts first (answer in two taps), then lessons as cards |
| **Interviews** | Card list: role, date, score, status; tap opens a vertical summary with "Your path to a pass" |
| **Me** | Profile basics, subscription, settings, help |

**Interview on a phone (v1, after v0):** portrait, interviewer full-width, big "Click Here" button at the chest, small "You" tile in a corner, typing as the fallback, controls as icons. Built from the `/try` layout, extended to the full session.

## Design rules for every phone screen

1. Bottom tab bar, primary action in the thumb zone.
2. One column. Lists become cards; tables never reach a phone.
3. Tap targets at least 44 px; no hover-only controls.
4. Nothing wider than the screen, ever (tested at 375 px).
5. Nothing that needs a laptop is shown without saying so.

## Order of work

1. **Done:** a dismissible heads-up for phones in the signed-in portal ("Best on a laptop or tablet for now. We are building a proper phone experience"). Not shown on `/try` or inside a live room.
2. Check how many signed-in sessions are on phones (a cheap query), so the order below is based on real use.
3. Phone shell: tab bar, Today, Inbox, Learning Alerts, Interviews as cards, summary page in one column.
4. Portrait interview room built on `/try`.
5. Then decide native (second MVP), with the questions below answered.

## Questions to settle

- Does Spatius have a native iOS / Android SDK, or web only? (Fadi)
- Is push notification for Learning Alerts the deciding feature for going native?
- Which of the five tabs matters most to the people who actually use a phone today (step 2 above will say)?
- Class 9 (downloadable software) trade mark is a separate application, due when the app is a near-term plan.
