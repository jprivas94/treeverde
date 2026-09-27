import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const { initSessionSync, broadcastLogout, broadcastLogin, broadcastProfileUpdate, broadcastNotificationsRead } = await import('./sessionSync.js');

// Limpieza: cerrar el transporte abierto por los tests
let cleanupFn = null;
let savedWindow = null;

function restoreGlobals() {
  globalThis.window = savedWindow;
  MockBroadcastChannel.registry.clear();
}

afterEach(() => {
  if (cleanupFn) { cleanupFn(); cleanupFn = null; }
  restoreGlobals();
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock de BroadcastChannel que imita el comportamiento del navegador:
// - un registro compartido por nombre de canal (todas las "pestañas");
// - `postMessage` entrega el mensaje a las OTRAS instancias del mismo canal
//   (nunca a la que publica → inmune a bucles) de forma asíncrona, como el
//   evento `message` real.
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

// Simula el entorno del navegador: expone `window.BroadcastChannel` (la clase
// mock), que es lo que sessionSync.js usa como transporte.
function withBrowserEnv(fn) {
  savedWindow = globalThis.window;
  MockBroadcastChannel.registry.clear();
  globalThis.window = { BroadcastChannel: MockBroadcastChannel };
  try {
    return fn();
  } finally {
    restoreGlobals();
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────

test('initSessionSync devuelve una función de limpieza', () => {
  withBrowserEnv(() => {
    const cleanup = initSessionSync({});
    assert.equal(typeof cleanup, 'function');
    cleanup();
  });
});

test('un mensaje logout de otra pestaña dispara el handler', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogout: () => { called += 1; } });
    // Simular otra pestaña publicando en el canal compartido
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'logout', ts: Date.now() });
  });
  await wait(10);
  assert.equal(called, 1, 'el handler debe dispararse al recibir logout');
});

test('un mensaje login de otra pestaña entrega el token', async () => {
  let receivedToken = null;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogin: (token) => { receivedToken = token; } });
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'login', token: 'token-de-prueba', ts: Date.now() });
  });
  await wait(10);
  assert.equal(receivedToken, 'token-de-prueba', 'el token debe llegar al handler onLogin');
});

test('un login sin token no dispara onLogin (mensaje inválido)', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogin: () => { called += 1; } });
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'login', ts: Date.now() });
  });
  await wait(10);
  assert.equal(called, 0, 'solo los mensajes login con token deben disparar');
});

test('mensajes de otro tipo no disparan handlers', async () => {
  let logoutCalls = 0;
  let loginCalls = 0;
  let profileCalls = 0;
  let notifReadCalls = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({
      onLogout: () => { logoutCalls += 1; },
      onLogin: () => { loginCalls += 1; },
      onProfileUpdate: () => { profileCalls += 1; },
      onNotificationsRead: () => { notifReadCalls += 1; },
    });
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'ping', ts: Date.now() });
  });
  await wait(10);
  assert.equal(logoutCalls, 0, 'onLogout no debe dispararse');
  assert.equal(loginCalls, 0, 'onLogin no debe dispararse');
  assert.equal(profileCalls, 0, 'onProfileUpdate no debe dispararse');
  assert.equal(notifReadCalls, 0, 'onNotificationsRead no debe dispararse');
});

test('broadcastLogout, broadcastLogin, broadcastProfileUpdate y broadcastNotificationsRead sin transporte inicializado no lanzan (degradación)', () => {
  assert.doesNotThrow(() => broadcastLogout());
  assert.doesNotThrow(() => broadcastLogin('token'));
  assert.doesNotThrow(() => broadcastProfileUpdate({ name: 'Nuevo' }));
  assert.doesNotThrow(() => broadcastNotificationsRead());
});

test('broadcastLogin publica el mensaje login en el canal (lo recibe otra pestaña)', async () => {
  let received = null;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogin: () => {} });
    // Instancia de "otra pestaña": recibe lo que publica broadcastLogin
    const peer = new MockBroadcastChannel('treeverde-session-sync');
    peer.onmessage = (event) => { received = event.data; };
    broadcastLogin('token-broadcast');
  });
  await wait(10);
  assert.equal(received.type, 'login');
  assert.equal(received.token, 'token-broadcast');
});

test('broadcastLogout publica el mensaje logout en el canal (lo recibe otra pestaña)', async () => {
  let received = null;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogout: () => {} });
    const peer = new MockBroadcastChannel('treeverde-session-sync');
    peer.onmessage = (event) => { received = event.data; };
    broadcastLogout();
  });
  await wait(10);
  assert.equal(received.type, 'logout');
});

test('un mensaje profile de otra pestaña entrega las actualizaciones', async () => {
  let receivedUpdates = null;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onProfileUpdate: (updates) => { receivedUpdates = updates; } });
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'profile', updates: { name: 'Nuevo Nombre', profileImage: 'https://img.foto.png' }, ts: Date.now() });
  });
  await wait(10);
  assert.deepEqual(receivedUpdates, { name: 'Nuevo Nombre', profileImage: 'https://img.foto.png' });
});

test('un profile sin updates no dispara onProfileUpdate (mensaje inválido)', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onProfileUpdate: () => { called += 1; } });
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'profile', ts: Date.now() });
  });
  await wait(10);
  assert.equal(called, 0, 'solo los mensajes profile con updates deben disparar');
});

test('broadcastProfileUpdate publica el mensaje profile en el canal (lo recibe otra pestaña)', async () => {
  let received = null;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onProfileUpdate: () => {} });
    const peer = new MockBroadcastChannel('treeverde-session-sync');
    peer.onmessage = (event) => { received = event.data; };
    broadcastProfileUpdate({ name: 'Propagado', profileImage: 'https://img.avatar.png' });
  });
  await wait(10);
  assert.equal(received.type, 'profile');
  assert.deepEqual(received.updates, { name: 'Propagado', profileImage: 'https://img.avatar.png' });
});

test('broadcastProfileUpdate sin campos relevantes no publica nada', async () => {
  let received = null;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onProfileUpdate: () => {} });
    const peer = new MockBroadcastChannel('treeverde-session-sync');
    peer.onmessage = (event) => { received = event.data; };
    broadcastProfileUpdate({});
    broadcastProfileUpdate(null);
  });
  await wait(10);
  assert.equal(received, null, 'no debe publicarse nada sin name/profileImage');
});

test('mensajes en otros canales se ignoran', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogout: () => { called += 1; } });
    // Publicar en OTRO canal: el módulo solo escucha su canal
    const otherChannel = new MockBroadcastChannel('otro-canal');
    otherChannel.postMessage({ type: 'logout', ts: Date.now() });
  });
  await wait(10);
  assert.equal(called, 0, 'solo el canal de sync debe procesarse');
});

test('payload corrupto en el canal se ignora sin lanzar', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogout: () => { called += 1; } });
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage('{{payload-invalido');
  });
  await wait(10);
  assert.equal(called, 0, 'un payload corrupto no debe lanzar ni disparar handlers');
});

test('la limpieza cierra el canal y desactiva los handlers', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogout: () => { called += 1; } });
    cleanupFn();
    const otherTab = new MockBroadcastChannel('treeverde-session-sync');
    otherTab.postMessage({ type: 'logout', ts: Date.now() });
  });
  await wait(10);
  assert.equal(called, 0, 'después de limpiar no debe reaccionar a mensajes');
});

test('initSessionSync es idempotente: reinicializar no duplica canales', async () => {
  let called = 0;
  withBrowserEnv(() => {
    cleanupFn = initSessionSync({ onLogout: () => { called += 1; } });
    initSessionSync({ onLogout: () => { called += 1; } });
    const instances = MockBroadcastChannel.registry.get('treeverde-session-sync');
    assert.equal(instances.size, 1, 'solo debe haber un canal abierto');
  });
  await wait(10);
  assert.equal(called, 0, 'no debe haberse disparado nada');
});
