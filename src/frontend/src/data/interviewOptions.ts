// Interview options shared by the full interview intake (InterviewPackStart) and the public "Try it live" demo (TryItLivePage), so the two can never
// drift apart. The homepage (src/viewme/public/home-v2.html) is static HTML and keeps an inline mirror of these two lists — update it when this changes.
// Backend mirrors: Features/Interviews/TtsLanguage.cs (language codes) and Features/TryOut/Endpoint.cs (difficulty names).

// The exact 32 languages ElevenLabs' eleven_flash_v2_5 model (Amina/Wayne/Michelle's voice
// model, see SpeakVoiceHandler.cs/AvatarAudioHandler.cs) genuinely supports — confirmed against
// ElevenLabs' own docs, 2026-09-18. Previously a smaller, hand-picked 15-language list that
// included Swahili, which ElevenLabs doesn't support at all (would have generated correct
// Swahili text that then got spoken in an English-accented voice, the exact bug this whole
// multilingual pass fixed for the other 12) — dropped for that reason, not an oversight.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fil', name: 'Filipino' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' },
  { code: 'no', name: 'Norwegian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'es', name: 'Spanish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DIFFICULTIES = [
  {
    value: 'Beginner',
    color: '#4F8EF7',
    borderColor: 'rgba(79,142,247,0.3)',
    desc: 'Foundational questions with no pressure — a genuine first practice run, great if you’re new to this.',
  },
  {
    value: 'Standard',
    color: '#34D399',
    borderColor: 'rgba(52,211,153,0.3)',
    desc: 'Well-rounded questions to build genuine confidence and solid preparation.',
  },
  {
    value: 'Pro',
    color: '#F59E0B',
    borderColor: 'rgba(245,158,11,0.3)',
    desc: 'Challenging questions that probe deeper — sharpen your edge beyond the basics.',
  },
  {
    value: 'Expert',
    color: '#EF4444',
    borderColor: 'rgba(239,68,68,0.3)',
    desc: "We'll treat you like the leading authority in your field. Intense. Technical. Unforgiving.",
  },
];

export type DifficultyName = (typeof DIFFICULTIES)[number]['value'];

// ── Speech recognition codes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The interviewer SPEAKS the chosen language (ElevenLabs, by `code` above); these make the candidate's spoken ANSWERS be transcribed in it too.
// Whisper takes an ISO 639-1 code (Filipino is "tl" = Tagalog there); the browser's live-preview recognition takes a BCP-47 locale.
/** The code Whisper expects for an interview language. */
export const whisperLanguage = (code: string): string => (code === 'fil' ? 'tl' : code);

const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-GB', ar: 'ar-SA', bg: 'bg-BG', hr: 'hr-HR', cs: 'cs-CZ', da: 'da-DK', nl: 'nl-NL', fil: 'fil-PH', fi: 'fi-FI', fr: 'fr-FR', de: 'de-DE',
  el: 'el-GR', hi: 'hi-IN', hu: 'hu-HU', id: 'id-ID', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR', ms: 'ms-MY', no: 'nb-NO', pl: 'pl-PL', pt: 'pt-PT',
  ro: 'ro-RO', ru: 'ru-RU', sk: 'sk-SK', es: 'es-ES', sv: 'sv-SE', ta: 'ta-IN', tr: 'tr-TR', uk: 'uk-UA', vi: 'vi-VN', zh: 'zh-CN',
};
/** The BCP-47 locale for the browser's speech recognition in an interview language (English stays en-GB, as before). */
export const speechLocale = (code: string): string => SPEECH_LOCALES[code] ?? 'en-GB';
