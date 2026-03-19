import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'postvertebral-nonthematically-zayn.ngrok-free.dev'
    ],
    headers: {
      'Content-Security-Policy': "frame-ancestors https://meet.google.com",
    },
    hmr: {
      protocol: 'wss',
      clientPort: 443
    }
  }
})
