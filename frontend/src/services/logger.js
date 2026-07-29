/**
 * Logger — Sistema simple de logging para depurar Treeverde en produccion.
 */

function formatTimestamp() {
  return new Date().toISOString().slice(11, 23);
}

const logger = {
  error(msg, ...args) {
    if (typeof window === 'undefined') return;
    console.error('[Treeverde] ❌ ERROR ' + formatTimestamp(), msg, ...args);

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
};

export default logger;
