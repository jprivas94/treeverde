import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, profileImage: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) {
    logger.error('Error al obtener usuarios', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

export default router;
