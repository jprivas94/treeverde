// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import useKanbanStore from '../store/kanbanStore';
import { stubFetch, findCall } from '../test/fetchStub';

const { default: CreateTaskModal } = await import('./CreateTaskModal.jsx');

const realFetch = globalThis.fetch;

const USER = { id: 'u1', name: 'Jean', email: 'jean@test.com' };
const USERS = [USER, { id: 'u2', name: 'Alice', email: 'alice@test.com' }];

const defaultHandlers = () => [{ method: 'GET', path: '/users', body: USERS }];

function seedStore() {
  useKanbanStore.setState({ user: USER, token: 'tok', tasks: [], archivedTasks: [] });
}

beforeEach(() => seedStore());

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  useKanbanStore.setState({ user: null, token: null, tasks: [], archivedTasks: [] });
});

test('CreateTaskModal: renderiza el título y los botones', () => {
  stubFetch(defaultHandlers());
  const { getByText } = render(<CreateTaskModal onClose={() => {}} />);
  getByText('Nueva Tarea');
  getByText('Crear Tarea');
  getByText('Cancelar');
  getByText(/Creado por/);
});

test('CreateTaskModal: submit con título vacío no crea la tarea', () => {
  const calls = stubFetch(defaultHandlers());
  const { getByText } = render(<CreateTaskModal onClose={() => {}} />);
  fireEvent.click(getByText('Crear Tarea'));
  assert.equal(
    calls.some((c) => c.method === 'POST' && c.path.includes('/tasks')),
    false,
    'no debe llamar POST /tasks con título vacío'
  );
});

test('CreateTaskModal: crear tarea hace POST /tasks, la agrega al store y cierra', async () => {
  const created = { id: 't1', title: 'Mi tarea', status: 'TODO', priority: 'MEDIUM' };
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'POST', path: '/tasks', body: created },
  ]);
  let closed = 0;
  const { getByPlaceholderText, getByText } = render(<CreateTaskModal onClose={() => { closed++; }} />);
  fireEvent.change(getByPlaceholderText('Ej: Implementar login'), { target: { value: 'Mi tarea' } });
  fireEvent.click(getByText('Crear Tarea'));
  await waitFor(() => assert.equal(closed, 1));
  assert.equal(useKanbanStore.getState().tasks[0]?.id, 't1', 'la tarea se agrega al store');
  const createCall = findCall(calls, 'POST', '/tasks');
  assert.ok(createCall, 'debe llamar POST /tasks');
  const payload = JSON.parse(createCall.body);
  assert.equal(payload.title, 'Mi tarea');
  assert.equal(payload.priority, 'MEDIUM');
});

test('CreateTaskModal: modo invitación genera el enlace y muestra el panel de éxito', async () => {
  const created = { id: 't1', title: 'Invite', status: 'TODO' };
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'POST', path: '/tasks', body: created },
    { method: 'POST', path: '/tasks/t1/invite', body: { inviteUrl: 'http://localhost/?invite=abc', inviteRole: 'assignee' } },
  ]);
  const { getByRole, getByPlaceholderText, getByLabelText, getByText } = render(<CreateTaskModal onClose={() => {}} />);
  fireEvent.click(getByRole('checkbox')); // "Crear enlace de invitación"
  fireEvent.change(getByPlaceholderText('Ej: Implementar login'), { target: { value: 'Invite' } });
  fireEvent.click(getByText('Crear Tarea'));
  await waitFor(() => getByText('¡Tarea creada!'));
  assert.equal(getByLabelText('Enlace de invitación').value, 'http://localhost/?invite=abc');
  const inviteCall = findCall(calls, 'POST', '/invite');
  assert.ok(inviteCall, 'debe llamar POST /tasks/:id/invite');
  assert.equal(JSON.parse(inviteCall.body).role, 'assignee');
});

test('CreateTaskModal: ESC cierra el modal', () => {
  stubFetch(defaultHandlers());
  let closed = 0;
  render(<CreateTaskModal onClose={() => { closed++; }} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(closed, 1);
});

test('CreateTaskModal: clic en el fondo cierra el modal', () => {
  stubFetch(defaultHandlers());
  let closed = 0;
  const { container } = render(<CreateTaskModal onClose={() => { closed++; }} />);
  fireEvent.click(container.firstChild);
  assert.equal(closed, 1);
});
