/**
 * Logger — Sistema simple de logging para depurar Treeverde en produccion.
 */

const PREFIX = '[Treeverde]';

function formatTimestamp() {
  return new Date().toISOString().slice(11, 23);
}

const logger = {
  debug(msg, ...args) {
    if (typeof window === 'undefined') return;
    console.debug(PREFIX + ' \u{1F41B} DEBUG ' + formatTimestamp(), msg, ...args);
  },

  info(msg, ...args) {
    if (typeof window === 'undefined') return;
    console.info(PREFIX + ' \u2139\uFE0F INFO ' + formatTimestamp(), msg, ...args);
  },

  warn(msg, ...args) {
    if (typeof window === 'undefined') return;
    console.warn(PREFIX + ' \u26A0\uFE0F WARN ' + formatTimestamp(), msg, ...args);
  },

  error(msg, ...args) {
    if (typeof window === 'undefined') return;
    console.error(PREFIX + ' \u274C ERROR ' + formatTimestamp(), msg, ...args);

    try {
      const logKey = 'treeverde_error_log';
      const existing = JSON.parse(localStorage.getItem(logKey) || '[]');
      const errorObj = args.find((a) => a instanceof Error);
      const entry = {
        ts: new Date().toISOString(),
        message: typeof msg === 'string' ? msg : String(msg),
        error: errorObj
          ? { name: errorObj.name, message: errorObj.message, stack: errorObj.stack?.slice(0, 300) }
          : null,
        url: window.location.href,
      };
      existing.push(entry);
      if (existing.length > 20) existing.splice(0, existing.length - 20);
      localStorage.setItem(logKey, JSON.stringify(existing));
    } catch {}
  },

  getErrorHistory() {
    try {
      return JSON.parse(localStorage.getItem('treeverde_error_log') || '[]');
    } catch {
      return [];
    }
  },

  clearErrorHistory() {
    try {
      localStorage.removeItem('treeverde_error_log');
    } catch {}
  },

  exportLogs() {
    const errors = this.getErrorHistory();
    if (errors.length === 0) return 'No hay errores registrados.';
    return errors
      .map(
        (e) => '[' + e.ts + '] ' + e.message + (e.error ? ' | ' + e.error.name + ': ' + e.error.message : '')
      )
      .join('\n');
  },
};

export default logger;
