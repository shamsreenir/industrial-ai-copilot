import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
      '/assets/organizer_test_gallery': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/assets/demo_images': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/assets/heatmaps': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/assets/uploads': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      }
    }
  }
})
