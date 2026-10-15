import type { Priority, RoutineKind } from '../api/routinesApi';
import { MAX_ITEM_TEXT, MAX_READ_TEXT } from '../api/routinesApi';

// "Paste your list" (Francis, 2026-10-13): turns a list pasted from Evernote, Notes, Word or an email into routine items for a preview the person reviews before anything is saved.
// Everything here runs in the browser; nothing is sent anywhere until they press Add. The guesses are only defaults: every row in the preview can be changed or unticked.
//
// What it recognises:
//   - A heading line (starts with an emoji such as 🎯, or ends with a colon) starts a section.
//   - Bullet lines under it ("*", "-", "•", "1.") become tick items.
//   - Plain paragraphs under a heading with no bullets become one "read aloud" passage (e.g. "First:" declarations).
//   - Headings that are really places to WRITE (gratitude, how I feel, shopping list…) become one note item; what was written under them is a past answer and is not copied.
//   - "If Sunday, then …" / "If last day of month, …" lines become items with an if-then rule.
//   - Readings glued to an item ("Check Blood Pressure 170/101/67") become a number item without yesterday's figures.

export interface ParsedItem {
  key: string;
  text: string;
  section: string;
  kind: RoutineKind;
  priority: Priority;
  include: boolean;
  weekdays: number[];
  lastDay: boolean;
  label: string;
  /** An if-then item whose condition could not be turned into days (e.g. "Dialysis day"): the person has to choose them. */
  needsDays: boolean;
  /** A short explanation shown under a row when the parser changed or guessed something. */
  note?: string;
}

export interface ParsedList {
  sections: string[];
  items: ParsedItem[];
  /** How many written-answer lines (gratitude entries, feelings, shopping entries…) were left out on purpose. */
  leftOut: number;
}

const NOTES_SECTION = 'Check in';
// A list marker: a bullet or number, a checkbox character (Evernote and Notion checklists paste with one), or a markdown task ("- [ ]", "[x]").
const BOX = '\\u2610\\u2611\\u2612\\u2713\\u2714\\u25A1\\u25A0\\u25A2\\u25AA\\u25AB\\u25FB\\u25FC';
const BULLET = new RegExp(`^\\s*(?:(?:[*•·–-]|\\d{1,2}[.)])\\s+(?:\\[[ xX]?\\]\\s*)?|[${BOX}]\\s*|\\[[ xX]?\\]\\s+)`);
const EMPTY_BULLET = new RegExp(`^\\s*(?:[*•·–-]|\\d{1,2}[.)]|[${BOX}]|\\[[ xX]?\\])\\s*$`);
const LEADING_DECOR = /^[\p{Extended_Pictographic}️‍\s]+/u;
const NOTE_HEADING = /gratitude|thankful|how (?:do|will|am) i|\bfeel|retrospective|thoughts|expectation|skeleton|shopping|\bmeals?\b|important notes|reflect|journal|ideas|inspiration|things to remember/i;
const SKIP_BY_DEFAULT = /ideas|inspiration|things to remember/i;
const READ_HEADING = /^(?:first|affirmations?|declarations?|prayers?|morning words|read aloud)\b/i;
const PROMPT = /^(?:what|which|how|when|why|who|where|do|did|are|is)\b/i;
const KNOWN_SUBHEADING = /^thoughts to note\b/i;
const READING = /^(?:check|record|log|measure|take)\s+(?:my\s+)?(?:blood\s+pressure|bp|blood\s+sugar|sugar|glucose|weight|temperature|pulse)\b/i;

const DAY_NAMES: [RegExp, number][] = [
  [/\bsun(?:day)?s?\b/i, 0], [/\bmon(?:day)?s?\b/i, 1], [/\btue(?:s|sday)?s?\b/i, 2], [/\bwed(?:nesday)?s?\b/i, 3],
  [/\bthu(?:r|rs|rsday)?s?\b/i, 4], [/\bfri(?:day)?s?\b/i, 5], [/\bsat(?:urday)?s?\b/i, 6],
];

function tidy(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, '$1')     // markdown links keep their label
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function headingText(line: string): string {
  return tidy(line.replace(LEADING_DECOR, '')).replace(/:\s*$/, '').trim();
}

function isHeading(line: string): boolean {
  if (BULLET.test(line) || EMPTY_BULLET.test(line)) return false;
  const t = line.trim();
  if (t.length === 0) return false;
  if (/^\p{Extended_Pictographic}/u.test(t)) return true;
  if (KNOWN_SUBHEADING.test(t)) return true;
  // "What shopping do we need for today:" is the prompt under a heading, not a new heading.
  if (PROMPT.test(t)) return false;
  return t.length <= 60 && /:\s*$/.test(t);
}

/** "If Sunday, then plan the week" -> condition + action. Returns null when the line is not an if-then. */
function splitIfThen(text: string): { condition: string; action: string } | null {
  const a = /^if\s+(.+?)\s*,?\s+then\s+(?:do\s+)?(.+)$/i.exec(text);
  if (a) return { condition: a[1].trim(), action: a[2].trim() };
  const b = /^if\s+([^,]+),\s*(.+)$/i.exec(text);
  if (b) return { condition: b[1].trim(), action: b[2].trim() };
  return null;
}

function conditionToRule(condition: string): { weekdays: number[]; lastDay: boolean; label: string } {
  const weekdays = DAY_NAMES.filter(([re]) => re.test(condition)).map(([, n]) => n);
  const lastDay = /last day of (?:the )?month|month[- ]?end|end of (?:the )?month/i.test(condition);
  const label = capital(condition.replace(/\s+/g, ' ').trim()).slice(0, 40);
  return { weekdays, lastDay, label };
}

interface Block { heading: string; bullets: string[]; plain: string[] }

export function parseRoutineList(raw: string): ParsedList {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  const lines = raw.replace(/\r/g, '').split('\n');
  // Most pastes mark their headings (an emoji, a colon). If none do, a short title standing on its own above a run of lines is read as a heading instead.
  const marked = lines.some(l => isHeading(l));
  const bareHeading = (i: number): boolean => {
    const t = lines[i].trim();
    if (!t || BULLET.test(lines[i]) || EMPTY_BULLET.test(lines[i])) return false;
    if (i > 0 && lines[i - 1].trim()) return false;                                   // must start a paragraph
    if (t.split(/\s+/).length > 5 || /[.!?,;]$/.test(t) || !/^[A-Z0-9]/.test(t)) return false;
    let n = 0;
    for (let k = i + 1; k < lines.length && lines[k].trim(); k++) n++;
    return n >= 2;                                                                    // and be followed by at least two more lines
  };
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    if (rawLine.trim().length === 0) continue;
    if (isHeading(rawLine) || (!marked && bareHeading(idx))) {
      cur = { heading: headingText(rawLine), bullets: [], plain: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) { cur = { heading: '', bullets: [], plain: [] }; blocks.push(cur); }
    if (EMPTY_BULLET.test(rawLine)) continue;
    if (BULLET.test(rawLine)) cur.bullets.push(tidy(rawLine.replace(BULLET, '')));
    else cur.plain.push(tidy(rawLine));
  }

  const sections: string[] = [];
  const items: ParsedItem[] = [];
  let leftOut = 0;
  let n = 0;
  const addSection = (s: string) => { if (!sections.includes(s)) sections.push(s); };
  const push = (p: Omit<ParsedItem, 'key' | 'priority' | 'include' | 'weekdays' | 'lastDay' | 'label' | 'needsDays'> & Partial<ParsedItem>) =>
    items.push({ priority: 'standard', include: true, weekdays: [], lastDay: false, label: '', needsDays: false, ...p, key: `i${n++}` });

  const ruleItems: { text: string; rule: ReturnType<typeof conditionToRule> }[] = [];
  const noteItems: { text: string; include: boolean }[] = [];

  for (const b of blocks) {
    const heading = b.heading || 'My routine';
    const isNoteHeading = NOTE_HEADING.test(heading) && !/^plan for today(?!['’]s)\b/i.test(heading);
    // Checklists copied from some apps arrive as plain lines with no marker at all. Plain lines under a heading are a list of items, not a passage to read
    // aloud, unless the heading says it is declarations, a prayer and so on (or a line is too long to be an item).
    const plainIsList = !isNoteHeading && b.bullets.length === 0 && !READ_HEADING.test(heading) && b.plain.length > 0 && b.plain.every(l => l.length <= MAX_ITEM_TEXT);
    const content = (plainIsList ? b.plain : b.bullets).filter(Boolean);

    // If-then lines can sit under any heading ("IF DAY THEN DO") or on their own; they are pulled out wherever they are.
    const rest: string[] = [];
    for (const line of content) {
      const split = /^if\s/i.test(line) ? splitIfThen(line) : null;
      if (split) ruleItems.push({ text: capital(split.action).slice(0, MAX_ITEM_TEXT), rule: conditionToRule(split.condition) });
      else rest.push(line);
    }

    if (isNoteHeading) {
      leftOut += rest.length + (content.length === 0 ? b.plain.length : 0);
      if (b.heading) noteItems.push({ text: capital(heading).slice(0, MAX_ITEM_TEXT), include: !SKIP_BY_DEFAULT.test(heading) });
      continue;
    }

    if (rest.length === 0 && content.length === 0 && b.plain.length > 0) {
      // A passage: declarations, a prayer, words to read aloud.
      const text = b.plain.join('\n').slice(0, MAX_READ_TEXT);
      const section = b.heading ? capital(heading).slice(0, 60) : 'First';
      addSection(section);
      push({ text, section, kind: 'read', priority: READ_HEADING.test(heading) ? 'essential' : 'standard', note: 'A passage to read aloud, with one tick: "I\'ve read it".' });
      continue;
    }

    if (rest.length === 0) continue;
    const section = capital(heading).slice(0, 60);
    addSection(section);
    const seen = new Set<string>();
    for (const line of rest) {
      let text = line;
      let kind: RoutineKind = 'check';
      let note: string | undefined;
      if (READING.test(text)) {
        const stripped = text.replace(/[\s\-–:]*\d[\d./]*.*$/, '').trim();
        if (stripped.length > 0 && stripped !== text) { text = stripped; note = 'A number to enter each day. The reading that was pasted is not copied.'; }
        kind = 'number';
      }
      text = text.slice(0, MAX_ITEM_TEXT);
      const k = norm(text);
      if (k.length === 0 || seen.has(k)) continue;
      seen.add(k);
      push({ text, section, kind, ...(note ? { note } : {}) });
    }
  }

  // If-then items go to "Plan for today" when there is one, otherwise the first section that has tick items, otherwise Check in.
  if (ruleItems.length > 0) {
    const target = sections.find(s => /^plan for today/i.test(s))
      ?? items.find(i => i.kind === 'check' || i.kind === 'number')?.section   // never the passage's own section
      ?? NOTES_SECTION;
    addSection(target);
    const seen = new Set<string>();
    for (const r of ruleItems) {
      const k = norm(r.text) + '|' + r.rule.weekdays.join(',') + (r.rule.lastDay ? 'L' : '');
      if (seen.has(k)) continue;
      seen.add(k);
      const needsDays = r.rule.weekdays.length === 0 && !r.rule.lastDay;
      push({
        text: r.text, section: target, kind: 'check', weekdays: r.rule.weekdays, lastDay: r.rule.lastDay, label: r.rule.label, needsDays,
        ...(needsDays ? { note: `Which days is "${r.rule.label}"? Choose them below, or untick this item.` } : {}),
      });
    }
  }

  if (noteItems.length > 0) {
    addSection(NOTES_SECTION);
    const seen = new Set<string>();
    for (const t of noteItems) {
      const k = norm(t.text);
      if (seen.has(k)) continue;
      seen.add(k);
      push({ text: t.text, section: NOTES_SECTION, kind: 'text', include: t.include, note: t.include ? 'A note you write each day. What was pasted under it is not copied.' : 'Left unticked: this looks like ideas, not a routine.' });
    }
  }

  return { sections, items, leftOut };
}
