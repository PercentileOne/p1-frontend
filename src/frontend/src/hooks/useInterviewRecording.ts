import { useCallback, useEffect, useRef, useState } from 'react';
import type { MCQQuestion } from '../api/aiScoring';
import { getTTSAudioContext, setTTSRecordingDestination } from '../api/ttsApi';
import type { CVContext, JobSpecContext } from '../utils/contextBuilder';
import { FILTER_CSS, type FilterPreset } from './useVideoFilter';
import type { ChapterMarker, McqResult, RoomPhase, SessionAnswer } from '../pages/interview-room/types';

const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

export interface UseInterviewRecordingParams {
  phase: RoomPhase;
  filterPreset: FilterPreset;
  /** The question currently on screen — burned into the mobile-path canvas caption while
   * phase is 'asking'/'answering', cleared otherwise. */
  questionText?: string;
  candidateId: string;
  authToken: string | null;
  jobTitle?: string;
  company?: string;
  /** Real account name — always available, unlike cvCtx.firstName/lastName, which is only
   * populated if a CV happened to be parsed for this specific session. */
  candidateName?: string;
}

export interface UseInterviewRecordingReturn {
  isRecording: boolean;
  recordingFailed: boolean;
  uploadStatus: 'idle' | 'uploading' | 'done' | 'error';
  startRecording: () => Promise<void>;
  /** mcqQuestions/mcqResults/mcqBonusPoints/cvCtx/jobCtx are passed at CALL TIME, not closed
   * over — see the doc comment above uploadRecording's definition for why that matters. */
  uploadRecording: (
    answers: SessionAnswer[],
    extra: { mcqQuestions: MCQQuestion[]; mcqResults: McqResult[]; mcqBonusPoints: number; cvCtx?: CVContext; jobCtx?: JobSpecContext },
  ) => void;
  buildPlaybackUrl: () => string | null;
  chapterMarkersRef: React.RefObject<ChapterMarker[]>;
  interviewIdRef: React.RefObject<string>;
  recordingStartTimeRef: React.RefObject<number>;
  videoElRef: React.RefObject<HTMLVideoElement | null>;
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useInterviewRecording(params: UseInterviewRecordingParams): UseInterviewRecordingReturn {
  const { phase, filterPreset, questionText, candidateId, authToken, jobTitle, company, candidateName } = params;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingFailed, setRecordingFailed] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  // Gates the candidate's own mic in the RECORDING only (never the live room — Sarah/James/
  // Mike are always heard live regardless) so the saved video isn't full of ambient noise —
  // coughs, background chatter — captured over the AI interviewers' lines. Muted by default,
  // opened only while phase === 'answering'; see the effect below that drives it.
  const micGainNodeRef = useRef<GainNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  // Hidden elements that composite the candidate's own webcam (+ a question caption) onto a
  // canvas, which is what's actually recorded. Deliberately NOT getDisplayMedia (screen/tab
  // capture) — no mobile browser exposes that API to web content at all, so relying on it meant
  // every mobile interview silently recorded nothing. canvas.captureStream() works identically
  // on desktop and mobile, needs only the same camera/mic permission the app already asks for.
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const recordDrawFrameRef = useRef<number>(0);
  const recordCaptionRef = useRef<string>('');
  const filterPresetRef = useRef<FilterPreset>(filterPreset);
  useEffect(() => { filterPresetRef.current = filterPreset; }, [filterPreset]);
  const chapterMarkersRef = useRef<ChapterMarker[]>([]);
  // Stable for the whole room session — used as the Cosmos doc id so the auto-upload
  // (below) and closeInterview's navigate() state always refer to the same saved record.
  const interviewIdRef = useRef<string>(crypto.randomUUID());

  // Opens the candidate's mic in the recording only during their own answering turn, muted
  // everything else — see micGainNodeRef's doc above. setTargetAtTime ramps over ~50ms rather
  // than snapping the gain instantly, avoiding an audible click/pop at the open and close.
  useEffect(() => {
    const node = micGainNodeRef.current;
    if (!node) return;
    node.gain.setTargetAtTime(phase === 'answering' ? 1 : 0, node.context.currentTime, 0.05);
  }, [phase]);

  // Keeps the mobile-path recording caption in sync without restarting the draw loop
  useEffect(() => {
    recordCaptionRef.current = (phase === 'asking' || phase === 'answering') ? (questionText ?? '') : '';
  }, [phase, questionText]);

  const startRecording = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supportsScreenCapture = typeof (navigator.mediaDevices as any)?.getDisplayMedia === 'function';
    try {
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      let compositeStream: MediaStream;

      if (supportsScreenCapture) {
        // Desktop — capture the full browser tab, unchanged: Sarah, James, question cards,
        // MCQ overlays, coaching, everything visible on screen.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tabStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { displaySurface: 'browser', frameRate: 30 },
          audio: true,           // captures ElevenLabs voices playing in the tab
          preferCurrentTab: true,
        });
        tabStreamRef.current = tabStream;

        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          micStreamRef.current = micStream;
        } catch { /* mic denied — tab audio only */ }

        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        // Limiter — tab audio (already containing the AI voices at full volume) and the raw
        // mic were both connecting straight to dest with no gain staging, so Web Audio just
        // summed them: two full-scale sources add up to a signal that clips, and the clipping
        // gets audibly worse exactly when the combined signal is louder. Routing both through
        // one compressor first keeps the mix under the ceiling instead of clipping past it.
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(dest);
        const tabAudioTracks = tabStream.getAudioTracks();
        if (tabAudioTracks.length > 0) {
          audioCtx.createMediaStreamSource(new MediaStream(tabAudioTracks)).connect(compressor);
        }
        if (micStream) {
          const micGain = audioCtx.createGain();
          micGain.gain.value = 0; // starts muted — the effect watching `phase` opens it
          micGainNodeRef.current = micGain;
          audioCtx.createMediaStreamSource(micStream).connect(micGain).connect(compressor);
        }

        compositeStream = new MediaStream([...tabStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

        tabStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          micStream?.getTracks().forEach(t => t.stop());
          audioCtx.close();
        });
      } else {
        // Mobile — no browser exposes screen/tab capture to web content here at all, so
        // getDisplayMedia would never even show a prompt. Fall back to the candidate's own
        // camera + a question caption composited onto a canvas, instead of silently
        // recording nothing. Desktop is untouched by this branch entirely.
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: true,
        });
        tabStreamRef.current = camStream; // stopped generically in uploadRecording's cleanup

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
          // Mirror the feed, matching every other self-view in this app. Desktop recording
          // is a tab-capture, so the appearance filter is already baked in visually — this
          // mobile path draws its own frame, so the same filter needs applying explicitly.
          ctx2d.save();
          ctx2d.scale(-1, 1);
          ctx2d.filter = FILTER_CSS[filterPresetRef.current];
          ctx2d.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx2d.restore();

          const caption = recordCaptionRef.current;
          if (caption) {
            ctx2d.font = '600 28px -apple-system, "Segoe UI", sans-serif';
            const words = caption.split(/\s+/);
            const lines: string[] = [];
            let line = '';
            for (const word of words) {
              const test = line ? `${line} ${word}` : word;
              if (line && ctx2d.measureText(test).width > canvas.width - 64) { lines.push(line); line = word; }
              else line = test;
            }
            if (line) lines.push(line);
            const capped = lines.slice(0, 3);
            const lineHeight = 36;
            const barHeight = capped.length * lineHeight + 32;
            ctx2d.fillStyle = 'rgba(6,10,20,0.75)';
            ctx2d.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
            ctx2d.fillStyle = '#ffffff';
            ctx2d.textBaseline = 'top';
            capped.forEach((l, i) => ctx2d.fillText(l, 32, canvas.height - barHeight + 16 + i * lineHeight));
          }

          recordDrawFrameRef.current = requestAnimationFrame(draw);
        };
        draw();

        const canvasStream = canvas.captureStream(30);

        // Mix candidate mic + AI interviewer voices (via the shared TTS AudioContext) into
        // one audio track — must be the SAME context speak() uses, nodes can't cross contexts.
        // Desktop doesn't need this: tab-audio capture above already includes ElevenLabs playback.
        const audioCtx = await getTTSAudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        // Same limiter fix as the desktop path above — mic and TTS voices (connected in
        // ttsApi.ts's speak(), via setTTSRecordingDestination) both route through this
        // compressor instead of landing on dest at full gain and summing into clipping.
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(dest);
        const micGain = audioCtx.createGain();
        micGain.gain.value = 0; // starts muted — the effect watching `phase` opens it
        micGainNodeRef.current = micGain;
        audioCtx.createMediaStreamSource(camStream).connect(micGain).connect(compressor);
        setTTSRecordingDestination(dest, compressor);

        compositeStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      }

      recordingStreamRef.current = compositeStream;
      recordingChunksRef.current = [];
      chapterMarkersRef.current = [];
      recordingStartTimeRef.current = Date.now();

      const recorder = new MediaRecorder(compositeStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.start(1000);
      setIsRecording(true);
      setRecordingFailed(false);
    } catch (err) {
      console.error('[InterviewRoom] Failed to start recording:', err);
      setRecordingFailed(true);
      // Interview continues unrecorded, but this is now visible in the status badge
      // instead of silently producing a video-less summary page.
    }
  }, []);

  // Snapshot current chunks into a local blob URL for immediate playback on summary screen.
  // Called BEFORE navigate so the URL is ready when the summary mounts.
  const buildPlaybackUrl = useCallback((): string | null => {
    if (recordingChunksRef.current.length === 0) return null;
    const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    return URL.createObjectURL(blob);
  }, []);

  // mcqQuestions/mcqResults/mcqBonusPoints/cvCtx/jobCtx are passed as call-time arguments
  // rather than closed over, DELIBERATELY — they change mid-session as background AI/MCQ
  // data streams in while Mike is still speaking. When this function used to depend on them
  // directly, every change gave it a new identity, which broke the true-unmount upload effect
  // below (it would fire on every one of those changes, stopping the still-running recorder
  // and uploading just Mike's intro, then never recording again). Taking them as arguments
  // instead means this function's own identity never changes, so that whole class of bug is
  // structurally impossible now, not just defended against — see the ref-indirection comment
  // below for how the previous version had to work around it before this change.
  const uploadRecording = useCallback((
    answers: SessionAnswer[],
    extra: { mcqQuestions: MCQQuestion[]; mcqResults: McqResult[]; mcqBonusPoints: number; cvCtx?: CVContext; jobCtx?: JobSpecContext },
  ) => {
    const recorder = mediaRecorderRef.current;
    const interviewId = interviewIdRef.current;

    // Persist the session even without a recording (screen-share permission denied) —
    // otherwise there'd be no record for the summary page to reload, or for Save/Share to act on.
    const finish = async (videoBlob: Blob | null) => {
      setUploadStatus('uploading');
      try {
        const overallScore = answers.length
          ? answers.reduce((s, a) => s + a.score.overallScore, 0) / answers.length
          : 0;
        const metadata = JSON.stringify({
          candidateId,
          interviewId,
          role: jobTitle,
          company,
          overallScore: Math.round(overallScore * 100),
          answers,
          mcqQuestions: extra.mcqQuestions,
          mcqResults: extra.mcqResults,
          mcqBonusPoints: extra.mcqBonusPoints,
          chapters: chapterMarkersRef.current,
          cvCtx: extra.cvCtx,
          jobCtx: extra.jobCtx,
          candidateName,
        });

        // A real video upload on a poor connection (public/hospital wifi, etc.) can genuinely
        // take a while, but with no timeout at all a stalled connection hangs this forever —
        // the interview never lands, and InterviewSummaryPage's "still uploading" poll then
        // waits on something that will never arrive, with no way for the candidate to know.
        // Timeout + one retry + a video-less fallback so a bad connection loses the video, not
        // the whole session.
        const attemptUpload = async (withVideo: boolean, timeoutMs: number) => {
          const form = new FormData();
          form.append('metadata', metadata);
          if (withVideo && videoBlob) form.append('video', videoBlob, 'session.webm');
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            return await fetch(`${API_BASE}/api/interviews/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${authToken ?? ''}` },
              body: form,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }
        };

        let res: Response | null = null;
        try {
          res = await attemptUpload(true, 120_000);
        } catch (err) {
          console.warn('[InterviewRoom] Upload attempt 1 failed, retrying once:', err);
          try {
            res = await attemptUpload(true, 120_000);
          } catch (err2) {
            console.error('[InterviewRoom] Upload retry also failed — falling back to metadata only, without video:', err2);
            if (videoBlob) {
              try {
                res = await attemptUpload(false, 30_000);
              } catch (err3) {
                console.error('[InterviewRoom] Metadata-only fallback also failed:', err3);
              }
            }
          }
        }

        setUploadStatus(res?.ok ? 'done' : 'error');
        if (!res?.ok) console.error('[InterviewRoom] Upload ultimately failed — no interview record was saved.', res);
      } catch (err) {
        console.error('[InterviewRoom] Unexpected error during upload:', err);
        setUploadStatus('error');
      }
    };

    if (!recorder || recorder.state === 'inactive' || recordingChunksRef.current.length === 0) {
      if (answers.length > 0) void finish(null);
      return;
    }
    recorder.onstop = () => {
      // Stop all streams — composite, tab/camera, and mic — and tear down the mobile-path
      // canvas draw loop + TTS recording tap (harmless no-ops if the desktop path ran instead)
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
      tabStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      tabStreamRef.current = null;
      micStreamRef.current = null;
      micGainNodeRef.current = null;
      cancelAnimationFrame(recordDrawFrameRef.current);
      setTTSRecordingDestination(null);
      setIsRecording(false);
      const mimeType = recordingChunksRef.current[0]?.type ?? 'video/webm';
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      void finish(blob);
    };
    recorder.stop();
  }, [candidateId, authToken, jobTitle, company, candidateName]);

  // Upload if component unmounts mid-session — TRUE unmount only (empty deps). A ref
  // indirection is kept even though uploadRecording's deps are now all session-stable values
  // (candidateId/authToken/jobTitle/company/candidateName never change mid-session) — cheap
  // insurance against exactly the historical bug this same pattern was built to prevent.
  const uploadRecordingRef = useRef(uploadRecording);
  useEffect(() => { uploadRecordingRef.current = uploadRecording; }, [uploadRecording]);
  useEffect(() => {
    return () => { uploadRecordingRef.current([], { mcqQuestions: [], mcqResults: [], mcqBonusPoints: 0 }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording, recordingFailed, uploadStatus,
    startRecording, uploadRecording, buildPlaybackUrl,
    chapterMarkersRef, interviewIdRef, recordingStartTimeRef,
    videoElRef, canvasElRef,
  };
}
