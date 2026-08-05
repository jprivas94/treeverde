// Tests del envío de correo con Resend MOCKEADO (archivo separado para que
// mock.module('resend') se registre ANTES del import de email.js).
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const RESET_LINK = 'http://localhost:5173/?resetToken=abc123token';

// Comportamiento configurable del SDK mockeado
let sendImpl = async () => ({ data: { id: 'em_ok' }, error: null });
const sentPayloads = [];

// Mock del SDK de Resend
mock.module('resend', {
  namedExports: {
    Resend: class {
      constructor() {}
      emails = {
        send: async (payload) => {
          sentPayloads.push(payload);
          return sendImpl(payload);
        },
      };
    },
  },
});

beforeEach(() => {
  sentPayloads.length = 0;
  sendImpl = async () => ({ data: { id: 'em_ok' }, error: null });
});

// Import DINÁMICO después del mock
const { sendPasswordResetEmail } = await import('../src/utils/email.js?send-tests=1');

test('con API key llama a Resend con from/to/asunto y plantillas HTML + texto', async () => {
  process.env.RESEND_API_KEY = 're_test_123';

  const result = await sendPasswordResetEmail({
    email: 'ana@test.com',
    name: 'Ana',
    resetLink: RESET_LINK,
  });

  assert.equal(result.sent, true);
  assert.equal(result.id, 'em_ok');
  assert.equal(sentPayloads.length, 1);
  const p = sentPayloads[0];
  assert.equal(p.to[0], 'ana@test.com');
  assert.match(p.subject, /Recupera tu contraseña/);
  assert.match(p.html, /Restablecer contraseña/);
  // El href del botón debe ser EXACTAMENTE el resetLink (integridad de la plantilla)
  assert.ok(p.html.includes('href="' + RESET_LINK + '"'), 'el botón debe apuntar al resetLink exacto');
  assert.match(p.html, /Treeverde/);
  assert.match(p.text, /restablecer/i);
});

test('si Resend devuelve error, reporta sent:false sin lanzar', async () => {
  process.env.RESEND_API_KEY = 're_test_456';
  sendImpl = async () => ({ data: null, error: new Error('422: domain not verified') });

  const result = await sendPasswordResetEmail({
    email: 'bob@test.com',
    name: 'Bob',
    resetLink: RESET_LINK,
  });

  assert.equal(result.sent, false);
  assert.ok(result.error);
  assert.equal(result.resetLink, RESET_LINK);
});

test('si el SDK lanza excepción (red), reporta sent:false sin lanzar', async () => {
  process.env.RESEND_API_KEY = 're_test_789';
  sendImpl = async () => { throw new Error('ECONNRESET'); };

  const result = await sendPasswordResetEmail({
    email: 'carol@test.com',
    name: 'Carol',
    resetLink: RESET_LINK,
  });

  assert.equal(result.sent, false);
  assert.ok(result.error);
});
