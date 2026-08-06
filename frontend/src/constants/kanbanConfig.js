// ─── Configuración central del tablero Kanban ────────────────────────
// Fuente única de verdad para estados, columnas, prioridades y etiquetas.
// Antes estaba dispersa en kanbanStore, Column, TaskCard y Board.

export const BOARD_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];

// Tamaño de página para el listado de tareas (GET /api/tasks?limit=&offset=)
export const TASKS_PAGE_SIZE = 100;

export const STATUS_LABELS = {
  TODO: 'Por Hacer',
  IN_PROGRESS: 'En Progreso',
  DONE: 'Revisión',
  ARCHIVED: 'Terminado',
};

// Colores por estado usados por Column.jsx
// bg=columna, header=cabecera, dot=punto, text=texto (con variantes dark:)
const STATUS_COLORS = {
  TODO: { bg: 'bg-amber-50 dark:bg-amber-950/40', header: 'bg-amber-100 dark:bg-amber-900/40', dot: 'bg-amber-500', text: 'text-amber-800 dark:text-amber-300' },
  IN_PROGRESS: { bg: 'bg-blue-50 dark:bg-blue-950/40', header: 'bg-blue-100 dark:bg-blue-900/40', dot: 'bg-blue-500', text: 'text-blue-800 dark:text-blue-300' },
  DONE: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', header: 'bg-emerald-100 dark:bg-emerald-900/40', dot: 'bg-emerald-500', text: 'text-emerald-800 dark:text-emerald-300' },
  ARCHIVED: { bg: 'bg-red-50 dark:bg-red-950/40', header: 'bg-red-100 dark:bg-red-900/40', dot: 'bg-red-500', text: 'text-red-800 dark:text-red-300' },
};

export const STATUS_DOTS = {
  TODO: 'bg-amber-400',
  IN_PROGRESS: 'bg-blue-400',
  DONE: 'bg-emerald-400',
  ARCHIVED: 'bg-red-400',
};

// Estilos de navegación mobile (Board.jsx)
export const STATUS_NAV = {
  TODO: { dot: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', label: 'Por Hacer' },
  IN_PROGRESS: { dot: 'bg-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', label: 'En Progreso' },
  DONE: { dot: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-300', label: 'Revisión' },
  ARCHIVED: { dot: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-300', label: 'Terminado' },
};

// Botones de transición en TaskCard.jsx
// En modo oscuro las pastillas se aterrizan sobre tonos *-900/40 para no quemar
// la vista y mantener el contraste del texto en tonos claros.
export const STATUS_BTN_COLORS = {
  TODO: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', hoverBg: 'hover:bg-amber-200 dark:hover:bg-amber-900/60', hoverText: 'hover:text-amber-800 dark:hover:text-amber-200' },
  IN_PROGRESS: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', hoverBg: 'hover:bg-blue-200 dark:hover:bg-blue-900/60', hoverText: 'hover:text-blue-800 dark:hover:text-blue-200' },
  DONE: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', hoverBg: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/60', hoverText: 'hover:text-emerald-800 dark:hover:text-emerald-200' },
  ARCHIVED: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', hoverBg: 'hover:bg-red-200 dark:hover:bg-red-900/60', hoverText: 'hover:text-red-800 dark:hover:text-red-200' },
};

// Transiciones visibles en TaskCard. La columna ARCHIVED (Terminado) se
// muestra en el tablero pero vacía: terminar una tarea (botón "Terminar" o
// drag) la archiva y pasa al historial, fuera de la columna.
export const TRANSITION_LABELS = {
  'TODO->IN_PROGRESS': 'En Progreso',
  'IN_PROGRESS->TODO': 'Por Hacer',
  'IN_PROGRESS->DONE': 'Revisión',
  'DONE->IN_PROGRESS': 'En Progreso',
  'DONE->ARCHIVED': 'Terminar',
};

// ─── Prioridades ──────────────────────────────
// value → etiqueta y estilos (compartidos por CreateTaskModal y EditTaskModal)
export const PRIORITIES = [
  { value: 'LOW', label: '🟢 Baja', color: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-900' },
  { value: 'MEDIUM', label: '🟡 Media', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900' },
  { value: 'HIGH', label: '🟠 Alta', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-900' },
  { value: 'CRITICAL', label: '🔴 Crítica', color: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-900' },
];

export const PRIORITY_CONFIG = {
  LOW: { label: 'Baja', class: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50' },
  MEDIUM: { label: 'Media', class: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50' },
  HIGH: { label: 'Alta', class: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/50' },
  CRITICAL: { label: 'Crítica', class: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50' },
};

export function getStatusConfig(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.TODO;
}

// ─── Colores de usuarios compartidos ──────────
// (antes definidos en EditTaskModal)
export const USER_COLORS = [
  '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4',
];

export function getUserColor(userId) {
  if (!userId) return USER_COLORS[0];
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
}
