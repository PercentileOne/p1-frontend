// How many "words" a spoken line holds, for the safety timers that decide how long to wait for a voice to finish.
// Counting spaces works for English but not for languages written without them (Chinese, Japanese, Thai, Lao, Burmese, Khmer): a whole Chinese question is one
// "word", so the timer ran out after a few seconds and the page moved on while the interviewer was still talking (seen live 2026-10-18: the "Click Here to speak
// your answer" button appeared before Haruto finished). For those scripts we count characters instead, about two characters to a word.
const NO_SPACE_SCRIPTS = /[฀-໿က-႟ក-៿぀-ヿ㐀-䶿一-鿿豈-﫿]/g;

export function speechWords(text: string): number {
  const chars = (text.match(NO_SPACE_SCRIPTS) ?? []).length;
  const rest = text.replace(NO_SPACE_SCRIPTS, ' ').trim();
  const spaced = rest === '' ? 0 : rest.split(/\s+/).length;
  return Math.max(1, spaced + Math.ceil(chars / 1.8));
}
