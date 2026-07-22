import { create } from 'zustand';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];

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
  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),

  updateTaskStatus: (taskId, newStatus) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const now = new Date().toISOString();
        const wasDone = t.status === 'DONE';
        const becomesDone = newStatus === 'DONE';
        return {
          ...t,
          status: newStatus,
          completedAt: becomesDone && !wasDone ? now : wasDone && !becomesDone ? null : t.completedAt,
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
    return STATUSES.map((status) => ({
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

  // ─── UI ────────────────────────────────────
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

export default useKanbanStore;

