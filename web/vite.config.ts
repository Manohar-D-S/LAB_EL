import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    },
    allowedHosts: [
      '75f9-2401-4900-61a0-578d-1872-fc71-67e6-e74b.ngrok-free.app'
    ]
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

// This error means you are trying to run a Node.js server build that does not exist.
// For a Vite/React app, you should use the dev server, not `node dist/node/server/index.js`.
// To start your app for development, use:
  // npm run dev
// or
  // vite --host

// If you want a production build, use:
  // npm run build
  // npm run preview

// Remove or fix any "start" script in package.json that tries to run a non-existent server file.
