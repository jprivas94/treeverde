import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-dev-only';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage } });
  } catch (err) {
    logger.error('Error al registrar usuario', err, { email: req.body?.email });
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'El usuario no existe' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage } });
  } catch (err) {
    logger.error('Error al iniciar sesión', err, { email: req.body?.email });
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me — obtener usuario actual (protegido)
router.get('/me', async (req, res) => {
  // Protegemos esta ruta inline
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, profileImage: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    logger.error('Error al obtener perfil (GET /me)', err);
    res.status(401).json({ error: 'Token inválido' });
  }
});

// PUT /api/auth/profile — actualizar perfil (nombre, contraseña, foto)
router.put('/profile', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const { name, password, profileImage } = req.body;

    // Validar que al menos venga algo
    if (!name && !password && profileImage === undefined) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    // Construir objeto de actualización
    const data = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      data.name = name.trim();
    }
    if (password !== undefined) {
      if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      data.password = await bcrypt.hash(password, 12);
    }
    if (profileImage !== undefined) {
      data.profileImage = profileImage || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data,
      select: { id: true, name: true, email: true, profileImage: true, createdAt: true }
    });

    res.json(updatedUser);
  } catch (err) {
    logger.error('Error al actualizar perfil (PUT /profile)', err, { userId: decoded?.userId });
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;

