// En desarrollo usa el proxy de Vite (/api). En producción usa VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error ${res.status}`);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);

    // ─── Reintentar errores de red ─────────────────────────────
    if (
      retries > 0 &&
      (err.name === 'TypeError' ||
        err.name === 'AbortError' ||
        RETRYABLE_CODES.some((code) => err.message?.includes(code)))
    ) {
      const delay = RETRY_DELAY_BASE * (MAX_RETRIES - retries + 1);
      console.warn(
        `[API] Error de red al conectar con el servidor. Reintentando en ${delay}ms... (intento ${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`
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
  getAll: () => request('/tasks'),
  updateStatus: (id, status) =>
    request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
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
