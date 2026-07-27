/**
 * Logger — Sistema de logging estructurado para Treeverde backend.
 *
 * Niveles: INFO, WARN, ERROR
 * Formato: [Treeverde] [NIVEL] HH:MM:SS.mmm | mensaje | {contexto}
 * Para errores: incluye stack trace, request path, userId, etc.
 */

const PREFIX = '[Treeverde]';

// Indentación para objetos multi-línea
function pretty(obj) {
  if (!obj || typeof obj !== 'object') return '';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function formatTimestamp() {
  return new Date().toISOString().slice(11, 23) + '|' + String(process.hrtime.bigint()).slice(-6);
}

const logger = {
  info(msg, context) {
    const ts = formatTimestamp();
    const ctx = context ? ' ' + pretty(context) : '';
    console.log(`${PREFIX} [INFO] ${ts} | ${msg}${ctx}`);
  },

  warn(msg, context) {
    const ts = formatTimestamp();
    const ctx = context ? ' ' + pretty(context) : '';
    console.warn(`${PREFIX} [WARN] ${ts} | ${msg}${ctx}`);
  },

  error(msg, err, context) {
    const ts = formatTimestamp();

    const errInfo = err
      ? {
          message: err.message || String(err),
          code: err.code || err.statusCode || null,
          stack: err.stack ? err.stack.split('\n').slice(0, 6).join('\n    ') : null,
        }
      : null;

    const contextObj = { ...(context || {}) };
    if (errInfo) contextObj.error = errInfo;

    console.error(`${PREFIX} [ERROR] ${ts} | ${msg}`);
    console.error(pretty(contextObj));
  },

  /**
   * Log de petición HTTP — usar como middleware o al final de cada request.
   * Incluye método, ruta, status, duración y userId si está autenticado.
   */
  request(req, status, durationMs) {
    const ts = formatTimestamp();
    const userId = req.userId || '-';
    const method = req.method.padEnd(7);
    const path = req.originalUrl || req.url;
    const statusStr = String(status).padEnd(3);
    const duration = durationMs != null ? `${String(Math.round(durationMs)).padStart(4)}ms` : '    -';
    console.log(`${PREFIX} [REQ]  ${ts} | ${method} ${statusStr} ${duration} | user:${String(userId).slice(0, 12).padEnd(12)} | ${path}`);
  },
};

export default logger;
