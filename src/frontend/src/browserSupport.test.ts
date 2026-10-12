import { describe, it, expect } from 'vitest';

// Safari before 16.4 cannot PARSE a script that contains a regex look-behind, so one such literal anywhere in the app's main bundle stops the whole app from starting
// there: the page sits on "Loading…" for ever and logs nothing. Found 2026-10-12 when a visitor on Safari 15.6.1 (macOS Catalina's last Safari) could not use the demo.
// Keep look-behinds out of the app's own source (split on a captured group and a marker instead).
const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('older Safari can still start the app', () => {
  it('has no regex look-behind in the app source', () => {
    const hits = Object.entries(sources)
      .filter(([file, text]) => !/\.test\.(ts|tsx)$/.test(file) && /\(\?<[=!]/.test(text))
      .map(([file]) => file);
    expect(Object.keys(sources).length).toBeGreaterThan(50); // the glob really found the source
    expect(hits).toEqual([]);
  });
});
