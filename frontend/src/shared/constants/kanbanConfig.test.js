import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_STATUSES, STATUS_LABELS, STATUS_DOTS, STATUS_NAV,
  STATUS_BTN_COLORS, PRIORITIES, PRIORITY_CONFIG, getUserColor,
} from './kanbanConfig.js';

test('BOARD_STATUSES tiene los 4 estados del tablero', () => {
  assert.deepEqual(BOARD_STATUSES, ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED']);
});

test('todas las configuraciones cubren cada estado', () => {
  for (const s of BOARD_STATUSES) {
    assert.ok(STATUS_LABELS[s], `label para ${s}`);
    assert.ok(STATUS_DOTS[s], `dot para ${s}`);
    assert.ok(STATUS_NAV[s], `nav para ${s}`);
    assert.ok(STATUS_BTN_COLORS[s], `botones para ${s}`);
  }
});

test('PRIORITIES y PRIORITY_CONFIG cubren las 4 prioridades', () => {
  assert.deepEqual(PRIORITIES.map((p) => p.value), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  assert.ok(PRIORITY_CONFIG.LOW && PRIORITY_CONFIG.CRITICAL);
});

test('getUserColor es determinista y siempre devuelve un color válido', () => {
  const ids = ['user-1', 'a', 'cm1234567890', 'ana@test.com'];
  for (const id of ids) {
    assert.equal(getUserColor(id), getUserColor(id), `${id} debe mapear siempre al mismo color`);
  }
  assert.ok(getUserColor('x').startsWith('#'), 'debe devolver un color hex');
});

test('getUserColor sin userId devuelve el color por defecto (fallback)', () => {
  assert.equal(getUserColor(), '#8B5CF6', 'sin argumento');
  assert.equal(getUserColor(null), '#8B5CF6', 'con null');
  assert.equal(getUserColor(''), '#8B5CF6', 'con string vacío');
});

test('getUserColor siempre devuelve un color de la paleta definida', () => {
  const palette = [
    '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899',
    '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4',
  ];
  for (let i = 0; i < 50; i++) {
    const color = getUserColor(`user-${i}`);
    assert.ok(palette.includes(color), `user-${i} debe mapear a un color de la paleta (obtuvo ${color})`);
  }
});

