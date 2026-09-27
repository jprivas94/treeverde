import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parseSubtasks } = await import('./tasks.js');

test('parseSubtasks: JSON string se convierte a array', () => {
  const raw = JSON.stringify([{ id: '1', title: 'A', completed: false }]);
  assert.deepEqual(parseSubtasks(raw), [{ id: '1', title: 'A', completed: false }]);
});

test('parseSubtasks: array pasa tal cual', () => {
  const arr = [{ id: '2', title: 'B', completed: true }];
  assert.deepEqual(parseSubtasks(arr), arr);
});

test('parseSubtasks: valores vacíos/inválidos devuelven []', () => {
  assert.deepEqual(parseSubtasks(null), []);
  assert.deepEqual(parseSubtasks(undefined), []);
  assert.deepEqual(parseSubtasks('no-es-json'), []);
  assert.deepEqual(parseSubtasks({}), []);
});
