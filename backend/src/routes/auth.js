import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import prisma from '../db.js';
import authenticate from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { getJwtSecret, getFrontendUrl } from '../utils/config.js';
import { createSupabaseToken } from '../utils/supabaseToken.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const router = Router();
const JWT_SECRET = getJwtSecret();
const FRONTEND_URL = getFrontendUrl();

// ─── Rate limiting: rutas sensibles a fuerza bruta ───────────────────
// Solo activo en producción: en test se desactiva para la suite hermética,
// y en development la suite e2e de Playwright hace ~11 logins por run —
// repetirla dentro de la ventana de 15 min agotaría el presupuesto
// (flakes de 429 en cada login).
// Nota: una sola instancia compartida entre las 3 rutas → presupuesto de
// 20 peticiones/15min COMBINADO por IP (login + register + forgot-password).
const authLimiter = process.env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // ventana de 15 minutos
      limit: 20,                // máx 20 peticiones por IP
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
    })
  : (req, res, next) => next();

// Hash dummy para igualar el tiempo de respuesta cuando el email no existe
// (evita timing attacks que permitan enumerar emails)
const DUMMY_PASSWORD_HASH = '$2b$12$LGV8EmYMMOUsGfX8hE/byOz4X3XNHjb94inEwj95uU5t7abz6npWu';

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
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
    res.status(201).json({
      token,
      // Token compatible con Supabase para autenticar la conexión Realtime (RLS)
      supabaseToken: createSupabaseToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage }
    });
  } catch (err) {
    logger.error('Error al registrar usuario', err, { email: req.body?.email });
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const user = await prisma.user.findUnique({ where: { email } });

    // Comparar siempre contra un hash (real o dummy) para igualar el tiempo de respuesta
    const valid = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      // Mensaje unificado: no revela si el email existe (anti-enumeración)
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      supabaseToken: createSupabaseToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage }
    });
  } catch (err) {
    logger.error('Error al iniciar sesión', err, { email: req.body?.email });
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me — obtener usuario actual (protegido)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, profileImage: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ...user, supabaseToken: createSupabaseToken(user.id) });
  } catch (err) {
    logger.error('Error al obtener perfil (GET /me)', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/auth/profile — actualizar perfil (nombre, contraseña, foto)
router.put('/profile', authenticate, async (req, res) => {
  try {
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
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, profileImage: true, createdAt: true }
    });

    res.json(updatedUser);
  } catch (err) {
    logger.error('Error al actualizar perfil (PUT /profile)', err, { userId: req.userId });
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ─── Recuperación de contraseña ───────────────────────────────────────

// POST /api/auth/forgot-password — Solicitar restablecimiento
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({ where: { email } });

    // Siempre responder con éxito aunque el email no exista (seguridad)
    if (!user) {
      return res.json({ message: 'Si el email existe, recibirás un enlace de recuperación.' });
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires }
    });

    const resetLink = `${FRONTEND_URL}/?resetToken=${resetToken}`;

    // Enviar el correo de recuperación con el enlace (Resend).
    // Si no hay RESEND_API_KEY o el envío falla, se loguea el enlace y se
    // devuelve en la respuesta solo en desarrollo (fallback para pruebas).
    const result = await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetLink,
    });

    if (result.sent) {
      logger.info('Correo de recuperación enviado', { userId: user.id });
    } else {
      // ⚠️ El token de reset es una capacidad de toma de cuenta: NUNCA se
      // loguea completo en producción (solo en desarrollo, para pruebas).
      const logData = { userId: user.id, error: result.error || 'RESEND_API_KEY no configurada' };
      if (process.env.NODE_ENV !== 'production') logData.resetLink = resetLink;
      logger.warn('No se pudo enviar el correo de recuperación', logData);
    }

    res.json({
      message: 'Si el email existe, recibirás un enlace de recuperación.',
      // Solo en desarrollo incluimos el enlace para pruebas.
      // En producción nunca se devuelve (el token viaja únicamente por el correo).
      ...(process.env.NODE_ENV !== 'production' && { resetLink })
    });
  } catch (err) {
    logger.error('Error al solicitar recuperación de contraseña', err, { email: req.body?.email });
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST /api/auth/reset-password — Restablecer contraseña
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Token, nueva contraseña y confirmación son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    // Buscar usuario por token
    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido o ya utilizado' });
    }

    // Verificar expiración
    if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
      return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });
    }

    // Hashear y actualizar contraseña
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    logger.info('Contraseña restablecida exitosamente', { userId: user.id });

    res.json({ message: 'Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.' });
  } catch (err) {
    logger.error('Error al restablecer contraseña', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

export default router;

