import useKanbanStore from '../store/kanbanStore';
import { authApi } from '../services/api';
import { broadcastLogin } from '../services/sessionSync';

// Hook de autenticación usado por LoginForm y RegisterForm.
// Nota: la restauración de sesión (GET /me + tareas) NO vive aquí: la hace
// App.jsx en paralelo cuando hay token guardado y el usuario aún no está
// cargado (estos formularios solo se renderizan sin sesión, así que el
// efecto de restauración nunca se ejecutaría aquí).
export default function useAuth() {
  const loading = useKanbanStore((s) => s.loading);
  const setUser = useKanbanStore((s) => s.setUser);
  const setLoading = useKanbanStore((s) => s.setLoading);
  const setShowWelcome = useKanbanStore((s) => s.setShowWelcome);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user, data.token, data.supabaseToken);
      // Propagar el login a las demás pestañas (sincronización de sesión)
      broadcastLogin(data.token);
      setShowWelcome(true);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await authApi.register(name, email, password);
      setUser(data.user, data.token, data.supabaseToken);
      broadcastLogin(data.token);
      setShowWelcome(true);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  return { login, register, loading };
}
