// Tests unitarios del módulo de email (plantillas HTML/texto + envío Resend)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResetPasswordHtml,
  buildResetPasswordText,
} from '../src/utils/email.js';

const RESET_LINK = 'http://localhost:5173/?resetToken=abc123token';

test('buildResetPasswordHtml → incluye marca, botón, enlace y nota de expiración', () => {
  const html = buildResetPasswordHtml({ name: 'Jean', resetLink: RESET_LINK });
  assert.match(html, /Treeverde/);
  assert.match(html, /Hola, Jean/i);
  assert.match(html, /Restablecer contraseña/);
  assert.match(html, /resetToken=abc123token/);
  assert.match(html, /válido por 1 hora/i);
  assert.match(html, /<!DOCTYPE html>/);
});

test('buildResetPasswordHtml → escapa HTML inyectado en nombre y enlace', () => {
  const html = buildResetPasswordHtml({
    name: '<script>alert(1)</script>',
    resetLink: 'http://localhost:5173/?resetToken=""><script>x</script>',
  });
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<script>x</script>'), false);
  assert.match(html, /&lt;script&gt;/);
});

test('buildResetPasswordHtml → funciona sin nombre (solo saluda genérico)', () => {
  const html = buildResetPasswordHtml({ resetLink: RESET_LINK });
  assert.match(html, /Hola! 👋/);
});

test('buildResetPasswordText → incluye el enlace y la nota de seguridad', () => {
  const text = buildResetPasswordText({ name: 'Ana', resetLink: RESET_LINK });
  assert.match(text, /Hola, Ana/i);
  assert.ok(text.includes(RESET_LINK));
  assert.match(text, /válido por 1 hora/i);
});

test('sendPasswordResetEmail → sin RESEND_API_KEY devuelve sent:false con el enlace', async () => {
  const prev = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  const { sendPasswordResetEmail } = await import('../src/utils/email.js?no-key=1');
  const result = await sendPasswordResetEmail({
    email: 'x@test.com',
    name: 'X',
    resetLink: RESET_LINK,
  });

  assert.equal(result.sent, false);
  assert.equal(result.resetLink, RESET_LINK);

  if (prev !== undefined) process.env.RESEND_API_KEY = prev;
});
