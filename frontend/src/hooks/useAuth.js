import { useEffect } from 'react';
import useKanbanStore from '../store/kanbanStore';
import { authApi } from '../services/api';
import { broadcastLogin } from '../services/sessionSync';

export default function useAuth() {
  const { user, token, loading, setUser, logout, setLoading, setError, setShowWelcome } = useKanbanStore();

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      authApi
        .me()
        .then((u) => setUser(u, token, u.supabaseToken))
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, [token, user, setUser, logout, setLoading]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user, data.token, data.supabaseToken);
      // Propagar el login a las demás pestañas (sincronización de sesión)
      broadcastLogin(data.token);
      setShowWelcome(true);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register(name, email, password);
      setUser(data.user, data.token, data.supabaseToken);
      broadcastLogin(data.token);
      setShowWelcome(true);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { user, token, loading, isAuthenticated: !!token, login, register, logout };
}

