import { useEffect, useState } from 'react';

// Renders exam question text that may contain LaTeX maths written as \( ... \) (inline) or
// \[ ... \] (display). The question generator writes maths that way for GCSE/A-level/AP maths and
// science (2026-09-19: Francis saw a raw "\(\frac{3}{4}-\frac{2}{5}\)" in a GCSE Maths question).
// KaTeX is loaded lazily and only when a string actually contains maths, so IT-certification exams
// (no maths) never pay for it.

type Segment = { kind: 'text' | 'math'; value: string; display?: boolean };

const MATH = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;

// The model sometimes over-escapes LaTeX inside its JSON: a doubled backslash before "(" or "frac"
// instead of a single one. Collapse a doubled backslash that precedes a letter, bracket or
// parenthesis so those questions still render.
export function normaliseEscapes(text: string): string {
  return text.replace(/\\\\(?=[a-zA-Z()[\]])/g, '\\');
}

export function splitMath(rawText: string): Segment[] {
  const text = normaliseEscapes(rawText);
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    if (m.index! > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    out.push({ kind: 'math', value: (m[1] ?? m[2]).trim(), display: m[2] !== undefined });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

// Non-global on purpose: a global regex keeps its lastIndex between calls, and matchAll copies it,
// so testing with the global one could make splitMath skip a leading formula.
const HAS_MATH = /\\\((.+?)\\\)|\\\[(.+?)\\\]/s;

export function hasMath(text: string): boolean {
  return HAS_MATH.test(normaliseEscapes(text));
}

type Katex = typeof import('katex').default;
let katexLoad: Promise<Katex> | null = null;
function loadKatex(): Promise<Katex> {
  katexLoad ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([k]) => k.default);
  return katexLoad;
}

export function MathText({ text }: { text: string }) {
  const needsMath = hasMath(text);
  const [katex, setKatex] = useState<Katex | null>(null);

  useEffect(() => {
    if (!needsMath) return;
    let cancelled = false;
    loadKatex().then(k => { if (!cancelled) setKatex(() => k); }).catch(() => { /* fall back to readable text */ });
    return () => { cancelled = true; };
  }, [needsMath]);

  if (!needsMath) return <>{text}</>;

  const segments = splitMath(text);
  // Until KaTeX has loaded (or if it fails), show the maths as readable text with the delimiters
  // stripped rather than the raw \( \) markup.
  if (!katex) return <>{segments.map(s => s.value).join('')}</>;

  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'text'
          ? <span key={i}>{s.value}</span>
          : <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(s.value, { throwOnError: false, displayMode: !!s.display, output: 'html' }) }} />,
      )}
    </>
  );
}
