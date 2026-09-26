import { useState, useEffect, useRef } from 'react';
import useKanbanStore from './store/kanbanStore';
import useTheme from './hooks/useTheme';
import useSessionRestore from './hooks/useSessionRestore';
import { tasksApi, boardsApi, invitesApi } from './services/api';
import { connectRealtime } from './services/realtime';
import { initSessionSync } from './services/sessionSync';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ResetPasswordForm from './components/ResetPasswordForm';
import Board from './components/Board';
import BoardsPanel from './components/BoardsPanel';
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
  // Modo oscuro: vive en App para que el listener del sistema y la
  // sincronización entre pestañas funcionen también en las pantallas de auth.
  const { isDark, toggle } = useTheme();

  const token = useKanbanStore((s) => s.token);
  const user = useKanbanStore((s) => s.user);
  const showWelcome = useKanbanStore((s) => s.showWelcome);
  const setToken = useKanbanStore((s) => s.setToken);
  const setTasks = useKanbanStore((s) => s.setTasks);
  const updateUser = useKanbanStore((s) => s.updateUser);
  const markAllRead = useKanbanStore((s) => s.markAllRead);
  const [authView, setAuthView] = useState('login');
  const setBoards = useKanbanStore((s) => s.setBoards);
  // Vista de tableros: 'panel' (listado) o 'board' (kanban de un tablero / todas las tareas)
  const [view, setView] = useState('panel');
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
  // Invitación a un TABLERO (?boardInvite=TOKEN): quien lo abre queda como
  // miembro del tablero y solo verá/trabajará dentro de él.
  const [boardInviteToken, setBoardInviteToken] = useState(null);
  const [boardInviteInfo, setBoardInviteInfo] = useState(null); // { boardName, boardIcon, ownerName }
  const [boardInviteInvalid, setBoardInviteInvalid] = useState(false);
  const boardInviteAcceptedRef = useRef(false);

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

    // Invitación a un tablero: cargar info pública para el banner
    const boardInviteParam = params.get('boardInvite');
    if (boardInviteParam) {
      setBoardInviteToken(boardInviteParam);
      invitesApi
        .getBoardInfo(boardInviteParam)
        .then((info) => setBoardInviteInfo(info))
        .catch(() => setBoardInviteInvalid(true));
    }
  }, []);

  // Aceptar la invitación AL TABLERO cuando hay sesión: agrega al usuario como
  // miembro, refresca tableros/tareas y muestra un aviso. Idempotente (ref).
  useEffect(() => {
    if (!user || !boardInviteToken || boardInviteAcceptedRef.current) return;
    if (boardInviteInfo === null && !boardInviteInvalid) return; // aún cargando la info
    boardInviteAcceptedRef.current = true;
    if (boardInviteInvalid) return;

    let cancelled = false;
    invitesApi
      .acceptBoard(boardInviteToken)
      .then((res) => {
        if (cancelled) return;
        setInviteAcceptedMsg(
          boardInviteInfo
            ? `🎉 Te uniste al tablero ${boardInviteInfo.boardIcon || ''} «${boardInviteInfo.boardName}»`
            : res.message || '🎉 Te uniste al tablero'
        );
        // Refrescar tableros y tareas: el tablero nuevo aparece en el panel
        // y sus tareas (visibles ahora para el usuario) se cargan al entrar.
        boardsApi.getAll().then(setBoards).catch(() => {});
        tasksApi.getAll({ limit: TASKS_PAGE_SIZE }).then((data) => {
          if (!cancelled) setTasks(data, data.length === TASKS_PAGE_SIZE);
        }).catch(() => {});
        // Limpiar el parámetro de la URL
        const url = new URL(window.location);
        if (url.searchParams.has('boardInvite')) {
          url.searchParams.delete('boardInvite');
          window.history.replaceState({}, '', url);
        }
      })
      .catch(() => {
        if (!cancelled) setBoardInviteInvalid(true);
      });
    return () => { cancelled = true; };
  }, [user, boardInviteToken, boardInviteInfo, boardInviteInvalid, setBoards, setTasks]);

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

  // Restaurar sesión y precargar tareas EN PARALELO (hook extraído de App)
  useSessionRestore();

  // Cargar tableros al iniciar sesión (panel de selección). Se recargan al
  // volver del tablero al panel para reflejar conteos y tableros nuevos.
  useEffect(() => {
    if (!user) return;
    boardsApi.getAll().then(setBoards).catch(() => {});
  }, [user, view, setBoards]);

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
      // getState() evita depender de la variable de cierre (acción estable del
    // store) y el falso positivo de exhaustive-deps con los actions de zustand.
    onLogout: () => useKanbanStore.getState().logout({ broadcast: false }),

      onLogin: (incomingToken) => setToken(incomingToken),
      onProfileUpdate: (updates) => updateUser(updates),
      onNotificationsRead: () => markAllRead(),
    });
  }, [setToken, updateUser, markAllRead]);

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
    // Banner de invitación a un TABLERO: se muestra en el login/registro
    // mientras se resuelve la info pública del enlace.
    if (boardInviteToken) {
      const banner = boardInviteInvalid
        ? { error: true, text: 'El enlace de invitación no es válido' }
        : boardInviteInfo
        ? { text: `${boardInviteInfo.boardIcon || '🗂'} ${boardInviteInfo.ownerName || 'Alguien'} te invita a unirte al tablero «${boardInviteInfo.boardName}»` }
        : null;
      if (banner) {
        return (
          <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
            <div className="w-full max-w-md mx-auto px-4 pt-6">
              <div
                className={`text-sm font-medium rounded-xl px-4 py-3 border ${
                  banner.error
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                }`}
              >
                {banner.text}
              </div>
            </div>
            <div className="flex-1 flex items-start justify-center pt-2">
              {authView === 'login' ? (
                <LoginForm
                  onSwitch={() => setAuthView('register')}
                  onForgotPassword={() => setAuthView('forgot-password')}
                />
              ) : (
                <RegisterForm onSwitch={() => setAuthView('login')} />
              )}
            </div>
          </div>
        );
      }
    }
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

  // ─── Panel de tableros ────────────────────────────────────────
  if (view === 'panel') {
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
        <BoardsPanel
          isDark={isDark}
          onToggleTheme={toggle}
          onSelectBoard={(boardId) => {
            useKanbanStore.getState().setActiveBoard(boardId);
            setTasks([], false);
            useKanbanStore.setState({ tasksLoaded: false });
            setView('board');
          }}
          onSelectAll={() => {
            useKanbanStore.getState().setActiveBoard(null);
            setTasks([], false);
            useKanbanStore.setState({ tasksLoaded: false });
            setView('board');
          }}
        />
        {showWelcome && <WelcomeModal />}
      </ErrorBoundary>
    );
  }

  // ─── Tablero Kanban ──────────────────────────────────────────
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
      <Board
        isDark={isDark}
        onToggleTheme={toggle}
        onBackToBoards={() => {
          useKanbanStore.setState({ tasksLoaded: false });
          setView('panel');
        }}
      />
      {showWelcome && <WelcomeModal />}
    </ErrorBoundary>
  );
}

