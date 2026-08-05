import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canViewTask, canEditTask, canEditSubtasks, canDeleteTask } from '../src/utils/permissions.js';

test('canViewTask: creador, asignado o compartido', () => {
  const task = { creatorId: 'u1', assigneeId: 'u2', shares: [{ userId: 'u3' }] };
  assert.equal(canViewTask(task, 'u1'), true);
  assert.equal(canViewTask(task, 'u2'), true);
  assert.equal(canViewTask(task, 'u3'), true);
  assert.equal(canViewTask(task, 'u4'), false);
  assert.equal(canViewTask({ creatorId: 'u1' }, 'u4'), false);
});

test('canEditTask: solo creador o asignado', () => {
  const task = { creatorId: 'u1', assigneeId: 'u2', shares: [{ userId: 'u3' }] };
  assert.equal(canEditTask(task, 'u1'), true);
  assert.equal(canEditTask(task, 'u2'), true);
  assert.equal(canEditTask(task, 'u3'), false); // compartido NO edita
});

test('canEditSubtasks: compartido también puede', () => {
  const task = { creatorId: 'u1', assigneeId: null, shares: [{ userId: 'u3' }] };
  assert.equal(canEditSubtasks(task, 'u3'), true);
  assert.equal(canEditSubtasks(task, 'u4'), false);
});

test('canDeleteTask: solo el creador', () => {
  const task = { creatorId: 'u1', assigneeId: 'u2' };
  assert.equal(canDeleteTask(task, 'u1'), true);
  assert.equal(canDeleteTask(task, 'u2'), false);
});
