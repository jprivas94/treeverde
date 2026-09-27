import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  parseDate,
  formatDateShort,
  formatDateFull,
  isOverdue,
  timeAgo,
  parseLocalDate,
  formatLocalDate,
  formatDateForInput,
} = await import('./date.js');

test('parseDate: valores vacíos/inválidos devuelven null', () => {
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate('fecha-invalida'), null);
});

test('parseDate: string válido devuelve Date', () => {
  const d = parseDate('2026-08-05T12:00:00.000Z');
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), '2026-08-05T12:00:00.000Z');
});

test('formatDateShort: formato es-PE corto o null', () => {
  assert.equal(formatDateShort(null), null);
  assert.equal(formatDateShort('2026-08-05T12:00:00.000Z'), '5 ago.');
});

test('formatDateFull: formato completo o null', () => {
  assert.equal(formatDateFull(''), null);
  assert.equal(formatDateFull('2026-08-05T12:00:00.000Z'), '05 ago. 2026');
});

test('isOverdue: false para fechas futuras, true para pasadas', () => {
  assert.equal(isOverdue(null), false);
  assert.equal(isOverdue('2099-01-01T00:00:00.000Z'), false);
  assert.equal(isOverdue('2020-01-01T00:00:00.000Z'), true);
});

test('timeAgo: rangos relativos', () => {
  const now = Date.now();
  assert.equal(timeAgo(new Date(now - 30 * 1000).toISOString()), 'ahora');
  assert.equal(timeAgo(new Date(now - 5 * 60 * 1000).toISOString()), 'hace 5m');
  assert.equal(timeAgo(new Date(now - 3 * 60 * 60 * 1000).toISOString()), 'hace 3h');
  assert.equal(timeAgo(new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()), 'hace 2d');
  assert.equal(timeAgo(null), '');
});

test('parseLocalDate: YYYY-MM-DD a Date local sin desfase', () => {
  const d = parseLocalDate('2026-08-05');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7); // agosto = índice 7
  assert.equal(d.getDate(), 5);
});

test('formatLocalDate: Date a YYYY-MM-DD local', () => {
  assert.equal(formatLocalDate(new Date(2026, 7, 5)), '2026-08-05');
});

test('formatDateForInput: ISO string a YYYY-MM-DD (o vacío)', () => {
  assert.equal(formatDateForInput(null), '');
  assert.equal(formatDateForInput('2026-08-05T12:00:00.000Z'), '2026-08-05');
});
