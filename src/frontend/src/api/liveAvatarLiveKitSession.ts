import {
  Room,
  RoomEvent,
  VideoPresets,
  supportsAdaptiveStream,
  supportsDynacast,
  type RemoteTrack,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';
import { EventEmitter } from 'events';

// Direct livekit-client + raw WebSocket replacement for @heygen/liveavatar-web-sdk's
// LiveAvatarSession, built per HeyGen Advanced Support's own recommended path (2026-09-16) —
// the SDK (0.0.18) silently drops most inbound WS frames (only ever forwards
// agent.speak_started/agent.speak_ended through its typed emitter, regardless of what else the
// socket sends), including agent.state_updated, which real avatar pose state depends on.
//
// Deliberately narrower than the SDK: no FULL-mode LiveKit-data-channel command fallback, no
// voice-chat, no connection-quality indicator — none of those are used anywhere in this codebase
// (confirmed before writing this file). Every method below is a direct port of the SDK's own
// compiled source (node_modules/@heygen/liveavatar-web-sdk/lib/LiveAvatarSession/
// LiveAvatarSession.js + SessionApiClient.js + audio_utils.js + events.js), read line-by-line
// before writing this — not reconstructed from docs. Where a method's exact shape matters for
// parity with already-proven-working production behavior (see feedback-match-proven-config-
// exactly), that's called out inline.

const API_URL = 'https://api.liveavatar.com'; // mirrors the SDK's own lib/const.js API_URL
const HEYGEN_PARTICIPANT_ID = 'heygen';
const SUCCESS_CODE = 1000;

export const LiveAvatarSessionEvent = {
  SESSION_STREAM_READY: 'session.stream_ready',
  SESSION_DISCONNECTED: 'session.disconnected',
  AVATAR_SPEAK_STARTED: 'avatar.speak_started',
  AVATAR_SPEAK_ENDED: 'avatar.speak_ended',
  AGENT_STATE_UPDATED: 'agent.state_updated', // new — the event the old SDK dropped
} as const;

type SessionState = 'inactive' | 'connecting' | 'connected' | 'disconnecting' | 'disconnected';

interface SessionInfo {
  livekit_url: string;
  livekit_client_token: string;
  ws_url: string;
  session_id: string;
  max_session_duration: number;
}

export interface AgentStateUpdatedPayload {
  previousState: string | null;
  newState: string | null;
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers — same shape as the SDK's own fallback.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Mirrors @heygen/liveavatar-web-sdk's splitPcm24kStringToChunks (lib/audio_utils.js) EXACTLY —
// character-slice, 960 chars/chunk. Our own liveAvatarApi.ts::fetchAvatarAudioBase64 already
// base64-encodes the PCM before repeatAudio() is ever called, so despite the original function's
// PCM-byte framing in its own comments, what actually gets chunked in production (today, proven
// working) is the BASE64 STRING — individual chunks are only valid base64 once HeyGen's server
// reassembles every chunk for one event_id. Do not "fix" this to chunk raw bytes before encoding;
// that would be a different, unproven behavior — see feedback-match-proven-config-exactly.
function splitBase64ToChunks(base64: string): string[] {
  const CHARS_PER_CHUNK = 960;
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += CHARS_PER_CHUNK) {
    chunks.push(base64.slice(i, i + CHARS_PER_CHUNK));
  }
  return chunks;
}

async function request<T>(sessionToken: string, path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== SUCCESS_CODE) {
    throw new Error(data?.message || `LiveAvatar API request failed (${path}, HTTP ${response.status})`);
  }
  return data.data as T;
}

export class LiveAvatarLiveKitSession extends EventEmitter {
  private readonly sessionToken: string;
  private readonly _room: Room;
  private ws: WebSocket | null = null;
  private state: SessionState = 'inactive';
  private videoTrack: RemoteTrack | null = null;
  private audioTrackInternal: RemoteTrack | null = null;
  private tornDown = false;

  constructor(sessionToken: string) {
    super();
    this.sessionToken = sessionToken;
    // Exact RoomOptions the SDK itself uses — no webAudioMix, nothing else added.
    this._room = new Room({
      adaptiveStream: supportsAdaptiveStream() ? { pauseVideoInBackground: false } : false,
      dynacast: supportsDynacast(),
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    });
  }

  // Public on purpose — replaces the private `room` field reach useLiveAvatarSession.ts's
  // pollAudioStats used to do against the SDK's instance. Still an unsupported reach into
  // livekit-client's own internals from there (room.engine.pcManager.subscriber._pc) — that part
  // is livekit-client's structure, not this class's, and stays as-is regardless of which session
  // class owns the Room.
  get room(): Room {
    return this._room;
  }

  // Replaces the private `_remoteAudioTrack` field reach — same data, now a proper public getter.
  get audioTrack(): MediaStreamTrack | null {
    return (this.audioTrackInternal as unknown as { mediaStreamTrack?: MediaStreamTrack } | null)?.mediaStreamTrack ?? null;
  }

  async start(): Promise<void> {
    if (this.state !== 'inactive') {
      console.warn('[LiveAvatarLiveKitSession] Session is already started');
      return;
    }
    try {
      this.state = 'connecting';
      const sessionInfo = await request<SessionInfo>(this.sessionToken, '/v1/sessions/start');
      const { livekit_url, livekit_client_token, ws_url } = sessionInfo;

      if (livekit_url && livekit_client_token) {
        // Listener wiring happens BEFORE room.connect() resolves — matches the SDK exactly, so a
        // track subscribed the instant the handshake completes can't be missed.
        this.wireRoomEvents();
        await this._room.connect(livekit_url, livekit_client_token);
      }
      if (ws_url) {
        await this.connectWebSocket(ws_url);
        this.wireWebSocketEvents();
      }
      this.state = 'connected';
    } catch (err) {
      console.error('[LiveAvatarLiveKitSession] Session start failed:', err);
      this.teardown('start_failed');
      throw err;
    }
  }

  // SAFETY-CRITICAL: exactly this, nothing else. Zero Web Audio API involvement in the playback
  // path — this is the proven-clean configuration from commit b654002. A prior custom-transport
  // attempt (31d1f4a, reverted as 6d4130f) regressed live specifically because it added
  // webAudioMix processing here. Do not "improve" this method — see
  // feedback-match-proven-config-exactly and project-liveavatar-lipsync-investigation.
  attach(element: HTMLVideoElement): void {
    if (!this.videoTrack || !this.audioTrackInternal) {
      console.warn('[LiveAvatarLiveKitSession] Stream is not yet ready');
      return;
    }
    this.videoTrack.attach(element);
    this.audioTrackInternal.attach(element);
  }

  repeatAudio(audioBase64: string): void {
    if (this.state !== 'connected') throw new Error('Session needs to be connected to send command event');
    const eventId = generateEventId();
    for (const chunk of splitBase64ToChunks(audioBase64)) {
      this.send({ type: 'agent.speak', event_id: eventId, audio: chunk });
    }
    this.send({ type: 'agent.speak_end', event_id: eventId });
  }

  startListening(): void {
    if (this.state !== 'connected') throw new Error('Session needs to be connected to send command event');
    this.send({ type: 'agent.start_listening', event_id: generateEventId() });
  }

  stopListening(): void {
    if (this.state !== 'connected') throw new Error('Session needs to be connected to send command event');
    this.send({ type: 'agent.stop_listening', event_id: generateEventId() });
  }

  interrupt(): void {
    if (this.state !== 'connected') throw new Error('Session needs to be connected to send command event');
    this.send({ type: 'agent.interrupt', event_id: generateEventId() });
  }

  // Deliberately NOT awaited internally — matches the SDK's own keepAlive(), which never awaits
  // its internal REST call either (see useLiveAvatarSession.ts's keepAlive-interval comment: a
  // failed keep-alive is invisible to the caller by design/quirk of the original, not something
  // this replicates a "fix" for). The .catch() here only prevents a noisy unhandled-rejection
  // console warning; it does NOT surface the failure to this method's own caller — this resolves
  // immediately either way, same as the original.
  async keepAlive(): Promise<void> {
    if (this.state !== 'connected') return;
    request(this.sessionToken, '/v1/sessions/keep-alive').catch(err => {
      console.warn('[LiveAvatarLiveKitSession] keepAlive request failed:', err);
    });
  }

  async stop(): Promise<void> {
    if (this.state !== 'connected') return;
    this.state = 'disconnecting';
    this.teardown('client_initiated');
  }

  private wireRoomEvents(): void {
    let hasVideo = false;
    let hasAudio = false;
    this._room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (participant.identity !== HEYGEN_PARTICIPANT_ID) return;
      if (track.kind !== 'video' && track.kind !== 'audio') return;
      if (track.kind === 'video') { this.videoTrack = track; hasVideo = true; }
      else { this.audioTrackInternal = track; hasAudio = true; }
      if (hasVideo && hasAudio) this.emit(LiveAvatarSessionEvent.SESSION_STREAM_READY);
    });
    this._room.on(RoomEvent.Disconnected, () => this.teardown('room_disconnected'));
  }

  private connectWebSocket(url: string): Promise<void> {
    return new Promise(resolve => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
    });
  }

  private wireWebSocketEvents(): void {
    if (!this.ws) return;
    this.ws.onmessage = event => this.handleWebSocketMessage(event);
    this.ws.onerror = error => console.error('[LiveAvatarLiveKitSession] WebSocket error:', error);
    this.ws.onclose = event => {
      console.warn('[LiveAvatarLiveKitSession] WebSocket closed - code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean);
      if (this.state === 'disconnecting' || this.state === 'disconnected') return;
      this.teardown('websocket_closed');
    };
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    let frame: { type?: string; previous_state?: string; new_state?: string } | null = null;
    try {
      frame = JSON.parse(event.data);
    } catch (err) {
      console.error('[LiveAvatarLiveKitSession] Failed to parse WebSocket message:', err);
      return;
    }
    if (!frame) return;
    switch (frame.type) {
      case 'agent.speak_started':
        this.emit(LiveAvatarSessionEvent.AVATAR_SPEAK_STARTED);
        break;
      case 'agent.speak_ended':
        this.emit(LiveAvatarSessionEvent.AVATAR_SPEAK_ENDED);
        break;
      case 'agent.state_updated':
        this.emit(LiveAvatarSessionEvent.AGENT_STATE_UPDATED, {
          previousState: frame.previous_state ?? null,
          newState: frame.new_state ?? null,
        } satisfies AgentStateUpdatedPayload);
        break;
      default:
        // The SDK this replaces silently dropped every frame type except the two above, with
        // zero logging at all. This log line is a deliberate, safe addition (not a change to any
        // proven behavior) so a future unrecognized frame type is visible instead of vanishing.
        console.log('[LiveAvatarLiveKitSession] Unrecognized WS frame type:', frame.type);
    }
  }

  private send(frame: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Session needs to be connected to send command event');
    }
    this.ws.send(JSON.stringify(frame));
  }

  // Guarded by tornDown so a WS close and a Room disconnect arriving together (or one triggering
  // the other) can't double-fire cleanup or double-POST /v1/sessions/stop — a small, deliberate
  // safety improvement over the SDK's own handleRoomDisconnect(), which had no equivalent guard.
  // Fires the stopSession REST call without awaiting it (matches the SDK's own stop(), which
  // never awaits its cleanup() call either) — SESSION_DISCONNECTED fires as soon as the
  // synchronous teardown steps finish, same timing as production already relies on today.
  private teardown(reason: string): void {
    if (this.tornDown) return;
    this.tornDown = true;
    this.videoTrack?.stop();
    this.audioTrackInternal?.stop();
    this.videoTrack = null;
    this.audioTrackInternal = null;
    this._room.localParticipant.removeAllListeners();
    this._room.removeAllListeners();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    if (this._room.state === 'connected') this._room.disconnect();
    request(this.sessionToken, '/v1/sessions/stop').catch(err => {
      console.warn('[LiveAvatarLiveKitSession] stopSession request failed:', err);
    });
    this.state = 'disconnected';
    this.emit(LiveAvatarSessionEvent.SESSION_DISCONNECTED, reason);
  }
}
