// ─── Paginación centralizada ──────────────────────────────────────────
// Lectura de ?limit= & ?offset= con topes seguros (máx 500 por página).
// Usada por GET /api/tasks y GET /api/users (antes duplicada en ambas rutas).

export function parsePagination(query, { maxLimit = 500 } = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 0, 0), maxLimit);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}
