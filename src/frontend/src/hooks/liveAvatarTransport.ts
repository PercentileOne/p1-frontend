import {
  Room, RoomEvent, Track, VideoPresets, ConnectionState,
  supportsAdaptiveStream, supportsDynacast,
} from 'livekit-client';
import type { RemoteTrack, RemoteAudioTrack, RemoteParticipant, RemoteTrackPublication } from 'livekit-client';

// Replaces @heygen/liveavatar-web-sdk's LiveAvatarSession for this app's specific usage (LITE
// mode, voiceChat always off, never ElevenLabsAgentSession). Every REST endpoint, WebSocket
// message shape, and the SESSION_STREAM_READY condition below were copied directly from that
// package's own compiled source (node_modules/@heygen/liveavatar-web-sdk/lib/index.esm.js) —
// nothing here is guessed. The one thing genuinely different from the SDK: the Room is
// constructed with `webAudioMix`, which the SDK's own internal Room never sets and has no way to
// receive from a caller — confirmed by reading livekit-client's source directly. That option is
// what let the lips-before-sound glitch actually get fixed (see useLiveAvatarSession.ts) — a
// second, independent audio pipeline (our old custom tap) racing the native one on a session's
// first utterance, confirmed by HeyGen support 2026-09-14 after a clean two-for-two control test.

const API_URL = 'https://api.liveavatar.com';
const HEYGEN_PARTICIPANT_ID = 'heygen';
const SUCCESS_CODE = 1000;

interface SessionStartData {
  livekit_url: string;
  livekit_client_token: string;
  ws_url: string;
  session_id: string;
}

interface ApiEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

// Splits a PCM 24kHz base64 string into a 400ms first chunk (minimizes time-to-first-audio) then
// 1s subsequent chunks (reduces message overhead) — ported verbatim from the SDK's own
// splitPcm24kStringToChunks, already verified correct against HeyGen's own unit test during the
// "does repeatAudio() chunk correctly" branch of this investigation (2026-09-13, frame-cap theory
// retracted). Do not "fix" the slice-by-character-count-of-a-base64-string approach — this exact
// behavior is what's already proven working in production.
function splitPcm24kStringToChunks(pcmString: string): string[] {
  const firstChunkBytes = 24000 * 0.4 * 2; // 19200 == 400ms
  const subsequentChunkBytes = 24000 * 1.0 * 2; // 48000 == 1s
  const totalLength = pcmString.length;
  const result: string[] = [];
  if (totalLength === 0) return result;
  result.push(pcmString.slice(0, firstChunkBytes));
  for (let i = firstChunkBytes; i < totalLength; i += subsequentChunkBytes) {
    result.push(pcmString.slice(i, i + subsequentChunkBytes));
  }
  return result;
}

interface TransportEventMap {
  streamReady: () => void;
  disconnected: (reason?: unknown) => void;
  speakStarted: () => void;
  speakEnded: () => void;
}

export class LiveAvatarTransport {
  readonly room: Room;
  sessionId: string | null = null;

  private sessionToken: string;
  private socket: WebSocket | null = null;
  private videoTrack: RemoteTrack | null = null;
  private audioTrack: RemoteAudioTrack | null = null;
  private listeners: { [K in keyof TransportEventMap]: Set<TransportEventMap[K]> } = {
    streamReady: new Set(),
    disconnected: new Set(),
    speakStarted: new Set(),
    speakEnded: new Set(),
  };

  constructor(sessionToken: string, audioContext: AudioContext) {
    this.sessionToken = sessionToken;
    // Same base options @heygen/liveavatar-web-sdk's own Room construction uses, plus
    // webAudioMix — the one option that Room needs at construction time and cannot receive
    // after the fact (confirmed against livekit-client's source: it's read in
    // acquireAudioContext/createParticipant, both only ever called from the constructor's own
    // setup path).
    this.room = new Room({
      adaptiveStream: supportsAdaptiveStream() ? { pauseVideoInBackground: false } : false,
      dynacast: supportsDynacast(),
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
      webAudioMix: { audioContext },
    });
  }

  on<K extends keyof TransportEventMap>(event: K, cb: TransportEventMap[K]) {
    this.listeners[event].add(cb);
  }
  off<K extends keyof TransportEventMap>(event: K, cb: TransportEventMap[K]) {
    this.listeners[event].delete(cb);
  }
  private emit<K extends keyof TransportEventMap>(event: K, ...args: Parameters<TransportEventMap[K]>) {
    this.listeners[event].forEach(cb => (cb as (...a: unknown[]) => void)(...args));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${this.sessionToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json() as ApiEnvelope<T>;
    if (!res.ok || body.code !== SUCCESS_CODE) {
      throw new Error(body.message || `LiveAvatar API request failed (${res.status})`);
    }
    return body.data;
  }

  // Resolves once both the HeyGen participant's video AND audio tracks have been subscribed —
  // the SDK's entire SESSION_STREAM_READY implementation is exactly this condition, nothing more
  // (verified against its trackEvents() method). A 5s safety timeout mirrors the same guard
  // useLiveAvatarSession.ts's connect() already had around the SDK's own event.
  async start(): Promise<void> {
    const info = await this.request<SessionStartData>('/v1/sessions/start', { method: 'POST' });
    this.sessionId = info.session_id;

    let videoSubscribed = false;
    let audioSubscribed = false;
    const streamReadyPromise = new Promise<void>((resolve) => {
      const onTrackSubscribed = (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (participant.identity !== HEYGEN_PARTICIPANT_ID) return;
        if (track.kind === Track.Kind.Video) { this.videoTrack = track; videoSubscribed = true; }
        if (track.kind === Track.Kind.Audio) { this.audioTrack = track as RemoteAudioTrack; audioSubscribed = true; }
        if (videoSubscribed && audioSubscribed) {
          this.room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
          this.emit('streamReady');
          resolve();
        }
      };
      this.room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    });

    this.room.on(RoomEvent.Disconnected, (reason) => this.emit('disconnected', reason));

    await this.room.connect(info.livekit_url, info.livekit_client_token);
    await this.connectSocket(info.ws_url);

    await Promise.race([
      streamReadyPromise,
      new Promise<void>(resolve => setTimeout(resolve, 5000)),
    ]);
  }

  private connectSocket(wsUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;
      socket.onopen = () => resolve();
      socket.onmessage = (event) => this.handleSocketMessage(event);
      socket.onerror = (err) => console.error('[LiveAvatarTransport] WebSocket error:', err);
      socket.onclose = (event) => {
        console.warn('[LiveAvatarTransport] WebSocket closed', event.code, event.reason);
      };
    });
  }

  private handleSocketMessage(event: MessageEvent) {
    let data: { type?: string } | null = null;
    try { data = JSON.parse(event.data as string); } catch { return; }
    if (!data) return;
    if (data.type === 'agent.speak_started') this.emit('speakStarted');
    else if (data.type === 'agent.speak_ended') this.emit('speakEnded');
  }

  // WebSocket first, LiveKit data-channel fallback — same resilience the SDK's own
  // sendCommandEvent has (publishData on the "agent-control" topic when the socket isn't open
  // but the room is still connected), not incidental complexity to drop.
  private sendCommand(payload: Record<string, unknown>) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return;
    }
    if (this.room.state === ConnectionState.Connected) {
      const data = new TextEncoder().encode(JSON.stringify(payload));
      this.room.localParticipant.publishData(data, { reliable: true, topic: 'agent-control' });
      return;
    }
    console.warn('[LiveAvatarTransport] No active connection to send command:', payload.type);
  }

  attach(el: HTMLVideoElement) {
    this.videoTrack?.attach(el);
    this.audioTrack?.attach(el);
  }

  // For the caller to splice our recording/boost nodes into LiveKit's own webAudioMix chain via
  // audioTrack.setWebAudioPlugins([...]) — see useLiveAvatarSession.ts's attachIfReady.
  getAudioTrack(): RemoteAudioTrack | null {
    return this.audioTrack;
  }

  repeatAudio(base64: string) {
    const eventId = crypto.randomUUID();
    for (const chunk of splitPcm24kStringToChunks(base64)) {
      this.sendCommand({ type: 'agent.speak', event_id: eventId, audio: chunk });
    }
    this.sendCommand({ type: 'agent.speak_end', event_id: eventId });
  }

  interrupt() {
    this.sendCommand({ type: 'agent.interrupt', event_id: crypto.randomUUID() });
  }
  startListening() {
    this.sendCommand({ type: 'agent.start_listening', event_id: crypto.randomUUID() });
  }
  stopListening() {
    this.sendCommand({ type: 'agent.stop_listening', event_id: crypto.randomUUID() });
  }

  async keepAlive(): Promise<void> {
    await this.request('/v1/sessions/keep-alive', { method: 'POST' });
  }

  async stop(): Promise<void> {
    try { await this.request('/v1/sessions/stop', { method: 'POST' }); } catch { /* best-effort */ }
    this.socket?.close();
    this.socket = null;
    await this.room.disconnect();
    this.videoTrack = null;
    this.audioTrack = null;
  }
}
