import { defineConfig, devices } from '@playwright/test';

// ─── Config e2e de Playwright (verificación real en navegador) ─────────
// Verifica la sincronización de sesión entre pestañas con los servidores
// locales reales. Los arranca automáticamente si no están corriendo:
//   - backend  → http://localhost:3001 (npm run start, requiere BD + seed)
//   - frontend → http://localhost:5173 (npm run dev, Vite con proxy /api)
// En local reutiliza los servidores ya levantados (reuseExistingServer);
// en CI (process.env.CI) los arranca desde cero.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start',
      cwd: '../backend',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
