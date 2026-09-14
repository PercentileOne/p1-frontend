// Bridges LiveAvatar's WebRTC audio into the interview recording. Kept as a separate module
// from ttsApi.ts's setTTSRecordingDestination, deliberately: LiveAvatar's audio arrives over
// WebRTC, not through the same AudioContext->destination path regular ElevenLabs TTS already
// uses — desktop recording relies on getDisplayMedia's tab-audio-capture (audio: true) to grab
// whatever's audible in the tab, which reliably captures that regular TTS path but not this
// one. Reusing ttsApi.ts's destination for this too would risk DOUBLE-capturing regular TTS on
// desktop (tab-capture already gets it independently) — a separate bus avoids that entirely.
//
// 2026-09-14: this no longer creates its own MediaStreamAudioSourceNode from a raw track. That
// approach (a second, independent Web Audio pipeline running alongside the <video> element's own
// native WebRTC playback) was confirmed by HeyGen support to be the actual cause of the
// lips-before-sound glitch on a session's first utterance — two pipelines racing on startup.
// The real fix is livekit-client's own `webAudioMix` Room option: once a RemoteAudioTrack has an
// audioContext (set via webAudioMix at Room construction — see liveAvatarTransport.ts), calling
// track.attach(element) synchronously mutes the element's native output AND builds the Web Audio
// chain itself (element -> createMediaStreamSource -> [our plugin nodes] -> its own gain ->
// destination) — ONE pipeline, no race window, verified directly against livekit-client's
// installed source. This function's job now is just to build the plugin node chain LiveKit
// should splice in, via track.setWebAudioPlugins([boost]) — see useLiveAvatarSession.ts.

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

// Builds the boost node LiveKit should splice into ITS OWN webAudioMix chain for one LiveAvatar
// seat, via `remoteAudioTrack.setWebAudioPlugins([theReturnedNode])` — called from
// useLiveAvatarSession.ts's attachIfReady, right after transport.attach(). Fans the boosted
// signal out to the candidate's own listening path (master gain), the recording bus, and
// (if onAnalyser given) a live AnalyserNode for WaveformBars — same three destinations this
// always fed, just no longer the entry point of the chain: LiveKit's own
// createMediaStreamSource(element.srcObject) is now upstream of this, not us.
//
// No muting logic here anymore — RemoteAudioTrack.attach() mutes the native element and wires
// the Web Audio chain synchronously and atomically the moment it runs (see this file's own top
// comment), so there's no window where native playback could leak through.
export function tapLiveAvatarAudioForRecording(
  audioCtx: AudioContext,
  onAnalyser?: (a: AnalyserNode | null) => void,
): { node: GainNode; dispose: () => void } {
  const boost = audioCtx.createGain();
  boost.gain.value = LIVE_AVATAR_VOLUME_BOOST;
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
  return {
    node: boost,
    dispose: () => {
      try { boost.disconnect(); analyser?.disconnect(); } catch { /* already disconnected */ }
      onAnalyser?.(null);
    },
  };
}
