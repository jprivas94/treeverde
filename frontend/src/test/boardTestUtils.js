// ─── Helpers compartidos para tests de Board (jsdom) ──────────────────
// Evitan duplicar makeTask/seedStore/stubs entre Board.test.jsx y
// Board.dnd.test.jsx (mismo patron que fetchStub.js).

export const NOW = new Date().toISOString();

export const USER = { id: 'u1', name: 'Jeansa36', email: 'jean@test.com' };

export function makeTask(id, title, status, extra = {}) {
  return {
    id, title, status, priority: 'MEDIUM', description: '', tags: '', images: [],
    dueDate: '', completedAt: status === 'DONE' || status === 'ARCHIVED' ? NOW : null,
    archivedAt: status === 'ARCHIVED' ? NOW : null, updatedAt: NOW,
    creator: { id: 'c1', name: 'Carol' }, assignee: null, ...extra,
  };
}

// Stubs de APIs que jsdom no expone: ResizeObserver (Board mide la altura
// de TODO) y requestAnimationFrame (el sensor de dnd encola frames).
export function ensureDomStubs() {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  }
}

// Handlers de fetch compartidos: NotificationPanel pide notificaciones al
// montar y el PATCH de estado cubre drag & drop y archivado.
export function defaultHandlers() {
  return [
    { method: 'GET', path: '/notifications', body: { notifications: [], unreadCount: 0 } },
    { method: 'PATCH', path: '/tasks/', body: {} },
  ];
}
