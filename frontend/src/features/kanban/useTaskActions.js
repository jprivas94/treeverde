import { useCallback, useState } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import { tasksApi, boardsApi } from '../../shared/services/api';
import { isAssigneeOnly, isSharedUser } from '../../shared/utils/tasks';
import logger from '../../shared/services/logger';
import { reloadTasks } from '../tasks/taskService';

// ─── useTaskActions ───────────────────────────────────────────────────
// Acciones del tablero sobre las tareas (mover, archivar, eliminar, vaciar)
// con UI optimista + rollback, y el estado de sus modales de confirmación.
// Las acciones del store se leen con getState() en el momento de usarlas.
export default function useTaskActions() {
  const user = useKanbanStore((s) => s.user);
  const activeBoardId = useKanbanStore((s) => s.activeBoardId);

  const [completing, setCompleting] = useState(null); // { task, sourceId } → modal de finalización
  const [deletingTask, setDeletingTask] = useState(null); // tarea pendiente de confirmar borrado
  const [clearScope, setClearScope] = useState(null); // 'board' | 'all' → modal de vaciado
  const [busy, setBusy] = useState(false); // borrado/vaciado en curso

  // Mover una tarea a otra columna (botones de la tarjeta y drag & drop).
  // Mover a ARCHIVED abre el modal de finalización (solo el creador).
  const moveTask = useCallback(async (task, newStatus) => {
    if (isSharedUser(task, user)) return;
    if (newStatus === 'ARCHIVED') {
      if (!isAssigneeOnly(task, user)) setCompleting({ task, sourceId: task.status });
      return;
    }
    const { updateTaskStatus } = useKanbanStore.getState();
    updateTaskStatus(task.id, newStatus);
    try {
      await tasksApi.updateStatus(task.id, newStatus);
    } catch (err) {
      logger.error('Error al mover tarea', err, { taskId: task.id, fromStatus: task.status, toStatus: newStatus });
      updateTaskStatus(task.id, task.status); // rollback
    }
  }, [user]);

  const onDragEnd = useCallback(({ draggableId, source, destination }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const task = useKanbanStore.getState().tasks.find((t) => t.id === draggableId);
    if (task) moveTask(task, destination.droppableId);
  }, [moveTask]);

  // Confirmar la finalización: la tarea sale del tablero y queda en el historial.
  const confirmArchive = useCallback(() => {
    if (!completing) return;
    const { task, sourceId } = completing;
    const { updateTaskStatus, removeTask, archiveTask, restoreTask } = useKanbanStore.getState();
    const now = new Date().toISOString();

    updateTaskStatus(task.id, 'ARCHIVED');
    removeTask(task.id);
    archiveTask({ ...task, status: 'ARCHIVED', completedAt: task.completedAt || now, archivedAt: now, updatedAt: now });
    setCompleting(null);

    tasksApi.updateStatus(task.id, 'ARCHIVED').catch((err) => {
      logger.error('Error al archivar tarea (PATCH ARCHIVED)', err, { taskId: task.id, sourceStatus: sourceId });
      restoreTask(task, sourceId); // rollback
    });
  }, [completing]);

  const confirmDelete = useCallback(async () => {
    const task = deletingTask;
    setBusy(true);
    try {
      await tasksApi.remove(task.id);
      useKanbanStore.getState().removeTask(task.id);
    } catch (err) {
      logger.error('Error al eliminar tarea', err, { taskId: task.id });
    } finally {
      setDeletingTask(null);
      setBusy(false);
    }
  }, [deletingTask]);

  // Vaciar: con tablero activo elimina sus tareas; en "Todas" elimina todas las del usuario.
  // Si el backend no pudo borrar todo (tareas protegidas/ajenas), se recarga desde el servidor.
  const confirmClear = useCallback(async () => {
    setBusy(true);
    try {
      // Con tablero activo el store solo contiene tareas de ese tablero
      const { tasks, archivedTasks, clearAllTasks } = useKanbanStore.getState();
      if (clearScope === 'all') {
        const res = await tasksApi.removeAll();
        const remaining = Number(res?.remaining);
        if (Number.isFinite(remaining) && remaining > 0) await reloadTasks();
        else clearAllTasks();
      } else if (activeBoardId) {
        const res = await boardsApi.clearTasks(activeBoardId);
        const deleted = Number(res?.deleted);
        if (Number.isFinite(deleted) && deleted < tasks.length + archivedTasks.length) await reloadTasks(activeBoardId);
        else clearAllTasks();
      }
    } catch (err) {
      logger.error('Error al vaciar tareas', err, { scope: clearScope, boardId: activeBoardId });
    } finally {
      setClearScope(null);
      setBusy(false);
    }
  }, [clearScope, activeBoardId]);

  return {
    moveTask,
    onDragEnd,
    completing,
    confirmArchive,
    deletingTask,
    requestDelete: setDeletingTask,
    cancelDelete: () => setDeletingTask(null),
    confirmDelete,
    clearScope,
    requestClear: setClearScope,
    cancelClear: () => setClearScope(null),
    confirmClear,
    busy,
  };
}
