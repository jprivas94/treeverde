import { create } from 'zustand';

// Columnas del tablero (ARCHIVED es el destino para completar tareas)
const BOARD_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];

const useKanbanStore = create((set, get) => ({
  // ─── Estado ────────────────────────────────
  user: null,
  token: localStorage.getItem('token'),
  tasks: [],
  archivedTasks: [],
  users: [],
  loading: false,
  error: null,

  // ─── Auth ──────────────────────────────────
  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, tasks: [], archivedTasks: [], users: [] });
  },

  // ─── Tasks ─────────────────────────────────
  setTasks: (tasks) =>
    set({
      // Separar ARCHIVED al cargar: no aparecen en el tablero pero sí en historial
      tasks: tasks.filter((t) => t.status !== 'ARCHIVED'),
      archivedTasks: tasks.filter((t) => t.status === 'ARCHIVED'),
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
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) })),

  archiveTask: (task) =>
    set((s) => ({
      archivedTasks: [{ ...task, archivedAt: new Date().toISOString() }, ...s.archivedTasks]
    })),

  // ─── Users ─────────────────────────────────
  setUsers: (users) => set({ users }),

  // ─── Columns (agrupadas por status) ────────
  getColumns: () => {
    const { tasks } = get();
    return BOARD_STATUSES.map((status) => ({
      id: status,
      title:
        status === 'TODO'
          ? 'Por Hacer'
          : status === 'IN_PROGRESS'
          ? 'En Progreso'
          : status === 'DONE'
          ? 'Revisión'
          : '🗑 Terminado',
      tasks: tasks.filter((t) => t.status === status)
    }));
  },

  // ─── Welcome Modal ─────────────────────────
  showWelcome: false,
  setShowWelcome: (show) => set({ showWelcome: show }),

  // ─── Welcome Modal ─────────────────────────
  showWelcome: false,
  setShowWelcome: (show) => set({ showWelcome: show }),

  // ─── UI ────────────────────────────────────
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

export default useKanbanStore;

