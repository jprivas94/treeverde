import { parseDate } from '../../shared/utils/date';

// ─── Lógica pura del historial (sin React) ────────────────────────────

export const ITEMS_PER_PAGE = 5;

export const PRIORITY_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'LOW', label: 'Baja', cls: 'text-green-600' },
  { value: 'MEDIUM', label: 'Media', cls: 'text-amber-600' },
  { value: 'HIGH', label: 'Alta', cls: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critica', cls: 'text-red-600' },
];

export const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'early', label: 'Anticipado' },
  { value: 'ontime', label: 'A tiempo' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'nodate', label: 'Sin fecha' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mas reciente' },
  { value: 'oldest', label: 'Mas antiguo' },
];

const DAY_MS = 1000 * 60 * 60 * 24;

/** Fecha en que se completó la tarea (la mejor disponible). */
export const completedDate = (task) => parseDate(task.completedAt || task.archivedAt || task.updatedAt);

/**
 * Puntualidad de una tarea completada respecto a su fecha límite.
 * null si no tiene fecha límite. `diff` < 0 anticipada, 0 a tiempo, > 0 vencida (días).
 */
export function getTaskTiming(task) {
  const due = parseDate(task.dueDate);
  const completed = completedDate(task);
  if (!completed || !due) return null;

  const diff = Math.round((completed.getTime() - due.getTime()) / DAY_MS);
  if (diff < 0) {
    const early = Math.abs(diff);
    return {
      diff,
      label: early <= 1 ? 'Anticipado' : `${early} días antes`,
      badge: 'Anticipado',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      rowColor: 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50',
      textColor: 'text-emerald-600',
    };
  }
  if (diff === 0) {
    return {
      diff,
      label: 'Justo a tiempo',
      badge: 'A tiempo',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      rowColor: 'bg-blue-50/30 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
      textColor: 'text-blue-600',
    };
  }
  return {
    diff,
    label: `${diff} día${diff !== 1 ? 's' : ''} después`,
    badge: 'Vencido',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    rowColor: 'bg-red-50/30 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/50',
    textColor: 'text-red-500',
  };
}

const TIMING_MATCHERS = {
  nodate: (t) => t === null,
  early: (t) => t !== null && t.diff < 0,
  ontime: (t) => t !== null && t.diff === 0,
  overdue: (t) => t !== null && t.diff > 0,
};

/** Tareas completadas (DONE/ARCHIVED del tablero + archivadas, sin duplicados). */
export function completedTasks(tasks, archivedTasks = []) {
  const done = tasks.filter((t) => t.status === 'DONE' || t.status === 'ARCHIVED');
  const ids = new Set(done.map((t) => t.id));
  return [...done, ...archivedTasks.filter((t) => !ids.has(t.id))];
}

/** Aplica orden, búsqueda y filtros del historial. */
export function filterHistory(list, { search, priority, timing, sort }) {
  const q = search.toLowerCase().trim();
  const time = (t) => new Date(t.updatedAt || t.createdAt || 0).getTime();

  return [...list]
    .sort((a, b) => (sort === 'newest' ? time(b) - time(a) : time(a) - time(b)))
    .filter((t) => !q || [t.title, t.description, t.creator?.name, t.assignee?.name, t.tags, t.board?.name]
      .some((field) => (field || '').toLowerCase().includes(q)))
    .filter((t) => !priority || t.priority === priority)
    .filter((t) => !timing || (TIMING_MATCHERS[timing]?.(getTaskTiming(t)) ?? true));
}
