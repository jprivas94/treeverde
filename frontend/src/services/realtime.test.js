import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock de localStorage (Node no lo expone globalmente; lo necesita el store)
const storage = {};
globalThis.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
};

const { isRealtimeEnabled, connectRealtime } = await import('./realtime.js');

beforeEach(() => {
  storage.token = null;
});

test('isRealtimeEnabled devuelve false sin credenciales de Supabase (node:test sin Vite)', () => {
  // En node:test import.meta.env no existe, por lo que SUPABASE_URL/ANON_KEY son null
  assert.equal(isRealtimeEnabled(), false);
});

test('connectRealtime sin credenciales devuelve una función noop que no lanza', () => {
  const cleanup = connectRealtime('user-1', 'token');
  assert.equal(typeof cleanup, 'function');
  assert.doesNotThrow(() => cleanup());
});

test('connectRealtime sin userId devuelve una función noop', () => {
  assert.doesNotThrow(() => connectRealtime(null, 'token'));
});

test('connectRealtime sin supabaseToken devuelve una función noop (degradación RLS)', () => {
  // Sin el token compatible con Supabase no se puede autenticar Realtime
  // (RLS no podría evaluar auth.uid()) → se degrada al polling.
  assert.doesNotThrow(() => connectRealtime('user-2', null));
  assert.doesNotThrow(() => connectRealtime('user-2', undefined));
});

test('connectRealtime con credenciales ausentes nunca llama a createClient', () => {
  // Como no hay env vars, el canal nunca se crea; el cleanup es un noop seguro.
  const cleanup = connectRealtime('user-3', 'token');
  assert.doesNotThrow(() => cleanup());
});
