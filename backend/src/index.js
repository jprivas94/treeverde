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

// ─── Ruta raíz — redirige al frontend o muestra info ──
app.get('/', (_req, res) => {
  const frontendUrl = getFrontendUrl();
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Treeverde API</title>
      <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
        h1 { color: #065f46; font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #6b7280; font-size: 0.875rem; line-height: 1.5; }
        a { display: inline-block; margin-top: 1rem; background: #059669; color: white; text-decoration: none; padding: 0.625rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; transition: background 0.2s; }
        a:hover { background: #047857; }
        .api { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
        .api a { background: #e5e7eb; color: #374151; font-weight: 500; font-size: 0.75rem; padding: 0.375rem 1rem; margin: 0.25rem; display: inline-block; }
        .api a:hover { background: #d1d5db; }
      </style>
    </head>
    <body>
      <div class="card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">📋</div>
        <h1>Treeverde API</h1>
        <p>El servidor backend está funcionando correctamente.</p>
        <a href="${frontendUrl}">Ir al Tablero →</a>
        <div class="api">
          <p style="margin-bottom: 0.75rem;">Endpoints disponibles:</p>
          <a href="/api/health">/api/health</a>
          <a href="/api/auth/me">/api/auth/me</a>
          <a href="/api/tasks">/api/tasks</a>
          <a href="/api/users">/api/users</a>
        </div>
      </div>
    </body>
    </html>
  `);
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

