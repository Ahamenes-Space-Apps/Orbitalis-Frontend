import { defineConfig } from 'vitest/config';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Dev/preview target for `/api` when the client runs with VITE_API_URL=/api/v1.
// Defaults to the production API; set ORB_API_PROXY_TARGET=http://localhost:8080
// to work against a local backend instead.
const apiTarget =
  process.env.ORB_API_PROXY_TARGET ??
  'https://orbitalis-api-894548039245.me-central1.run.app';

// Cloud Run only allows configured origins. The browser talks to Vite
// same-origin, so the proxy drops `Origin` before forwarding. Dev-only; no
// credentials are added and the app's own calls are unchanged.
const apiProxy: Record<string, ProxyOptions> = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (request) => request.removeHeader('origin'));
    },
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  build: {
    // Aladin Lite ships its WebAssembly core inside one large file.
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
