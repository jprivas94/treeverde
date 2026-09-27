import { Router } from 'express';
import prisma from '../db.js';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { safeCreate } from '../utils/notifications.js';

const router = Router();

// GET /api/invites/:token — información pública del enlace de invitación
// (solo datos mínimos para el banner de registro/login: sin datos sensibles).
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const task = await prisma.task.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        title: true,
        creator: { select: { id: true, name: true } }
      }
    });
    if (!task) {
      return res.status(404).json({ error: 'Enlace de invitación inválido' });
    }
    res.json({
      taskId: task.id,
      taskTitle: task.title,
      creatorName: task.creator?.name || null
    });
  } catch (err) {
    logger.error('Error al obtener invitación', err, { token: req.params?.token });
    res.status(500).json({ error: 'Error al obtener invitación' });
  }
});

// POST /api/invites/:token/accept — el usuario autenticado se une a la tarea
// - inviteRole 'assignee' (URL de creación): queda como asignado.
// - inviteRole 'share' (URL de edición): queda como usuario compartido.
// Idempotente: si ya es parte de la tarea, responde éxito sin duplicar.
router.post('/:token/accept', authenticate, async (req, res) => {
  try {
    const { token } = req.params;
    const task = await prisma.task.findUnique({
      where: { inviteToken: token },
      select: { id: true, title: true, creatorId: true, assigneeId: true, inviteRole: true }
    });
    if (!task) {
      return res.status(404).json({ error: 'Enlace de invitación inválido o ya utilizado' });
    }

    // Idempotente: ya es asignado o compartido → no hacer nada
    const alreadyShared = await prisma.taskShare.findUnique({
      where: { taskId_userId: { taskId: task.id, userId: req.userId } }
    });
    if (task.assigneeId === req.userId || alreadyShared) {
      return res.json({ message: 'Ya eres parte de esta tarea', taskId: task.id });
    }

    if (task.inviteRole === 'assignee') {
      // Enlace de creación: el nuevo usuario queda como asignado
      await prisma.task.update({
        where: { id: task.id },
        data: { assigneeId: req.userId }
      });
    } else {
      // Enlace de edición: queda como usuario compartido
      await prisma.taskShare.create({ data: { taskId: task.id, userId: req.userId } });
    }

    // Notificar al creador que alguien se unió (nunca romper la operación principal)
    if (task.creatorId && task.creatorId !== req.userId) {
      const joiner = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true }
      });
      await safeCreate(prisma, {
        userId: task.creatorId,
        taskId: task.id,
        type: 'INVITE_ACCEPTED',
        message: `${joiner?.name || 'Un usuario'} se unió a tu tarea "${task.title}"${task.inviteRole === 'assignee' ? ' como asignado' : ''}`
      });
    }

    res.json({ message: 'Te uniste a la tarea', taskId: task.id });
  } catch (err) {
    if (err.code === 'P2002') {
      // Carrera: el share ya existía entre el findUnique y el create
      return res.json({ message: 'Ya eres parte de esta tarea', taskId: null });
    }
    logger.error('Error al aceptar invitación', err, { token: req.params?.token });
    res.status(500).json({ error: 'Error al aceptar invitación' });
  }
});

// ─── Invitación a un TABLERO (?boardInvite=TOKEN) ────────────────────

// GET /api/invites/board/:token — información pública del enlace (banner de login/registro)
router.get('/board/:token', async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { inviteToken: req.params.token },
      select: {
        id: true,
        name: true,
        icon: true,
        owner: { select: { name: true } }
      }
    });
    if (!board) {
      return res.status(404).json({ error: 'Enlace de invitación inválido' });
    }
    res.json({
      type: 'board',
      boardId: board.id,
      boardName: board.name,
      boardIcon: board.icon,
      ownerName: board.owner?.name || null
    });
  } catch (err) {
    logger.error('Error al obtener invitación de tablero', err, { token: req.params?.token });
    res.status(500).json({ error: 'Error al obtener invitación' });
  }
});

// POST /api/invites/board/:token/accept — el usuario autenticado se une al tablero
// Queda como miembro: puede ver y trabajar SOLO dentro de este tablero.
// Idempotente: si ya es miembro, responde éxito sin duplicar.
router.post('/board/:token/accept', authenticate, async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { inviteToken: req.params.token },
      select: { id: true, name: true, ownerId: true, members: { select: { userId: true } } }
    });
    if (!board) {
      return res.status(404).json({ error: 'Enlace de invitación inválido' });
    }

    // Idempotente: ya es miembro → no hacer nada
    if (board.members.some((m) => m.userId === req.userId)) {
      return res.json({ message: 'Ya eres parte de este proyecto', boardId: board.id });
    }

    await prisma.boardMember.create({
      data: { boardId: board.id, userId: req.userId, role: 'member' }
    });

    // Notificar al dueño que alguien aceptó (nunca romper la operación principal)
    if (board.ownerId !== req.userId) {
      const joiner = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true }
      });
      await safeCreate(prisma, {
        userId: board.ownerId,
        type: 'INVITE_ACCEPTED',
        message: `${joiner?.name || 'Un usuario'} se unió a tu proyecto "${board.name}"`
      });
    }

    res.json({ message: `Te uniste al proyecto "${board.name}"`, boardId: board.id });
  } catch (err) {
    if (err.code === 'P2002') {
      // Carrera: la membresía ya existía entre el find y el create
      return res.json({ message: 'Ya eres parte de este proyecto', boardId: null });
    }
    logger.error('Error al aceptar invitación de tablero', err, { token: req.params?.token });
    res.status(500).json({ error: 'Error al aceptar la invitación' });
  }
});

export default router;
