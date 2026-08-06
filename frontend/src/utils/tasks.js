// ─── Helpers de tareas compartidos ────────────────────────────────────
// Centraliza el parseo de subtareas (el backend las guarda como JSON
// string, pero en cliente pueden llegar como array) usado en tarjetas,
// detalles y modales de edición.

/** Convierte subtasks (JSON string o array) a array seguro. */
export function parseSubtasks(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
