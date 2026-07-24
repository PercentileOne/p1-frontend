# FlashTalk — Product Specification v1.0
*Part of the TalkToLearn ecosystem — authored with Francis Cobbinah*

---

## What FlashTalk Is

FlashTalk is the "Down Time" mode inside TalkToLearn. It is educational, competitive, and genuinely fun. A term or word appears on screen — the user has seconds to explain it out loud. They are scored on accuracy, speed, and depth.

It is learning disguised as a game.

---

## The Three Pillars It Sits Within

```
TalkToLearn
│
├── 📚 Learn Mode
│     └── Enter subject → AI lesson → Practice talking → Score
│
├── 🎤 Interview Prep (Mock Interview Suite)
│     └── Choose role + difficulty → AI panel → 30 questions →
│         Pass/Fail + detailed feedback
│
├── ⚡ FlashTalk (Down Time / Games)
│     └── Speed rounds → term definitions → leaderboard
│
└── 🏆 Compete
      └── Weekly/monthly boards → prizes → social sharing
```

---

## Pillar 1 — FlashTalk (The Speed Game)

### Screen Layout

```
┌─────────────────────────────────┐
│  ✗  14          ⏱ 0:47      ✓ 7│
│                                 │
│         Profession:             │
│      Software Engineer          │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Vertical Slice          │  │
│  │   Architecture            │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│        [ 🎙 Talk ]              │
│                                 │
│  ████████████░░░░░░░░░░░░░░░░  │
│           Time Bar              │
└─────────────────────────────────┘
```

### UI Elements
- **Top Left** — ✗ wrong answers (running total)
- **Top Middle** — ⏱ countdown timer
- **Top Right** — ✓ correct answers (running total)
- **Profession label** — defaults to user's registered profession, changeable
- **Term Card** — the word or phrase to define
- **Talk Button** — hold to record answer
- **Time Bar** — visual countdown, turns red as time runs out

### Scoring Per Answer
| Score | Criteria |
|---|---|
| 10/10 | Perfect definition, answered quickly |
| 7/10 | Good definition, slightly slow |
| 5/10 | Partial definition |
| 3/10 | Vague but relevant |
| 0/10 | Pass, timeout, or irrelevant |

### Game Modes
| Mode | Description |
|---|---|
| **Profession Mode** | Terms from user's registered field only |
| **General Mode** | Use the word correctly in a sentence |
| **Blitz Mode** | 60 seconds, as many terms as possible |
| **Challenge Mode** | Someone sends you a specific term to define |

---

## Pillar 2 — Mock Interview Suite

### Setup Screen
```
┌────────────────────────────────┐
│  Role: Senior .NET Architect   │
│  Difficulty: ○ Grad ○ Mid ● Sr │
│  Questions: 10 / 20 / 30       │
│                                │
│  Question Types:               │
│  ☑ Technical Questions         │
│  ☑ Scenario / Problem Solving  │
│  ☑ HR / Behavioural Questions  │
│                                │
│  [ Start Interview ]           │
└────────────────────────────────┘
```

### HR / Behavioural Questions (the ones that actually fail people)
- "Tell us about yourself"
- "Where do you see yourself in 5 years?"
- "What have you been doing in your downtime?"
- "Describe a time you dealt with conflict"
- "Why do you want to leave your current role?"
- "What is your biggest weakness?"
- "Give an example of when you showed leadership"
- "How do you handle pressure and tight deadlines?"

### Roles Available (examples — AI generates questions for any role)
| Category | Example Roles |
|---|---|
| Technology | .NET Architect, React Developer, DevOps Engineer, Data Scientist |
| Healthcare | NHS Nurse, Junior Doctor, Paramedic, Physiotherapist |
| Legal | Barrister, Solicitor, Legal Secretary, Judge's Clerk |
| Trades | Electrician, Welder, Plumber, Carpenter |
| Retail | Store Manager, Sales Assistant, Buyer |
| Finance | Investment Analyst, Accountant, Financial Advisor |
| Education | Teacher, Teaching Assistant, Lecturer |
| Custom | User types any role they like |

### Difficulty Levels
| Level | Target Candidate |
|---|---|
| **Graduate** | Entry level, foundational questions |
| **Mid-level** | Competency-based, some depth required |
| **Senior** | Architectural, strategic, leadership questions |
| **Executive** | Board-level, vision, P&L, stakeholder questions |

### Scoring Per Interview Question
- **Clarity** — did you answer what was actually asked?
- **Depth** — did you go beneath the surface?
- **Confidence** — pace, hesitation, filler words
- **Structure** — did your answer have a beginning, middle, end?

### End Screen
```
Interview Complete
─────────────────
Overall Score:     74/100
Technical:         82/100
Behavioural:       66/100
Verdict:           PASS ✓

Weakest Answer — Question 7:
"Describe your approach to system design"
→ You gave a good overview but missed
  scalability and failure modes.

[ Review All Answers ] [ Try Again ] [ Share Result ]
```

---

## Pillar 3 — Leaderboard & Prizes

### Board Types
- **Weekly** — resets every Monday
- **Monthly** — resets first of each month
- **All Time** — permanent hall of fame

### Categories
- Per profession (Top Software Engineers this week)
- General (Overall top talkers)
- Per game mode (Blitz champions, Interview champions)

### Prize Mechanic
- 🥇 Top of weekly board → Free Premium month
- 🏆 Top of monthly board → Cash prize / gift card
- Verified scores only — AI-judged, not self-reported
- Regional boards (UK, USA, Global)

### Why Leaderboards Are Strategically Powerful
- Creates **retention** — people return every week to defend their position
- Creates **social sharing** — "I topped the .NET leaderboard this week"
- Creates **press stories** — "App pays users to be best in their field"
- Attracts **corporate sponsors** — Microsoft, AWS, NHS sponsoring profession boards
- Drives **word of mouth** — competitive people tell competitive people

---

## What TalkToLearn Actually Is (The Big Picture)

TalkToLearn is not a study app.

**It is the world's first spoken performance platform** — covering learning, career development, interview preparation, and competitive education for every profession on earth.

### Use Cases
| Use Case | Example |
|---|---|
| Study prep | "Teach me about the French Revolution" |
| Certification prep | "Prepare me for AZ-900" |
| Interview prep | "Prepare me for a Senior .NET Architect interview" |
| Exam orals | University vivas, spoken assessments |
| Medical OSCEs | Clinical communication, patient scenarios |
| Language learning | Conversation practice with a simulated native speaker |
| Presentation practice | Pitch to investors, client meetings |
| FlashTalk | Competitive term definition speed game |
| Mock Interviews | Full AI panel interview with scoring |

---

## Build Order Recommendation

| Phase | Feature | Why |
|---|---|---|
| **Phase 1** | FlashTalk | Fastest to build, immediately fun, drives daily habit |
| **Phase 2** | Mock Interview Suite | Killer feature, drives premium subscriptions |
| **Phase 3** | Leaderboard | Drives retention and virality once users exist |

---

## Marketing Angles

- **Product Hunt launch** — "Practice any job interview with an AI panel. Get scored. Get the job."
- **BBC / press angle** — "The app that's changing how Britain prepares for interviews"
- **University partnerships** — Every careers service in every UK university
- **NHS partnership** — OSCE preparation for nursing and medical students
- **Corporate B2B** — Companies licence TalkToLearn for staff interview training

---

*"We will change the way you learn, forever."*
