// Bridges LiveAvatar's WebRTC audio into the interview recording. Kept as a separate module
// from ttsApi.ts's setTTSRecordingDestination, deliberately: LiveAvatar's <video> element
// plays its own WebRTC-attached audio track natively — it was never routed through the Web
// Audio graph at all — whereas desktop recording relies on getDisplayMedia's tab-audio-capture
// (audio: true) to grab whatever's audible in the tab. That reliably captures regular
// ElevenLabs TTS (a normal AudioContext->destination path) but does NOT reliably capture
// WebRTC-sourced audio attached to a <video> element the same way, which is why recordings
// had lip-synced avatar video with no voice at all. Reusing ttsApi.ts's destination for this
// too would risk DOUBLE-capturing regular TTS on desktop (tab-capture already gets it
// independently) — a separate bus avoids that entirely.

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
  // TEMP diagnostic logging — remove once the "no sound in recording" bug is confirmed fixed.
  console.log('[LiveAvatar][RecordingBus] setLiveAvatarRecordingDestination', {
    destSet: !!dest, busExistedAlready: !!_recordingBusGain,
  });
}

// Routes one LiveAvatar <video> element's audio into the shared bus. Must reconnect back to
// the AudioContext's own destination too — createMediaElementSource() silently takes over the
// element's native audio output, so skipping that step would make the avatar go silent for
// the candidate even though it still plays fine visually (same caveat InterviewerAvatar.tsx's
// pre-rendered-video audio tap already documents). Safe to call once per real <video> element
// — createMediaElementSource throws if called twice on the same element, which is why callers
// must guard against re-tapping the same element instance.
export function tapLiveAvatarAudioForRecording(videoEl: HTMLVideoElement, audioCtx: AudioContext): () => void {
  try {
    const source = audioCtx.createMediaElementSource(videoEl);
    const boost = audioCtx.createGain();
    boost.gain.value = LIVE_AVATAR_VOLUME_BOOST;
    source.connect(boost);
    // Through the shared master gain (not straight to destination) — this is what makes the
    // volume slider actually affect the avatars' live voices at all, on top of the boost above.
    boost.connect(getMasterGain(audioCtx));
    const bus = getRecordingBus(audioCtx);
    boost.connect(bus);
    // A freshly-created AudioContext can start life 'suspended' per the browser's autoplay
    // policy — same resume-defensively pattern as ttsApi.ts and InterviewerAvatar.tsx's own
    // video-analyser tap.
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    // TEMP diagnostic logging — remove once the "no sound in recording" bug is confirmed fixed.
    console.log('[LiveAvatar][RecordingBus] tapped video element', {
      videoElId: videoEl.id || '(no id)', audioCtxState: audioCtx.state,
      destCurrentlyRegistered: !!_currentDest, videoElMuted: videoEl.muted, videoElVolume: videoEl.volume,
    });
    return () => { try { source.disconnect(); boost.disconnect(); } catch { /* already disconnected */ } };
  } catch (err) {
    console.warn('[LiveAvatar] Could not tap video audio for recording:', err);
    return () => {};
  }
}
