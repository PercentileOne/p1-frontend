// Bridges LiveAvatar's WebRTC audio into the interview recording. Kept as a separate module
// from ttsApi.ts's setTTSRecordingDestination, deliberately: LiveAvatar's audio arrives over
// WebRTC, not through the same AudioContext->destination path regular ElevenLabs TTS already
// uses — desktop recording relies on getDisplayMedia's tab-audio-capture (audio: true) to grab
// whatever's audible in the tab, which reliably captures that regular TTS path but not this
// one. Reusing ttsApi.ts's destination for this too would risk DOUBLE-capturing regular TTS on
// desktop (tab-capture already gets it independently) — a separate bus avoids that entirely.
//
// 2026-09-14: this tap is now RECORDING-ONLY — it never connects to getMasterGain/speaker
// output. The native <video> element (unmuted, untouched — see useLiveAvatarSession.ts) is the
// only thing that ever plays this audio for the candidate to hear; this tap is a silent sidecar
// that captures the same raw track purely for the recording bus + waveform analyser. Two
// consumers of one track, only one of them ever reaches a speaker — the previous version had
// this tap ALSO feeding getMasterGain, making it a second, independent playback pipeline racing
// the native element's own, which HeyGen support confirmed was the actual cause of the
// lips-before-sound glitch this whole file's history below was chasing. No volume boost applied
// here either, for the same reason — see liveAvatarApi.ts's fetchAvatarAudioBase64, which now
// boosts the raw PCM samples themselves before they're ever sent to HeyGen, so the native
// element already plays back loud audio without any destination-side processing at all.
//
// The audio source itself: originally this tapped the <video> element LiveAvatar's SDK attaches
// to, via createMediaElementSource(). That proved unreliable for this SDK's WebRTC-sourced audio
// — confirmed live via 20 consecutive 1-second samples of pure silence despite the element being
// correctly unmuted, the AudioContext running, and no errors anywhere in the chain. Now taps the
// RAW MediaStreamTrack directly instead (see useLiveAvatarSession.ts's attachIfReady for how
// it's obtained) via createMediaStreamSource() — the standard, reliable way to capture WebRTC
// audio for Web Audio API, bypassing the <video> element's decode/render pipeline entirely.

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

// Routes one LiveAvatar seat's raw audio track into the recording bus only — see this file's own
// top comment for why it deliberately never connects to getMasterGain/speaker output. Wired as
// soon as a session is stream-ready (useLiveAvatarSession.ts's wireTapIfReady), which can happen
// well before the <video> element even exists (it only mounts once the avatar becomes visually
// relevant) — this tap never needed the element at all, it reads the raw track directly.
//
// onAnalyser, if given, is handed a live AnalyserNode fed from the same signal — lets the room's
// own WaveformBars react to the avatar's real voice instead of sitting on synthetic simulation,
// the same contract ttsApi.ts's speak() and InterviewerAvatar's own pre-rendered-video tap
// already give their callers.
export function tapLiveAvatarAudioForRecording(
  rawAudioTrack: MediaStreamTrack,
  audioCtx: AudioContext,
  onAnalyser?: (a: AnalyserNode | null) => void,
): () => void {
  try {
    const source = audioCtx.createMediaStreamSource(new MediaStream([rawAudioTrack]));
    const bus = audioCtx.createGain(); // unity gain — audio is already boosted at the PCM source, see liveAvatarApi.ts
    source.connect(bus);
    bus.connect(getRecordingBus(audioCtx));
    let analyser: AnalyserNode | null = null;
    if (onAnalyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // matches WaveformBars' own analyser sizing elsewhere in this app
      analyser.smoothingTimeConstant = 0.75;
      bus.connect(analyser);
      onAnalyser(analyser);
    }
    // A freshly-created AudioContext can start life 'suspended' per the browser's autoplay
    // policy — same resume-defensively pattern as ttsApi.ts and InterviewerAvatar.tsx's own
    // video-analyser tap.
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return () => {
      try { source.disconnect(); bus.disconnect(); analyser?.disconnect(); } catch { /* already disconnected */ }
      onAnalyser?.(null);
    };
  } catch (err) {
    console.warn('[LiveAvatar] Could not tap raw audio track for recording:', err);
    return () => {};
  }
}
