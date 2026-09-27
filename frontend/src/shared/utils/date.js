// ─── Helpers de fecha compartidos ─────────────────────────────────────
// Centraliza el parseo/formateo de fechas usado en tarjetas, historial,
// notificaciones, detalles y formularios (antes duplicado en varios
// componentes con pequeñas variantes).

/** Convierte un string (o Date) a Date válido, o null si es inválido/vacío. */
export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Fecha corta: «12 ago» (TaskCard). Devuelve null si no hay fecha. */
export function formatDateShort(value) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : null;
}

/** Fecha completa: «12 ago 2026» (historial, detalles). Devuelve null si no hay fecha. */
export function formatDateFull(value) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
}

/** ¿La fecha ya pasó (sin contar hoy)? (TaskCard) */
export function isOverdue(value) {
  const d = parseDate(value);
  if (!d) return false;
  return d < new Date(new Date().toDateString());
}

/** Tiempo relativo: «ahora», «hace 5m», «hace 2h», «hace 3d» (NotificationPanel). */
export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '';
  const now = Date.now();
  const mins = Math.floor((now - d.getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

// ─── Fechas locales «YYYY-MM-DD» (formularios) ────────────────────────

/** Convierte «YYYY-MM-DD» a Date LOCAL (sin desfase UTC del parser ISO). */
export function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Convierte Date a «YYYY-MM-DD» local. */
export function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Convierte un ISO string a «YYYY-MM-DD» (para inputs de fecha). */
export function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
