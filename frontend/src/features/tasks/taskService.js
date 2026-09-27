import useKanbanStore from '../../store/kanbanStore';
import { tasksApi } from '../../shared/services/api';
import { TASKS_PAGE_SIZE } from '../../shared/constants/kanbanConfig';

// ─── Servicio de tareas ───────────────────────────────────────────────
// Operaciones que combinan API + store y se usaban copiadas en App,
// Board y los modales.

const boardFilter = (boardId) => (boardId ? { boardId } : {});

/** Carga la primera página de tareas (del tablero o de todos) y reemplaza el store. */
export async function reloadTasks(boardId = null) {
  const data = await tasksApi.getAll({ limit: TASKS_PAGE_SIZE, ...boardFilter(boardId) });
  useKanbanStore.getState().setTasks(data, data.length === TASKS_PAGE_SIZE);
}

/** Carga la siguiente página a partir de `offset` y la añade al store. */
export async function loadMoreTasks(boardId, offset) {
  const data = await tasksApi.getAll({ limit: TASKS_PAGE_SIZE, offset, ...boardFilter(boardId) });
  useKanbanStore.getState().appendTasks(data, data.length === TASKS_PAGE_SIZE);
}

/** Aplica `fn(task)` a la tarea `taskId` del tablero (actualización local). */
export function patchTaskInStore(taskId, fn) {
  useKanbanStore.setState((s) => ({
    tasks: s.tasks.map((t) => (t.id === taskId ? fn(t) : t)),
  }));
}
