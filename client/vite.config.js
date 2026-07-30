import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },

  build: {
    minify: 'esbuild',
    chunkSizeWarningLimit: 700,
    sourcemap: false,
  },

  server: {
    port: 5173,
    open: true
  }
})

