import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies API calls to the Express server so the browser can use
// same-origin relative URLs (`/api/...`) in both dev and production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
