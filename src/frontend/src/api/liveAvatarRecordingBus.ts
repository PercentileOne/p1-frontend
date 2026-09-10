// Bridges LiveAvatar's WebRTC audio into the interview recording. Kept as a separate module
// from ttsApi.ts's setTTSRecordingDestination, deliberately: LiveAvatar's audio arrives over
// WebRTC, not through the same AudioContext->destination path regular ElevenLabs TTS already
// uses — desktop recording relies on getDisplayMedia's tab-audio-capture (audio: true) to grab
// whatever's audible in the tab, which reliably captures that regular TTS path but not this
// one. Reusing ttsApi.ts's destination for this too would risk DOUBLE-capturing regular TTS on
// desktop (tab-capture already gets it independently) — a separate bus avoids that entirely.
//
// The audio source itself: originally this tapped the <video> element LiveAvatar's SDK attaches
// to, via createMediaElementSource(). That proved unreliable for this SDK's WebRTC-sourced audio
// — confirmed live via 20 consecutive 1-second samples of pure silence despite the element being
// correctly unmuted, the AudioContext running, and no errors anywhere in the chain. Now taps the
// RAW MediaStreamTrack directly instead (see useLiveAvatarSession.ts's attachIfReady for how
// it's obtained) via createMediaStreamSource() — the standard, reliable way to capture WebRTC
// audio for Web Audio API, bypassing the <video> element's decode/render pipeline entirely.

import { getMasterGain } from './ttsApi';

// LiveAvatar's raw WebRTC audio track plays noticeably quieter than ElevenLabs' own generated
// clips at native level — reported live the same day this tap first shipped. Applied on top of
// (not instead of) the shared master gain, so the volume slider still scales it proportionally
// rather than this boost fighting a user's own lower setting.
const LIVE_AVATAR_VOLUME_BOOST = 1.6;

let _recordingBusGain: GainNode | null = null;
// The destination most recently registered by useInterviewRecording. Kept even when no bus
// exists yet — recording almost always starts BEFORE either avatar has connected (it starts
// near the top of the room's lifecycle; avatars connect later, during their own intro lines),
// so setLiveAvatarRecordingDestination typically runs first, with nothing to connect to yet.
// Remembering it here means getRecordingBus can wire a freshly-created bus straight to it the
// moment the first avatar actually taps in, instead of only handling the reverse order.
let _currentDest: MediaStreamAudioDestinationNode | null = null;
let _currentCompressor: DynamicsCompressorNode | null = null;

function getRecordingBus(ctx: AudioContext): GainNode {
  if (!_recordingBusGain || _recordingBusGain.context !== ctx) {
    _recordingBusGain = ctx.createGain();
    _recordingBusGain.gain.value = 1;
    if (_currentDest) _recordingBusGain.connect(_currentCompressor ?? _currentDest);
  }
  return _recordingBusGain;
}

// Called by useInterviewRecording when a recording starts/stops.
export function setLiveAvatarRecordingDestination(
  dest: MediaStreamAudioDestinationNode | null,
  compressor?: DynamicsCompressorNode | null,
) {
  _recordingBusGain?.disconnect();
  _currentDest = dest;
  _currentCompressor = compressor ?? null;
  if (dest && _recordingBusGain) {
    _recordingBusGain.connect(compressor ?? dest);
  }
}

// Routes one LiveAvatar seat's raw audio track into the shared bus, and into the candidate's
// own listening path (via the master gain, so the volume slider and the boost above both
// apply). videoEl is muted here too (belt-and-braces — the authoritative mute now happens
// synchronously in useLiveAvatarSession.ts's attachIfReady, in the same tick as attach(), to
// close a real race: leaving it unmuted until THIS async tap finished wiring let the element's
// own native WebRTC audio play briefly, and a brand-new session's first-ever audio decode is
// well known to cold-start slower than video — browsers' native A/V sync then audibly sped
// audio up to resync, which is what candidates heard as "catching up" on Amina's first line
// every session, 2026-09-10). Kept here regardless: createMediaStreamSource does NOT take over
// an element's native output the way createMediaElementSource did, so without this the
// candidate would hear the avatar twice: once from the element's own native WebRTC playback,
// once from this tap's route through the master gain to the same destination.
//
// onAnalyser, if given, is handed a live AnalyserNode fed from the SAME boosted signal — lets
// the room's own WaveformBars react to the avatar's real voice instead of sitting on synthetic
// simulation, the same contract ttsApi.ts's speak() and InterviewerAvatar's own pre-rendered-
// video tap already give their callers.
export function tapLiveAvatarAudioForRecording(
  rawAudioTrack: MediaStreamTrack,
  videoEl: HTMLVideoElement,
  audioCtx: AudioContext,
  onAnalyser?: (a: AnalyserNode | null) => void,
): () => void {
  try {
    videoEl.muted = true;
    const source = audioCtx.createMediaStreamSource(new MediaStream([rawAudioTrack]));
    const boost = audioCtx.createGain();
    boost.gain.value = LIVE_AVATAR_VOLUME_BOOST;
    source.connect(boost);
    boost.connect(getMasterGain(audioCtx));
    boost.connect(getRecordingBus(audioCtx));
    let analyser: AnalyserNode | null = null;
    if (onAnalyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // matches WaveformBars' own analyser sizing elsewhere in this app
      analyser.smoothingTimeConstant = 0.75;
      boost.connect(analyser);
      onAnalyser(analyser);
    }
    // A freshly-created AudioContext can start life 'suspended' per the browser's autoplay
    // policy — same resume-defensively pattern as ttsApi.ts and InterviewerAvatar.tsx's own
    // video-analyser tap.
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return () => {
      try { source.disconnect(); boost.disconnect(); analyser?.disconnect(); } catch { /* already disconnected */ }
      onAnalyser?.(null);
    };
  } catch (err) {
    console.warn('[LiveAvatar] Could not tap raw audio track for recording:', err);
    return () => {};
  }
}
