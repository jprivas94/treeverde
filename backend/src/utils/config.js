// ─── Configuración sensible centralizada ──────────────────────────────

// JWT_SECRET: obligatorio en producción (sin fallback que permita forjar tokens)
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET es obligatorio en producción');
    }
    return 'fallback-secret-dev-only';
  }
  return secret;
}

// FRONTEND_URL: base del frontend (enlace de reset + origen CORS)
// Soporta múltiples orígenes separados por coma.
export function getAllowedOrigins() {
  const urls = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  // En desarrollo también permitimos localhost (proxy de Vite)
  if (process.env.NODE_ENV !== 'production') {
    urls.push('http://localhost:5173', 'http://localhost:3001');
  }
  return [...new Set(urls)];
}

// Primer origen configurado (usado para el enlace de reset)
export function getFrontendUrl() {
  return getAllowedOrigins()[0] || 'http://localhost:5173';
}
