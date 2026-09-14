import { useCallback, useEffect, useRef, useState } from 'react';
import { getTTSAudioContext, setTTSRecordingDestination } from '../api/ttsApi';
import { setLiveAvatarRecordingDestination } from '../api/liveAvatarRecordingBus';

export interface UseTalkRecordingParams {
  /** True only while the candidate should be audible in the recording — Talks have no per-turn
   * answering phase like interviews, but ambient mic noise under Mike's/Amina's/Wayne's own
   * spoken lines is still worth avoiding, same reasoning as useInterviewRecording.ts's
   * phase==='answering' gating. Pass `phase === 'talk'` from the caller. */
  micOpen: boolean;
}

export interface UseTalkRecordingReturn {
  isRecording: boolean;
  recordingFailed: boolean;
  startRecording: () => Promise<void>;
  /** Stops the recorder and resolves with the recorded blob (null if nothing was captured or
   * recording never started) — awaited before uploadTalk() so the blob is ready in time. */
  stopRecording: () => Promise<Blob | null>;
  videoElRef: React.RefObject<HTMLVideoElement | null>;
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
}

// Talk-room counterpart to useInterviewRecording.ts — deliberately a separate, smaller hook
// rather than reusing that one as-is: its uploadRecording() hardcodes interview-shaped
// metadata and POSTs to /api/interviews/upload, which would silently write bogus documents
// into the wrong Cosmos container if reused directly (see TalkRoomPage.tsx's own prior
// top-comment, now resolved by this file existing). This hook owns ONLY the capture mechanics
// (getDisplayMedia/canvas + MediaRecorder) — TalkRoomPage.tsx itself calls uploadTalk() with
// the resulting blob, reusing the upload plumbing that already existed and already supports
// video (Features/Talks/Endpoint.cs's /api/talks/upload always has, it just never received one).
export function useTalkRecording({ micOpen }: UseTalkRecordingParams): UseTalkRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFailed, setRecordingFailed] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  // Mobile-only canvas-composite path — see useInterviewRecording.ts's identical elements for
  // why getDisplayMedia can't be relied on there (no mobile browser exposes tab/screen capture
  // to web content at all).
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const recordDrawFrameRef = useRef<number>(0);

  // Opens the candidate's mic in the recording only while micOpen is true — same ramped
  // setTargetAtTime approach as useInterviewRecording.ts, avoiding an audible click/pop.
  useEffect(() => {
    const node = micGainNodeRef.current;
    if (!node) return;
    node.gain.setTargetAtTime(micOpen ? 1 : 0, node.context.currentTime, 0.05);
  }, [micOpen]);

  const startRecording = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supportsScreenCapture = typeof (navigator.mediaDevices as any)?.getDisplayMedia === 'function';
    try {
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      let compositeStream: MediaStream;

      if (supportsScreenCapture) {
        // Desktop — capture the full browser tab: Amina, Wayne, Mike, everything visible.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tabStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { displaySurface: 'browser', frameRate: 30 },
          audio: true,
          preferCurrentTab: true,
        });
        tabStreamRef.current = tabStream;

        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          micStreamRef.current = micStream;
        } catch { /* mic denied — tab audio only */ }

        // Shared TTS context, not a fresh local one — LiveAvatar's audio tap (see
        // liveAvatarRecordingBus.ts) needs to connect into this SAME graph.
        const audioCtx = await getTTSAudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        // Limiter — same reasoning as useInterviewRecording.ts: tab audio + raw mic both at
        // full scale would sum into clipping without gain staging first.
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(dest);
        const tabAudioTracks = tabStream.getAudioTracks();
        if (tabAudioTracks.length > 0) {
          audioCtx.createMediaStreamSource(new MediaStream(tabAudioTracks)).connect(compressor);
        }
        if (micStream) {
          const micGain = audioCtx.createGain();
          micGain.gain.value = 0; // starts muted — the effect watching micOpen opens it
          micGainNodeRef.current = micGain;
          audioCtx.createMediaStreamSource(micStream).connect(micGain).connect(compressor);
        }
        // Wire the LiveAvatar recording tap in here — same fix as useInterviewRecording.ts
        // (2026-09-14): getDisplayMedia's tab-audio-capture does not reliably grab a raw WebRTC
        // <video> element's own native playback (LiveAvatar's sole audio path since this
        // morning's native-<video>-only fix), so both avatars need the explicit recording-only
        // tap wired to this same destination — building this hook AFTER that fix landed, so it
        // starts correct rather than needing the same live-tested correction later.
        setLiveAvatarRecordingDestination(dest, compressor);

        compositeStream = new MediaStream([...tabStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

        tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          micStream?.getTracks().forEach(t => t.stop());
          // Disconnect only — audioCtx is the shared TTS context, other things in the app still
          // need it, so it must never be closed here.
          compressor.disconnect();
        });
      } else {
        // Mobile — no browser exposes screen/tab capture to web content here at all, so
        // getDisplayMedia would never even show a prompt. Fall back to the candidate's own
        // camera composited onto a canvas, same as useInterviewRecording.ts's mobile path —
        // trimmed here since talks have no per-question caption to burn into the frame.
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: true,
        });
        tabStreamRef.current = camStream;

        const video = videoElRef.current;
        const canvas = canvasElRef.current;
        if (!video || !canvas) throw new Error('recording canvas not mounted');
        video.srcObject = camStream;
        await video.play();

        canvas.width = 1280;
        canvas.height = 720;
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) throw new Error('canvas 2d context unavailable');

        const draw = () => {
          // Mirror the feed, matching every other self-view in this app.
          ctx2d.save();
          ctx2d.scale(-1, 1);
          ctx2d.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx2d.restore();
          recordDrawFrameRef.current = requestAnimationFrame(draw);
        };
        draw();

        const canvasStream = canvas.captureStream(30);

        // Mix candidate mic + Mike's/Amina's/Wayne's voices into one audio track — must be the
        // SAME context speak() and LiveAvatar's tap use, nodes can't cross contexts.
        const audioCtx = await getTTSAudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(dest);
        const micGain = audioCtx.createGain();
        micGain.gain.value = 0; // starts muted — the effect watching micOpen opens it
        micGainNodeRef.current = micGain;
        audioCtx.createMediaStreamSource(camStream).connect(micGain).connect(compressor);
        setTTSRecordingDestination(dest, compressor);
        setLiveAvatarRecordingDestination(dest, compressor);

        compositeStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      }

      recordingStreamRef.current = compositeStream;
      recordingChunksRef.current = [];

      const recorder = new MediaRecorder(compositeStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.start(1000);
      setIsRecording(true);
      setRecordingFailed(false);
    } catch (err) {
      console.error('[TalkRoom] Failed to start recording:', err);
      setRecordingFailed(true);
      // Talk continues unrecorded — transcript/scoring/save all work without video.
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
      recorder.onstop = () => {
        recordingStreamRef.current?.getTracks().forEach(t => t.stop());
        tabStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        tabStreamRef.current = null;
        micStreamRef.current = null;
        micGainNodeRef.current = null;
        cancelAnimationFrame(recordDrawFrameRef.current);
        setTTSRecordingDestination(null);
        setLiveAvatarRecordingDestination(null);
        setIsRecording(false);
        if (recordingChunksRef.current.length === 0) { resolve(null); return; }
        const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
        resolve(new Blob(recordingChunksRef.current, { type: mimeType }));
      };
      recorder.stop();
    });
  }, []);

  // Stop everything on true unmount, mirroring useInterviewRecording.ts — a live recording left
  // open on navigation away is both a resource leak and a billable getDisplayMedia session.
  useEffect(() => () => {
    cancelAnimationFrame(recordDrawFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    tabStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { isRecording, recordingFailed, startRecording, stopRecording, videoElRef, canvasElRef };
}
