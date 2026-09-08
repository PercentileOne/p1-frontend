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
    source.connect(audioCtx.destination);
    source.connect(getRecordingBus(audioCtx));
    // A freshly-created AudioContext can start life 'suspended' per the browser's autoplay
    // policy — same resume-defensively pattern as ttsApi.ts and InterviewerAvatar.tsx's own
    // video-analyser tap.
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return () => { try { source.disconnect(); } catch { /* already disconnected */ } };
  } catch (err) {
    console.warn('[LiveAvatar] Could not tap video audio for recording:', err);
    return () => {};
  }
}
