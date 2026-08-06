// ─── Validación de payloads (sin dependencias externas) ───────────────
// Ayudantes pequeños para validar los cuerpos de las rutas (tasks/auth).
// Se aplican SOLO a campos presentes; cada ruta decide si los requiere.
// Objetivo: rechazar tipos/datos corruptos antes de llegar a Prisma.

export const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];
export const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const isString = (v) => typeof v === 'string';

/** ¿Es un string no vacío (tras trim)? */
export function isNonEmptyString(v) {
  return isString(v) && v.trim().length > 0;
}

/** Título de tarea: obligatorio, máx 200 caracteres. */
export function isValidTitle(v) {
  return isNonEmptyString(v) && v.trim().length <= 200;
}

export function isValidDescription(v) {
  return v === undefined || (isString(v) && v.length <= 5000);
}

export function isValidPriority(v) {
  return v === undefined || VALID_PRIORITIES.includes(v);
}

export function isValidStatus(v) {
  return VALID_STATUSES.includes(v);
}

export function isValidDueDate(v) {
  return v === null || v === undefined || !isNaN(new Date(v).getTime());
}

export function isValidTags(v) {
  return v === undefined || (isString(v) && v.length <= 500);
}

/** Imágenes: array de hasta 5 URLs (o data URLs). */
export function isValidImages(v) {
  if (v === undefined) return true;
  return (
    Array.isArray(v) &&
    v.length <= 5 &&
    v.every((u) => isString(u) && (u.startsWith('http') || u.startsWith('data:')))
  );
}

/** Subtareas: array de hasta 50 ítems con título y estado booleano. */
export function isValidSubtasks(v) {
  if (v === undefined) return true;
  if (!Array.isArray(v) || v.length > 50) return false;
  return v.every(
    (st) => st && isNonEmptyString(st.title) && st.title.trim().length <= 200 && typeof st.completed === 'boolean'
  );
}

export function isValidEmail(v) {
  return isNonEmptyString(v) && v.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isValidName(v) {
  return isNonEmptyString(v) && v.trim().length <= 100;
}

export function isValidPassword(v) {
  return isString(v) && v.length >= 6 && v.length <= 100;
}

/** Valida un cuerpo de creación de tarea. Devuelve el primer error o null. */
export function validateTaskCreate(body) {
  if (!isValidTitle(body.title)) return 'El título es requerido (máx 200 caracteres)';
  if (!isValidDescription(body.description)) return 'La descripción es demasiado larga';
  if (!isValidPriority(body.priority)) return 'Prioridad inválida';
  if (!isValidDueDate(body.dueDate)) return 'Fecha límite inválida';
  if (!isValidTags(body.tags)) return 'Las etiquetas son demasiado largas';
  if (!isValidImages(body.images)) return 'Imágenes inválidas (máx 5 URLs)';
  if (!isValidSubtasks(body.subtasks)) return 'Subtareas inválidas (máx 50, cada una con título y estado)';
  return null;
}

/** Valida un cuerpo de actualización de tarea (solo campos presentes). Devuelve el primer error o null. */
export function validateTaskUpdate(body) {
  if (body.title !== undefined && !isValidTitle(body.title)) return 'El título es requerido (máx 200 caracteres)';
  if (body.description !== undefined && !isValidDescription(body.description)) return 'La descripción es demasiado larga';
  if (body.priority !== undefined && !isValidPriority(body.priority)) return 'Prioridad inválida';
  if (body.status !== undefined && !isValidStatus(body.status)) return 'Estado inválido. Use: TODO, IN_PROGRESS, DONE, ARCHIVED';
  if (body.dueDate !== undefined && !isValidDueDate(body.dueDate)) return 'Fecha límite inválida';
  if (body.tags !== undefined && !isValidTags(body.tags)) return 'Las etiquetas son demasiado largas';
  if (body.images !== undefined && !isValidImages(body.images)) return 'Imágenes inválidas (máx 5 URLs)';
  if (body.subtasks !== undefined && !isValidSubtasks(body.subtasks)) return 'Subtareas inválidas (máx 50, cada una con título y estado)';
  return null;
}
