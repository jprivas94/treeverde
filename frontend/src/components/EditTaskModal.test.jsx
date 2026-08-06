// El DOM (jsdom) debe crearse ANTES de cargar react-dom: ver test/setupDom.js
import '../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import useKanbanStore from '../store/kanbanStore';
import { stubFetch, findCall } from '../test/fetchStub';

const { default: EditTaskModal } = await import('./EditTaskModal.jsx');

const realFetch = globalThis.fetch;
const USERS = [
  { id: 'u1', name: 'Jean', email: 'jean@test.com' },
  { id: 'u2', name: 'Alice', email: 'alice@test.com' },
];

const TASK = {
  id: 't1',
  title: 'Tarea de prueba',
  description: 'Descripción de prueba',
  priority: 'HIGH',
  dueDate: '2026-08-10T00:00:00.000Z',
  tags: 'bug',
  status: 'IN_PROGRESS',
  images: [],
  subtasks: [{ id: 's1', title: 'Sub 1', completed: false }],
  creator: { id: 'u1', name: 'Jean' },
  assignee: null,
  shares: [],
};

const defaultHandlers = () => [{ method: 'GET', path: '/users', body: USERS }];

function seedStore({ user = USERS[0], tasks = [TASK] } = {}) {
  useKanbanStore.setState({ user, token: 'tok', tasks, archivedTasks: [] });
}

beforeEach(() => seedStore());

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  useKanbanStore.setState({ user: null, token: null, tasks: [], archivedTasks: [] });
});

test('EditTaskModal: renderiza el modo edición con los valores de la tarea', () => {
  stubFetch(defaultHandlers());
  const { getByText, getByDisplayValue } = render(<EditTaskModal task={TASK} onClose={() => {}} />);
  getByText('Editar Tarea');
  getByDisplayValue('Tarea de prueba');
  getByText('Guardar');
  getByText('Cancelar');
});

test('EditTaskModal: guardar hace PUT /tasks/:id, actualiza el store y cierra', async () => {
  const updated = { ...TASK, title: 'Título nuevo' };
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'PUT', path: '/tasks/t1', body: updated },
  ]);
  let closed = 0;
  const { getByDisplayValue, getByText } = render(<EditTaskModal task={TASK} onClose={() => { closed++; }} />);
  fireEvent.change(getByDisplayValue('Tarea de prueba'), { target: { value: 'Título nuevo' } });
  fireEvent.click(getByText('Guardar'));
  await waitFor(() => assert.equal(closed, 1));
  assert.equal(useKanbanStore.getState().tasks[0]?.title, 'Título nuevo', 'el store se actualiza');
  const putCall = findCall(calls, 'PUT', '/tasks/t1');
  assert.ok(putCall, 'debe llamar PUT /tasks/:id');
  assert.equal(JSON.parse(putCall.body).title, 'Título nuevo');
  assert.equal(JSON.parse(putCall.body).priority, 'HIGH');
});

test('EditTaskModal: ESC cierra el modal', () => {
  stubFetch(defaultHandlers());
  let closed = 0;
  render(<EditTaskModal task={TASK} onClose={() => { closed++; }} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(closed, 1);
});

test('EditTaskModal: readOnly muestra la vista estática con el título', () => {
  stubFetch(defaultHandlers());
  const { getByText, queryByText } = render(<EditTaskModal task={TASK} readOnly onClose={() => {}} />);
  getByText('Ver Tarea');
  getByText('Tarea de prueba');
  getByText('Cerrar');
  assert.equal(queryByText('Guardar'), null, 'no muestra el formulario de edición');
});

test('EditTaskModal: sharedView permite togglear subtareas (PATCH)', async () => {
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'PATCH', path: '/tasks/t1/subtasks', body: { id: 't1', subtasks: [{ id: 's1', title: 'Sub 1', completed: true, toggledBy: 'u1' }] } },
  ]);
  const { getByTitle } = render(<EditTaskModal task={TASK} sharedView onClose={() => {}} />);
  fireEvent.click(getByTitle('Marcar/desmarcar'));
  await waitFor(() => assert.ok(findCall(calls, 'PATCH', '/subtasks')));
  assert.equal(useKanbanStore.getState().tasks[0]?.subtasks[0]?.completed, true, 'la subtarea queda completada en el store');
  const patchCall = findCall(calls, 'PATCH', '/subtasks');
  assert.equal(JSON.parse(patchCall.body).subtasks[0].completed, true, 'el payload envía la subtarea completada');
});

test('EditTaskModal: el creador puede eliminar la tarea (modal de confirmacion + DELETE)', async () => {
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'DELETE', path: '/tasks/t1', body: { message: 'Tarea eliminada' } },
  ]);
  let closed = 0;
  const { getByText } = render(<EditTaskModal task={TASK} onClose={() => { closed++; }} />);
  // Clic en Eliminar abre el modal de confirmacion
  fireEvent.click(getByText('Eliminar'));
  getByText('¿Eliminar tarea?');
  // Aceptar confirma la eliminacion
  fireEvent.click(getByText('Aceptar'));
  await waitFor(() => assert.equal(closed, 1));
  assert.equal(useKanbanStore.getState().tasks.some((t) => t.id === 't1'), false, 'la tarea se quita del store');
  assert.ok(findCall(calls, 'DELETE', '/tasks/t1'), 'debe llamar DELETE /tasks/:id');
});

// Nueva ruta de cancelacion: Cancelar cierra todo y vuelve al board sin eliminar
test('EditTaskModal: cancelar la confirmacion de eliminacion vuelve al board sin borrar', async () => {
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'DELETE', path: '/tasks/t1', body: { message: 'Tarea eliminada' } },
  ]);
  let closed = 0;
  const { getByText, getByRole } = render(<EditTaskModal task={TASK} onClose={() => { closed++; }} />);
  fireEvent.click(getByText('Eliminar'));
  getByText('¿Eliminar tarea?');
  // Cancelar en el modal: vuelve al board (onClose) sin DELETE
  // (hay dos Cancelar: el del form de edicion y el del modal de confirmacion)
  const modalBox = getByRole('dialog', { name: 'Confirmar eliminación' });
  fireEvent.click(within(modalBox).getByText('Cancelar'));
  await waitFor(() => assert.equal(closed, 1));
  assert.equal(findCall(calls, 'DELETE', '/tasks/t1'), undefined, 'no debe llamarse DELETE al cancelar');
  assert.equal(useKanbanStore.getState().tasks.some((t) => t.id === 't1'), true, 'la tarea sigue en el store');
});

test('EditTaskModal: el asignado (no creador) no ve botón eliminar y ve los candados', () => {
  stubFetch(defaultHandlers());
  const taskAsignada = {
    ...TASK,
    creator: { id: 'u1', name: 'Jean' },
    assignee: { id: 'u2', name: 'Alice' },
  };
  seedStore({ user: USERS[1], tasks: [taskAsignada] });
  const { queryByText, getAllByText } = render(<EditTaskModal task={taskAsignada} onClose={() => {}} />);
  assert.equal(queryByText('Eliminar'), null, 'el asignado no puede eliminar');
  assert.equal(getAllByText(/Solo el creador puede cambiar/).length, 3, 'candados de asignado, prioridad y fecha');
});

test('EditTaskModal: generar enlace de invitación muestra la URL', async () => {
  const calls = stubFetch([
    { method: 'GET', path: '/users', body: USERS },
    { method: 'POST', path: '/tasks/t1/invite', body: { inviteUrl: 'http://localhost/?invite=xyz', inviteRole: 'share' } },
  ]);
  const { getByText, getByLabelText } = render(<EditTaskModal task={TASK} onClose={() => {}} />);
  fireEvent.click(getByText(/Generar enlace/));
  await waitFor(() => assert.equal(getByLabelText('Enlace de invitación').value, 'http://localhost/?invite=xyz'));
  const inviteCall = findCall(calls, 'POST', '/invite');
  assert.ok(inviteCall, 'debe llamar POST /tasks/:id/invite');
  assert.equal(JSON.parse(inviteCall.body).role, 'share');
});
