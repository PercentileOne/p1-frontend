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
// apply). videoEl is muted here rather than left alone — createMediaStreamSource does NOT take
// over an element's native output the way createMediaElementSource did, so without this the
// candidate would hear the avatar twice: once from the element's own native WebRTC playback,
// once from this tap's route through the master gain to the same destination.
export function tapLiveAvatarAudioForRecording(
  rawAudioTrack: MediaStreamTrack,
  videoEl: HTMLVideoElement,
  audioCtx: AudioContext,
): () => void {
  try {
    videoEl.muted = true;
    const source = audioCtx.createMediaStreamSource(new MediaStream([rawAudioTrack]));
    const boost = audioCtx.createGain();
    boost.gain.value = LIVE_AVATAR_VOLUME_BOOST;
    source.connect(boost);
    boost.connect(getMasterGain(audioCtx));
    boost.connect(getRecordingBus(audioCtx));
    // A freshly-created AudioContext can start life 'suspended' per the browser's autoplay
    // policy — same resume-defensively pattern as ttsApi.ts and InterviewerAvatar.tsx's own
    // video-analyser tap.
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    // TEMP diagnostic logging — remove once the "no sound in recording" bug is confirmed fixed
    // against this new raw-track approach. Samples every second for 20s: any non-zero sample
    // confirms real audio is flowing through this specific tap; all-zero for the whole window
    // would mean something is still wrong even with the raw track.
    console.log(`[DIAG v2] tapped raw audio track: audioCtxState=${audioCtx.state} destRegistered=${!!_currentDest} trackReadyState=${rawAudioTrack.readyState} trackEnabled=${rawAudioTrack.enabled} trackMuted=${rawAudioTrack.muted}`);
    const levelCheck = audioCtx.createAnalyser();
    levelCheck.fftSize = 256;
    boost.connect(levelCheck);
    const data = new Uint8Array(levelCheck.frequencyBinCount);
    let sampleCount = 0;
    const intervalId = setInterval(() => {
      sampleCount++;
      levelCheck.getByteFrequencyData(data);
      const peak = Math.max(...data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      console.log(`[DIAG v2] level sample #${sampleCount} (t=${sampleCount}s): peak=${peak} avg=${avg.toFixed(1)} (0=silence, up to 255)`);
      if (sampleCount >= 20) {
        clearInterval(intervalId);
        try { levelCheck.disconnect(); } catch { /* already gone */ }
      }
    }, 1000);
    return () => { try { source.disconnect(); boost.disconnect(); } catch { /* already disconnected */ } };
  } catch (err) {
    console.warn('[LiveAvatar] Could not tap raw audio track for recording:', err);
    return () => {};
  }
}
