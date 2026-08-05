import { useState, useEffect, useRef } from 'react';
import useKanbanStore from './store/kanbanStore';
import { authApi, tasksApi, invitesApi } from './services/api';
import { connectRealtime } from './services/realtime';
import { initSessionSync } from './services/sessionSync';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ResetPasswordForm from './components/ResetPasswordForm';
import Board from './components/Board';
import BoardSkeleton from './components/BoardSkeleton';
import { TASKS_PAGE_SIZE } from './constants/kanbanConfig';
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
  const setTasks = useKanbanStore((s) => s.setTasks);
  const setToken = useKanbanStore((s) => s.setToken);
  const updateUser = useKanbanStore((s) => s.updateUser);
  const markAllRead = useKanbanStore((s) => s.markAllRead);
  const [authView, setAuthView] = useState('login');
  const [resetToken, setResetToken] = useState(null);
  // Invitación por URL (?invite=TOKEN): al crearse una tarea se puede generar
  // un enlace que, al abrirlo, permite unirse a la tarea (como asignado si es
  // URL de creación, o como compartido si es de edición).
  // Sin sesión se muestra el LOGIN primero (con el banner de la tarea) para que
  // quien ya tiene cuenta inicie sesión y se una; los nuevos usuarios cambian a
  // 'Registrarse'. Con sesión activa, la tarea se añade automáticamente.
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null); // { taskTitle, creatorName }
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const [inviteAcceptedMsg, setInviteAcceptedMsg] = useState('');
  const inviteAcceptedRef = useRef(false);

  // Detectar token de restablecimiento y/o invitación en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('resetToken');
    if (tokenParam) {
      setResetToken(tokenParam);
      setAuthView('reset-password');
      // Limpiar el token de la URL sin recargar
      const url = new URL(window.location);
      url.searchParams.delete('resetToken');
      window.history.replaceState({}, '', url);
    }

    const inviteParam = params.get('invite');
    if (inviteParam) {
      setInviteToken(inviteParam);
      // Cargar la info pública de la tarea para el banner (registro/login)
      invitesApi
        .getInfo(inviteParam)
        .then((info) => setInviteInfo(info))
        .catch(() => setInviteInvalid(true));
    }
  }, []);

  // Aceptar la invitación cuando hay sesión: agrega al usuario a la tarea,
  // recarga las tareas y muestra un aviso. Idempotente (ref evita loops).
  useEffect(() => {
    if (!user || !inviteToken || inviteAcceptedRef.current) return;
    if (inviteInfo === null && !inviteInvalid) return; // aún cargando la info
    inviteAcceptedRef.current = true;
    if (inviteInvalid) return;

    let cancelled = false;
    invitesApi
      .accept(inviteToken)
      .then(() => {
        if (cancelled) return;
        setInviteAcceptedMsg(
          inviteInfo ? `🎉 Te uniste a la tarea «${inviteInfo.taskTitle}»` : '🎉 Te uniste a la tarea'
        );
        // Recargar tareas para que la tarea aparezca en el tablero
        tasksApi.getAll({ limit: TASKS_PAGE_SIZE }).then((data) => {
          if (!cancelled) setTasks(data, data.length === TASKS_PAGE_SIZE);
        }).catch(() => {});
        // Limpiar el parámetro de la URL
        const url = new URL(window.location);
        if (url.searchParams.has('invite')) {
          url.searchParams.delete('invite');
          window.history.replaceState({}, '', url);
        }
      })
      .catch(() => {
        if (!cancelled) setInviteInvalid(true);
      });
    return () => { cancelled = true; };
  }, [user, inviteToken, inviteInfo, inviteInvalid, setTasks]);

  // Al montar el tablero (sesión activa), volver authView a 'login' para que
  // un logout posterior muestre el login y no una vista anterior (p. ej.
  // 'register' tras haberse registrado). No puede tocar la pantalla de reset,
  // porque ahí token es null.
  useEffect(() => {
    if (token && user && authView !== 'login') setAuthView('login');
  }, [token, user, authView]);

  // Restaurar sesión y precargar tareas EN PARALELO (una sola espera)
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

  // Conectar Realtime (Supabase) cuando hay sesión activa: notificaciones
  // y cambios de tareas en vivo. Se desconecta al cerrar sesión o desmontar.
  const supabaseToken = useKanbanStore((s) => s.supabaseToken);
  useEffect(() => {
    if (!user) return undefined;
    return connectRealtime(user.id, supabaseToken);
  }, [user, supabaseToken]);

  // Sincronizar sesión entre pestañas (BroadcastChannel):
  // - onLogout: si otra pestaña cierra sesión, esta también lo hace.
  //   broadcast: false evita el bucle (el logout originario ya avisó).
  // - onLogin: si otra pestaña inicia sesión, aplicamos el token; el efecto
  //   de restauración (token && !user) carga la sesión completa por sí solo.
  // - onProfileUpdate: si otra pestaña edita el perfil, aplicamos los
  //   nombre/foto vía updateUser (propaga también a tareas asignadas/creadas).
  // - onNotificationsRead: si otra pestaña marcó las notificaciones como
  //   leídas (el backend ya se actualizó ahí), solo aplicamos el estado local.
  useEffect(() => {
    return initSessionSync({
      onLogout: () => logout({ broadcast: false }),
      onLogin: (incomingToken) => setToken(incomingToken),
      onProfileUpdate: (updates) => updateUser(updates),
      onNotificationsRead: () => markAllRead(),
    });
  }, [logout, setToken, updateUser, markAllRead]);

  // Mostrar formulario de restablecimiento si hay token
  if (resetToken && authView === 'reset-password' && !token) {
    return (
      <ResetPasswordForm
        token={resetToken}
        onSuccess={() => {
          setResetToken(null);
          setAuthView('login');
        }}
      />
    );
  }

  if (!token) {
    if (authView === 'forgot-password') {
      return <ForgotPasswordForm onBack={() => setAuthView('login')} />;
    }
    return authView === 'login' ? (
      <LoginForm
        onSwitch={() => setAuthView('register')}
        onForgotPassword={() => setAuthView('forgot-password')}
        invite={inviteInfo}
      />
    ) : (
      <RegisterForm onSwitch={() => setAuthView('login')} invite={inviteInfo} />
    );
  }

  // Skeleton del tablero mientras se restauran sesión y tareas (en paralelo)
  if (token && !user) {
    return (
      <ErrorBoundary>
        <BoardSkeleton />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {inviteAcceptedMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100%-2rem)] bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-3 animate-fade-scale-in">
          <span>{inviteAcceptedMsg}</span>
          <button
            onClick={() => setInviteAcceptedMsg('')}
            className="text-emerald-100 hover:text-white transition text-base leading-none"
            aria-label="Cerrar aviso"
          >
            &times;
          </button>
        </div>
      )}
      <Board />
      {showWelcome && <WelcomeModal />}
    </ErrorBoundary>
  );
}

