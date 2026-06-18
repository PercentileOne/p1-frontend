/* ══════════════════════════════════════════════════════════════
   P1 STORIES — shared data + types
   ══════════════════════════════════════════════════════════════ */

export type StoryCategory =
  | "Hardship"
  | "Comeback Story"
  | "Career Journey"
  | "Student Life"
  | "Health & Recovery"
  | "Mental Health"
  | "Family & Relationships"
  | "Craft & Mastery"
  | "Founder Journey"
  | "Trade Story"
  | "Creativity & Art"
  | "Identity & Background"
  | "Life Lessons";

export const ALL_CATEGORIES: StoryCategory[] = [
  "Hardship", "Comeback Story", "Career Journey", "Student Life",
  "Health & Recovery", "Mental Health", "Family & Relationships",
  "Craft & Mastery", "Founder Journey", "Trade Story",
  "Creativity & Art", "Identity & Background", "Life Lessons",
];

export interface StoryAuthor {
  name: string;
  initials: string;
  color: string;
  profession: string;
  professionEmoji: string;
  university?: string;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  publishedAt: string;
  readTime?: string;
  image?: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  author: StoryAuthor;
  category: StoryCategory;
  tags: string[];
  profession?: string;
  professionEmoji?: string;
  university?: string;
  group?: string;
  wall?: string;
  wallEmoji?: string;
  chapters: Chapter[];
  savedCount: number;
  followerCount: number;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  publishedAt: string;
  lastUpdate: string;
  status: "ongoing" | "complete";
  featured?: boolean;
}

// ── Chapter helpers ───────────────────────────────────────────

function ch(id: string, n: number, title: string, content: string, publishedAt: string, image?: string): Chapter {
  return { id, number: n, title, content, publishedAt, image };
}

// ── Story data ────────────────────────────────────────────────

export const STORIES: Story[] = [
  {
    id: "pipes-to-product",
    title: "From Pipes to Product",
    description: "A plumber who spent 12 years under sinks discovers code, gets laughed at by his mates, and builds a product that makes it onto the App Store.",
    author: { name: "Marcus Williams", initials: "MW", color: "#22c55e", profession: "Ex-Plumber · Founder", professionEmoji: "🔧" },
    category: "Founder Journey",
    tags: ["hardship", "career change", "coding", "founder", "trade"],
    profession: "Founders", professionEmoji: "🚀",
    wall: "Founders' Wall", wallEmoji: "🚀",
    group: "Plumbers of London",
    chapters: [
      ch("pp1", 1, "The Job I Was Born Into",
        `My dad was a plumber. His dad was a plumber. I became a plumber at 17 because it was the obvious path, and honestly, because I was good at it. There's a pride in the trade that outsiders don't see — the precision, the problem solving, the satisfaction of a perfect joint.\n\nFor twelve years, I worked six days a week. My van. My tools. My customers. I built a business worth £180,000 a year by 29. I should have been happy.\n\nI wasn't.`,
        "Jan 2026"),
      ch("pp2", 2, "The YouTube Rabbit Hole",
        `It started with a video about an app that a 22-year-old had built in a weekend. Revenue: £4,000 a month. Team size: one. I watched it three times at 11pm on a Tuesday.\n\nI didn't sleep that night. I opened YouTube and searched "how to build an app." Four hours later, I had watched 14 videos, downloaded Xcode, and written my first three lines of Swift.\n\n"Hello, world."\n\nI laughed out loud in my kitchen at 3am. It was the most ridiculous thing I had ever done. I was a plumber. I had no degree, no computer science background, no money for courses. I had a router, a laptop, and YouTube.\n\nIt was enough.`,
        "Jan 2026"),
      ch("pp3", 3, "What My Mates Said",
        `I told my best mate Carl over a pint. He's been my mate since we were 14. He's also a plumber.\n\n"You what?"\n\n"I'm building an app."\n\nHe laughed for about 45 seconds. Not the polite kind. The full body kind where he nearly fell off his stool.\n\n"Marcus, mate. You can barely work your own phone."\n\nHe wasn't wrong. But there was something that happened in that moment that I haven't fully explained to anyone until now. The laughter made me certain. Not defensive. Certain.\n\nI drove home and coded for six hours.`,
        "Feb 2026"),
      ch("pp4", 4, "The Night I Almost Quit",
        `Six months in. I had 400 lines of code and three crashes every time I pressed the login button. I had burned through my savings learning — courses, subscriptions, a MacBook Pro I bought on credit.\n\nMy wife, Donna, found me at 1am crying at the kitchen table. Not tearfully upset. Actually crying. The kind where your shoulders shake.\n\nShe sat down opposite me. She didn't say anything for a long time.\n\nThen she said: "Is it better than a blocked drain?"\n\nI laughed. She laughed. We both laughed until we were both crying.\n\n"Then keep going," she said.\n\nI shipped version 0.1 three weeks later.`,
        "Feb 2026"),
      ch("pp5", 5, "The App Store",
        `The email from Apple arrived at 6:47am on a Thursday. I was in the van, about to start a job — a burst pipe in Hackney.\n\n"Your app has been approved for distribution on the App Store."\n\nI sat in the van for eleven minutes without moving. Then I called Donna. She screamed. I screamed. The customer rang to ask if I was coming.\n\nI went to the job. I fixed the pipe. I did it perfectly — because that's what you do.\n\nBut I cried the whole way home.`,
        "Mar 2026"),
      ch("pp6", 6, "First £1,000",
        `The first month, the app made £23. I told everyone it made £23. I was as proud as if it had made £23 million.\n\nMonth three: £187.\nMonth seven: £1,040.\n\nThe day it crossed £1,000, I took the day off plumbing. For the first time in 12 years, I took a Tuesday off and did absolutely nothing except sit in my garden and think about what was possible.`,
        "Apr 2026"),
      ch("pp7", 7, "What This Is Actually About",
        `This story isn't really about code. Or apps. Or money.\n\nIt's about the moment you realise that the identity you were handed — son of a plumber, plumber, always a plumber — is not the only identity available to you.\n\nI'm still proud of being a plumber. I still think it's one of the most important trades in the country. But I am also someone who builds things in code. Someone who learned a skill at 30 that most people start at 20. Someone who proved, at least to myself, that the door is never closed.\n\nChapter 8 drops next month. It covers what happened when a VC reached out after finding the app. That one gets complicated.`,
        "May 2026"),
    ],
    savedCount: 1204, followerCount: 847,
    accentColor: "#22c55e", gradientFrom: "#0a1a0a", gradientTo: "#102010",
    publishedAt: "Jan 2026", lastUpdate: "2 days ago",
    status: "ongoing", featured: true,
  },

  {
    id: "night-shift-diaries",
    title: "Night Shift Diaries",
    description: "What happens inside an A&E ward between midnight and 6am — eight months of observations, crises, kindness, and the patients who never left my mind.",
    author: { name: "Kwame Asante", initials: "KA", color: "#10b981", profession: "A&E Nurse", professionEmoji: "🩺" },
    category: "Health & Recovery",
    tags: ["NHS", "nursing", "night shift", "mental health", "hardship"],
    profession: "Nurses", professionEmoji: "🩺",
    wall: "Nurses' Wall", wallEmoji: "🩺",
    group: "NHS Night Shift Crew",
    chapters: [
      ch("ns1", 1, "Why 3am Is Different",
        `The ward changes at 3am. Anyone who has worked nights knows this. It's not superstition — it's something real in the air. The sounds are different. The pace is different. The patients who are awake at 3am are the ones who need you most, and the ones who know it least.\n\nI have worked 280 night shifts in the last four years. I started writing these notes in my car during breaks, on my phone, just trying to process what I was seeing. This is what I wrote.`,
        "Oct 2025"),
      ch("ns2", 2, "The Night We Had 14 Emergencies in 90 Minutes",
        `It was a Saturday in December. I can't give you the exact date for patient confidentiality reasons, but I remember every minute.\n\nThe first ambulance arrived at 22:47. The fourteenth arrived at 00:19. In between, we had a cardiac arrest, three serious traumas, two overdoses, and a nine-year-old who had swallowed something we still hadn't identified by 2am.\n\nWe had six nurses on shift. Six.\n\nWhat I want to tell you is what it looks like when professionals who are scared do their job anyway. Because every person in that ward was scared. And every person did their job.`,
        "Nov 2025"),
      ch("ns3", 3, "The Patient I Still Think About",
        `There was a man — early 70s, I'll call him Mr. T — who came in alone at 4am in November. No family. No emergency contacts. A coat that wasn't warm enough for the weather.\n\nHis presenting complaint was chest pain. It wasn't. He wasn't having a cardiac event. What was happening was loneliness of a kind that had become physical. His body had started to register the absence of other people as pain.\n\nI have seen this before. It doesn't get easier.\n\nI sat with him for twenty minutes after my shift ended. I don't think it helped much. But I sat with him.`,
        "Dec 2025"),
      ch("ns4", 4, "What They Don't Tell You About Compassion Fatigue",
        `They brief you on compassion fatigue in training. They give you a leaflet. They tell you to talk to someone.\n\nWhat they don't tell you is that it doesn't arrive like a breakdown. It arrives like a dimmer switch, slowly turned down over eighteen months until you realise you're going through the motions — doing everything right, feeling nothing.\n\nI noticed it when a family was crying in the corridor outside a bay where I was working, and my first thought was logistical. Not human. I noted that there were four of them and this would create a footfall problem in the corridor.\n\nThat night I called the wellbeing line and asked for help.`,
        "Jan 2026"),
      ch("ns5", 5, "What Brought Me Back",
        `Recovery from compassion fatigue isn't dramatic. There's no single moment. You don't wake up one morning fixed.\n\nWhat brought me back was smaller than that. An old woman — she must have been ninety — who held my hand when I adjusted her drip at 4am and said, very quietly, "You have kind hands."\n\nI went to the staff bathroom and stood in there for four minutes.\n\nThen I went back to work.\n\nI'm still not fully back. But I'm more back than I was. And I've started writing again, which means something.`,
        "Feb 2026"),
    ],
    savedCount: 2318, followerCount: 1640,
    accentColor: "#10b981", gradientFrom: "#021a0e", gradientTo: "#041f12",
    publishedAt: "Oct 2025", lastUpdate: "5 days ago",
    status: "ongoing", featured: true,
  },

  {
    id: "startup-nearly-died",
    title: "The Day My Startup Nearly Died",
    description: "We had 48 hours of runway left, two angry co-founders, and a term sheet that just evaporated. This is what happened next.",
    author: { name: "Zara Ahmed", initials: "ZA", color: "#f59e0b", profession: "Founder · Pre-seed", professionEmoji: "🚀" },
    category: "Hardship",
    tags: ["startup", "failure", "funding", "founder", "resilience"],
    profession: "Founders", professionEmoji: "🚀",
    wall: "Founders' Wall", wallEmoji: "🚀",
    chapters: [
      ch("sd1", 1, "The Email That Changed Everything",
        `It arrived on a Thursday morning at 7:12am. I was in the shower. My phone was on the bathroom shelf. I saw the notification before I saw the words clearly:\n\n"Subject: Re: Term Sheet — Important Update"\n\nI knew before I read it. You know. You always know.\n\nThe investor had decided not to proceed. Language about "market conditions." Language about "portfolio constraints." Language that meant: we changed our minds and we don't have to explain why.\n\nWe had £18,000 left in the bank. At our burn rate, that was 47 days.`,
        "Mar 2026"),
      ch("sd2", 2, "The Co-Founder Call",
        `The hardest call of my life was not the investor. The hardest call was Jamie.\n\nJamie had been my co-founder for three years. He'd left a £140,000-a-year job to build this with me. His wife had just had their second child.\n\nI told him on a video call at 8am. I watched his face go through five different things in thirty seconds.\n\nHe didn't say anything for a long time. Then: "Okay. What's the plan?"\n\nThat's who Jamie is. I'll never forget that.`,
        "Mar 2026"),
      ch("sd3", 3, "48 Hours",
        `We had 47 days of runway but we needed to act in 48 hours. After 48 hours, our investors would need to be told. Our team would need to be told. The window to do something — anything — without public failure would close.\n\nJamie and I split the work. He worked the existing investor list. I worked every warm intro I could extract from LinkedIn, Slack groups, WhatsApp threads, dinner parties, and one conversation I'd half-forgotten with someone at a conference in 2023.\n\nWe slept for four hours on Thursday night. Combined.`,
        "Apr 2026"),
      ch("sd4", 4, "The Angel Who Said Yes",
        `Her name is Miriam. She's a former founder. She responded to my cold email within two hours with: "Send me the deck. I'll call you at noon."\n\nThe call lasted 22 minutes. She asked five questions. She said: "I'm in for £75,000 at your last valuation. Get me the paperwork by end of week."\n\nI sat on the pavement outside our office after the call. A stranger asked if I was okay.\n\n"Yeah," I said. "Really yeah."\n\nWe survived. This time.`,
        "Apr 2026"),
    ],
    savedCount: 891, followerCount: 623,
    accentColor: "#f59e0b", gradientFrom: "#1a0c00", gradientTo: "#1f1209",
    publishedAt: "Mar 2026", lastUpdate: "1 week ago",
    status: "ongoing",
  },

  {
    id: "oxford-first-year",
    title: "How I Survived My First Year at Oxford",
    description: "State school. First generation. Absolutely terrified. And then something unexpected happened.",
    author: { name: "Emma Clarke", initials: "EC", color: "#1d4ed8", profession: "Student · PPE", professionEmoji: "🎓" },
    category: "Student Life",
    tags: ["oxford", "first gen", "imposter syndrome", "student", "academic"],
    university: "Oxford", wall: "University of Oxford", wallEmoji: "🎓",
    chapters: [
      ch("ox1", 1, "Fresher's Week",
        `I arrived with one suitcase and the certainty that I didn't belong.\n\nMy college was 800 years old. My secondary school was 40. The first person I met had gone to Eton and had a grandfather who had also attended this college. He was perfectly nice. He had no idea he was terrifying me.\n\nThe first formal dinner, I used the wrong fork. Three people noticed. Two of them were kind about it. One wasn't.\n\nI rang my mum from the bathroom and she told me to go back in and eat my dessert. I did.`,
        "Oct 2025"),
      ch("ox2", 2, "The Tutorial That Broke Me",
        `Oxford tutorials are one-on-one with a professor. You submit a paper. You discuss it. The professor reads while you sit in silence, and then dismantles your thinking with the precision of a surgeon.\n\nMy first tutorial, I submitted a paper I had worked on for 19 hours. The professor read it for about four minutes.\n\n"There's something in here," he said, "but you're not saying it yet. Rewrite it. Due Thursday."\n\nI rewrote it. He said the same thing. I rewrote it again. The fourth version, he said: "Now you're thinking."\n\nI went home and cried. And then I understood what the process was.`,
        "Nov 2025"),
      ch("ox3", 3, "Finding My People",
        `The turning point came in week five when I found the First Gen Oxford group.\n\n47 students who had come from state schools, council estates, single-parent households, families where university was not the expectation. People who had also pretended they knew what certain words meant, had also Googled etiquette, had also felt the weight of representing something to people at home who were watching.\n\nWe had dinner once a week in someone's room. We talked about everything.\n\nI stopped feeling alone.`,
        "Jan 2026"),
    ],
    savedCount: 1567, followerCount: 1120,
    accentColor: "#1d4ed8", gradientFrom: "#030b2e", gradientTo: "#060f3a",
    publishedAt: "Oct 2025", lastUpdate: "2 weeks ago",
    status: "ongoing",
  },

  {
    id: "song-nearly-killed-career",
    title: "The Song That Almost Ended My Career",
    description: "I released a song that went viral for the wrong reasons. Then I wrote the album that saved everything.",
    author: { name: "Layla Hassan", initials: "LH", color: "#ec4899", profession: "Composer & Producer", professionEmoji: "🎵" },
    category: "Creativity & Art",
    tags: ["music", "creativity", "failure", "comeback", "art"],
    profession: "Musicians", professionEmoji: "🎵",
    wall: "Musicians' Wall", wallEmoji: "🎵",
    chapters: [
      ch("sg1", 1, "The Release",
        `I spent eight months on that song. Every production decision was considered. Every lyric was rewritten at least twice. The mix was perfect — I'd worked with an engineer I'd saved for two years to afford.\n\nIt went live on a Friday at midnight.\n\nBy Sunday morning, it had been shared 40,000 times. Not because people loved it. Because people were using it as the backing track to a meme format that was making fun of something I hadn't intended.\n\nI turned off my phone and didn't turn it back on for three days.`,
        "Sep 2025"),
      ch("sg2", 2, "What the Comments Said",
        `I made the mistake of reading the comments on day four.\n\nMost were about the meme. But some — a few hundred — were about the music itself. About what they actually heard. About the chord progression in the bridge. About a lyric in verse two that had meant something to a woman in Auckland who was going through something I had also been through.\n\nI read every one of those comments. All 340 of them. I screenshot them all.\n\nThey're still on my phone.`,
        "Oct 2025"),
      ch("sg3", 3, "The Album",
        `I booked three weeks of studio time. No engineer this time — just me, my laptop, and the grief.\n\nI wrote 22 songs. I kept nine. The nine I kept were the most honest things I had ever made — not polished, not produced to perfection, just true.\n\nThe album came out six months after the meme. It was reviewed in four publications. Two gave it four stars. One gave it three. One gave it a sentence I still have printed and stuck above my studio door:\n\n"This is the record she was always going to make — it just took a disaster to make it possible."`,
        "Dec 2025"),
    ],
    savedCount: 743, followerCount: 512,
    accentColor: "#ec4899", gradientFrom: "#1a0014", gradientTo: "#200018",
    publishedAt: "Sep 2025", lastUpdate: "3 weeks ago",
    status: "complete",
  },

  {
    id: "code-at-40",
    title: "Learning to Code at 40",
    description: "Every tutorial assumes you're 22 and have eight hours a day. I had two hours, three kids, a full-time job, and a stubborn refusal to stop.",
    author: { name: "Gary Wilson", initials: "GW", color: "#8b5cf6", profession: "Self-taught Developer", professionEmoji: "💻" },
    category: "Career Journey",
    tags: ["coding", "career change", "self-taught", "persistence", "developer"],
    profession: "Developers", professionEmoji: "💻",
    wall: "Developers' Wall", wallEmoji: "💻",
    chapters: [
      ch("ca1", 1, "Why 40",
        `People ask why I started at 40. As if there's a good time to start something hard.\n\nI was a logistics manager. I was decent at it. I was bored by it. My job was being slowly automated by systems I didn't understand and couldn't influence. I decided to understand them.\n\nI bought a Python course on a Sunday night. £12.99. I finished the first module on my commute on Monday. I was terrible at it. I kept going.`,
        "Nov 2025"),
      ch("ca2", 2, "The Two-Hour Rule",
        `With three children aged 8, 6, and 4, I had approximately two hours per evening after bedtime. Some nights, less. Some nights, I had thirty minutes before I fell asleep at the keyboard.\n\nI coded every single one of those nights for nine months. I didn't miss one. My wife called it "Dad's weird homework." My kids started asking to see what I was building.\n\nAt month four, I built a small script that automated something I used to do manually at work. It saved me 40 minutes a week. My manager asked who built it. I said I did. She looked at me for a moment, then asked me to build something else.`,
        "Dec 2025"),
      ch("ca3", 3, "The Job",
        `Month eleven. A junior developer role at a company that builds tools for logistics firms. They weren't interested in my career history. They were interested in my GitHub — 180 commits over eleven months, each one a small problem solved.\n\nThe salary was £8,000 less than my logistics role. I took it without negotiating.\n\nThe first day, I sat in a stand-up meeting and understood every word. Not because I was the best developer in the room. Because I had built something from nothing, and I knew what that felt like, and it made every other problem feel smaller.`,
        "Jan 2026"),
    ],
    savedCount: 2104, followerCount: 1480,
    accentColor: "#8b5cf6", gradientFrom: "#120a2e", gradientTo: "#180d36",
    publishedAt: "Nov 2025", lastUpdate: "1 month ago",
    status: "complete",
  },

  {
    id: "marathon-comeback",
    title: "Sub-4 After the Injury",
    description: "I tore my ACL at mile 18 of the Manchester Marathon. Eighteen months later, I crossed the finish line at 3:58. This is everything in between.",
    author: { name: "Tom Adeyemi", initials: "TA", color: "#22c55e", profession: "Amateur Marathoner", professionEmoji: "🏃" },
    category: "Health & Recovery",
    tags: ["running", "injury", "comeback", "marathon", "mental health"],
    profession: "Athletes", professionEmoji: "🏆",
    wall: "Athletes' Wall", wallEmoji: "🏆",
    chapters: [
      ch("mc1", 1, "Mile 18",
        `I felt it before I heard it. A sensation like a bowstring snapping behind my right knee, followed immediately by the sound — a soft, wet pop that no one else around me could hear.\n\nI stopped. The runners behind me parted like water around a stone. I stood on the Embankment in the rain at mile 18 of the Manchester Marathon, and I knew my race was over.\n\nI sat down on the kerb. A St. John's Ambulance volunteer came over. I wasn't in as much pain as you'd expect. Just a profound, quiet absence where my confidence had been.`,
        "Oct 2025"),
      ch("mc2", 2, "The Diagnosis",
        `Complete ACL tear. Surgery recommended. Six to twelve months recovery minimum before running. Twelve to eighteen before competitive running.\n\nI was 34. I had been running since I was 19. Running was the thing that organised my life — the 5am runs, the long Sunday efforts, the community of people who moved their bodies before the world woke up.\n\nThe surgeon was kind. She said, "You will run again." I nodded. I went home and sat in the car for twenty minutes before going inside.`,
        "Nov 2025"),
      ch("mc3", 3, "Month Eight: The Return",
        `The first run back was 800 metres. Fifteen minutes of careful jogging around the block near the physio clinic. I cried at the 400-metre mark.\n\nNot from pain. From the realisation that my body was doing the thing again. That the deal I thought had been broken was still, somehow, in place.\n\n800 metres. Then 1k. Then 2k. Then parkrun. Then 10k. Then the half. The body remembers. It took longer than the body, but the mind remembered too.`,
        "Feb 2026"),
      ch("mc4", 4, "3:58",
        `I crossed the finish line at 3:58:42. I had trained for sub-4. I had believed in sub-4 for eighteen months.\n\nMy wife was at the finish line with a sign. My kids were there. My physio had driven down from Manchester to watch.\n\nThere's a photo of me at the finish line that I look at sometimes when things are hard. I look like someone who has been given something back.`,
        "Apr 2026"),
    ],
    savedCount: 1876, followerCount: 1340,
    accentColor: "#22c55e", gradientFrom: "#041a06", gradientTo: "#071f09",
    publishedAt: "Oct 2025", lastUpdate: "3 weeks ago",
    status: "complete",
  },

  {
    id: "invisible-excellence",
    title: "The Plumber's Philosophy",
    description: "After 22 years as a plumber, I've come to believe that invisible work — the stuff no one ever sees — is the purest form of craft.",
    author: { name: "Gary Benson", initials: "GB", color: "#94a3b8", profession: "Plumber · 22 yrs", professionEmoji: "🔧" },
    category: "Craft & Mastery",
    tags: ["plumbing", "craft", "philosophy", "trade", "mastery"],
    profession: "Plumbers", professionEmoji: "🔧",
    wall: "Plumbers' Wall", wallEmoji: "🔧",
    group: "Plumbers of London",
    chapters: [
      ch("pe1", 1, "What Nobody Sees",
        `Behind the wall of a house in Chelsea, there is a set of copper joints I soldered in 2019. They are perfectly done. The angles are clean. The flux was applied correctly, the heat was right, the compression is precise.\n\nNobody will ever see them. They will be hidden by plasterboard for 40 years. The family who lives there does not know they exist. They just know that when they turn on the tap, water comes out.\n\nI think about those joints sometimes. I think they might be some of the best work I've ever done.`,
        "Dec 2025"),
      ch("pe2", 2, "The Apprentice's Question",
        `My apprentice — he's 19, sharp as a tack — asked me once why I still took pride in the hidden work. "Nobody ever sees it," he said. "As long as it doesn't leak, who cares?"\n\nI thought about it for a moment. We were under a kitchen sink in Islington.\n\n"The family who lives here will never flood," I said. "Their floors won't buckle. Their ceiling below won't collapse at 3am. They'll just live in a house that works."\n\n"That's because of you," he said.\n\n"That's because of us," I said.`,
        "Jan 2026"),
    ],
    savedCount: 3204, followerCount: 2180,
    accentColor: "#94a3b8", gradientFrom: "#0f1218", gradientTo: "#131720",
    publishedAt: "Dec 2025", lastUpdate: "1 month ago",
    status: "complete", featured: true,
  },
];

export function getStory(id: string): Story | undefined {
  return STORIES.find(s => s.id === id);
}
