import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parsePagination } = await import('../src/utils/pagination.js');

test('parsePagination: valores por defecto cuando no hay query', () => {
  assert.deepEqual(parsePagination({}), { limit: 0, offset: 0 });
});

test('parsePagination: respeta limit/offset y topa el límite a 500', () => {
  assert.deepEqual(parsePagination({ limit: '50', offset: '20' }), { limit: 50, offset: 20 });
  assert.deepEqual(parsePagination({ limit: '9999', offset: '-5' }), { limit: 500, offset: 0 });
});

test('parsePagination: valores inválidos se tratan como 0', () => {
  assert.deepEqual(parsePagination({ limit: 'abc', offset: 'xyz' }), { limit: 0, offset: 0 });
});

test('parsePagination: maxLimit configurable', () => {
  assert.deepEqual(parsePagination({ limit: '300' }, { maxLimit: 100 }), { limit: 100, offset: 0 });
});
