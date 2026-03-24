import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'log-requests',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          console.log(`[REQUEST] ${req.method} ${req.url}`);
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    strictPort: true,
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' https://meet.google.com https://*.google.com",
      'X-Frame-Options': 'ALLOWALL',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: false
  }
})