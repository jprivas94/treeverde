import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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

