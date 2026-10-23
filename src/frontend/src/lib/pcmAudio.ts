// Small helpers for the live talking guide: the conversation service sends the agent's voice as base64 pieces of 16-bit mono PCM at the agent's own sample rate (often 16 kHz),
// while the Spatius face is set up for 24 kHz. These turn one into the other. Plain functions so they can be tested.

/** Decodes a base64 string into bytes. */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The sample rate in a format name such as "pcm_16000", or null when the format is not plain PCM (for example "ulaw_8000"). */
export function pcmRateOf(format: string | undefined | null): number | null {
  const m = /^pcm_(\d{4,6})$/.exec((format ?? '').trim());
  return m ? Number(m[1]) : null;
}

/** Resamples little-endian 16-bit mono PCM from one rate to another (linear interpolation). The same rate returns the bytes unchanged. */
export function resamplePcm16(bytes: Uint8Array, fromRate: number, toRate: number): Uint8Array {
  if (fromRate === toRate || bytes.length < 2) return bytes;
  const inSamples = Math.floor(bytes.length / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, inSamples * 2);
  const outSamples = Math.max(1, Math.round((inSamples * toRate) / fromRate));
  const out = new Uint8Array(outSamples * 2);
  const outView = new DataView(out.buffer);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outSamples; i++) {
    const pos = i * ratio;
    const i0 = Math.min(inSamples - 1, Math.floor(pos));
    const i1 = Math.min(inSamples - 1, i0 + 1);
    const frac = pos - i0;
    const s = view.getInt16(i0 * 2, true) * (1 - frac) + view.getInt16(i1 * 2, true) * frac;
    outView.setInt16(i * 2, Math.max(-32768, Math.min(32767, Math.round(s))), true);
  }
  return out;
}

/** A short run of silence (PCM16 mono at the given rate), used to close an agent turn cleanly. */
export function silence(rate: number, ms: number): ArrayBuffer {
  return new ArrayBuffer(Math.max(2, Math.round((rate * ms) / 1000) * 2));
}
