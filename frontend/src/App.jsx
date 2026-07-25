import { useState, useEffect } from 'react';
import useKanbanStore from './store/kanbanStore';
import { authApi } from './services/api';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Board from './components/Board';
import WelcomeModal from './components/WelcomeModal';
import ErrorBoundary from './components/ErrorBoundary';
import logger from './services/logger';

// Capturar errores globales no controlados
if (typeof window !== 'undefined') {
  window.onerror = function (msg, source, line, col, error) {
    logger.error('Error global no capturado', error || msg, { source, line, col });
  };
  window.addEventListener('unhandledrejection', function (e) {
    logger.error('Promesa no manejada', e.reason, {});
  });
}

export default function App() {
  const token = useKanbanStore((s) => s.token);
  const user = useKanbanStore((s) => s.user);
  const setUser = useKanbanStore((s) => s.setUser);
  const logout = useKanbanStore((s) => s.logout);
  const showWelcome = useKanbanStore((s) => s.showWelcome);
  const [authView, setAuthView] = useState('login');
  const [loadingUser, setLoadingUser] = useState(false);

  // Restaurar usuario desde el backend si hay token guardado
  useEffect(() => {
    if (token && !user) {
      setLoadingUser(true);
      authApi
        .me()
        .then((u) => setUser(u, token))
        .catch(() => logout())
        .finally(() => setLoadingUser(false));
    }
  }, [token, user, setUser, logout, setLoadingUser]);

  if (!token) {
    return authView === 'login' ? (
      <LoginForm onSwitch={() => setAuthView('register')} />
    ) : (
      <RegisterForm onSwitch={() => setAuthView('login')} />
    );
  }

  // Pantalla de carga mientras se restaura la sesión
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📋</div>
          <p className="text-gray-500 text-sm">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Board />
      {showWelcome && <WelcomeModal />}
    </ErrorBoundary>
  );
}

