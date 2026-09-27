import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock de localStorage (Node no lo expone globalmente)
const storage = {};
globalThis.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
};

// Mock de fetch con cola de respuestas y conteo de llamadas
let fetchCalls = 0;
let responseQueue = [];

globalThis.fetch = async () => {
  fetchCalls++;
  const next = responseQueue.shift();
  if (!next) throw new Error('fetch sin respuesta en cola');
  return next;
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(status, body) {
  // Cuerpo no-JSON: es lo que devuelve el proxy de Vite ante ECONNRESET
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

beforeEach(() => {
  fetchCalls = 0;
  responseQueue = [];
});

const { authApi, tasksApi, invitesApi } = await import('./api.js');

// ═══════════════ RETRY: 5xx ═══════════════

test('POST con 5xx JSON (respondió la app) NO se reintenta — evita duplicar', async () => {
  responseQueue.push(jsonResponse(500, { error: 'Error interno del servidor' }));

  await assert.rejects(
    () => authApi.login('a@test.com', 'x'),
    /Error interno del servidor/
  );
  assert.equal(fetchCalls, 1, 'un POST con 5xx JSON no debe reintentarse');
});

test('POST con 5xx texto (proxy ECONNRESET) SÍ se reintenta y puede tener éxito', async () => {
  responseQueue.push(textResponse(500, 'http proxy error: read ECONNRESET'));
  responseQueue.push(jsonResponse(200, { token: 't1', user: { id: 'u1' } }));

  const res = await authApi.login('a@test.com', 'x');
  assert.equal(res.token, 't1', 'el login debe completarse tras el reintento');
  assert.equal(fetchCalls, 2, 'el 500 del proxy debe reintentarse (login POST)');
});

test('GET con 5xx JSON (idempotente) SÍ se reintenta', async () => {
  responseQueue.push(jsonResponse(500, { error: 'boom' }));
  responseQueue.push(jsonResponse(200, [{ id: 't1' }]));

  const res = await tasksApi.getAll();
  assert.equal(res.length, 1, 'GET debe reintentarse y completarse');
  assert.equal(fetchCalls, 2, 'GET con 5xx JSON debe reintentarse');
});

test('POST con 5xx texto agotado: reintenta 2 veces y lanza el error final', async () => {
  responseQueue.push(textResponse(500, 'proxy error 1'));
  responseQueue.push(textResponse(500, 'proxy error 2'));
  responseQueue.push(textResponse(500, 'proxy error 3'));

  await assert.rejects(
    () => authApi.login('a@test.com', 'x'),
    /Error 500/
  );
  assert.equal(fetchCalls, 3, '1 intento + 2 reintentos');
});

// ═══════════════ INVITACIONES POR URL ═══════════════

test('tasksApi.getInviteUrl hace POST a /tasks/:id/invite con el rol', async () => {
  responseQueue.push(jsonResponse(200, { inviteUrl: 'http://localhost:5173/?invite=abc', inviteRole: 'assignee' }));
  const res = await tasksApi.getInviteUrl('t1', 'assignee');
  assert.equal(res.inviteRole, 'assignee');
  assert.match(res.inviteUrl, /invite=abc/);
  assert.equal(fetchCalls, 1, 'una sola llamada');
});

test('invitesApi.getInfo hace GET a /invites/:token', async () => {
  responseQueue.push(jsonResponse(200, { taskId: 't1', taskTitle: 'Mi tarea', creatorName: 'Jean' }));
  const res = await invitesApi.getInfo('token-1');
  assert.equal(res.taskTitle, 'Mi tarea');
  assert.equal(fetchCalls, 1, 'una sola llamada');
});

test('invitesApi.accept hace POST a /invites/:token/accept', async () => {
  responseQueue.push(jsonResponse(200, { message: 'Te uniste a la tarea' }));
  const res = await invitesApi.accept('token-2');
  assert.match(res.message, /Te uniste/);
  assert.equal(fetchCalls, 1, 'una sola llamada');
});
