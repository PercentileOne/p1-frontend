/* ══════════════════════════════════════════════════════════════
   TRANSCRIPTION ENGINE — Phase 13
   Stateless. Takes a Blob (real) or null (mock) and returns a
   cleaned, punctuated transcript. Swap the mock body for a
   real API call (Whisper, Assembly AI, etc.) in Phase 14+.
   ══════════════════════════════════════════════════════════════ */

// ── Filler-word removal ───────────────────────────────────────────

const FILLERS = [
  /\b(um+|uh+|er+|ah+|hmm+)\b,?\s*/gi,
  /\b(you know|like,? |I mean,? |sort of|kind of|basically|literally|actually,? )\b/gi,
  /\b(right\?,? |okay,? |so,? so|and,? and)\b/gi,
];

export function cleanTranscript(raw: string): string {
  let text = raw.trim();
  for (const re of FILLERS) {
    text = text.replace(re, " ");
  }
  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, " ").trim();
  // Ensure sentences end with punctuation
  text = text.replace(/([a-zA-Z0-9])(\s+[A-Z])/g, "$1. $2".trimEnd());
  // Capitalise first character
  if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
  return text;
}

// ── Mock transcripts bucketed by recording length ─────────────────

const SHORT_TRANSCRIPTS = [   // < 20 s
  "The key principle here is immutability. State must never be mutated directly — always use the provided setter function to trigger a re-render.",
  "Photosynthesis converts light energy into chemical energy stored in glucose. This process occurs in the chloroplasts and requires water, carbon dioxide, and sunlight.",
  "The quadratic formula gives us x equals negative b plus or minus the square root of b squared minus four a c, all over two a.",
];

const MEDIUM_TRANSCRIPTS = [  // 20–60 s
  "Today I want to cover three main concepts. First, the definition and scope of the topic — what it is and what it isn't. Second, the mechanism: how does it actually work at a fundamental level. Third, why it matters in practice, and where you will most commonly encounter it in exams and applied work.",
  "The mechanism of enzyme action follows the induced fit model. When a substrate binds to the active site, the enzyme changes shape slightly to form a tighter fit. This reduces the activation energy required for the reaction to proceed. The enzyme is not consumed — it is released unchanged after the reaction completes, ready to catalyse the next substrate.",
  "In economics, when we talk about elasticity of demand, we mean how responsive quantity demanded is to a change in price. If a one percent price increase causes more than a one percent fall in demand, we say demand is price elastic. If demand falls by less than one percent, it is price inelastic. The formula is percentage change in quantity divided by percentage change in price.",
];

const LONG_TRANSCRIPTS = [    // > 60 s
  "Let me go through the entire proof step by step. We start by establishing the base case, where n equals one. In this case the left hand side equals one and the right hand side also equals one, so the base case holds. Now we assume the statement is true for some arbitrary k — this is our inductive hypothesis. We need to show it holds for k plus one. Starting from the inductive hypothesis, we add the next term to both sides. On the left hand side this gives us the sum up to k plus one. On the right hand side we can factor and simplify. After algebraic manipulation we arrive at the closed form for k plus one, which is exactly what we needed to prove. By the principle of mathematical induction, the statement holds for all natural numbers n.",
  "The French Revolution unfolded in several distinct phases. The first phase from 1789 to 1792 saw the collapse of the ancien régime, the Declaration of the Rights of Man, and the constitutional monarchy. The second phase, the Radical Republic from 1792 to 1794, was dominated by the Jacobins and culminated in the Reign of Terror under Robespierre. Thousands were guillotined during this period in the name of revolutionary virtue. The third phase, the Thermidorian Reaction, saw the fall of Robespierre in July 1794 and a move back towards moderate republican governance. Finally the Directory period from 1795 to 1799 ended with Napoleon's coup d'état in November 1799, marking the transition to the Consulate. The Revolution fundamentally transformed France by abolishing feudalism, establishing the principle of popular sovereignty, and spreading Enlightenment ideas across Europe.",
];

function pickTranscript(durationSecs: number): string {
  if (durationSecs < 20) return SHORT_TRANSCRIPTS[Math.floor(Math.random() * SHORT_TRANSCRIPTS.length)];
  if (durationSecs < 60) return MEDIUM_TRANSCRIPTS[Math.floor(Math.random() * MEDIUM_TRANSCRIPTS.length)];
  return LONG_TRANSCRIPTS[Math.floor(Math.random() * LONG_TRANSCRIPTS.length)];
}

// ── Public API ────────────────────────────────────────────────────

export interface TranscriptResult {
  raw:     string;
  cleaned: string;
}

export async function transcribe(
  _blob:       Blob | null,
  durationSecs: number,
): Promise<TranscriptResult> {
  // Simulate real transcription latency (scales with length, max 2 s)
  const latency = Math.min(2000, 400 + durationSecs * 25);
  await new Promise(r => setTimeout(r, latency));

  const raw     = pickTranscript(durationSecs);
  const cleaned = cleanTranscript(raw);
  return { raw, cleaned };
}
