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

function getRecordingBus(ctx: AudioContext): GainNode {
  if (!_recordingBusGain || _recordingBusGain.context !== ctx) {
    _recordingBusGain = ctx.createGain();
    _recordingBusGain.gain.value = 1;
  }
  return _recordingBusGain;
}

// Called by useInterviewRecording when a recording starts/stops — the bus itself is created
// lazily on first avatar tap, so this can be called before or after any avatar has connected,
// in either order, without losing audio either way. The bus's own connection is the only
// state that needs to persist between calls; dest/compressor are only ever needed for this
// one connect() call, not stored beyond it.
export function setLiveAvatarRecordingDestination(
  dest: MediaStreamAudioDestinationNode | null,
  compressor?: DynamicsCompressorNode | null,
) {
  _recordingBusGain?.disconnect();
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
