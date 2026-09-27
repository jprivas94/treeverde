import { useEffect } from 'react';
import useKanbanStore from '../store/kanbanStore';
import { connectRealtime } from '../shared/services/realtime';
import { initSessionSync } from '../shared/services/sessionSync';
import { refreshBoards } from '../features/boards/boardService';

// ─── useAppSync ───────────────────────────────────────────────────────
// Sincronización global de la app con sesión activa:
// - Tableros: se cargan al entrar y al cambiar de vista (conteos al día).
// - Realtime (Supabase): notificaciones y tareas en vivo.
// - Entre pestañas (BroadcastChannel): logout, login, perfil y "leídas".
export default function useAppSync(view) {
  const user = useKanbanStore((s) => s.user);
  const supabaseToken = useKanbanStore((s) => s.supabaseToken);

  useEffect(() => {
    if (user) refreshBoards();
  }, [user, view]);

  useEffect(() => {
    if (!user) return undefined;
    return connectRealtime(user.id, supabaseToken);
  }, [user, supabaseToken]);

  useEffect(() => {
    const store = useKanbanStore.getState;
    return initSessionSync({
      // broadcast: false evita el bucle (la pestaña de origen ya avisó)
      onLogout: () => store().logout({ broadcast: false }),
      // Solo el token: useSessionRestore carga la sesión completa (token && !user)
      onLogin: (incomingToken) => store().setToken(incomingToken),
      onProfileUpdate: (updates) => store().updateUser(updates),
      // El backend ya se marcó en la otra pestaña: aquí solo el estado local
      onNotificationsRead: () => store().markAllRead(),
    });
  }, []);
}
