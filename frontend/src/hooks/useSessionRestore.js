import { useEffect } from 'react';
import useKanbanStore from '../store/kanbanStore';
import { authApi, tasksApi } from '../services/api';
import { TASKS_PAGE_SIZE } from '../constants/kanbanConfig';

// ─── useSessionRestore ────────────────────────────────────────────────
// Restaura la sesión (GET /me) y precarga las tareas EN PARALELO (una sola
// espera) cuando hay token guardado y el usuario aún no está cargado.
// Extraído de App.jsx para mantener el componente legible y aislar el
// flujo (candidato a test con mocks de API/store).
export default function useSessionRestore() {
  const token = useKanbanStore((s) => s.token);
  const user = useKanbanStore((s) => s.user);
  const setUser = useKanbanStore((s) => s.setUser);
  const setTasks = useKanbanStore((s) => s.setTasks);
  const logout = useKanbanStore((s) => s.logout);

  useEffect(() => {
    if (token && !user) {
      Promise.allSettled([authApi.me(), tasksApi.getAll({ limit: TASKS_PAGE_SIZE })]).then(
        ([meResult, tasksResult]) => {
          if (meResult.status === 'fulfilled') {
            setUser(meResult.value, token, meResult.value.supabaseToken);
            // Solo aplicar tareas si la sesión es válida
            if (tasksResult.status === 'fulfilled') {
              setTasks(tasksResult.value, tasksResult.value.length === TASKS_PAGE_SIZE);
            }
          } else {
            logout();
          }
        }
      );
    }
  }, [token, user, setUser, setTasks, logout]);
}
