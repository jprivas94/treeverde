import { create } from 'zustand';
import { BOARD_STATUSES, STATUS_LABELS } from '../shared/constants/kanbanConfig.js';
import { broadcastLogout } from '../shared/services/sessionSync.js';

// ARCHIVED se muestra como 'Terminado' en el tablero
const BOARD_TITLES = { ...STATUS_LABELS, ARCHIVED: '🗑 Terminado' };

const useKanbanStore = create((set, get) => ({
  // ─── Estado ────────────────────────────────
  user: null,
  token: localStorage.getItem('token'),
  // Token compatible con Supabase (acuñado por el backend) para autenticar
  // la conexión Realtime y que RLS evalúe con auth.uid().
  supabaseToken: null,
  tasks: [],
  archivedTasks: [],
  // Estado de carga usado por useAuth (login/register) y los formularios
  loading: false,
  // true cuando las tareas ya fueron cargadas (evita re-fetch al montar Board)
  tasksLoaded: false,
  // true si hay más páginas de tareas por cargar (paginación)
  tasksHasMore: false,

  // ─── Boards (tableros) ─────────────────────
  // Lista de tableros donde el usuario es dueño o miembro. boardsLoaded
  // evita re-fetch al volver del tablero al panel. activeBoardId guarda el
  // tablero abierto (null = vista de todos).
  boards: [],
  boardsLoaded: false,
  activeBoardId: null,

  setBoards: (boards) => set({ boards, boardsLoaded: true }),

  addBoard: (board) => set((s) => ({ boards: [...s.boards, board] })),

  updateBoard: (boardId, updates) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === boardId ? { ...b, ...updates } : b)),
    })),

  removeBoard: (boardId) =>
    set((s) => ({
      boards: s.boards.filter((b) => b.id !== boardId),
      // Si se elimina el tablero activo, volver a la vista general
      activeBoardId: s.activeBoardId === boardId ? null : s.activeBoardId,
    })),

  setActiveBoard: (boardId) => set({ activeBoardId: boardId }),

  // Conteo de tareas visibles del tablero activo (para refrescar el panel)
  refreshBoardCounts: () =>
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === s.activeBoardId
          ? {
              ...b,
              myTaskCount: s.tasks.length,
              doneCount: s.tasks.filter((t) => t.status === 'DONE').length + s.archivedTasks.length,
            }
          : b
      ),
    })),

  // ─── Auth ──────────────────────────────────
  setUser: (user, token, supabaseToken = null) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token, supabaseToken });
  },

  logout: ({ broadcast = true } = {}) => {
    localStorage.removeItem('token');
    set({ user: null, token: null, supabaseToken: null, tasks: [], archivedTasks: [], tasksLoaded: false, tasksHasMore: false, boards: [], boardsLoaded: false, activeBoardId: null });
    // Avisar a las demás pestañas (solo desde la pestaña originaria;
    // el flag evita un bucle cuando el logout viene de otra pestaña vía BroadcastChannel).
    if (broadcast) broadcastLogout();
  },

  // Aplicar un token entrante de otra pestaña (sincronización de login).
  // Solo guarda el token: el efecto de App.jsx detecta token && !user y
  // restaura la sesión completa (/me + tareas) automáticamente.
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    set({ token });
  },

  // ─── Tasks ─────────────────────────────────
  setTasks: (tasks, hasMore = false) =>
    set({
      // Separar ARCHIVED al cargar: no aparecen en el tablero pero sí en historial
      tasks: tasks.filter((t) => t.status !== 'ARCHIVED'),
      archivedTasks: tasks.filter((t) => t.status === 'ARCHIVED'),
      tasksLoaded: true,
      tasksHasMore: !!hasMore,
    }),

  // Cargar la siguiente página sin duplicados (paginación de GET /api/tasks)
  appendTasks: (newTasks, hasMore = false) =>
    set((s) => {
      const seen = new Set([...s.tasks, ...s.archivedTasks].map((t) => t.id));
      const fresh = newTasks.filter((t) => !seen.has(t.id));
      return {
        tasks: [...s.tasks, ...fresh.filter((t) => t.status !== 'ARCHIVED')],
        archivedTasks: [...s.archivedTasks, ...fresh.filter((t) => t.status === 'ARCHIVED')],
        tasksLoaded: true,
        tasksHasMore: !!hasMore,
      };
    }),

  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),

  updateTaskStatus: (taskId, newStatus) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const now = new Date().toISOString();
        const wasCompleted = t.status === 'DONE' || t.status === 'ARCHIVED';
        const becomesCompleted = newStatus === 'DONE' || newStatus === 'ARCHIVED';
        const becomesArchived = newStatus === 'ARCHIVED';
        const wasArchived = t.status === 'ARCHIVED';
        return {
          ...t,
          status: newStatus,
          completedAt: becomesCompleted && !wasCompleted
            ? now
            : !becomesCompleted
            ? null
            : t.completedAt,
          archivedAt: becomesArchived && !wasArchived
            ? now
            : !becomesCompleted
            ? null
            : t.archivedAt,
          updatedAt: now
        };
      })
    })),

  removeTask: (taskId) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
      archivedTasks: s.archivedTasks.filter((t) => t.id !== taskId),
    })),

  // Vaciar "Todas las tareas": elimina del store todas las tareas visibles
  // (activas y archivadas). El backend ya resolvió qué podía borrar.
  clearAllTasks: () =>
    set({ tasks: [], archivedTasks: [] }),

  // Insertar o actualizar una tarea (usado por realtime: llegan eventos
  // INSERT/UPDATE de tareas creadas/cambiadas por otros usuarios).
  upsertTask: (task) =>
    set((s) => {
      const inTasks = s.tasks.some((t) => t.id === task.id);
      const inArchived = s.archivedTasks.some((t) => t.id === task.id);
      if (task.status === 'ARCHIVED') {
        return {
          tasks: s.tasks.filter((t) => t.id !== task.id),
          archivedTasks: inArchived
            ? s.archivedTasks.map((t) => (t.id === task.id ? task : t))
            : [task, ...s.archivedTasks],
        };
      }
      return {
        tasks: inTasks ? s.tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...s.tasks],
        archivedTasks: inArchived ? s.archivedTasks.filter((t) => t.id !== task.id) : s.archivedTasks,
      };
    }),

  archiveTask: (task) =>
    set((s) => ({
      archivedTasks: [{ ...task, archivedAt: new Date().toISOString() }, ...s.archivedTasks]
    })),

  // Restaurar una tarea al tablero (usado como rollback al archivar)
  restoreTask: (task, sourceStatus) =>
    set((s) => ({
      tasks: [...s.tasks, { ...task, status: sourceStatus, archivedAt: null }],
      archivedTasks: s.archivedTasks.filter((t) => t.id !== task.id)
    })),

  // ─── Users ─────────────────────────────────
  updateUser: (updates) =>
    set((s) => {
      if (!s.user) return {};
      const newUser = { ...s.user, ...updates };

      // Propagar nombre y foto a todas las tareas donde el usuario es asignado o creador
      const updateAssignee = (t) => {
        if (t.assignee && t.assignee.id === s.user.id) {
          return {
            ...t,
            assignee: {
              ...t.assignee,
              name: updates.name || t.assignee.name,
              profileImage: updates.profileImage !== undefined ? updates.profileImage : t.assignee.profileImage,
            },
          };
        }
        return t;
      };

      const updateCreator = (t) => {
        if (t.creator && t.creator.id === s.user.id) {
          return {
            ...t,
            creator: {
              ...t.creator,
              name: updates.name || t.creator.name,
              profileImage: updates.profileImage !== undefined ? updates.profileImage : t.creator.profileImage,
            },
          };
        }
        return t;
      };

      const updateTask = (t) => updateCreator(updateAssignee(t));

      return {
        user: newUser,
        tasks: s.tasks.map(updateTask),
        archivedTasks: s.archivedTasks.map(updateTask),
      };
    }),

  // ─── Columns (agrupadas por status) ────────
  getColumns: () => {
    const { tasks } = get();
    return BOARD_STATUSES.map((status) => ({
      id: status,
      title: BOARD_TITLES[status] || status,
      tasks: tasks
        .filter((t) => t.status === status)
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    }));
  },

  // ─── Notifications ─────────────────────────
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  // Agregar una notificación nueva al inicio (usado por realtime en INSERT).
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + (notification.read ? 0 : 1),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    })),

  // ─── UI ────────────────────────────────────
  showWelcome: false,
  setLoading: (loading) => set({ loading }),
  setShowWelcome: (showWelcome) => set({ showWelcome })
}));

export default useKanbanStore;

