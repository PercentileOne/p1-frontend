import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { avatarkitVitePlugin } from '@spatius/avatarkit/vite'

// https://vite.dev/config/
export default defineConfig({
  // avatarkitVitePlugin serves/copies Spatius' WebAssembly renderer (needed only by the /dev/spatius-test page)
  plugins: [react(), avatarkitVitePlugin()],
  build: {
    // Lower the output so older Safari (the app otherwise never starts there: the page sits on "Loading…") can read it. Vite's default target keeps class static
    // blocks, which Safari before 16.4 cannot parse. Found 2026-10-12 when a visitor on Safari 15.6.1 (macOS Catalina's last Safari) saw nothing but the boot screen.
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
