// En desarrollo usa el proxy de Vite (/api). En producción usa VITE_API_URL.
// Guard: import.meta.env no existe fuera de Vite (tests con node:test).
const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || '/api';

// En producción, VITE_API_URL DEBE apuntar al backend terminando en /api.
// Si falta, las peticiones irían al propio dominio del frontend (Vercel) y
// el rewrite SPA las mandaría a index.html → 405 Method Not Allowed en
// POST/PATCH/DELETE. Fallamos temprano con un mensaje accionable.
if (import.meta.env && import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    '[API] VITE_API_URL no está configurada en producción. ' +
    'Las llamadas a /api se están haciendo contra el dominio del frontend y ' +
    'fallarán con 405. Configúrala apuntando al backend terminando en /api.'
  );
}

// ─── Configuración de reintentos ─────────────────────────────
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1200; // ms
// Códigos de error de red que merecen reintento
const RETRYABLE_CODES = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}, retries = MAX_RETRIES) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  // Desactivar keep-alive para evitar conexiones stale (ECONNRESET)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Distinguir el origen del 5xx:
      // - Cuerpo NO-JSON (texto) → error del proxy de Vite (ECONNRESET) o
      //   cold start de Vercel: la petición NUNCA llegó al backend, así que
      //   es seguro reintentar cualquier método (incluido POST /auth/login).
      // - Cuerpo JSON → respondió la app: reintentar solo GET (idempotente)
      //   para no duplicar operaciones de POST/PUT/PATCH/DELETE.
      let data = null;
      let isJson = false;
      try {
        data = await res.json();
        isJson = true;
      } catch {
        /* cuerpo no-JSON (proxy error) */
      }
      const httpError = new Error(data?.error || `Error ${res.status}`);
      httpError.status = res.status;
      httpError.isJson = isJson;
      throw httpError;
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);

    // ─── Reintentar errores de red y 5xx seguros ───────────────
    // 5xx con cuerpo no-JSON (proxy/cold start) → la petición no llegó
    // al backend → seguro reintentar cualquier método.
    // 5xx con JSON (respondió la app) → solo GET (idempotente).
    const isIdempotent = !options.method || options.method === 'GET';
    const isRetryable5xx =
      err.status >= 500 && err.status < 600 && (!err.isJson || isIdempotent);

    if (
      retries > 0 &&
      (err.name === 'TypeError' ||
        err.name === 'AbortError' ||
        isRetryable5xx ||
        RETRYABLE_CODES.some((code) => err.message?.includes(code)))
    ) {
      const delay = RETRY_DELAY_BASE * (MAX_RETRIES - retries + 1);
      console.warn(
        `[API] Error al conectar con el servidor (${err.status || err.name}). Reintentando en ${delay}ms... (intento ${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`
      );
      await sleep(delay);
      return request(endpoint, options, retries - 1);
    }

    // ─── Propagar errores no recuperables ─────────────────────
    if (err.name === 'TypeError') {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    }
    throw err;
  }
}

// ─── Helpers de endpoints ─────────────────────────────────────────
// send('POST', body) → opciones de fetch con método y cuerpo JSON.
const send = (method, body) => ({ method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

// withQuery('/tasks', { limit: 10, boardId: undefined }) → '/tasks?limit=10'
function withQuery(path, params) {
  if (!params) return path;
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined)).toString();
  return `${path}?${qs}`;
}

// ─── Auth ──────────────────────────────────────
export const authApi = {
  register: (name, email, password) => request('/auth/register', send('POST', { name, email, password })),
  login: (email, password) => request('/auth/login', send('POST', { email, password })),
  me: () => request('/auth/me'),
};

// ─── Tasks ─────────────────────────────────────
export const tasksApi = {
  getAll: (params) => request(withQuery('/tasks', params)),
  getById: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks', send('POST', data)),
  update: (id, data) => request(`/tasks/${id}`, send('PUT', data)),
  updateStatus: (id, status) => request(`/tasks/${id}/status`, send('PATCH', { status })),
  updateSubtasks: (id, subtasks) => request(`/tasks/${id}/subtasks`, send('PATCH', { subtasks })),
  share: (id, userId) => request(`/tasks/${id}/share`, send('POST', { userId })),
  unshare: (id, userId) => request(`/tasks/${id}/share/${userId}`, send('DELETE')),
  remove: (id) => request(`/tasks/${id}`, send('DELETE')),
  // Elimina TODAS las tareas visibles del usuario (personales + de todos los tableros)
  removeAll: () => request('/tasks/all', send('DELETE')),
  // Enlace de invitación: role 'assignee' (queda asignado) o 'share' (queda compartido)
  getInviteUrl: (id, role) => request(`/tasks/${id}/invite`, send('POST', { role })),
};

// ─── Boards (tableros) ─────────────────────────
export const boardsApi = {
  getAll: () => request('/boards'),
  getById: (id) => request(`/boards/${id}`),
  create: ({ name, description, color, icon }) => request('/boards', send('POST', { name, description, color, icon })),
  update: (id, data) => request(`/boards/${id}`, send('PUT', data)),
  remove: (id) => request(`/boards/${id}`, send('DELETE')),
  // Genera (o regenera) el enlace de invitación al tablero (solo dueño)
  invite: (id) => request(`/boards/${id}/invite`, send('POST')),
  removeMember: (id, userId) => request(`/boards/${id}/members/${userId}`, send('DELETE')),
  // Vaciar el tablero: elimina todas las tareas visibles del usuario en él
  clearTasks: (id) => request(`/boards/${id}/tasks`, send('DELETE')),
};

// ─── Invitaciones por URL ─────────────────────
export const invitesApi = {
  getInfo: (token) => request(`/invites/${token}`),
  accept: (token) => request(`/invites/${token}/accept`, send('POST')),
  getBoardInfo: (token) => request(`/invites/board/${token}`),
  acceptBoard: (token) => request(`/invites/board/${token}/accept`, send('POST')),
};

// ─── Users ─────────────────────────────────────
export const usersApi = {
  // ?search=nombre (parcial, case-insensitive) + paginación opcional
  getAll: (params) => request(withQuery('/users', params)),
};

// ─── Notifications ────────────────────────────
export const notificationsApi = {
  getAll: () => request('/notifications'),
  markRead: () => request('/notifications/read', send('PATCH')),
  remove: (id) => request(`/notifications/${id}`, send('DELETE')),
};

// ─── Profile ──────────────────────────────────
export const profileApi = {
  update: (data) => request('/auth/profile', send('PUT', data)),
};

// ─── Password Reset ──────────────────────────
export const passwordApi = {
  forgotPassword: (email) => request('/auth/forgot-password', send('POST', { email })),
  resetPassword: (token, newPassword, confirmPassword) =>
    request('/auth/reset-password', send('POST', { token, newPassword, confirmPassword })),
};
