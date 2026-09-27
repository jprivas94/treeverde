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

/** URLs de imágenes válidas de una tarea (ignora valores vacíos). */
export function getTaskImages(task) {
  return Array.isArray(task?.images) ? task.images.filter(Boolean) : [];
}

// ─── Permisos sobre una tarea ─────────────────────────────────────────

/** El usuario creó la tarea. */
export function isCreator(task, user) {
  return Boolean(user && task?.creator?.id === user.id);
}

/** Asignado pero no creador: solo puede mover hasta Revisión y no cambia asignado/fecha/prioridad. */
export function isAssigneeOnly(task, user) {
  return Boolean(user && task?.assignee?.id === user.id && !isCreator(task, user));
}

/** Solo compartida con el usuario (ni creador ni asignado): puede ver y marcar subtareas. */
export function isSharedUser(task, user) {
  if (!user || !task) return false;
  return !isCreator(task, user) &&
    task.assignee?.id !== user.id &&
    Boolean(task.shares?.some((s) => s.user?.id === user.id || s.userId === user.id));
}
