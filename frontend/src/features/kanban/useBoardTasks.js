import { useCallback, useEffect, useState } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import logger from '../../shared/services/logger';
import { loadMoreTasks, reloadTasks } from '../tasks/taskService';

// ─── useBoardTasks ────────────────────────────────────────────────────
// Carga inicial de tareas del tablero activo (si no se precargaron),
// paginación ("Cargar más") y refresco de los conteos del panel.
export default function useBoardTasks() {
  const tasks = useKanbanStore((s) => s.tasks);
  const archivedTasks = useKanbanStore((s) => s.archivedTasks);
  const tasksLoaded = useKanbanStore((s) => s.tasksLoaded);
  const activeBoardId = useKanbanStore((s) => s.activeBoardId);
  const refreshBoardCounts = useKanbanStore((s) => s.refreshBoardCounts);
  const [loading, setLoading] = useState(!tasksLoaded);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (tasksLoaded) return;
    setLoading(true);
    reloadTasks(activeBoardId)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [tasksLoaded, activeBoardId]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const offset = tasks.length + archivedTasks.length;
    setLoadingMore(true);
    try {
      await loadMoreTasks(activeBoardId, offset);
    } catch (err) {
      logger.error('Error al cargar más tareas', err, { offset });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, tasks.length, archivedTasks.length, activeBoardId]);

  // Conteos del tablero activo en el panel (myTaskCount/doneCount)
  useEffect(() => {
    refreshBoardCounts();
  }, [refreshBoardCounts, tasks, archivedTasks]);

  return { loading, loadingMore, loadMore };
}
