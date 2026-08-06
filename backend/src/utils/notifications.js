// Helpers de notificaciones — centralizan la creación de notificaciones
// y garantizan que un fallo de notificación nunca rompa la operación principal.
import logger from './logger.js';

/** Crea una notificación de forma segura (nunca rompe la operación principal). */
export async function safeCreate(prisma, data) {
  try {
    await prisma.notification.create({ data });
  } catch (err) {
    logger.error('Error al crear notificación', err, { type: data.type, taskId: data.taskId });
  }
}

/** Notifica una asignación/reasignación de tarea. */
export async function notifyAssigned(prisma, { userId, taskId, actorName, taskTitle }) {
  if (!userId) return;
  await safeCreate(prisma, {
    userId, taskId, type: 'ASSIGNED',
    message: `${actorName} te asignó la tarea: ${taskTitle}`
  });
}

/** Notifica que una tarea fue completada. */
export async function notifyCompleted(prisma, { userId, taskId, taskTitle }) {
  if (!userId) return;
  await safeCreate(prisma, {
    userId, taskId, type: 'COMPLETED',
    message: `La tarea "${taskTitle}" fue marcada como completada`
  });
}

/** Notifica que una tarea fue compartida. */
export async function notifyShared(prisma, { userId, taskId, sharerName, taskTitle }) {
  if (!userId) return;
  await safeCreate(prisma, {
    userId, taskId, type: 'SHARED',
    message: `${sharerName} compartió la tarea "${taskTitle}" contigo`
  });
}

/** Notifica que una subtarea fue completada por otro usuario. */
export async function notifySubtaskCompleted(prisma, { userId, taskId, completerName, subtaskTitle, taskTitle }) {
  if (!userId) return;
  await safeCreate(prisma, {
    userId, taskId, type: 'SUBTASK_COMPLETED',
    message: `${completerName} completó la sub-tarea "${subtaskTitle}" en "${taskTitle}"`
  });
}
