// ─── Sincronización de sesión entre pestañas ──────────────────────────
// Cuando el usuario inicia sesión, cierra sesión o edita su perfil en una
// pestaña, se avisa a las demás para que repliquen la sesión (login),
// cierren sesión (logout) o actualicen el perfil (profile), evitando
// sesiones huérfanas o pestañas desincronizadas.
//
// Transporte: BroadcastChannel (mensajería nativa entre pestañas del mismo
// origen). Cada pestaña solo recibe los mensajes de las OTRAS (nunca los
// suyos) → inmune a bucles. Degradación elegante: si no hay soporte
// (SSR/Node sin BroadcastChannel), noop.

// Nombre del canal compartido entre pestañas
const CHANNEL_NAME = 'treeverde-session-sync';

let channel = null;
let onLogout = null;
let onLogin = null;
let onProfileUpdate = null;
let onNotificationsRead = null;

/** Procesa un mensaje recibido (desde otra pestaña vía BroadcastChannel). */
function dispatchMessage(data) {
  const { type, token, updates } = data || {};
  if (type === 'logout') {
    onLogout?.();
  } else if (type === 'login' && token) {
    onLogin?.(token);
  } else if (type === 'profile' && updates && (updates.name !== undefined || updates.profileImage !== undefined)) {
    onProfileUpdate?.(updates);
  } else if (type === 'notifications-read') {
    onNotificationsRead?.();
  }
}

/** Devuelve la clase BroadcastChannel disponible (window o global de Node). */
function getChannelClass() {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    return window.BroadcastChannel;
  }
  if (typeof BroadcastChannel === 'function') {
    return BroadcastChannel;
  }
  return null;
}

/**
 * Inicializa la sincronización de sesión entre pestañas vía BroadcastChannel.
 * - `onLogout()` se llama cuando OTRA pestaña cierra sesión.
 * - `onLogin(token)` se llama cuando OTRA pestaña inicia sesión.
 * - `onProfileUpdate(updates)` se llama cuando OTRA pestaña edita el perfil.
 * - `onNotificationsRead()` se llama cuando OTRA pestaña marcó las leídas.
 * Devuelve una función de limpieza (cierra el canal).
 */
export function initSessionSync({ onLogout: logoutHandler, onLogin: loginHandler, onProfileUpdate: profileHandler, onNotificationsRead: notificationsReadHandler } = {}) {
  // Idempotente: cerrar canal previo si existe (evita fugas si el efecto se
  // re-ejecuta o se llama dos veces sin limpiar).
  teardown();
  onLogout = logoutHandler;
  onLogin = loginHandler;
  onProfileUpdate = profileHandler;
  onNotificationsRead = notificationsReadHandler;

  const ChannelClass = getChannelClass();
  if (ChannelClass) {
    channel = new ChannelClass(CHANNEL_NAME);
    channel.onmessage = (event) => {
      try {
        dispatchMessage(event.data);
      } catch {
        // Mensaje corrupto: ignorar
      }
    };
  }
  // Sin soporte (p. ej. SSR sin BroadcastChannel): noop.

  return teardown;
}

/** Cierra el canal activo y limpia los handlers. */
function teardown() {
  if (channel) {
    channel.close();
    channel = null;
  }
  onLogout = null;
  onLogin = null;
  onProfileUpdate = null;
  onNotificationsRead = null;
}

/** Publica un mensaje en el canal compartido (llega solo a OTRAS pestañas). */
function publish(data) {
  channel?.postMessage(data);
}

/** Avisa a las otras pestañas que se cerró sesión. */
export function broadcastLogout() {
  publish({ type: 'logout' });
}

/** Avisa a las otras pestañas que se inició sesión (envía el token). */
export function broadcastLogin(token) {
  if (token) {
    publish({ type: 'login', token });
  }
}

/** Avisa a las otras pestañas que el perfil cambió (nombre/foto). */
export function broadcastProfileUpdate(updates) {
  if (updates && (updates.name !== undefined || updates.profileImage !== undefined)) {
    publish({ type: 'profile', updates });
  }
}

/** Avisa a las otras pestañas que las notificaciones se marcaron como leídas. */
export function broadcastNotificationsRead() {
  publish({ type: 'notifications-read' });
}
