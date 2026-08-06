import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { getFrontendUrl } from '../utils/config.js';
import { canViewTask, canEditTask, canEditSubtasks, canDeleteTask } from '../utils/permissions.js';
import { notifyAssigned, notifyCompleted, notifyShared, notifySubtaskCompleted } from '../utils/notifications.js';
import { parsePagination } from '../utils/pagination.js';
import { isValidStatus, isValidSubtasks, validateTaskCreate, validateTaskUpdate } from '../utils/validate.js';

const router = Router();

// Campos mínimos de usuario incluidos en las tareas (sin email: no se muestra en la UI)
const USER_SELECT = { id: true, name: true, profileImage: true };

// Include estándar de tareas (relaciones con usuarios mínimos) — usado por
// GET /, GET /:id, PATCH status y PUT para no repetir el bloque en cada handler.
const TASK_INCLUDE = {
  assignee: { select: USER_SELECT },
  creator: { select: USER_SELECT },
  shares: {
    include: {
      user: { select: USER_SELECT }
    }
  }
};

// Todas las rutas de tasks requieren autenticación
router.use(authenticate);

// GET /api/tasks — obtener tareas donde el usuario es creador, asignado o invitado
// Paginación opcional: ?limit=50&offset=0 (máx 500 por página; sin limit = todas)
router.get('/', async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: req.userId },
          { assigneeId: req.userId },
          { shares: { some: { userId: req.userId } } }
        ]
      },
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...(limit > 0 ? { take: limit, skip: offset } : {})
    });
    res.json(tasks);
  } catch (err) {
    logger.error('Error al obtener tareas', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// GET /api/tasks/:id — obtener una tarea concreta (incluye shares)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE
    });
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (!canViewTask(task, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta tarea' });
    }
    res.json(task);
  } catch (err) {
    logger.error('Error al obtener tarea', err, { userId: req.userId, taskId: req.params?.id });
    res.status(500).json({ error: 'Error al obtener tarea' });
  }
});

// POST /api/tasks — crear una tarea
router.post('/', async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate, tags, images, subtasks } = req.body;

    // Validar el cuerpo ANTES de tocar la base de datos
    const validationError = validateTaskCreate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Validar que el usuario asignado existe
    if (assigneeId) {
      const assigneeExists = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assigneeExists) {
        return res.status(400).json({ error: 'El usuario asignado no existe' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        status: 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags || '',
        images: images || [],
        subtasks: subtasks || [],
        assigneeId: assigneeId || null,
        creatorId: req.userId
      },
      include: {
        assignee: { select: USER_SELECT },
        creator: { select: USER_SELECT }
      }
    });

    // Notificar al asignado si la tarea fue asignada a alguien más
    if (assigneeId && assigneeId !== req.userId) {
      await notifyAssigned(prisma, {
        userId: assigneeId,
        taskId: task.id,
        actorName: task.creator?.name || 'Un usuario',
        taskTitle: task.title
      });
    }

    res.status(201).json(task);
  } catch (err) {
    logger.error('Error al crear tarea', err, { userId: req.userId, title: req.body?.title });
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// PATCH /api/tasks/:id/status — actualizar estado (usado por Drag & Drop)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidStatus(status)) {
      return res.status(400).json({ error: 'Estado inválido. Use: TODO, IN_PROGRESS, DONE, ARCHIVED' });
    }

    // Verificar permisos y obtener datos actuales en una sola consulta
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true, status: true, completedAt: true }
    });
    if (!existingTask) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canEditTask(existingTask, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }

    const updateData = { status };

    // Registrar completedAt la primera vez al completar o archivar
    if (status === 'DONE' || status === 'ARCHIVED') {
      const isNewlyCompleted =
        existingTask.status !== 'DONE' && existingTask.status !== 'ARCHIVED';
      if (isNewlyCompleted) {
        updateData.completedAt = new Date();
      }
    } else {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_INCLUDE
    });

    // Notificar al creador y al asignado cuando la tarea es completada
    if (status === 'DONE' || status === 'ARCHIVED') {
      const completionNotified = new Set();
      if (existingTask.creatorId && existingTask.creatorId !== req.userId) {
        completionNotified.add(existingTask.creatorId);
        await notifyCompleted(prisma, { userId: existingTask.creatorId, taskId: id, taskTitle: task.title });
      }
      if (existingTask.assigneeId && existingTask.assigneeId !== req.userId && !completionNotified.has(existingTask.assigneeId)) {
        await notifyCompleted(prisma, { userId: existingTask.assigneeId, taskId: id, taskTitle: task.title });
      }
    }

    res.json(task);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    logger.error('Error al actualizar estado', err, { userId: req.userId, taskId: req.params?.id, status: req.body?.status });
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// PUT /api/tasks/:id — actualizar tarea completa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario sea creador o asignado de la tarea
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true, title: true, status: true }
    });
    if (!existingTask) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canEditTask(existingTask, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }

    const { title, description, assigneeId, status, priority, dueDate, tags, images, subtasks } = req.body;

    // Validar solo los campos presentes (la actualización es parcial)
    const validationError = validateTaskUpdate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // El asignado (que no es creador) NO puede reasignar la tarea ni modificar la fecha límite
    const isAssigneeOnly = existingTask.assigneeId === req.userId && existingTask.creatorId !== req.userId;

    // Validar que el usuario asignado existe
    if (assigneeId && !isAssigneeOnly) {
      const assigneeExists = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assigneeExists) {
        return res.status(400).json({ error: 'El usuario asignado no existe' });
      }
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (!isAssigneeOnly && assigneeId !== undefined) data.assigneeId = assigneeId || null;
    if (status !== undefined) data.status = status;
    if (!isAssigneeOnly && priority !== undefined) data.priority = priority;
    if (!isAssigneeOnly && dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) data.tags = tags;
    if (images !== undefined) data.images = images;
    if (subtasks !== undefined) data.subtasks = subtasks;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: TASK_INCLUDE
    });

    // Notificar si se reasignó la tarea a otro usuario
    if (!isAssigneeOnly && assigneeId !== undefined && assigneeId !== existingTask.assigneeId && assigneeId !== req.userId) {
      await notifyAssigned(prisma, {
        userId: assigneeId,
        taskId: id,
        actorName: task.creator?.name || 'Un usuario',
        taskTitle: task.title
      });
    }

    // Notificar al creador solo si realmente cambió a completado
    const isNewlyCompleted = status !== undefined && (status === 'DONE' || status === 'ARCHIVED') && existingTask.status !== 'DONE' && existingTask.status !== 'ARCHIVED';
    if (isNewlyCompleted && existingTask.creatorId !== req.userId && existingTask.creatorId) {
      await notifyCompleted(prisma, { userId: existingTask.creatorId, taskId: id, taskTitle: task.title });
    }

    res.json(task);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    logger.error('Error al actualizar tarea', err, { userId: req.userId, taskId: req.params?.id });
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// POST /api/tasks/:id/share — compartir tarea con otro usuario
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    // Verificar que la tarea existe y el usuario tiene permiso para compartirla
    const task = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true }
    });
    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canEditTask(task, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para compartir esta tarea' });
    }

    // Verificar que el usuario a invitar existe
    const userToShare = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToShare) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Crear el share (si ya existe, upsert no falla)
    const share = await prisma.taskShare.upsert({
      where: { taskId_userId: { taskId: id, userId } },
      update: {},
      create: { taskId: id, userId },
      include: {
        user: { select: USER_SELECT }
      }
    });

    // Notificar al usuario compartido (si no se comparte a sí mismo)
    if (userId !== req.userId) {
      const sharer = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true }
      });
      const taskInfo = await prisma.task.findUnique({
        where: { id },
        select: { title: true }
      });
      await notifyShared(prisma, {
        userId,
        taskId: id,
        sharerName: sharer?.name || 'Un usuario',
        taskTitle: taskInfo?.title || 'una tarea'
      });
    }

    res.status(201).json(share);
  } catch (err) {
    logger.error('Error al compartir tarea', err, { userId: req.userId, taskId: req.params?.id, targetUserId: req.body?.userId });
    res.status(500).json({ error: 'Error al compartir tarea' });
  }
});

// POST /api/tasks/:id/invite — generar (o regenerar) el enlace de invitación
// - role 'assignee' (URL de creación): quien la acepte queda como asignado.
// - role 'share' (URL de edición): quien la acepte queda como compartido.
// Cada llamada regenera el token: el creador puede crear enlaces las veces que quiera.
router.post('/:id/invite', async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.body?.role === 'assignee' ? 'assignee' : 'share';

    const task = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true }
    });
    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canEditTask(task, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para generar el enlace de invitación' });
    }
    // Solo el creador puede invitar como asignado (quien acepte el enlace quedaría como asignado)
    if (role === 'assignee' && req.userId !== task.creatorId) {
      return res.status(403).json({ error: 'Solo el creador puede invitar a alguien como asignado' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    await prisma.task.update({
      where: { id },
      data: { inviteToken, inviteRole: role }
    });

    res.json({ inviteUrl: `${getFrontendUrl()}/?invite=${inviteToken}`, inviteRole: role });
  } catch (err) {
    logger.error('Error al generar enlace de invitación', err, { userId: req.userId, taskId: req.params?.id });
    res.status(500).json({ error: 'Error al generar enlace de invitación' });
  }
});

// DELETE /api/tasks/:id/share/:userId — eliminar invitación
router.delete('/:id/share/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Verificar que la tarea existe y el usuario tiene permiso
    const task = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true }
    });
    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canEditTask(task, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }

    await prisma.taskShare.deleteMany({
      where: { taskId: id, userId }
    });

    res.json({ message: 'Invitación eliminada' });
  } catch (err) {
    logger.error('Error al eliminar invitación', err, { userId: req.userId, taskId: req.params?.id, targetUserId: req.params?.userId });
    res.status(500).json({ error: 'Error al eliminar invitación' });
  }
});

// PATCH /api/tasks/:id/subtasks — actualizar sub-tareas (toggle check, añadir, eliminar)
router.patch('/:id/subtasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { subtasks } = req.body;

    if (!isValidSubtasks(subtasks)) {
      return res.status(400).json({ error: 'subtasks debe ser un array de hasta 50 ítems con título y estado' });
    }

    // Verificar permisos (creador, asignado o compartido pueden modificar subtareas)
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: {
        creatorId: true,
        assigneeId: true,
        title: true,
        subtasks: true,
        shares: { select: { userId: true } }
      }
    });
    if (!existingTask) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canEditSubtasks(existingTask, req.userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { subtasks },
      select: { id: true, subtasks: true }
    });

    // Detectar subtareas recién completadas y notificar a creador y asignado
    const oldSubtasks = Array.isArray(existingTask.subtasks) ? existingTask.subtasks : [];
    const newSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

    // Determinar a quiénes notificar (sin duplicados)
    const notifyUserIds = new Set();
    // Notificar al creador si no es quien completa la subtarea
    if (existingTask.creatorId && existingTask.creatorId !== req.userId) notifyUserIds.add(existingTask.creatorId);
    // Notificar al asignado si existe, no es quien completa y no es el mismo que el creador
    if (existingTask.assigneeId && existingTask.assigneeId !== req.userId) notifyUserIds.add(existingTask.assigneeId);

    if (notifyUserIds.size > 0) {
      // Subtareas recién completadas por OTRO usuario (con toggledBy)
      const newlyCompleted = newSubtasks.filter((st) => {
        if (!st.completed || !st.toggledBy) return false;
        const oldSt = oldSubtasks.find((s) => s.id === st.id);
        return !(oldSt && oldSt.completed);
      });

      if (newlyCompleted.length > 0) {
        // Una sola query para todos los completadores (evita N+1)
        const completerIds = [...new Set(newlyCompleted.map((st) => st.toggledBy))];
        const completers = await prisma.user.findMany({
          where: { id: { in: completerIds } },
          select: { id: true, name: true }
        });
        const nameById = new Map(completers.map((u) => [u.id, u.name]));

        for (const newSt of newlyCompleted) {
          const completerName = nameById.get(newSt.toggledBy) || 'Un usuario';
          // Enviar notificación a cada usuario (creador y/o asignado)
          for (const targetUserId of notifyUserIds) {
            if (targetUserId === newSt.toggledBy) continue; // No notificar a quien completó
            await notifySubtaskCompleted(prisma, {
              userId: targetUserId,
              taskId: id,
              completerName,
              subtaskTitle: newSt.title,
              taskTitle: existingTask.title
            });
          }
        }
      }
    }

    res.json(task);
  } catch (err) {
    logger.error('Error al actualizar sub-tareas', err, { userId: req.userId, taskId: req.params?.id });
    res.status(500).json({ error: 'Error al actualizar sub-tareas' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario sea creador o asignado de la tarea
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true }
    });
    if (!existingTask) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (!canDeleteTask(existingTask, req.userId)) {
      return res.status(403).json({ error: 'Solo el creador de la tarea puede eliminarla' });
    }

    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Tarea eliminada' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    logger.error('Error al eliminar tarea', err, { userId: req.userId, taskId: req.params?.id });
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

export default router;

