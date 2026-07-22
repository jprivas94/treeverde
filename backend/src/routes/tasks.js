import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Todas las rutas de tasks requieren autenticación
router.use(authenticate);

// GET /api/tasks — obtener todas las tareas
router.get('/', async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// POST /api/tasks — crear una tarea
router.post('/', async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate, tags } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        status: 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags || '',
        assigneeId: assigneeId || null,
        creatorId: req.userId
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// PATCH /api/tasks/:id/status — actualizar estado (usado por Drag & Drop)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Use: TODO, IN_PROGRESS, DONE' });
    }

    const updateData = { status };

    // Solo registrar completedAt si realmente está cambiando a DONE,
    // no cuando se reordena dentro de la misma columna
    if (status === 'DONE') {
      const currentTask = await prisma.task.findUnique({
        where: { id },
        select: { status: true }
      });
      if (currentTask && currentTask.status !== 'DONE') {
        updateData.completedAt = new Date();
      }
    } else if (status !== 'DONE') {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(task);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// PUT /api/tasks/:id — actualizar tarea completa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigneeId, status, priority, dueDate, tags } = req.body;
    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) data.tags = tags;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(task);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Tarea eliminada' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

export default router;

