import { useEffect } from 'react';
import useKanbanStore from '../store/kanbanStore';
import { authApi } from '../services/api';

export default function useAuth() {
  const { user, token, setUser, logout, setLoading, setError, setShowWelcome } = useKanbanStore();

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      authApi
        .me()
        .then((u) => setUser(u, token))
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, [token, user, setUser, logout, setLoading]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user, data.token);
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
      setUser(data.user, data.token);
      setShowWelcome(true);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { user, token, isAuthenticated: !!token, login, register, logout };
}

