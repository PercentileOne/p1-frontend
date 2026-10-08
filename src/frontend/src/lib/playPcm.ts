import { getTTSAudioContext } from '../api/ttsApi';

/**
 * Plays a raw PCM16 mono 24 kHz clip (what the interviewers' voice service returns) through the page's shared audio context. Used when a face can't be drawn
 * (a phone, or the face service is unavailable) so the visitor still hears the voice, which is the main point of the "Say hi" previews.
 */
export async function playPcm(pcm: Uint8Array): Promise<void> {
  const ctx = await getTTSAudioContext();
  const samples = Math.floor(pcm.byteLength / 2);
  const buf = ctx.createBuffer(1, samples, 24000);
  const ch = buf.getChannelData(0);
  const view = new DataView(pcm.buffer, pcm.byteOffset, samples * 2);
  for (let i = 0; i < samples; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
  await new Promise<void>(resolve => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const ceiling = window.setTimeout(resolve, (samples / 24000) * 1000 + 3000); // a suspended sound system never reports the end
    src.onended = () => { window.clearTimeout(ceiling); resolve(); };
    src.start();
  });
}
