import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { avatarkitVitePlugin } from '@spatius/avatarkit/vite'

// https://vite.dev/config/
export default defineConfig({
  // avatarkitVitePlugin serves/copies Spatius' WebAssembly renderer (needed only by the /dev/spatius-test page)
  plugins: [react(), avatarkitVitePlugin()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
