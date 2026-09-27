import useKanbanStore from '../../store/kanbanStore';
import { boardsApi } from '../../shared/services/api';

/** Recarga la lista de tableros del usuario (errores silenciosos: la UI conserva la anterior). */
export function refreshBoards() {
  return boardsApi.getAll().then(useKanbanStore.getState().setBoards).catch(() => {});
}
