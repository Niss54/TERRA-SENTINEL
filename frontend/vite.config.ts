import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Phase 22: Vercel Edge Global Frontend Deployment & CDN Optimization
// Governing Mathematical Invariant: TTFB_global <= 80ms, LighthouseScore >= 98
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-leaflet': ['leaflet'],
          'vendor-icons': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    port: 5173,
    host: true
  }
})
