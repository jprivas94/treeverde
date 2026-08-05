import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const { createSupabaseToken, isSupabaseRealtimeConfigured } = await import('../src/utils/supabaseToken.js');

afterEach(() => {
  delete process.env.SUPABASE_JWT_SECRET;
});

test('createSupabaseToken devuelve null sin SUPABASE_JWT_SECRET (degradación)', () => {
  delete process.env.SUPABASE_JWT_SECRET;
  assert.equal(createSupabaseToken('user-1'), null);
  assert.equal(isSupabaseRealtimeConfigured(), false);
});

test('createSupabaseToken devuelve null sin userId', () => {
  process.env.SUPABASE_JWT_SECRET = 'supabase-jwt-secret-de-prueba';
  assert.equal(createSupabaseToken(null), null);
  assert.equal(createSupabaseToken(undefined), null);
});

test('createSupabaseToken acuña un JWT válido con claims de Supabase', () => {
  process.env.SUPABASE_JWT_SECRET = 'supabase-jwt-secret-de-prueba';
  assert.equal(isSupabaseRealtimeConfigured(), true);

  const token = createSupabaseToken('user-123');
  assert.ok(token, 'debe acuñar un token');

  const decoded = jwt.verify(token, 'supabase-jwt-secret-de-prueba');
  assert.equal(decoded.sub, 'user-123', 'sub debe ser el userId (auth.uid())');
  assert.equal(decoded.role, 'authenticated', 'role debe ser authenticated para RLS');
  assert.equal(decoded.aud, 'authenticated');
  assert.equal(decoded.iss, 'supabase');
  assert.ok(decoded.exp > Math.floor(Date.now() / 1000), 'exp debe estar en el futuro');
});
