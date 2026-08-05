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
// bg=columna, header=cabecera, dot=punto, text=texto
const STATUS_COLORS = {
  TODO: { bg: 'bg-amber-50', header: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-800' },
  IN_PROGRESS: { bg: 'bg-blue-50', header: 'bg-blue-100', dot: 'bg-blue-500', text: 'text-blue-800' },
  DONE: { bg: 'bg-emerald-50', header: 'bg-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-800' },
  ARCHIVED: { bg: 'bg-red-50', header: 'bg-red-100', dot: 'bg-red-500', text: 'text-red-800' },
};

export const STATUS_DOTS = {
  TODO: 'bg-amber-400',
  IN_PROGRESS: 'bg-blue-400',
  DONE: 'bg-emerald-400',
  ARCHIVED: 'bg-red-400',
};

// Estilos de navegación mobile (Board.jsx)
export const STATUS_NAV = {
  TODO: { dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-800', label: 'Por Hacer' },
  IN_PROGRESS: { dot: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Progreso' },
  DONE: { dot: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Revisión' },
  ARCHIVED: { dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-800', label: 'Terminado' },
};

// Botones de transición en TaskCard.jsx
export const STATUS_BTN_COLORS = {
  TODO: { bg: 'bg-amber-100', text: 'text-amber-700', hoverBg: 'hover:bg-amber-200', hoverText: 'hover:text-amber-800' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', hoverBg: 'hover:bg-blue-200', hoverText: 'hover:text-blue-800' },
  DONE: { bg: 'bg-emerald-100', text: 'text-emerald-700', hoverBg: 'hover:bg-emerald-200', hoverText: 'hover:text-emerald-800' },
  ARCHIVED: { bg: 'bg-red-100', text: 'text-red-700', hoverBg: 'hover:bg-red-200', hoverText: 'hover:text-red-800' },
};

export const TRANSITION_LABELS = {
  'TODO->IN_PROGRESS': 'En Progreso',
  'IN_PROGRESS->TODO': 'Por Hacer',
  'IN_PROGRESS->DONE': 'Revisión',
  'DONE->IN_PROGRESS': 'En Progreso',
  'DONE->ARCHIVED': 'Terminar',
  'ARCHIVED->DONE': 'Restaurar',
};

// ─── Prioridades ──────────────────────────────
// value → etiqueta y estilos (compartidos por CreateTaskModal y EditTaskModal)
export const PRIORITIES = [
  { value: 'LOW', label: '🟢 Baja', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'MEDIUM', label: '🟡 Media', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'HIGH', label: '🟠 Alta', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'CRITICAL', label: '🔴 Crítica', color: 'text-red-600 bg-red-50 border-red-200' },
];

export const PRIORITY_CONFIG = {
  LOW: { label: 'Baja', class: 'text-green-700 bg-green-100' },
  MEDIUM: { label: 'Media', class: 'text-amber-700 bg-amber-100' },
  HIGH: { label: 'Alta', class: 'text-orange-700 bg-orange-100' },
  CRITICAL: { label: 'Crítica', class: 'text-red-700 bg-red-100' },
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
