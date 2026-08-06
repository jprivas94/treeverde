// ─── Board: render, archivado y drag & drop ────────────────────────────
import '../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Board from './Board.jsx';
import useKanbanStore from '../store/kanbanStore';
import { stubFetch, findCall } from '../test/fetchStub';
import { ensureDomStubs, makeTask, defaultHandlers, USER } from '../test/boardTestUtils';

ensureDomStubs();

let dragEndHandler = null;
const realFetch = globalThis.fetch;

const TASK_DONE = makeTask('t1', 'Tarea en Revision', 'DONE');

function seedStore(overrides = {}) {
  useKanbanStore.setState({
    user: USER,
    token: 'tok',
    tasks: [],
    archivedTasks: [],
    tasksLoaded: true,
    tasksHasMore: false,
    notifications: [],
    unreadCount: 0,
    ...overrides,
  });
}

function renderBoard(props = {}) {
  const origCreateElement = React.createElement;
  React.createElement = function (type, p, ...children) {
    if (p && typeof p.onDragEnd === 'function') {
      dragEndHandler = p.onDragEnd;
    }
    return origCreateElement.call(this, type, p, ...children);
  };
  try {
    return render(<Board isDark={false} onToggleTheme={() => {}} {...props} />);
  } finally {
    React.createElement = origCreateElement;
  }
}

beforeEach(() => {
  stubFetch(defaultHandlers());
  seedStore();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  dragEndHandler = null;
  useKanbanStore.setState({ user: null, token: null, tasks: [], archivedTasks: [], tasksLoaded: false });
});

// ─── Render y columnas ──────────────────────────────

test('Board: renderiza las 4 columnas incluida la columna Terminado', () => {
  seedStore({ tasks: [TASK_DONE] });
  const { getByRole, getAllByRole } = renderBoard();
  getByRole('heading', { name: 'Por Hacer' });
  getByRole('heading', { name: 'En Progreso' });
  getAllByRole('heading', { name: /Revisi/ });
  getByRole('heading', { name: '🗑 Terminado' });
});

test('Board: la columna Terminado se muestra aunque no haya tareas (las archivadas viven en el historial)', () => {
  seedStore({
    tasks: [TASK_DONE],
    archivedTasks: [makeTask('a1', 'Tarea archivada', 'ARCHIVED')],
  });
  const { getByRole, queryByText, getByText } = renderBoard();
  getByRole('heading', { name: '🗑 Terminado' });
  assert.equal(queryByText('Tarea archivada'), null, 'las archivadas no se renderizan en el tablero');
  getByText(/Tarea en Revisi/);
});

// ─── Archivado (botón Terminar → modal → confirmar) ──

test('Board: archivar una tarea (modal de finalizacion) la saca del tablero y la deja en archivedTasks', async () => {
  seedStore({ tasks: [TASK_DONE] });
  const calls = stubFetch(defaultHandlers());
  const { getByText, getByRole, queryByText } = renderBoard();

  getByText('Tarea en Revision');

  const terminarBtn = getByRole('button', { name: /^Terminar/ });
  fireEvent.click(terminarBtn);

  const confirmBtn = await waitFor(() => getByRole('button', { name: /Entendido/ }), { timeout: 3000 });
  fireEvent.click(confirmBtn);

  await waitFor(() => {
    assert.equal(queryByText('Tarea en Revision'), null, 'la tarea ya no debe estar en el tablero');
  });

  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 0, 'tasks vacio tras archivar');
  assert.equal(s.archivedTasks.length, 1, 'la tarea queda en archivedTasks');
  assert.equal(s.archivedTasks[0].id, 't1');
  assert.equal(s.archivedTasks[0].status, 'ARCHIVED');

  const patch = findCall(calls, 'PATCH', '/tasks/t1/status');
  assert.ok(patch, 'debe enviarse PATCH /tasks/:id/status al archivar');
  assert.ok(patch.body.includes('ARCHIVED'), 'el payload debe indicar ARCHIVED');
});

test('Board: archivar una tarea DONE conserva completedAt y fija archivedAt', async () => {
  const completedAt = '2026-07-20T10:00:00.000Z';
  seedStore({ tasks: [makeTask('t1', 'Tarea completada', 'DONE', { completedAt })] });
  const { getByRole, queryByText } = renderBoard();

  const terminarBtn = getByRole('button', { name: /^Terminar/ });
  fireEvent.click(terminarBtn);
  const confirmBtn = await waitFor(() => getByRole('button', { name: /Entendido/ }), { timeout: 3000 });
  fireEvent.click(confirmBtn);

  await waitFor(() => {
    assert.equal(queryByText('Tarea completada'), null);
  });
  const archived = useKanbanStore.getState().archivedTasks[0];
  assert.equal(archived.completedAt, completedAt, 'completedAt no debe perderse al archivar');
  assert.ok(archived.archivedAt, 'archivedAt debe fijarse al archivar');
});

// ─── Drag & drop (onDragEnd capturado) ──────────────

function simulateDrag(draggableId, fromColumn, toColumn) {
  assert.ok(dragEndHandler, 'el onDragEnd de Board debe estar capturado por el mock');
  dragEndHandler({
    draggableId,
    type: 'DEFAULT',
    reason: 'DROP',
    source: { droppableId: fromColumn, index: 0 },
    destination: toColumn ? { droppableId: toColumn, index: 0 } : null,
  });
}

test('Board: arrastrar de TODO a IN_PROGRESS actualiza el store y persiste el PATCH', async () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea movida por drag', 'TODO')] });
  const calls = stubFetch(defaultHandlers());
  renderBoard();

  assert.equal(useKanbanStore.getState().tasks[0].status, 'TODO');

  simulateDrag('t1', 'TODO', 'IN_PROGRESS');

  assert.equal(useKanbanStore.getState().tasks[0].status, 'IN_PROGRESS', 'la tarea debe quedar en IN_PROGRESS');

  const patch = findCall(calls, 'PATCH', '/tasks/t1/status');
  assert.ok(patch, 'debe enviarse PATCH /tasks/:id/status tras el drag');
  assert.ok(patch.body.includes('IN_PROGRESS'), 'el payload debe indicar IN_PROGRESS');
});

test('Board: arrastrar a la columna Terminado abre el modal de finalizacion sin cambiar el estado', async () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea finalizada por drag', 'DONE')] });
  stubFetch(defaultHandlers());
  const { getByRole } = renderBoard();

  simulateDrag('t1', 'DONE', 'ARCHIVED');

  const confirmBtn = await waitFor(() => getByRole('button', { name: /Entendido/ }), { timeout: 3000 });
  assert.ok(confirmBtn, 'el modal de finalizacion debe abrirse al arrastrar a Terminado');

  assert.equal(useKanbanStore.getState().tasks[0].status, 'DONE', 'el estado no cambia al arrastrar a Terminado');
  assert.equal(useKanbanStore.getState().archivedTasks.length, 0, 'nada se archiva sin confirmar');
});

test('Board: soltar fuera de una columna (destination null) no mueve ni persiste nada', () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea estatica', 'TODO')] });
  const calls = stubFetch(defaultHandlers());
  renderBoard();

  simulateDrag('t1', 'TODO', null);

  assert.equal(useKanbanStore.getState().tasks[0].status, 'TODO', 'la tarea no debe moverse');
  assert.equal(findCall(calls, 'PATCH', '/tasks/t1/status'), undefined, 'no debe persistirse nada');
});

// ─── Historial (botón → CompletedTasksPanel con archivadas) ─

test('Board: el boton Historial muestra las tareas archivadas y oculta el tablero', async () => {
  seedStore({
    tasks: [TASK_DONE],
    archivedTasks: [makeTask('a1', 'Tarea archivada', 'ARCHIVED')],
  });
  const { getByRole, getByText, queryByText, queryByRole } = renderBoard();

  assert.equal(queryByText('Tarea archivada'), null, 'la archivada no esta en el tablero');

  fireEvent.click(getByRole('button', { name: /Historial/ }));

  await waitFor(
    () => {
      getByText('Tarea archivada');
      getByText(/Tarea en Revisi/);
      getByRole('button', { name: /Volver/ });
    },
    { timeout: 3000 }
  );

  assert.equal(queryByRole('heading', { name: 'Por Hacer' }), null, 'las columnas se ocultan en el historial');
  assert.equal(queryByRole('button', { name: /A[nñ]adir Tarea/ }), null, 'el boton de añadir se oculta en el historial');

  fireEvent.click(getByRole('button', { name: /Volver/ }));
  await waitFor(() => getByRole('heading', { name: 'Por Hacer' }));
  assert.equal(queryByText('Tarea archivada'), null, 'al volver la archivada desaparece del tablero');
});

test('Board: el historial vacio muestra su estado vacio y el badge del header cambia a Historial', async () => {
  seedStore({ tasks: [], archivedTasks: [] });
  const { getByRole, getByText } = renderBoard();

  getByText('Tablero');

  fireEvent.click(getByRole('button', { name: /Historial/ }));

  await waitFor(
    () => {
      getByText('Historial');
      getByText('No hay tareas completadas aun.');
    },
    { timeout: 3000 }
  );
});

// ─── Eliminación desde la tarjeta (botón 🗑 solo para el creador) ─

test('Board: el creador ve el boton Eliminar en la tarjeta y elimina con confirmacion', async () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea del creador', 'TODO', { creator: USER })] });
  const calls = stubFetch([
    ...defaultHandlers(),
    { method: 'DELETE', path: '/tasks/t1', body: { message: 'Tarea eliminada' } },
  ]);
  const { getByText, getByTitle, queryByText } = renderBoard();

  const deleteBtn = getByTitle('Eliminar');

  fireEvent.click(deleteBtn);
  await waitFor(() => getByText('¿Eliminar tarea?'), { timeout: 3000 });

  fireEvent.click(getByText('Aceptar'));
  await waitFor(() => {
    assert.equal(useKanbanStore.getState().tasks.some((t) => t.id === 't1'), false, 'la tarea se elimina del store');
  });
  assert.ok(findCall(calls, 'DELETE', '/tasks/t1'), 'debe llamarse DELETE /tasks/:id');
  await waitFor(() => assert.equal(queryByText('Tarea del creador'), null));
});

test('Board: cancelar la eliminacion desde la tarjeta cierra el modal y no borra', async () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea a conservar', 'TODO', { creator: USER })] });
  const calls = stubFetch(defaultHandlers());
  const { getByText, getByTitle } = renderBoard();

  fireEvent.click(getByTitle('Eliminar'));
  await waitFor(() => getByText('¿Eliminar tarea?'), { timeout: 3000 });
  fireEvent.click(getByText('Cancelar'));

  await waitFor(() => assert.equal(useKanbanStore.getState().tasks.some((t) => t.id === 't1'), true, 'la tarea sigue en el store'));
  assert.equal(findCall(calls, 'DELETE', '/tasks/t1'), undefined, 'no debe llamarse DELETE al cancelar');
});

test('Board: el no creador no ve el boton Eliminar en la tarjeta', () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea ajena', 'TODO')] });
  const { queryByTitle } = renderBoard();
  assert.equal(queryByTitle('Eliminar'), null, 'el no creador no ve el boton eliminar');
});
