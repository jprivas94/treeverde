import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, read: false }
    });
    res.json({ notifications, unreadCount });
  } catch (err) {
    logger.error('Error al obtener notificaciones', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PATCH /api/notifications/read
router.patch('/read', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true }
    });
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (err) {
    logger.error('Error al marcar notificaciones como leídas', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al marcar notificaciones como leídas' });
  }
});

// DELETE /api/notifications/:id — eliminar una notificación
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    if (notif.userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta notificación' });
    }
    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notificación eliminada' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    logger.error('Error al eliminar notificación', err, { userId: req.userId, notificationId: req.params?.id });
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
});

export default router;
