import { test } from 'node:test';
import assert from 'node:assert/strict';

// ─── Test e2e (simulación Node) de la sincronización de sesión ────────
// Simula DOS pestañas del navegador sin dependencias externas:
// - Cada "pestaña" importa sessionSync.js con un specifier distinto
//   (`?tab=...`), así ESM las trata como módulos separados con estado aislado
//   (mismo truco que haría el navegador con realms distintos).
// - Un harness replica el wiring real de App.jsx / useAuth / Board: login
//   hace setUser + broadcastLogin, logout hace logout({broadcast:true}),
//   y los handlers recibidos hacen setToken / logout({broadcast:false}).
// - Transporte: BroadcastChannel (mock). Un registro estático compartido
//   simula el canal nativo: cada pestaña solo recibe los mensajes de las
//   OTRAS pestañas (nunca los suyos → inmune a bucles).

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock de BroadcastChannel (registro estático compartido entre "pestañas"):
// `postMessage` entrega el mensaje a las OTRAS instancias del mismo canal,
// nunca a la que publica (como el evento `message` real del navegador).
class MockBroadcastChannel {
  static registry = new Map();

  constructor(name) {
    this.name = name;
    if (!MockBroadcastChannel.registry.has(name)) {
      MockBroadcastChannel.registry.set(name, new Set());
    }
    MockBroadcastChannel.registry.get(name).add(this);
    this.onmessage = null;
  }

  postMessage(data) {
    const peers = MockBroadcastChannel.registry.get(this.name) || new Set();
    peers.forEach((peer) => {
      if (peer !== this && typeof peer.onmessage === 'function') {
        setTimeout(() => peer.onmessage({ data }), 0);
      }
    });
  }

  close() {
    const peers = MockBroadcastChannel.registry.get(this.name);
    if (peers) peers.delete(this);
  }
}

/** Mini-store por pestaña (imita las acciones relevantes del kanbanStore). */
function createTabState() {
  const state = {
    user: null,
    token: null,
    notifications: [],
    unreadCount: 0,
  };
  return {
    state,
    setUser: (user, token) => { state.user = user; state.token = token; },
    setToken: (token) => { state.token = token; },
    logout: () => { state.user = null; state.token = null; },
    markAllRead: () => { state.unreadCount = 0; state.notifications = state.notifications.map((n) => ({ ...n, read: true })); },
  };
}

/**
 * Crea una "pestaña" completa: estado + wiring de sesión sobre una instancia
 * aislada de sessionSync. Devuelve { state, api, cleanup }.
 * - `login(user, token)` imita useAuth.login: setUser + broadcastLogin.
 * - `logout()` imita Board → store.logout({ broadcast: true }).
 * Los handlers replican App.jsx: onLogout → logout local (broadcast:false),
 * onLogin → setToken (el efecto de restauración cargaría el user).
 */
function createTab(sessionSync) {
  const tab = createTabState();

  const api = {
    login: (user, token) => {
      tab.setUser(user, token);
      sessionSync.broadcastLogin(token);
    },
    logout: () => {
      tab.logout();
      sessionSync.broadcastLogout();
    },
    // EditProfileModal: updateUser + broadcastProfileUpdate
    updateProfile: (updates) => {
      if (tab.state.user) tab.state.user = { ...tab.state.user, ...updates };
      sessionSync.broadcastProfileUpdate(updates);
    },
    // NotificationPanel: markAllRead + broadcastNotificationsRead
    markNotificationsRead: () => {
      tab.markAllRead();
      sessionSync.broadcastNotificationsRead();
    },
  };

  const cleanup = sessionSync.initSessionSync({
    onLogout: () => tab.logout(),                 // logout({ broadcast: false })
    onLogin: (incomingToken) => tab.setToken(incomingToken),
    onProfileUpdate: (updates) => { if (tab.state.user) tab.state.user = { ...tab.state.user, ...updates }; },
    onNotificationsRead: () => tab.markAllRead(),
  });

  return { state: tab.state, api, cleanup };
}

// ─── BroadcastChannel: login/logout ────────────────────────────────────

test('e2e BroadcastChannel: login en pestaña A propaga la sesión a B', async () => {
  const tabAModule = await import('./sessionSync.js?tab=bc-a');
  const tabBModule = await import('./sessionSync.js?tab=bc-b');

  MockBroadcastChannel.registry.clear();
  globalThis.window = { BroadcastChannel: MockBroadcastChannel };
  const tabA = createTab(tabAModule);
  const tabB = createTab(tabBModule);

  try {
    // Publicar "desde la pestaña A" (publish usa el canal de su instancia)
    tabA.api.login({ id: 'u1', name: 'Jean' }, 'token-broadcast');
    await wait(50);

    assert.equal(tabB.state.token, 'token-broadcast', 'el login BroadcastChannel debe propagarse a B');
  } finally {
    tabA.cleanup();
    tabB.cleanup();
    MockBroadcastChannel.registry.clear();
    globalThis.window = undefined;
  }
});

test('e2e BroadcastChannel: logout en pestaña A cierra la sesión en B', async () => {
  const tabAModule = await import('./sessionSync.js?tab=bc-a2');
  const tabBModule = await import('./sessionSync.js?tab=bc-b2');

  MockBroadcastChannel.registry.clear();
  globalThis.window = { BroadcastChannel: MockBroadcastChannel };
  const tabA = createTab(tabAModule);
  const tabB = createTab(tabBModule);

  try {
    tabA.api.login({ id: 'u1', name: 'Jean' }, 'token-broadcast');
    await wait(50);
    assert.equal(tabB.state.token, 'token-broadcast');

    tabA.api.logout();
    await wait(50);

    assert.equal(tabB.state.token, null, 'el logout BroadcastChannel debe cerrar la sesión en B');
  } finally {
    tabA.cleanup();
    tabB.cleanup();
    MockBroadcastChannel.registry.clear();
    globalThis.window = undefined;
  }
});

// ─── BroadcastChannel: perfil y notificaciones leídas ─────────────────

test('e2e BroadcastChannel: editar perfil en pestaña A actualiza el de B', async () => {
  const tabAModule = await import('./sessionSync.js?tab=bc-p-a');
  const tabBModule = await import('./sessionSync.js?tab=bc-p-b');

  MockBroadcastChannel.registry.clear();
  globalThis.window = { BroadcastChannel: MockBroadcastChannel };
  const tabA = createTab(tabAModule);
  const tabB = createTab(tabBModule);

  try {
    // Ambos logueados (login inicial para que B tenga user)
    tabA.api.login({ id: 'u1', name: 'Jean', profileImage: 'img1' }, 'token-broadcast');
    await wait(50);
    tabB.api.login({ id: 'u1', name: 'Jean', profileImage: 'img1' }, 'token-broadcast');
    await wait(50);

    tabA.api.updateProfile({ name: 'Jean Actualizado', profileImage: 'img2' });
    await wait(50);

    assert.equal(tabB.state.user.name, 'Jean Actualizado', 'el nombre BroadcastChannel debe propagarse a B');
    assert.equal(tabB.state.user.profileImage, 'img2', 'la foto BroadcastChannel debe propagarse a B');
  } finally {
    tabA.cleanup();
    tabB.cleanup();
    MockBroadcastChannel.registry.clear();
    globalThis.window = undefined;
  }
});

test('e2e BroadcastChannel: marcar notificaciones leídas en A se refleja en B', async () => {
  const tabAModule = await import('./sessionSync.js?tab=bc-r-a');
  const tabBModule = await import('./sessionSync.js?tab=bc-r-b');

  MockBroadcastChannel.registry.clear();
  globalThis.window = { BroadcastChannel: MockBroadcastChannel };
  const tabA = createTab(tabAModule);
  const tabB = createTab(tabBModule);

  try {
    // B tiene notificaciones sin leer (estado local)
    tabB.state.notifications = [
      { id: 'n1', read: false },
      { id: 'n2', read: false },
    ];
    tabB.state.unreadCount = 2;

    tabA.api.markNotificationsRead();
    await wait(50);

    assert.equal(tabB.state.unreadCount, 0, 'el contador BroadcastChannel debe bajar a 0 en B');
    assert.ok(tabB.state.notifications.every((n) => n.read), 'las notificaciones BroadcastChannel de B deben marcarse leídas');
  } finally {
    tabA.cleanup();
    tabB.cleanup();
    MockBroadcastChannel.registry.clear();
    globalThis.window = undefined;
  }
});
