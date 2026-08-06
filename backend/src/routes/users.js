import { Router } from 'express';
import prisma from '../db.js';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

const router = Router();

router.use(authenticate);

// GET /api/users — listar usuarios para asignar/compartir tareas
// Sin email: la UI solo muestra nombre + avatar (búsqueda por nombre).
// Paginación opcional: ?limit=50&offset=0 (máx 500 por página; sin limit = todos)
router.get('/', async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const users = await prisma.user.findMany({
      // Búsqueda parcial por nombre (case-insensitive) para el selector de usuarios
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      select: { id: true, name: true, profileImage: true },
      orderBy: { name: 'asc' },
      ...(limit > 0 ? { take: limit, skip: offset } : {})
    });
    res.json(users);
  } catch (err) {
    logger.error('Error al obtener usuarios', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

export default router;
