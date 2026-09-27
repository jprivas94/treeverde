// ─── Board: render, archivado y drag & drop ────────────────────────────
import '../../test/setupDom';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Board from './Board.jsx';
import useKanbanStore from '../../store/kanbanStore';
import { stubFetch, findCall } from '../../test/fetchStub';
import { ensureDomStubs, makeTask, defaultHandlers, USER } from '../../test/boardTestUtils';

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

  getByText('Todas las tareas');

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

test('Board: muestra boton Invitar en header cuando hay un tablero activo y abre InviteBoardModal', async () => {
  const activeBoard = {
    id: 'b1',
    name: 'Tablero Principal',
    color: 'emerald',
    icon: '🚀',
    ownerId: USER.id,
    members: [{ ...USER, role: 'owner' }]
  };
  seedStore({
    boards: [activeBoard],
    activeBoardId: 'b1',
    tasks: []
  });

  const { getByTestId, findByText, getByText } = renderBoard();

  // El nombre del tablero activo se muestra en el header
  getByText('Tablero Principal');

  // El botón Invitar está presente
  const inviteBtn = getByTestId('invite-board-button');
  assert.ok(inviteBtn, 'el botón de invitar debe estar en el header del tablero');

  fireEvent.click(inviteBtn);

  // Se abre el modal de invitar al tablero
  const modalTitle = await findByText('Invitar al tablero');
  assert.ok(modalTitle, 'debe abrir el modal de invitar al tablero');
});

// ─── Vaciar tablero ──────────────────────────────────
const CLEAR_BOARD = {
  id: 'b1',
  name: 'Tablero Vaciable',
  color: 'emerald',
  icon: '🚀',
  ownerId: USER.id,
  members: [{ ...USER, role: 'owner' }]
};

test('Board: sin tablero activo muestra Vaciar (todo) pero no Vaciar (tablero)', () => {
  // El store es global entre tests: limpiar boards/activeBoardId explicitamente
  seedStore({ boards: [], activeBoardId: null });
  const { getByTestId, queryByTestId } = renderBoard();
  assert.ok(getByTestId('clear-all-button'), 'botón de eliminar todo presente en la vista general');
  assert.equal(queryByTestId('clear-board-button'), null, 'sin tablero activo no existe el botón de vaciar tablero');
});

test('Board: boton Vaciar abre el modal de confirmacion con el nombre del tablero', async () => {
  seedStore({ boards: [CLEAR_BOARD], activeBoardId: 'b1', tasks: [makeTask('t1', 'A', 'TODO')] });
  const { getByTestId, findByText } = renderBoard();

  fireEvent.click(getByTestId('clear-board-button'));

  const modalTitle = await findByText('¿Vaciar el tablero?');
  assert.ok(modalTitle, 'debe abrir el modal de confirmación de vaciado');
  findByText('Tablero Vaciable');
});

test('Board: cancelar el vaciado no elimina nada', async () => {
  seedStore({ boards: [CLEAR_BOARD], activeBoardId: 'b1', tasks: [makeTask('t1', 'A', 'TODO')] });
  const calls = stubFetch([
    ...defaultHandlers(),
    { method: 'DELETE', path: '/boards/b1/tasks', body: { message: 'Tareas eliminadas', deleted: 1 } },
  ]);
  const { getByTestId, findByText, getByText } = renderBoard();

  fireEvent.click(getByTestId('clear-board-button'));
  await findByText('¿Vaciar el tablero?');
  fireEvent.click(getByText('Cancelar'));

  await waitFor(() => assert.equal(useKanbanStore.getState().tasks.some((t) => t.id === 't1'), true, 'la tarea sigue en el store'));
  assert.equal(findCall(calls, 'DELETE', '/boards/b1/tasks'), undefined, 'no debe llamarse DELETE al cancelar');
});

test('Board: confirmar el vaciado elimina todas las tareas visibles', async () => {
  seedStore({
    boards: [CLEAR_BOARD],
    activeBoardId: 'b1',
    tasks: [makeTask('t1', 'A', 'TODO'), makeTask('t2', 'B', 'IN_PROGRESS')],
  });
  const calls = stubFetch([
    ...defaultHandlers(),
    { method: 'DELETE', path: '/boards/b1/tasks', body: { message: 'Tareas eliminadas', deleted: 2 } },
  ]);
  const { getByTestId, findByText, getByText } = renderBoard();

  fireEvent.click(getByTestId('clear-board-button'));
  await findByText('¿Vaciar el tablero?');
  fireEvent.click(getByText('Eliminar todas'));

  await waitFor(() => assert.equal(useKanbanStore.getState().tasks.length, 0, 'el store queda sin tareas'));
  assert.ok(findCall(calls, 'DELETE', '/boards/b1/tasks'), 'debe llamarse DELETE /boards/:id/tasks');
});

test('Board: el boton Vaciar desaparece en la vista Historial', () => {
  seedStore({ boards: [CLEAR_BOARD], activeBoardId: 'b1' });
  const { queryByTestId, getByText } = renderBoard();
  fireEvent.click(getByText('📊 Historial'));
  assert.equal(queryByTestId('clear-board-button'), null, 'sin boton Vaciar en Historial');
});

// ─── Eliminar todas las tareas (vista "Todas las tareas") ──────────

test('Board: en Todas las tareas el modal pide confirmar eliminar todo', async () => {
  seedStore({ boards: [], activeBoardId: null, tasks: [makeTask('t1', 'A', 'TODO')] });
  const { getByTestId, findByText } = renderBoard();

  fireEvent.click(getByTestId('clear-all-button'));

  const modalTitle = await findByText('¿Eliminar todas tus tareas?');
  assert.ok(modalTitle, 'debe abrir el modal de eliminar todas las tareas');
});

test('Board: confirmar eliminar todo llama DELETE /tasks/all y limpia el store', async () => {
  seedStore({
    boards: [],
    activeBoardId: null,
    tasks: [makeTask('t1', 'A', 'TODO'), makeTask('t2', 'B', 'IN_PROGRESS')],
    archivedTasks: [makeTask('t3', 'C', 'ARCHIVED')],
  });
  const calls = stubFetch([
    ...defaultHandlers(),
    { method: 'DELETE', path: '/tasks/all', body: { message: 'Tareas eliminadas', deleted: 3, remaining: 0 } },
  ]);
  const { getByTestId, findByText, getByText } = renderBoard();

  fireEvent.click(getByTestId('clear-all-button'));
  await findByText('¿Eliminar todas tus tareas?');
  fireEvent.click(getByText('Eliminar todo'));

  await waitFor(() => {
    const s = useKanbanStore.getState();
    assert.equal(s.tasks.length, 0, 'sin tareas activas');
    assert.equal(s.archivedTasks.length, 0, 'sin tareas archivadas');
  });
  assert.ok(findCall(calls, 'DELETE', '/tasks/all'), 'debe llamarse DELETE /tasks/all');
});

// ─── Color de letra del botón Vaciar según el fondo (onColor) ──────

test('Board: sobre header blanco el boton Vaciar usa letra oscura', () => {
  seedStore({ boards: [], activeBoardId: null });
  const { getByTestId } = renderBoard();
  const btn = getByTestId('clear-all-button');
  assert.ok(btn.className.includes('text-gray-900'), `letra oscura sobre fondo blanco (clases: ${btn.className})`);
  assert.ok(!btn.className.includes('text-white'), 'no debe llevar letra blanca sobre blanco');
});

test('Board: sobre el gradiente del tablero activo el boton Vaciar usa letra blanca', () => {
  seedStore({ boards: [CLEAR_BOARD], activeBoardId: 'b1' });
  const { getByTestId } = renderBoard();
  const btn = getByTestId('clear-board-button');
  assert.ok(btn.className.includes('text-white'), `letra blanca sobre el gradiente (clases: ${btn.className})`);
  assert.ok(btn.className.includes('bg-white/20'), 'fondo translúcido sobre el gradiente');
});

