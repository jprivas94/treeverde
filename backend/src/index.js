import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';
import inviteRoutes from './routes/invites.js';
import logger from './utils/logger.js';
import { getAllowedOrigins, getFrontendUrl } from './utils/config.js';
import { renderRootPage } from './utils/rootPage.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Confiar en el proxy de Vercel para obtener la IP real del cliente (rate limiting)
app.set('trust proxy', 1);

// CORS restringido a los orígenes del frontend configurados (FRONTEND_URL)
app.use(cors({ origin: getAllowedOrigins() }));
app.use(express.json());

// ─── Middleware de logging de peticiones HTTP ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.request(req, res.statusCode, Date.now() - start);
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invites', inviteRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Ruta raíz — redirige al frontend o muestra info (plantilla en rootPage.js) ──
app.get('/', (_req, res) => {
  res.send(renderRootPage(getFrontendUrl()));
});

// ─── 404 para rutas API no encontradas ──
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Manejador central de errores ──
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Error no controlado', err, { path: req.originalUrl || req.url, userId: req.userId });
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Vercel export (no llama a listen porque Vercel maneja el listener)
export default app;

// Solo escuchar si NO estamos en Vercel (desarrollo local)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Servidor iniciado en http://localhost:${PORT}`);
    logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      logger.warn('Cloudinary no configurado — subida de imágenes deshabilitada');
    }
  });
}

