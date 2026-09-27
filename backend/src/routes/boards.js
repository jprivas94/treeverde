import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { getFrontendUrl } from '../utils/config.js';
import { safeCreate } from '../utils/notifications.js';
import { isNonEmptyString, isValidDescription as isStringSafe } from '../utils/validate.js';
import { summarizeTasks } from '../utils/taskStats.js';

const router = Router();

// Colores permitidos para el tablero (clases usadas por el frontend)
const VALID_COLORS = ['emerald', 'blue', 'violet', 'amber', 'rose', 'cyan'];

// Emoji del tablero (lista cerrada para no guardar caracteres problemáticos)
const VALID_ICONS = ['🗂', '📋', '🚀', '💼', '🎨', '🐛', '🌱', '⚡', '🔧', '📚', '🎯', '🏠'];

// Campos del usuario incluidos en respuestas (mismo criterio que tasks.js)
const USER_SELECT = { id: true, name: true, profileImage: true };

// Include estándar de un tablero: conteo de tareas y lista de miembros
const BOARD_INCLUDE = {
  members: { include: { user: { select: USER_SELECT } } },
  _count: { select: { tasks: true } }
};

// ─── Helpers de membresía ────────────────────────────────────────────
// Devuelve el tablero con sus miembros, o null si no existe.
async function findBoard(id) {
  return prisma.board.findUnique({
    where: { id },
    include: BOARD_INCLUDE
  });
}

// ¿El usuario es miembro del tablero (o dueño)?
function isMember(board, userId) {
  return board.members.some((m) => m.userId === userId);
}

// ¿El usuario es dueño del tablero?
function isOwner(board, userId) {
  return board.ownerId === userId;
}

// Todas las rutas de boards requieren autenticación
router.use(authenticate);

// ─── GET /api/boards — tableros donde el usuario es dueño o miembro ──
router.get('/', async (req, res) => {
  try {
    const boards = await prisma.board.findMany({
      where: {
        members: { some: { userId: req.userId } }
      },
      include: {
        ...BOARD_INCLUDE,
        tasks: {
          // Solo tareas visibles para el usuario (creadas/asignadas/compartidas o de un tablero suyo)
          where: {
            OR: [
              { creatorId: req.userId },
              { assigneeId: req.userId },
              { shares: { some: { userId: req.userId } } }
            ]
          },
          select: { id: true, status: true, dueDate: true, updatedAt: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Respuesta compacta: conteos + estadísticas (vencidas, próximas, última actividad) para el panel
    res.json(boards.map(({ tasks, members, _count, ...board }) => ({
      ...board,
      taskCount: _count.tasks,
      myTaskCount: tasks.length,
      doneCount: tasks.filter((t) => t.status === 'DONE' || t.status === 'ARCHIVED').length,
      stats: summarizeTasks(tasks),
      members: members.map((m) => ({ ...m.user, role: m.role }))
    })));
  } catch (err) {
    logger.error('Error al obtener tableros', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// ─── POST /api/boards — crear un tablero (el creador queda como dueño) ──
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!isNonEmptyString(name) || name.trim().length > 80) {
      return res.status(400).json({ error: 'El nombre del proyecto es requerido (máx 80 caracteres)' });
    }
    if (description !== undefined && (!isStringSafe(description) || description.length > 200)) {
      return res.status(400).json({ error: 'La descripción es demasiado larga (máx 200 caracteres)' });
    }
    const finalColor = color && VALID_COLORS.includes(color) ? color : 'emerald';
    const finalIcon = icon && VALID_ICONS.includes(icon) ? icon : '🗂';

    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        color: finalColor,
        icon: finalIcon,
        ownerId: req.userId,
        members: {
          // El dueño también es miembro (rol 'owner')
          create: { userId: req.userId, role: 'owner' }
        }
      },
      include: BOARD_INCLUDE
    });

    const { members, _count, ...rest } = board;
    res.status(201).json({
      ...rest,
      taskCount: 0,
      myTaskCount: 0,
      doneCount: 0,
      members: members.map((m) => ({ ...m.user, role: m.role }))
    });
  } catch (err) {
    logger.error('Error al crear tablero', err, { userId: req.userId, name: req.body?.name });
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

// ─── GET /api/boards/:id — detalle de un tablero (solo miembros) ────
router.get('/:id', async (req, res) => {
  try {
    const board = await findBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    if (!isMember(board, req.userId)) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
    }
    const { members, _count, ...rest } = board;
    res.json({
      ...rest,
      taskCount: _count.tasks,
      members: members.map((m) => ({ ...m.user, role: m.role }))
    });
  } catch (err) {
    logger.error('Error al obtener tablero', err, { userId: req.userId, boardId: req.params?.id });
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

// ─── PUT /api/boards/:id — renombrar / cambiar color (solo dueño) ───
router.put('/:id', async (req, res) => {
  try {
    const board = await findBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    if (!isOwner(board, req.userId)) {
      return res.status(403).json({ error: 'Solo el dueño puede editar el proyecto' });
    }

    const { name, description, color, icon } = req.body;
    const data = {};
    if (name !== undefined) {
      if (!isNonEmptyString(name) || name.trim().length > 80) {
        return res.status(400).json({ error: 'El nombre del proyecto es requerido (máx 80 caracteres)' });
      }
      data.name = name.trim();
    }
    if (description !== undefined) {
      if (!isStringSafe(description) || description.length > 200) {
        return res.status(400).json({ error: 'La descripción es demasiado larga (máx 200 caracteres)' });
      }
      data.description = description.trim();
    }
    if (color !== undefined) {
      if (!VALID_COLORS.includes(color)) {
        return res.status(400).json({ error: 'Color inválido' });
      }
      data.color = color;
    }
    if (icon !== undefined) {
      if (!VALID_ICONS.includes(icon)) {
        return res.status(400).json({ error: 'Icono inválido' });
      }
      data.icon = icon;
    }

    const updated = await prisma.board.update({
      where: { id: board.id },
      data,
      include: BOARD_INCLUDE
    });
    const { members, _count, ...rest } = updated;
    res.json({
      ...rest,
      taskCount: _count.tasks,
      members: members.map((m) => ({ ...m.user, role: m.role }))
    });
  } catch (err) {
    logger.error('Error al actualizar tablero', err, { userId: req.userId, boardId: req.params?.id });
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

// ─── POST /api/boards/:id/invite — generar (o regenerar) el enlace de invitación ──
// Solo el dueño puede generar el enlace. Cada llamada regenera el token
// (invalida el anterior, igual que las invitaciones de tarea).
router.post('/:id/invite', async (req, res) => {
  try {
    const board = await findBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    if (!isOwner(board, req.userId)) {
      return res.status(403).json({ error: 'Solo el dueño puede generar el enlace de invitación' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    await prisma.board.update({
      where: { id: board.id },
      data: { inviteToken }
    });

    res.json({ inviteUrl: `${getFrontendUrl()}/?boardInvite=${inviteToken}` });
  } catch (err) {
    logger.error('Error al generar enlace de invitación al tablero', err, { userId: req.userId, boardId: req.params?.id });
    res.status(500).json({ error: 'Error al generar el enlace de invitación' });
  }
});

// ─── DELETE /api/boards/:id/members/:userId — quitar un miembro (dueño) ──
// El dueño no puede quitarse a sí mismo (el rol owner es inherente).
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const board = await findBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    if (!isOwner(board, req.userId)) {
      return res.status(403).json({ error: 'Solo el dueño puede gestionar los miembros' });
    }
    if (req.params.userId === board.ownerId) {
      return res.status(400).json({ error: 'El dueño no puede ser removido del proyecto' });
    }

    await prisma.boardMember.deleteMany({
      where: { boardId: board.id, userId: req.params.userId }
    });
    res.json({ message: 'Miembro eliminado' });
  } catch (err) {
    logger.error('Error al eliminar miembro del tablero', err, { userId: req.userId, boardId: req.params?.id, targetUserId: req.params?.userId });
    res.status(500).json({ error: 'Error al eliminar miembro' });
  }
});

// ─── DELETE /api/boards/:id/tasks — vaciar el tablero (solo miembros) ──
// Elimina TODAS las tareas visibles para el usuario dentro del tablero:
// las que creó, las que tiene asignadas y las compartidas con él.
// Las tareas de otros miembros sin relación con el usuario permanecen.
// Usa deleteMany con el mismo criterio de visibilidad que GET /api/tasks?boardId=.
router.delete('/:id/tasks', async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } }
    });
    if (!board) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    if (!board.members.some((m) => m.userId === req.userId)) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
    }

    const result = await prisma.task.deleteMany({
      where: {
        boardId: board.id,
        OR: [
          { creatorId: req.userId },
          { assigneeId: req.userId },
          { shares: { some: { userId: req.userId } } }
        ]
      }
    });
    logger.info('Tablero vaciado', { userId: req.userId, boardId: board.id, deleted: result.count });
    res.json({ message: 'Tareas eliminadas', deleted: result.count });
  } catch (err) {
    logger.error('Error al vaciar el tablero', err, { userId: req.userId, boardId: req.params?.id });
    res.status(500).json({ error: 'Error al eliminar las tareas del proyecto' });
  }
});

// ─── DELETE /api/boards/:id — eliminar tablero y sus tareas (dueño) ──
router.delete('/:id', async (req, res) => {
  try {
    const board = await findBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    if (!isOwner(board, req.userId)) {
      return res.status(403).json({ error: 'Solo el dueño puede eliminar el proyecto' });
    }
    // Cascade: BoardMember y Task (boardId) se eliminan en cascada
    await prisma.board.delete({ where: { id: board.id } });
    res.json({ message: 'Proyecto eliminado' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    logger.error('Error al eliminar tablero', err, { userId: req.userId, boardId: req.params?.id });
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
});

export default router;
