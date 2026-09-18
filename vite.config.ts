import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  // Same proxy for the built app, so a deployed preview reaches the mock API
  // running beside it.
  preview: {
    // The preview server only answers hosts it knows; the deployed one isn't
    // localhost.
    allowedHosts: ['.onrender.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: { sourcemap: true },
});
