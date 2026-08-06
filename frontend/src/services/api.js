// En desarrollo usa el proxy de Vite (/api). En producción usa VITE_API_URL.
// Guard: import.meta.env no existe fuera de Vite (tests con node:test).
const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || '/api';

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

// ─── Auth ──────────────────────────────────────
export const authApi = {
  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  me: () => request('/auth/me')
};

// ─── Tasks ─────────────────────────────────────
export const tasksApi = {
  getAll: (params) => {
    const qs = params
      ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined)).toString()}`
      : '';
    return request(`/tasks${qs}`);
  },
  getById: (id) => request(`/tasks/${id}`),
  create: (data) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id, data) =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  updateStatus: (id, status) =>
    request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  updateSubtasks: (id, subtasks) =>
    request(`/tasks/${id}/subtasks`, {
      method: 'PATCH',
      body: JSON.stringify({ subtasks })
    }),
  share: (id, userId) =>
    request(`/tasks/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
  unshare: (id, userId) =>
    request(`/tasks/${id}/share/${userId}`, { method: 'DELETE' }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  // Genera (o regenera) el enlace de invitación de una tarea.
  // role 'assignee' → quien lo acepte queda como asignado (URL de creación).
  // role 'share'    → quien lo acepte queda como compartido (URL de edición).
  getInviteUrl: (id, role) =>
    request(`/tasks/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ role })
    })
};

// ─── Invitaciones por URL ─────────────────────
export const invitesApi = {
  getInfo: (token) => request(`/invites/${token}`),
  accept: (token) => request(`/invites/${token}/accept`, { method: 'POST' })
};

// ─── Users ─────────────────────────────────────
export const usersApi = {
  // ?search=nombre (parcial, case-insensitive) + paginación opcional
  getAll: (params) => {
    const qs = params
      ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined)).toString()}`
      : '';
    return request(`/users${qs}`);
  }
};

// ─── Notifications ────────────────────────────
export const notificationsApi = {
  getAll: () => request('/notifications'),
  markRead: () => request('/notifications/read', { method: 'PATCH' }),
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' })
};

// ─── Profile ──────────────────────────────────
export const profileApi = {
  update: (data) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
};

// ─── Password Reset ──────────────────────────
export const passwordApi = {
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
  resetPassword: (token, newPassword, confirmPassword) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmPassword })
    }),
};
