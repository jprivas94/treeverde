// En desarrollo usa el proxy de Vite (/api). En producción usa VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }

  return res.json();
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
  create: (title, description, assigneeId) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, assigneeId })
    }),
  updateStatus: (id, status) =>
    request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  update: (id, data) =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  remove: (id) =>
    request(`/tasks/${id}`, { method: 'DELETE' })
};

// ─── Users ─────────────────────────────────────
export const usersApi = {
  getAll: () => request('/users')  // Se sirve desde el backend
};

