import { useCallback, useRef, useState } from 'react';

// Language codes match TalkPackStart's LANGUAGES list; Web Speech API wants BCP-47 tags.
const SPEECH_LANG: Record<string, string> = {
  en: 'en-GB', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', pt: 'pt-PT', nl: 'nl-NL',
  it: 'it-IT', pl: 'pl-PL', ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
  hi: 'hi-IN', sw: 'sw-KE', ro: 'ro-RO',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

// A continuous, whole-talk transcript — deliberately its own small hook rather than reusing
// VoiceInput.tsx, whose Record/Stop/Whisper-transcription UX is built around one bounded
// interview-answer turn, not a multi-minute uninterrupted talk. The underlying browser API
// (Web Speech, continuous: true) is the same technique VoiceInput already uses for its own
// live interim preview — just run for the length of a whole talk instead of one answer, and
// without VoiceInput's own recording/Whisper pipeline (the accumulated Web Speech text is
// what gets scored; a separate audio/video recording, if consented to, is handled entirely
// separately by useInterviewRecording).
export function useTalkTranscript() {
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef('');
  const stoppedIntentionallyRef = useRef(false);

  const start = useCallback((language: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return; // no Web Speech support — the talk still runs and records fine, just with no live transcript/score

    finalRef.current = '';
    setFinalText('');
    setInterimText('');
    stoppedIntentionallyRef.current = false;

    const recognition: SpeechRecognitionInstance = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG[language] ?? 'en-GB';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += `${t} `;
        else interim += t;
      }
      if (final) {
        finalRef.current = `${finalRef.current} ${final}`.trim();
        setFinalText(finalRef.current);
      }
      setInterimText(interim);
    };
    recognition.onerror = () => {};
    // Chrome/Safari silently stop Web Speech recognition after a stretch of silence even with
    // continuous:true — a well-known platform quirk, not something within our control. Restart
    // automatically unless we're the ones who called stop(), so a multi-minute talk with a
    // natural pause partway through doesn't lose the rest of the transcript.
    recognition.onend = () => {
      if (!stoppedIntentionallyRef.current && recognitionRef.current === recognition) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stop = useCallback((): string => {
    stoppedIntentionallyRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimText('');
    return finalRef.current;
  }, []);

  return { finalText, interimText, start, stop };
}
