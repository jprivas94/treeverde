// Helpers de autorización por recurso para tareas.
// Centralizan las reglas de permisos usadas en tasks.js.

/** ¿Puede ver la tarea? (creador, asignado o compartido) */
export function canViewTask(task, userId) {
  return Boolean(
    task.creatorId === userId ||
    task.assigneeId === userId ||
    task.shares?.some((s) => s.userId === userId)
  );
}

/** ¿Puede modificar estado / editar / compartir? (creador o asignado) */
export function canEditTask(task, userId) {
  return task.creatorId === userId || task.assigneeId === userId;
}

/** ¿Puede editar subtareas? (creador, asignado o compartido) */
export function canEditSubtasks(task, userId) {
  return Boolean(
    canEditTask(task, userId) || task.shares?.some((s) => s.userId === userId)
  );
}

/** ¿Puede eliminar? (solo el creador) */
export function canDeleteTask(task, userId) {
  return task.creatorId === userId;
}
