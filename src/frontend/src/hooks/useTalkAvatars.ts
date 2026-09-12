import { useCallback, useRef, useState } from 'react';
import type { AvatarState } from '../components/InterviewerAvatar';
import type { useLiveAvatarSession } from './useLiveAvatarSession';
import { speak } from '../api/ttsApi';
import { fetchWayneTips } from '../api/talksApi';

type LiveAvatarSession = ReturnType<typeof useLiveAvatarSession>;

export interface UseTalkAvatarsParams {
  liveAvatarHr: LiveAvatarSession;
  liveAvatarTechnical: LiveAvatarSession;
  onHrAnalyser: (a: AnalyserNode | null) => void;
  onTechAnalyser: (a: AnalyserNode | null) => void;
  resolvedPreferredName?: string;
  subject: string;
  isPersonalStory: boolean;
}

// Talk-room counterpart to useInterviewerAudio.ts — deliberately NOT a reuse of that hook
// (its askQuestion/repeatQuestion/askFollowUpWithHandoff surface is all built around a Q&A
// flow that doesn't exist here). Reuses two specific patterns from it instead: the
// speak-with-plain-TTS-fallback wrapper (liveAvatarSpeakHr/Technical in InterviewRoomPage.tsx),
// and the same hrState/techState AvatarState machine.
export function useTalkAvatars(params: UseTalkAvatarsParams) {
  const { liveAvatarHr, liveAvatarTechnical, onHrAnalyser, onTechAnalyser, resolvedPreferredName, subject, isPersonalStory } = params;

  const [hrState, setHrState] = useState<AvatarState>('idle');
  const [techState, setTechState] = useState<AvatarState>('idle');
  const cancelSpeakRef = useRef<(() => void) | null>(null);

  // Same fallback shape as InterviewRoomPage.tsx's liveAvatarSpeakHr/Technical — a failed
  // connect/speak degrades to plain TTS (no video, just voice) rather than dead air.
  const speakHr = useCallback((text: string, onEnd: () => void) => {
    let cancelled = false;
    let fallbackCancel: (() => void) | null = null;
    (async () => {
      try {
        if (liveAvatarHr.status !== 'connected') await liveAvatarHr.connect();
        await liveAvatarHr.speak(text, 'hr', () => onHrAnalyser(null));
        if (!cancelled) onEnd();
      } catch (err) {
        console.error('[TalkRoom] LiveAvatar (hr) speak failed, falling back to TTS:', err);
        if (!cancelled) fallbackCancel = speak(text, 'hr', onEnd, onHrAnalyser);
      }
    })();
    return () => { cancelled = true; fallbackCancel?.(); liveAvatarHr.interrupt(); };
  }, [liveAvatarHr, onHrAnalyser]);

  const speakTechnical = useCallback((text: string, onEnd: () => void) => {
    let cancelled = false;
    let fallbackCancel: (() => void) | null = null;
    (async () => {
      try {
        if (liveAvatarTechnical.status !== 'connected') await liveAvatarTechnical.connect();
        await liveAvatarTechnical.speak(text, 'technical', () => onTechAnalyser(null));
        if (!cancelled) onEnd();
      } catch (err) {
        console.error('[TalkRoom] LiveAvatar (technical) speak failed, falling back to TTS:', err);
        if (!cancelled) fallbackCancel = speak(text, 'technical', onEnd, onTechAnalyser);
      }
    })();
    return () => { cancelled = true; fallbackCancel?.(); liveAvatarTechnical.interrupt(); };
  }, [liveAvatarTechnical, onTechAnalyser]);

  // Mike has no avatar presence in the Talk room either, same as InterviewRoomPage — plain TTS
  // over a static photo, reusing the 'technical' voice slot purely for a consistent voice actor.
  const startMikePrep = useCallback((onDone: () => void) => {
    void liveAvatarHr.connect().catch(() => {});
    void liveAvatarTechnical.connect().catch(() => {});
    const name = resolvedPreferredName ? `${resolvedPreferredName}, ` : '';
    const mikeText = `${name}I'm Mike. You're about to give a short talk on "${subject}". Amina and Wayne will be right there with you the whole time — Amina's here for encouragement, Wayne knows the subject. Take a breath, speak naturally, and remember: this is practice, not a test. Good luck.`;
    cancelSpeakRef.current = speak(mikeText, 'technical', onDone, onTechAnalyser);
  }, [liveAvatarHr, liveAvatarTechnical, resolvedPreferredName, subject, onTechAnalyser]);

  // Amina's short opener + a general talk-craft tip, then Wayne's subject-specific tips
  // (fetched fresh here rather than pre-fetched on the intake screen, so it always reflects
  // the final subject/talk-type the candidate landed on). Kept deliberately short on both —
  // same lesson learned from Amina's intro glitch investigation: long avatar utterances are
  // the one thing that's caused real playback problems in this integration.
  const startAminaAndWayneTips = useCallback(async (onDone: () => void) => {
    setHrState('speaking'); setTechState('listening');
    const aminaText = "Hi — I'm Amina. I'll be right here the whole time, cheering you on. Look at the camera, take your time, and just speak naturally.";

    const afterAmina = async () => {
      setHrState('listening'); setTechState('speaking');
      const tips = await fetchWayneTips(subject, isPersonalStory);
      const wayneText = tips.length > 0
        ? `And I'm Wayne. A few things worth knowing: ${tips.join(' ')}`
        : "And I'm Wayne. Looking forward to hearing this one — take it away.";
      cancelSpeakRef.current = speakTechnical(wayneText, () => {
        setHrState('idle'); setTechState('idle');
        onDone();
      });
    };

    cancelSpeakRef.current = speakHr(aminaText, () => { void afterAmina(); });
  }, [subject, isPersonalStory, speakHr, speakTechnical]);

  // Both avatars stay connected and visibly present for the whole talk — this project's
  // decided cost/presence tradeoff (see the "My Talks" plan) — but switch into LiveAvatar's
  // own native "listening" state rather than continuing to actively speak, so they nod/react
  // instead of freezing. No new video assets needed; agent.start_listening/stop_listening are
  // real HeyGen SDK events already exposed by useLiveAvatarSession.
  const beginTalkPresence = useCallback(() => {
    setHrState('listening'); setTechState('listening');
    liveAvatarHr.startListening();
    liveAvatarTechnical.startListening();
  }, [liveAvatarHr, liveAvatarTechnical]);

  const endTalkPresence = useCallback(() => {
    liveAvatarHr.stopListening();
    liveAvatarTechnical.stopListening();
    setHrState('idle'); setTechState('idle');
  }, [liveAvatarHr, liveAvatarTechnical]);

  // Amina's closing line — same spirit as Mike's verbal debrief on the Interview Summary page,
  // just delivered live in the room by whichever avatar is cast as the encouraging one.
  const giveOutro = useCallback((overall: number | null, onDone: () => void) => {
    setHrState('speaking'); setTechState('idle');
    const scoreLine = overall !== null ? ` You scored ${overall} percent — ` : ' ';
    const outroText = `That's it — well done!${scoreLine}I'll let you see the full breakdown now.`;
    cancelSpeakRef.current = speakHr(outroText, () => { setHrState('idle'); onDone(); });
  }, [speakHr]);

  const stopAll = useCallback(() => {
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    liveAvatarHr.interrupt();
    liveAvatarTechnical.interrupt();
    setHrState('idle'); setTechState('idle');
  }, [liveAvatarHr, liveAvatarTechnical]);

  return {
    hrState, techState,
    startMikePrep, startAminaAndWayneTips,
    beginTalkPresence, endTalkPresence,
    giveOutro, stopAll,
  };
}
