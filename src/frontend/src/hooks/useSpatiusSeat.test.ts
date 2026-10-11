import { describe, it, expect } from 'vitest';
import { isSafariBrowser } from './useSpatiusSeat';

const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
const CHROME_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/148.0.0.0 Mobile/15E148 Safari/604.1';
const EDGE_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0';
const FIREFOX_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

describe('isSafariBrowser', () => {
  it('is true for Safari on a Mac and on an iPhone', () => {
    expect(isSafariBrowser(SAFARI_MAC)).toBe(true);
    expect(isSafariBrowser(SAFARI_IPHONE)).toBe(true);
  });
  it('is false for Chrome, Edge, Firefox and Android browsers (they keep the normal flow)', () => {
    for (const ua of [CHROME_MAC, CHROME_IPHONE, EDGE_WIN, FIREFOX_MAC, ANDROID_CHROME]) expect(isSafariBrowser(ua)).toBe(false);
  });
  it('is false when there is no user agent', () => {
    expect(isSafariBrowser('')).toBe(false);
  });
});
