import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deliberately separate from vite.config.ts, not merged — that file is what the real
// `tsc -b && vite build` production gate reads, and this refactor should never risk touching
// it. globals is off on purpose: with tsconfig.app.json's strict settings already gating the
// production type-check, every test file does `import { describe, it, expect, vi } from
// 'vitest'` explicitly rather than adding "vitest/globals" to that same tsconfig.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
  },
})
