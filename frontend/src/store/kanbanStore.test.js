import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock de localStorage (Node no lo expone globalmente)
const storage = {};
globalThis.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
};

const { default: useKanbanStore } = await import('./kanbanStore.js');

beforeEach(() => {
  useKanbanStore.setState({
    tasks: [],
    archivedTasks: [],
    user: null,
    token: null,
    notifications: [],
    unreadCount: 0,
    tasksLoaded: false,
    tasksHasMore: false,
  });
});

test('setTasks separa ARCHIVED en archivedTasks', () => {
  useKanbanStore.getState().setTasks([
    { id: '1', status: 'TODO' },
    { id: '2', status: 'ARCHIVED' },
  ]);
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 1);
  assert.equal(s.archivedTasks.length, 1);
  assert.equal(s.archivedTasks[0].id, '2');
});

test('setTasks marca tasksHasMore según el flag', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }], true);
  assert.equal(useKanbanStore.getState().tasksHasMore, true);

  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }], false);
  assert.equal(useKanbanStore.getState().tasksHasMore, false);
});

test('appendTasks agrega sin duplicar y separa ARCHIVED', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }], true);
  useKanbanStore.getState().appendTasks([
    { id: '1', status: 'TODO' }, // duplicado: se descarta
    { id: '2', status: 'IN_PROGRESS' },
    { id: '3', status: 'ARCHIVED' },
  ], true);
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 2, 'debe conservar 1 y agregar 2');
  assert.equal(s.archivedTasks.length, 1, 'debe separar la archivada');
  assert.equal(s.archivedTasks[0].id, '3');
  assert.equal(s.tasksHasMore, true);
});

test('appendTasks con página corta marca tasksHasMore = false', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }], true);
  useKanbanStore.getState().appendTasks([{ id: '2', status: 'TODO' }], false);
  assert.equal(useKanbanStore.getState().tasksHasMore, false);
});

test('logout resetea tasksHasMore', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }], true);
  useKanbanStore.getState().logout();
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 0);
  assert.equal(s.tasksHasMore, false);
  assert.equal(s.tasksLoaded, false);
});

test('updateTaskStatus marca completedAt al pasar a DONE', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }]);
  useKanbanStore.getState().updateTaskStatus('1', 'DONE');
  const t = useKanbanStore.getState().tasks.find((x) => x.id === '1');
  assert.equal(t.status, 'DONE');
  assert.ok(t.completedAt, 'completedAt debe establecerse');
});

test('updateTaskStatus limpia completedAt al retroceder', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'DONE', completedAt: new Date().toISOString() }]);
  useKanbanStore.getState().updateTaskStatus('1', 'IN_PROGRESS');
  assert.equal(useKanbanStore.getState().tasks[0].completedAt, null);
});

test('restoreTask devuelve la tarea al tablero con su estado original', () => {
  useKanbanStore.setState({
    tasks: [],
    archivedTasks: [{ id: '1', status: 'ARCHIVED' }],
  });
  useKanbanStore.getState().restoreTask({ id: '1', status: 'ARCHIVED' }, 'TODO');
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 1);
  assert.equal(s.tasks[0].status, 'TODO');
  assert.equal(s.archivedTasks.length, 0);
});

test('flujo completo de archivado: updateTaskStatus → removeTask → archiveTask → restoreTask', () => {
  // Tarea en el tablero (estado inicial)
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO', title: 'Tarea A' }]);

  // 1. updateTaskStatus: marcar como ARCHIVED (como hace handleArchiveTask)
  useKanbanStore.getState().updateTaskStatus('1', 'ARCHIVED');
  const archiving = useKanbanStore.getState().tasks.find((x) => x.id === '1');
  assert.equal(archiving.status, 'ARCHIVED');
  assert.ok(archiving.completedAt, 'completedAt debe fijarse al archivar');
  assert.ok(archiving.archivedAt, 'archivedAt debe fijarse al archivar');

  // 2. removeTask: sale del tablero activo
  useKanbanStore.getState().removeTask('1');
  assert.equal(useKanbanStore.getState().tasks.length, 0);

  // 3. archiveTask: pasa al historial (con el estado ya actualizado a ARCHIVED)
  useKanbanStore.getState().archiveTask(archiving);
  let s = useKanbanStore.getState();
  assert.equal(s.archivedTasks.length, 1);
  assert.equal(s.archivedTasks[0].status, 'ARCHIVED');
  assert.equal(s.archivedTasks[0].title, 'Tarea A');
  assert.ok(s.archivedTasks[0].archivedAt, 'archiveTask debe conservar archivedAt');

  // 4. restoreTask: rollback devuelve la tarea al tablero con su estado original
  useKanbanStore.getState().restoreTask({ id: '1', status: 'ARCHIVED', title: 'Tarea A' }, 'TODO');
  s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 1);
  assert.equal(s.tasks[0].status, 'TODO');
  assert.equal(s.tasks[0].archivedAt, null, 'archivedAt debe limpiarse al restaurar');
  assert.equal(s.archivedTasks.length, 0, 'el historial debe quedar vacío tras el rollback');
});

test('updateTaskStatus DONE → ARCHIVED conserva completedAt original', () => {
  const originalCompletedAt = '2026-07-20T10:00:00.000Z';
  useKanbanStore.getState().setTasks([
    { id: '1', status: 'DONE', completedAt: originalCompletedAt }
  ]);

  // Archivar una tarea ya completada (como hace handleArchiveTask con una tarea en DONE)
  useKanbanStore.getState().updateTaskStatus('1', 'ARCHIVED');
  const t = useKanbanStore.getState().tasks.find((x) => x.id === '1');
  assert.equal(t.status, 'ARCHIVED');
  assert.equal(t.completedAt, originalCompletedAt, 'completedAt debe conservarse, no sobrescribirse');
  assert.ok(t.archivedAt, 'archivedAt debe fijarse al archivar');
});

test('setNotifications reemplaza la lista y el contador de no leídas', () => {
  const notifs = [
    { id: 'n1', type: 'ASSIGNED', read: false },
    { id: 'n2', type: 'COMPLETED', read: true },
  ];
  useKanbanStore.getState().setNotifications(notifs, 1);
  const s = useKanbanStore.getState();
  assert.equal(s.notifications.length, 2);
  assert.equal(s.notifications[0].id, 'n1');
  assert.equal(s.unreadCount, 1);
});

test('markAllRead marca todas como leídas y resetea unreadCount', () => {
  useKanbanStore.getState().setNotifications([
    { id: 'n1', type: 'ASSIGNED', read: false },
    { id: 'n2', type: 'SHARED', read: false },
  ], 2);

  useKanbanStore.getState().markAllRead();
  const s = useKanbanStore.getState();
  assert.equal(s.unreadCount, 0);
  assert.ok(s.notifications.every((n) => n.read === true), 'todas deben quedar como leídas');
  assert.equal(s.notifications[0].type, 'ASSIGNED', 'no debe alterar el resto de campos');
});

test('upsertTask agrega una tarea nueva al tablero (evento realtime INSERT)', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }]);
  useKanbanStore.getState().upsertTask({ id: '2', status: 'IN_PROGRESS', title: 'Nueva' });
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 2);
  assert.ok(s.tasks.some((t) => t.id === '2'), 'la tarea nueva debe estar en el tablero');
});

test('upsertTask actualiza una tarea existente sin duplicarla (evento realtime UPDATE)', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO', title: 'Antes' }]);
  useKanbanStore.getState().upsertTask({ id: '1', status: 'DONE', title: 'Después' });
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 1, 'no debe duplicar');
  assert.equal(s.tasks[0].status, 'DONE');
  assert.equal(s.tasks[0].title, 'Después');
});

test('upsertTask mueve a archivedTasks cuando el status es ARCHIVED', () => {
  useKanbanStore.getState().setTasks([{ id: '1', status: 'TODO' }]);
  useKanbanStore.getState().upsertTask({ id: '1', status: 'ARCHIVED' });
  const s = useKanbanStore.getState();
  assert.equal(s.tasks.length, 0, 'sale del tablero activo');
  assert.equal(s.archivedTasks.length, 1, 'entra al historial');
  assert.equal(s.archivedTasks[0].id, '1');
});

test('removeTask limpia también archivedTasks (evento realtime DELETE)', () => {
  useKanbanStore.setState({
    tasks: [{ id: '1', status: 'TODO' }],
    archivedTasks: [{ id: '2', status: 'ARCHIVED' }],
  });
  useKanbanStore.getState().removeTask('2');
  const s = useKanbanStore.getState();
  assert.equal(s.archivedTasks.length, 0);
  assert.equal(s.tasks.length, 1, 'no debe tocar las tareas del tablero');
});

test('addNotification agrega al inicio, incrementa unreadCount y limita a 50', () => {
  useKanbanStore.getState().addNotification({ id: 'n1', type: 'ASSIGNED', read: false, message: 'Hola' });
  let s = useKanbanStore.getState();
  assert.equal(s.notifications[0].id, 'n1');
  assert.equal(s.unreadCount, 1);

  useKanbanStore.getState().addNotification({ id: 'n2', type: 'SHARED', read: true, message: 'Leída' });
  s = useKanbanStore.getState();
  assert.equal(s.notifications[0].id, 'n2', 'la más reciente primero');
  assert.equal(s.unreadCount, 1, 'las ya leídas no suman');

  // Límite de 50 notificaciones en memoria
  for (let i = 0; i < 60; i += 1) {
    useKanbanStore.getState().addNotification({ id: `bulk-${i}`, type: 'INFO', read: false });
  }
  s = useKanbanStore.getState();
  assert.equal(s.notifications.length, 50);
});

test('getColumns agrupa las tareas por estado en el orden de BOARD_STATUSES', () => {
  useKanbanStore.getState().setTasks([
    { id: '1', status: 'TODO' },
    { id: '2', status: 'DONE' },
    { id: '3', status: 'IN_PROGRESS' },
    { id: '4', status: 'TODO' },
  ]);
  const columns = useKanbanStore.getState().getColumns();

  // 4 columnas en el orden definido en BOARD_STATUSES
  assert.equal(columns.length, 4);
  assert.deepEqual(columns.map((c) => c.id), ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED']);

  // Agrupación correcta por estado
  assert.equal(columns[0].tasks.length, 2, 'TODO debe tener 2 tareas');
  assert.equal(columns[1].tasks.length, 1, 'IN_PROGRESS debe tener 1');
  assert.equal(columns[2].tasks.length, 1, 'DONE debe tener 1');
  assert.equal(columns[3].tasks.length, 0, 'ARCHIVED queda vacía (las archivadas van al historial)');

  // Títulos de las columnas (STATUS_LABELS / BOARD_TITLES)
  assert.equal(columns[0].title, 'Por Hacer');
  assert.equal(columns[2].title, 'Revisión');
});

test('getColumns ordena las tareas de cada columna por updatedAt descendente', () => {
  useKanbanStore.setState({
    tasks: [
      { id: 'a', status: 'TODO', updatedAt: '2026-07-01T10:00:00.000Z' },
      { id: 'b', status: 'TODO', updatedAt: '2026-07-05T10:00:00.000Z' },
      { id: 'c', status: 'TODO', updatedAt: '2026-07-03T10:00:00.000Z' },
    ],
  });

  const todo = useKanbanStore.getState().getColumns()[0];
  assert.deepEqual(todo.tasks.map((t) => t.id), ['b', 'c', 'a'], 'la más reciente primero');
});

test('updateTaskStatus ARCHIVED → TODO limpia completedAt y archivedAt (desarchivar)', () => {
  useKanbanStore.setState({
    tasks: [{
      id: '1',
      status: 'ARCHIVED',
      completedAt: '2026-07-20T10:00:00.000Z',
      archivedAt: '2026-07-21T10:00:00.000Z',
    }],
  });

  // Desarchivar: volver a TODO (como Restaurar en el historial)
  useKanbanStore.getState().updateTaskStatus('1', 'TODO');
  const t = useKanbanStore.getState().tasks.find((x) => x.id === '1');
  assert.equal(t.status, 'TODO');
  assert.equal(t.completedAt, null, 'completedAt debe limpiarse al desarchivar');
  assert.equal(t.archivedAt, null, 'archivedAt debe limpiarse al desarchivar');
});
