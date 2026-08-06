// ─── Stub de fetch para tests de componentes ──────────────────────────
// La capa API (services/api.js) usa fetch global en tiempo de llamada:
// este stub lo reemplaza para que SIEMPRE resuelva (si lanzara, el
// cliente reintentaría con delays de 1.2s+2.4s) y registra las llamadas
// ({method, path, body}) para poder asertar qué se envió.
//
// Los handlers se ordenan por longitud de path (más específicos primero)
// para que p. ej. /tasks/:id/invite no caiga en el genérico /tasks.
// Cualquier llamada sin handler → fallar ruidoso (evita regresiones
// silenciosas en los tests).

export function stubFetch(handlers) {
  const calls = [];
  const sorted = [...handlers].sort((a, b) => b.path.length - a.path.length);
  globalThis.fetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const path = String(url);
    calls.push({ method, path, body: options.body });
    for (const h of sorted) {
      if (h.method === method && (h.path === '*' || path.includes(h.path))) {
        const status = h.status || 200;
        const ok = h.ok !== undefined ? h.ok : status >= 200 && status < 300;
        return {
          ok,
          status,
          json: async () => (typeof h.body === 'function' ? h.body({ method, path, body: options.body ? JSON.parse(options.body) : null }) : h.body),
        };
      }
    }
    // Llamada inesperada → fallar ruidoso (evita regresiones silenciosas)
    throw new Error('fetch no esperado en test: ' + method + ' ' + path);
  };
  return calls;
}

// Helper: devuelve el body parseado de la primera llamada que coincida
// con método y path (para aserciones sobre el payload enviado).
export function findCall(calls, method, pathPart) {
  return calls.find((c) => c.method === method && c.path.includes(pathPart));
}
