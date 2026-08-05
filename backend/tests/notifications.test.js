import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyAssigned, notifyCompleted, notifyShared, notifySubtaskCompleted } from '../src/utils/notifications.js';

function fakePrisma() {
  const created = [];
  const prisma = { notification: { create: async (args) => { created.push(args.data); } } };
  return { prisma, created };
}

test('notifyAssigned crea notificación ASSIGNED', async () => {
  const { prisma, created } = fakePrisma();
  await notifyAssigned(prisma, { userId: 'u1', taskId: 't1', actorName: 'Ana', taskTitle: 'Tarea' });
  assert.equal(created.length, 1);
  assert.equal(created[0].type, 'ASSIGNED');
  assert.equal(created[0].message, 'Ana te asignó la tarea: Tarea');
});

test('notify sin userId no crea nada', async () => {
  let calls = 0;
  const prisma = { notification: { create: async () => { calls++; } } };
  await notifyAssigned(prisma, { userId: null, taskId: 't1', actorName: 'Ana', taskTitle: 'T' });
  await notifyCompleted(prisma, { userId: undefined, taskId: 't1', taskTitle: 'T' });
  assert.equal(calls, 0);
});

test('notifyCompleted y notifyShared generan el mensaje correcto', async () => {
  const { prisma, created } = fakePrisma();
  await notifyCompleted(prisma, { userId: 'u2', taskId: 't1', taskTitle: 'Bug crítico' });
  await notifyShared(prisma, { userId: 'u3', taskId: 't1', sharerName: 'Ana', taskTitle: 'Bug crítico' });
  assert.equal(created[0].type, 'COMPLETED');
  assert.match(created[0].message, /Bug crítico/);
  assert.equal(created[1].type, 'SHARED');
});

test('notifySubtaskCompleted incluye quien completó', async () => {
  const { prisma, created } = fakePrisma();
  await notifySubtaskCompleted(prisma, {
    userId: 'u2', taskId: 't1', completerName: 'Luis', subtaskTitle: 'Diseño', taskTitle: 'Landing'
  });
  assert.equal(created[0].type, 'SUBTASK_COMPLETED');
  assert.match(created[0].message, /Luis/);
  assert.match(created[0].message, /Diseño/);
});

// Un fallo de creación NO debe lanzar (safeCreate)
test('un fallo de prisma no rompe la operación', async () => {
  const prisma = { notification: { create: async () => { throw new Error('db down'); } } };
  await notifyAssigned(prisma, { userId: 'u1', taskId: 't1', actorName: 'Ana', taskTitle: 'T' });
  assert.ok(true); // no lanzó
});
