import { describe, expect, it } from 'vitest';
import { base64ToBytes, pcmRateOf, resamplePcm16, silence } from './pcmAudio';

function pcm(samples: number[]): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const v = new DataView(out.buffer);
  samples.forEach((s, i) => v.setInt16(i * 2, s, true));
  return out;
}
const read = (b: Uint8Array) => Array.from({ length: b.length / 2 }, (_, i) => new DataView(b.buffer, b.byteOffset).getInt16(i * 2, true));

describe('pcmAudio', () => {
  it('reads the sample rate from a format name and ignores formats that are not plain PCM', () => {
    expect(pcmRateOf('pcm_16000')).toBe(16000);
    expect(pcmRateOf('pcm_24000')).toBe(24000);
    expect(pcmRateOf('ulaw_8000')).toBeNull();
    expect(pcmRateOf(undefined)).toBeNull();
  });

  it('decodes base64', () => {
    expect(Array.from(base64ToBytes(btoa(String.fromCharCode(1, 2, 255))))).toEqual([1, 2, 255]);
  });

  it('leaves audio alone when the rates already match', () => {
    const a = pcm([1, 2, 3]);
    expect(resamplePcm16(a, 24000, 24000)).toBe(a);
  });

  it('gives one and a half times as many samples going from 16 kHz to 24 kHz, and keeps the shape of the wave', () => {
    const out = resamplePcm16(pcm([0, 3000, 6000, 3000, 0, -3000]), 16000, 24000);
    expect(out.length / 2).toBe(9);
    const s = read(out);
    expect(s[0]).toBe(0);
    expect(Math.max(...s)).toBeGreaterThan(5000);
    expect(Math.min(...s)).toBeLessThan(0);
  });

  it('makes silence of the right length', () => {
    expect(silence(24000, 20).byteLength).toBe(960);
    expect(silence(24000, 0).byteLength).toBe(2);
  });
});
