import { test } from 'node:test';
import assert from 'node:assert/strict';

const { getJwtSecret, getAllowedOrigins, getFrontendUrl } = await import('../src/utils/config.js');

// ─── JWT_SECRET ────────────────────────────────────────────────
test('getJwtSecret devuelve fallback en desarrollo si no hay secret', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.JWT_SECRET;
  assert.equal(getJwtSecret(), 'fallback-secret-dev-only');
});

test('getJwtSecret usa el secret de entorno si existe', () => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'mi-secret-real';
  assert.equal(getJwtSecret(), 'mi-secret-real');
});

test('getJwtSecret Lanza error en producción sin JWT_SECRET', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  assert.throws(() => getJwtSecret(), /JWT_SECRET es obligatorio en producción/);
});

// ─── Orígenes CORS ─────────────────────────────────────────────
test('getAllowedOrigins incluye localhost en desarrollo', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.FRONTEND_URL;
  const origins = getAllowedOrigins();
  assert.ok(origins.includes('http://localhost:5173'));
  assert.ok(origins.includes('http://localhost:3001'));
});

test('getAllowedOrigins en producción solo usa FRONTEND_URL', () => {
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'https://treeverde.app';
  const origins = getAllowedOrigins();
  assert.deepEqual(origins, ['https://treeverde.app']);
});

test('getAllowedOrigins soporta varios orígenes separados por coma', () => {
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'https://treeverde.app,https://preview.treeverde.app';
  const origins = getAllowedOrigins();
  assert.deepEqual(origins, ['https://treeverde.app', 'https://preview.treeverde.app']);
});

test('getFrontendUrl devuelve el primer origen configurado', () => {
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'https://treeverde.app,https://preview.treeverde.app';
  assert.equal(getFrontendUrl(), 'https://treeverde.app');
});
