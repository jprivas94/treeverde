import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// Todas las rutas de tasks requieren autenticación
router.use(authenticate);

// GET /api/tasks — obtener tareas donde el usuario es creador, asignado o invitado
router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: req.userId },
          { assigneeId: req.userId },
          { shares: { some: { userId: req.userId } } }
        ]
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, profileImage: true } },
        creator: { select: { id: true, name: true, email: true, profileImage: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (err) {
    logger.error('Error al obtener tareas', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// POST /api/tasks — crear una tarea
router.post('/', async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate, tags, imageUrl, subtasks } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
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
        imageUrl: imageUrl || null,
        subtasks: subtasks || [],
        assigneeId: assigneeId || null,
        creatorId: req.userId
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, profileImage: true } },
        creator: { select: { id: true, name: true, email: true, profileImage: true } }
      }
    });

    // Notificar al asignado si la tarea fue asignada a alguien más
    if (assigneeId && assigneeId !== req.userId) {
      const creatorName = task.creator?.name || 'Un usuario';
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          taskId: task.id,
          type: 'ASSIGNED',
          message: `${creatorName} te asignó la tarea: ${task.title}`
        }
      }).catch((e) => logger.error('Error al crear notificación', e));
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
    if (!['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'].includes(status)) {
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
    if (existingTask.creatorId !== req.userId && existingTask.assigneeId !== req.userId) {
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
      include: {
        assignee: { select: { id: true, name: true, email: true, profileImage: true } },
        creator: { select: { id: true, name: true, email: true, profileImage: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        }
      }
    });

    // Notificar al creador y al asignado cuando la tarea es completada
    if (status === 'DONE' || status === 'ARCHIVED') {
      const completionNotified = new Set();
      if (existingTask.creatorId && existingTask.creatorId !== req.userId) {
        completionNotified.add(existingTask.creatorId);
        await prisma.notification.create({
          data: {
            userId: existingTask.creatorId,
            taskId: id,
            type: 'COMPLETED',
            message: `La tarea "${task.title}" fue marcada como completada`
          }
        }).catch((e) => logger.error('Error al notificar completado a creador', e));
      }
      if (existingTask.assigneeId && existingTask.assigneeId !== req.userId && !completionNotified.has(existingTask.assigneeId)) {
        await prisma.notification.create({
          data: {
            userId: existingTask.assigneeId,
            taskId: id,
            type: 'COMPLETED',
            message: `La tarea "${task.title}" fue marcada como completada`
          }
        }).catch((e) => logger.error('Error al notificar completado a asignado', e));
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
    if (existingTask.creatorId !== req.userId && existingTask.assigneeId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }

    const { title, description, assigneeId, status, priority, dueDate, tags, imageUrl, subtasks } = req.body;

    // Validar que el usuario asignado existe
    if (assigneeId) {
      const assigneeExists = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assigneeExists) {
        return res.status(400).json({ error: 'El usuario asignado no existe' });
      }
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) data.tags = tags;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (subtasks !== undefined) data.subtasks = subtasks;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, profileImage: true } },
        creator: { select: { id: true, name: true, email: true, profileImage: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        }
      }
    });

    // Notificar si se reasignó la tarea a otro usuario
    if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId && assigneeId !== req.userId) {
      const creatorName = task.creator?.name || 'Un usuario';
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          taskId: id,
          type: 'ASSIGNED',
          message: `${creatorName} te asignó la tarea: ${task.title}`
        }
      }).catch((e) => logger.error('Error al crear notificación de reasignación', e));
    }

    // Notificar al creador solo si realmente cambió a completado
    const isNewlyCompleted = status !== undefined && (status === 'DONE' || status === 'ARCHIVED') && existingTask.status !== 'DONE' && existingTask.status !== 'ARCHIVED';
    if (isNewlyCompleted && existingTask.creatorId !== req.userId && existingTask.creatorId) {
      await prisma.notification.create({
        data: {
          userId: existingTask.creatorId,
          taskId: id,
          type: 'COMPLETED',
          message: `La tarea "${task.title}" fue marcada como completada`
        }
      }).catch((e) => logger.error('Error al crear notificación de completado', e));
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
    if (task.creatorId !== req.userId && task.assigneeId !== req.userId) {
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
        user: { select: { id: true, name: true, email: true, profileImage: true } }
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
      const sharerName = sharer?.name || 'Un usuario';
      const taskTitle = taskInfo?.title || 'una tarea';
      await prisma.notification.create({
        data: {
          userId,
          taskId: id,
          type: 'SHARED',
          message: `${sharerName} compartió la tarea "${taskTitle}" contigo`
        }
      }).catch((e) => logger.error('Error al crear notificación de compartido', e));
    }

    res.status(201).json(share);
  } catch (err) {
    logger.error('Error al compartir tarea', err, { userId: req.userId, taskId: req.params?.id, targetUserId: req.body?.userId });
    res.status(500).json({ error: 'Error al compartir tarea' });
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
    if (task.creatorId !== req.userId && task.assigneeId !== req.userId) {
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

    if (!Array.isArray(subtasks)) {
      return res.status(400).json({ error: 'subtasks debe ser un array' });
    }

    // Verificar permisos (creador, asignado o compartido pueden modificar subtareas)
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true, title: true, subtasks: true }
    });
    if (!existingTask) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    if (existingTask.creatorId !== req.userId && existingTask.assigneeId !== req.userId) {
      // Verificar si el usuario está en la lista de compartidos
      const isShared = await prisma.taskShare.findFirst({
        where: { taskId: id, userId: req.userId }
      });
      if (!isShared) {
        return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
      }
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
      // Buscar subtareas que cambiaron de no-completada a completada
      for (const newSt of newSubtasks) {
        if (!newSt.completed) continue;
        const oldSt = oldSubtasks.find((s) => s.id === newSt.id);
        if (oldSt && oldSt.completed) continue;

        const toggledBy = newSt.toggledBy;
        if (!toggledBy) continue;

        // Obtener nombre de quien la completó
        const completer = await prisma.user.findUnique({
          where: { id: toggledBy },
          select: { name: true }
        });
        const completerName = completer?.name || 'Un usuario';

        // Enviar notificación a cada usuario (creador y/o asignado)
        for (const targetUserId of notifyUserIds) {
          if (targetUserId === toggledBy) continue; // No notificar a quien completó
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              taskId: id,
              type: 'SUBTASK_COMPLETED',
              message: `${completerName} completó la sub-tarea "${newSt.title}" en "${existingTask.title}"`
            }
          }).catch((e) => logger.error('Error al notificar subtarea completada', e));
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
    if (existingTask.creatorId !== req.userId && existingTask.assigneeId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta tarea' });
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

