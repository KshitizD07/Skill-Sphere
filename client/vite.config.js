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
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    cssCodeSplit: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-3d';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
            return 'vendor-others';
          }
        }
      }
    }
  },

  server: {
    port: 5173,
    open: true
  }
})

