// ─── Token de Supabase Realtime ─────────────────────────────────────────
// Supabase Realtime evalúa las políticas RLS con auth.uid(), que se extrae
// del JWT que envía el cliente en la conexión. Como la app usa su propio
// JWT (no Supabase Auth), el backend acuña un JWT compatible con Supabase
// (HS256, firmado con SUPABASE_JWT_SECRET del dashboard) para que Realtime
// autentique al usuario real y RLS filtre correctamente por userId.
import jwt from 'jsonwebtoken';

// Nota: el secret se lee DENTRO de cada función (no en una const de módulo)
// para que los tests puedan setear/limpiar process.env después del import,
// siguiendo el mismo patrón de getJwtSecret() en config.js.

/** ¿Está configurado el JWT de Supabase? (sin él, realtime no puede autenticarse) */
export function isSupabaseRealtimeConfigured() {
  return Boolean(process.env.SUPABASE_JWT_SECRET);
}

/**
 * Acuña un JWT compatible con Supabase para el userId dado.
 * - `sub`: el userId → lo que devuelve auth.uid() en las políticas RLS.
 * - `role: 'authenticated'` → evalúa las políticas del rol autenticado.
 * - `aud: 'authenticated'`, `iss: 'supabase'` → claims estándar de Supabase Auth.
 * Devuelve null si no hay SUPABASE_JWT_SECRET configurado (realtime degrada).
 */
export function createSupabaseToken(userId) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret || !userId) return null;
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'supabase',
      iat: now,
      // Misma ventana que el JWT de la app (7 días); Realtime reconecta y
      // el token se renueva en cada login/register/me.
      exp: now + 7 * 24 * 3600,
    },
    secret,
    { algorithm: 'HS256' }
  );
}
