import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-dev-only';

export default function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    logger.warn('Auth fallida — token no proporcionado', { path: req.originalUrl || req.url });
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    logger.warn('Auth fallida — token inválido o expirado', { path: req.originalUrl || req.url, error: err.message });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

