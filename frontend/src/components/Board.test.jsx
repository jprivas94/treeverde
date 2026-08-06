// ─── Board: render, archivado y drag & drop ────────────────────────────
// El sensor real de @hello-pangea/dnd requiere geometria de layout que jsdom
// no calcula (getBoundingClientRect/elementFromPoint). La practica estandar
// es mockear el DragDropContext para CAPTURAR el onDragEnd de Board e
// invocarlo con un resultado de drag simulado, manteniendo el render real
// de Column/TaskCard (Droppable/Draggable stubeados con render props).
// El comportamiento visual del arrastre se cubre en e2e (Playwright).
import '../test/setupDom';
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import useKanbanStore from '../store/kanbanStore';
import { stubFetch, findCall } from '../test/fetchStub';
import { ensureDomStubs, makeTask, defaultHandlers, USER } from '../test/boardTestUtils';

ensureDomStubs();

// ─── Mock de @hello-pangea/dnd (antes de importar Board) ───────────────
let dragEndHandler = null;

mock.module('@hello-pangea/dnd', {
  exports: {
    DragDropContext: ({ onDragEnd, children }) => {
      dragEndHandler = onDragEnd;
      return children;
    },
    Droppable: ({ children, droppableId }) =>
      children(
        {
          innerRef: () => {},
          droppableProps: { 'data-rfd-droppable-id': droppableId },
          placeholder: null,
        },
        {} // snapshot: Column lee isDraggingOver
      ),
    Draggable: ({ children, draggableId }) =>
      children(
        {
          innerRef: () => {},
          draggableProps: { 'data-rfd-draggable-id': draggableId },
          dragHandleProps: { 'data-rfd-drag-handle-draggable-id': draggableId },
        },
        {}
      ),
  },
});

const { default: Board } = await import('./Board.jsx');

const realFetch = globalThis.fetch;

// Nota: 'Revision' va sin tilde (workaround de encoding del heredoc). El
// titulo sale del store sembrado y el heading de la columna se matchea con
// regex /Revisi/, asi que es consistente — no 'corregir' la tilde sin
// ajustar las aserciones exactas (getByText).
const TASK_DONE = makeTask('t1', 'Tarea en Revision', 'DONE');

function seedStore(overrides = {}) {
  useKanbanStore.setState({
    user: USER,
    token: 'tok',
    tasks: [],
    archivedTasks: [],
    tasksLoaded: true, // evita el fetch inicial de Board
    tasksHasMore: false,
    notifications: [],
    unreadCount: 0,
    ...overrides,
  });
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
  const { getByRole, getAllByRole } = render(<Board isDark={false} onToggleTheme={() => {}} />);
  getByRole('heading', { name: 'Por Hacer' });
  getByRole('heading', { name: 'En Progreso' });
  getAllByRole('heading', { name: /Revisi/ });
  getByRole('heading', { name: '🗑 Terminado' });
});

test('Board: la columna Terminado se muestra aunque no haya tareas (las archivadas viven en el historial)', () => {
  // archivedTasks con contenido pero getColumns solo agrupa desde tasks:
  // la columna Terminado aparece vacia en el tablero.
  seedStore({
    tasks: [TASK_DONE],
    archivedTasks: [makeTask('a1', 'Tarea archivada', 'ARCHIVED')],
  });
  const { getByRole, queryByText, getByText } = render(<Board isDark={false} onToggleTheme={() => {}} />);
  getByRole('heading', { name: '🗑 Terminado' });
  // La archivada NO aparece como tarjeta en el tablero (solo en el historial)
  assert.equal(queryByText('Tarea archivada'), null, 'las archivadas no se renderizan en el tablero');
  // La tarea activa si se ve en su columna
  getByText(/Tarea en Revisi/);
});

// ─── Archivado (botón Terminar → modal → confirmar) ──

test('Board: archivar una tarea (modal de finalizacion) la saca del tablero y la deja en archivedTasks', async () => {
  seedStore({ tasks: [TASK_DONE] });
  const calls = stubFetch(defaultHandlers());
  const { getByText, getByRole, queryByText } = render(<Board isDark={false} onToggleTheme={() => {}} />);

  // La tarea esta en el tablero
  getByText('Tarea en Revision');

  // Clic en el boton "Terminar →" de la tarjeta → abre el modal de finalizacion
  const terminarBtn = getByRole('button', { name: /^Terminar/ });
  fireEvent.click(terminarBtn);

  // Confirmar en el modal (lazy import de TaskCompleteModal)
  const confirmBtn = await waitFor(() => getByRole('button', { name: /Entendido/ }), { timeout: 3000 });
  fireEvent.click(confirmBtn);

  // La tarea sale del tablero activo
  await waitFor(() => {
    assert.equal(queryByText('Tarea en Revision'), null, 'la tarea ya no debe estar en el tablero');
  });

  // Y queda en archivedTasks (historial)
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 0, 'tasks vacio tras archivar');
  assert.equal(s.archivedTasks.length, 1, 'la tarea queda en archivedTasks');
  assert.equal(s.archivedTasks[0].id, 't1');
  assert.equal(s.archivedTasks[0].status, 'ARCHIVED');

  // Persistio en backend con PATCH /tasks/:id/status ARCHIVED
  const patch = findCall(calls, 'PATCH', '/tasks/t1/status');
  assert.ok(patch, 'debe enviarse PATCH /tasks/:id/status al archivar');
  assert.ok(patch.body.includes('ARCHIVED'), 'el payload debe indicar ARCHIVED');
});

test('Board: archivar una tarea DONE conserva completedAt y fija archivedAt', async () => {
  const completedAt = '2026-07-20T10:00:00.000Z';
  seedStore({ tasks: [makeTask('t1', 'Tarea completada', 'DONE', { completedAt })] });
  const { getByRole, queryByText } = render(<Board isDark={false} onToggleTheme={() => {}} />);

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

// Helper: dispara onDragEnd con un resultado de drag simulado
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
  render(<Board isDark={false} onToggleTheme={() => {}} />);

  assert.equal(useKanbanStore.getState().tasks[0].status, 'TODO');

  simulateDrag('t1', 'TODO', 'IN_PROGRESS');

  // El store refleja el movimiento (optimistic UI)
  assert.equal(useKanbanStore.getState().tasks[0].status, 'IN_PROGRESS', 'la tarea debe quedar en IN_PROGRESS');

  // Persistio con PATCH /tasks/:id/status IN_PROGRESS
  const patch = findCall(calls, 'PATCH', '/tasks/t1/status');
  assert.ok(patch, 'debe enviarse PATCH /tasks/:id/status tras el drag');
  assert.ok(patch.body.includes('IN_PROGRESS'), 'el payload debe indicar IN_PROGRESS');
});

test('Board: arrastrar a la columna Terminado abre el modal de finalizacion sin cambiar el estado', async () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea finalizada por drag', 'DONE')] });
  stubFetch(defaultHandlers());
  const { getByRole } = render(<Board isDark={false} onToggleTheme={() => {}} />);

  simulateDrag('t1', 'DONE', 'ARCHIVED');

  // Se abre el modal de finalizacion (lazy import) y el estado NO cambia aun.
  // Timeout 3000: evita solaparse con el auto-confirm de 5s del modal.
  const confirmBtn = await waitFor(() => getByRole('button', { name: /Entendido/ }), { timeout: 3000 });
  assert.ok(confirmBtn, 'el modal de finalizacion debe abrirse al arrastrar a Terminado');

  // El estado NO cambia hasta confirmar en el modal
  assert.equal(useKanbanStore.getState().tasks[0].status, 'DONE', 'el estado no cambia al arrastrar a Terminado');
  assert.equal(useKanbanStore.getState().archivedTasks.length, 0, 'nada se archiva sin confirmar');
});

test('Board: soltar fuera de una columna (destination null) no mueve ni persiste nada', () => {
  seedStore({ tasks: [makeTask('t1', 'Tarea estatica', 'TODO')] });
  const calls = stubFetch(defaultHandlers());
  render(<Board isDark={false} onToggleTheme={() => {}} />);

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
  const { getByRole, getByText, queryByText, queryByRole } = render(<Board isDark={false} onToggleTheme={() => {}} />);

  // En el tablero la archivada no se ve (solo vive en el historial)
  assert.equal(queryByText('Tarea archivada'), null, 'la archivada no esta en el tablero');

  // Clic en el boton Historial
  fireEvent.click(getByRole('button', { name: /Historial/ }));

  // Se carga el panel (lazy import) con la archivada y el boton cambia a Volver
  // Timeout 3000: el lazy import tarda mas bajo carga paralela de la suite.
  await waitFor(
    () => {
      getByText('Tarea archivada');
      getByText(/Tarea en Revisi/); // la DONE de tasks tambien aparece en el historial
      getByRole('button', { name: /Volver/ });
    },
    { timeout: 3000 }
  );

  // El tablero queda oculto: sin columnas y sin el boton de añadir tarea
  assert.equal(queryByRole('heading', { name: 'Por Hacer' }), null, 'las columnas se ocultan en el historial');
  assert.equal(queryByRole('button', { name: /A[nñ]adir Tarea/ }), null, 'el boton de añadir se oculta en el historial');

  // Volver restaura el tablero y la archivada desaparece de nuevo
  fireEvent.click(getByRole('button', { name: /Volver/ }));
  await waitFor(() => getByRole('heading', { name: 'Por Hacer' }));
  assert.equal(queryByText('Tarea archivada'), null, 'al volver la archivada desaparece del tablero');
});

test('Board: el historial vacio muestra su estado vacio y el badge del header cambia a Historial', async () => {
  seedStore({ tasks: [], archivedTasks: [] });
  const { getByRole, getByText } = render(<Board isDark={false} onToggleTheme={() => {}} />);

  // Badge del header: Tablero al inicio
  getByText('Tablero');

  fireEvent.click(getByRole('button', { name: /Historial/ }));

  // El badge cambia a Historial y el panel vacio muestra su estado vacio (lazy import)
  await waitFor(
    () => {
      getByText('Historial'); // badge del header
      getByText('No hay tareas completadas aun.'); // estado vacio del panel
    },
    { timeout: 3000 }
  );
});

// ─── Eliminación desde la tarjeta (botón 🗑 solo para el creador) ─

test('Board: el creador ve el boton Eliminar en la tarjeta y elimina con confirmacion', async () => {
  // Tarea cuyo creador es el usuario logueado (u1)
  seedStore({ tasks: [makeTask('t1', 'Tarea del creador', 'TODO', { creator: USER })] });
  const calls = stubFetch([
    ...defaultHandlers(),
    { method: 'DELETE', path: '/tasks/t1', body: { message: 'Tarea eliminada' } },
  ]);
  const { getByText, getByTitle, queryByText } = render(<Board isDark={false} onToggleTheme={() => {}} />);

  // El boton Eliminar (🗑) esta en la tarjeta
  const deleteBtn = getByTitle('Eliminar');

  // Clic → abre el modal de confirmacion (lazy import)
  fireEvent.click(deleteBtn);
  await waitFor(() => getByText('¿Eliminar tarea?'), { timeout: 3000 });

  // Aceptar → DELETE + la tarea sale del store y del tablero
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
  const { getByText, getByTitle } = render(<Board isDark={false} onToggleTheme={() => {}} />);

  fireEvent.click(getByTitle('Eliminar'));
  await waitFor(() => getByText('¿Eliminar tarea?'), { timeout: 3000 });
  fireEvent.click(getByText('Cancelar'));

  await waitFor(() => assert.equal(useKanbanStore.getState().tasks.some((t) => t.id === 't1'), true, 'la tarea sigue en el store'));
  assert.equal(findCall(calls, 'DELETE', '/tasks/t1'), undefined, 'no debe llamarse DELETE al cancelar');
});

test('Board: el no creador no ve el boton Eliminar en la tarjeta', () => {
  // creator por defecto es c1 (Carol), el usuario es u1 (Jean) → no es creador
  seedStore({ tasks: [makeTask('t1', 'Tarea ajena', 'TODO')] });
  const { queryByTitle } = render(<Board isDark={false} onToggleTheme={() => {}} />);
  assert.equal(queryByTitle('Eliminar'), null, 'el no creador no ve el boton eliminar');
});
