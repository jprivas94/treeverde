import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // manualChunks debe ser función en Vite 8 (rolldown)
        // Separa las dependencias pesadas del bundle inicial
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@hello-pangea/dnd')) return 'dnd';
            if (id.includes('zustand')) return 'zustand';
            if (id.includes('react') || id.includes('scheduler') || id.includes('react-dom')) return 'react-vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // ─── Desactiva keep-alive para evitar ECONNRESET ───
        // Cuando el backend se reinicia, las conexiones stale
        // causan 'read ECONNRESET'. Con agent: false forzamos
        // una conexión nueva en cada request.
        agent: false,
        proxyTimeout: 30000,
        timeout: 30000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
              console.warn('  ⚡ Proxy: El backend aún no responde, reintenta...');
            }
          });
        }
      }
    }
  }
});

