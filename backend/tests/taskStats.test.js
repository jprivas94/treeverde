import { test } from 'node:test';
import assert from 'node:assert/strict';

const { summarizeTasks } = await import('../src/utils/taskStats.js');

// "Hoy" fijo para que los cálculos de fechas sean deterministas
const NOW = new Date(2026, 8, 26, 15, 0, 0); // 26 sep 2026, 15:00 (hora local)
const day = (d) => new Date(2026, 8, d, 12, 0, 0).toISOString();

test('summarizeTasks: lista vacía', () => {
  assert.deepEqual(summarizeTasks([], NOW), { total: 0, pending: 0, done: 0, overdue: 0, dueSoon: 0, lastActivity: null });
});

test('summarizeTasks: cuenta pendientes, terminadas, vencidas y próximas', () => {
  const stats = summarizeTasks([
    { status: 'TODO', dueDate: day(20), updatedAt: day(1) },        // vencida
    { status: 'IN_PROGRESS', dueDate: day(26), updatedAt: day(2) }, // vence hoy → próxima
    { status: 'TODO', dueDate: day(30), updatedAt: day(3) },        // en 4 días → próxima
    { status: 'TODO', dueDate: new Date(2026, 9, 20).toISOString(), updatedAt: day(4) }, // lejana
    { status: 'TODO', dueDate: null, updatedAt: day(5) },           // sin fecha
    { status: 'DONE', dueDate: day(1), updatedAt: day(6) },         // terminada (no cuenta como vencida)
    { status: 'ARCHIVED', dueDate: null, updatedAt: day(7) },
  ], NOW);
  assert.equal(stats.total, 7);
  assert.equal(stats.pending, 5);
  assert.equal(stats.done, 2);
  assert.equal(stats.overdue, 1);
  assert.equal(stats.dueSoon, 2);
  assert.equal(stats.lastActivity, day(7));
});
