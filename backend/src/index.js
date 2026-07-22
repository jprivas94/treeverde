import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vercel export (no llama a listen porque Vercel maneja el listener)
export default app;

// Solo escuchar si NO estamos en Vercel (desarrollo local)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('[Treeverde] Servidor corriendo en http://localhost:' + PORT);
  });
}

