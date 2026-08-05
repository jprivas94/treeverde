// Tests de integración (Supertest + app Express real + Prisma en memoria)
// Requiere: node --experimental-test-module-mocks --test
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// ─── Entorno (ANTES del import dinámico de la app) ───────────────
process.env.VERCEL = '1'; // Supertest: no queremos app.listen
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
// Cloudinary de prueba para ejercitar el flujo de firma de POST /api/upload/sign
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

// ─── Fake de Prisma en memoria ───────────────────────────────────
function createFakeDb() {
  let users = [];
  let tasks = [];
  let shares = [];
  let uid = 0, tid = 0, sid = 0, nid = 0;
  const notifications = [];

  const clone = (o) => (o ? JSON.parse(JSON.stringify(o)) : o);

  return {
    _notifications: notifications,
    reset() { users = []; tasks = []; shares = []; notifications.length = 0; uid = 0; tid = 0; sid = 0; nid = 0; },
    user: {
      async findMany({ select, orderBy, take, skip } = {}) {
        let result = [...users];
        if (orderBy?.name === 'asc') {
          result.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (select) {
          result = result.map((u) => {
            const picked = {};
            for (const key of Object.keys(select)) picked[key] = u[key];
            return picked;
          });
        }
        if (skip) result = result.slice(skip);
        if (take) result = result.slice(0, take);
        return clone(result);
      },
      async findUnique({ where }) {
        const u = users.find((x) => {
          if (where.id) return x.id === where.id;
          if (where.email) return x.email === where.email;
          if (where.resetToken) return x.resetToken === where.resetToken;
          return false;
        });
        return u ? clone(u) : null;
      },
      async create({ data }) {
        const u = { id: `u${++uid}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
        users.push(u);
        return clone(u);
      },
      async update({ where, data }) {
        const u = users.find((x) => x.id === where.id);
        if (!u) { const e = new Error('not found'); e.code = 'P2025'; throw e; }
        Object.assign(u, data);
        return clone(u);
      }
    },
    task: {
      async findMany({ where, orderBy, take, skip } = {}) {
        let result = tasks;
        if (where && where.OR) {
          result = tasks.filter((t) =>
            where.OR.some((cond) =>
              (cond.creatorId && t.creatorId === cond.creatorId) ||
              (cond.assigneeId && t.assigneeId === cond.assigneeId) ||
              (cond.shares && cond.shares.some?.userId &&
                shares.some((s) => s.taskId === t.id && s.userId === cond.shares.some.userId))
            )
          );
        }
        if (orderBy?.createdAt === 'desc') {
          result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
        if (skip) result = result.slice(skip);
        if (take) result = result.slice(0, take);
        return clone(result);
      },
      async findUnique({ where }) {
        const t = tasks.find((x) => {
          if (where.id) return x.id === where.id;
          if (where.inviteToken) return x.inviteToken === where.inviteToken;
          return false;
        });
        return t ? clone(t) : null;
      },
      async create({ data }) {
        const t = { id: `t${++tid}`, status: 'TODO', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
        tasks.push(t);
        return clone(t);
      },
      async update({ where, data }) {
        const t = tasks.find((x) => x.id === where.id);
        if (!t) { const e = new Error('not found'); e.code = 'P2025'; throw e; }
        Object.assign(t, data, { updatedAt: new Date().toISOString() });
        return clone(t);
      },
      async delete({ where }) {
        const i = tasks.findIndex((x) => x.id === where.id);
        if (i === -1) { const e = new Error('not found'); e.code = 'P2025'; throw e; }
        tasks.splice(i, 1);
      }
    },
    taskShare: {
      async upsert({ where, create, update }) {
        const key = where.taskId_userId;
        const ex = shares.find((s) => s.taskId === key.taskId && s.userId === key.userId);
        if (ex) { Object.assign(ex, update); return clone(ex); }
        const s = { id: `s${++sid}`, taskId: key.taskId, userId: key.userId, ...create };
        shares.push(s);
        return clone(s);
      },
      async findFirst({ where }) {
        const s = shares.find((x) => x.taskId === where.taskId && x.userId === where.userId);
        return s ? clone(s) : null;
      },
      async findUnique({ where }) {
        const key = where.taskId_userId;
        const s = shares.find((x) => x.taskId === key.taskId && x.userId === key.userId);
        return s ? clone(s) : null;
      },
      async create({ data }) {
        const s = { id: `s${++sid}`, taskId: data.taskId, userId: data.userId, ...data };
        shares.push(s);
        return clone(s);
      },
      async deleteMany({ where }) {
        const before = shares.length;
        shares = shares.filter((x) => !(x.taskId === where.taskId && x.userId === where.userId));
        return { count: before - shares.length };
      }
    },
    notification: {
      async create({ data }) {
        const n = {
          id: `n${++nid}`,
          read: false,
          createdAt: new Date().toISOString(),
          ...data
        };
        notifications.push(n);
        return clone(n);
      },
      async findMany({ where = {}, orderBy, take } = {}) {
        let result = notifications.filter((n) => {
          if (where.userId && n.userId !== where.userId) return false;
          return true;
        });
        if (orderBy?.createdAt === 'desc') {
          result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
        if (take) result = result.slice(0, take);
        return clone(result);
      },
      async count({ where = {} } = {}) {
        return notifications.filter((n) => {
          if (where.userId && n.userId !== where.userId) return false;
          if (where.read !== undefined && n.read !== where.read) return false;
          return true;
        }).length;
      },
      async updateMany({ where = {}, data } = {}) {
        let count = 0;
        for (const n of notifications) {
          if (where.userId && n.userId !== where.userId) continue;
          if (where.read !== undefined && n.read !== where.read) continue;
          Object.assign(n, data);
          count++;
        }
        return { count };
      },
      async findUnique({ where }) {
        const n = notifications.find((x) => x.id === where.id);
        return n ? clone(n) : null;
      },
      async delete({ where }) {
        const i = notifications.findIndex((x) => x.id === where.id);
        if (i === -1) { const e = new Error('not found'); e.code = 'P2025'; throw e; }
        notifications.splice(i, 1);
      }
    }
  };
}

const fakeDb = createFakeDb();

// Interceptar el singleton de Prisma (backend/src/db.js)
mock.module('../src/db.js', { defaultExport: fakeDb });

// Import dinámico DESPUÉS del mock y de VERCEL=1
const { default: app } = await import('../src/index.js');

const api = request(app);

async function register(name, email, password = 'secret123') {
  const res = await api.post('/api/auth/register').send({ name, email, password });
  return res;
}

async function createTask(token, overrides = {}) {
  const res = await api.post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Tarea de prueba', ...overrides });
  return res;
}

beforeEach(() => { fakeDb.reset(); });

// ═══════════════ AUTH ═══════════════

test('POST /api/auth/register → 201 con token y usuario sin password', async () => {
  const res = await register('Ana Test', 'ana@test.com');
  assert.equal(res.status, 201);
  assert.ok(res.body.token, 'debe devolver token');
  assert.equal(res.body.user.name, 'Ana Test');
  assert.equal(res.body.user.email, 'ana@test.com');
  assert.equal(res.body.user.password, undefined);
  // Sin SUPABASE_JWT_SECRET configurado, supabaseToken es null (degradación)
  assert.equal(res.body.supabaseToken, null);
});

test('POST /api/auth/register → 409 si el email ya existe', async () => {
  await register('Ana Test', 'dup@test.com');
  const res = await register('Otra Ana', 'dup@test.com');
  assert.equal(res.status, 409);
});

test('POST /api/auth/register → 400 si faltan campos', async () => {
  const res = await api.post('/api/auth/register').send({ name: 'Solo nombre' });
  assert.equal(res.status, 400);
});

test('POST /api/auth/login → 200 con token (credenciales válidas)', async () => {
  await register('Luis Test', 'luis@test.com', 'mipassword1');
  const res = await api.post('/api/auth/login').send({ email: 'luis@test.com', password: 'mipassword1' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.name, 'Luis Test');
});

test('POST /api/auth/login → 401 con contraseña incorrecta', async () => {
  await register('Luis Test', 'luis2@test.com', 'mipassword1');
  const res = await api.post('/api/auth/login').send({ email: 'luis2@test.com', password: 'incorrecta' });
  assert.equal(res.status, 401);
});

test('POST /api/auth/login → mensaje unificado (anti-enumeración de emails)', async () => {
  await register('Enum Test', 'enum@test.com', 'mipassword1');

  // Email inexistente y contraseña incorrecta deben devolver el MISMO mensaje
  const noUser = await api.post('/api/auth/login').send({ email: 'noexiste@test.com', password: 'x' });
  const badPass = await api.post('/api/auth/login').send({ email: 'enum@test.com', password: 'incorrecta' });

  assert.equal(noUser.status, 401);
  assert.equal(badPass.status, 401);
  assert.equal(noUser.body.error, badPass.body.error, 'el mensaje no debe revelar si el email existe');
  assert.match(noUser.body.error, /Email o contraseña incorrectos/);
});

test('GET /api/auth/me → 200 con token válido', async () => {
  const reg = await register('Me Test', 'me@test.com');
  const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.email, 'me@test.com');
  assert.equal(res.body.supabaseToken, null, 'sin secret configurado, el token es null');
});

test('GET /api/auth/me → 401 sin token', async () => {
  const res = await api.get('/api/auth/me');
  assert.equal(res.status, 401);
});

// ═══════════════ TAREAS ═══════════════

test('POST /api/tasks → 201 (sin token → 401)', async () => {
  const noAuth = await api.post('/api/tasks').send({ title: 'X' });
  assert.equal(noAuth.status, 401);

  const reg = await register('Creador', 'creador@test.com');
  const res = await createTask(reg.body.token, {
    description: 'Descripción',
    priority: 'HIGH',
    subtasks: [{ id: 's1', title: 'Subtarea Uno', completed: false }]
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Tarea de prueba');
  assert.equal(res.body.status, 'TODO');
  assert.equal(res.body.priority, 'HIGH');
  assert.equal(res.body.subtasks.length, 1);
  assert.equal(res.body.creatorId, reg.body.user.id);
});

test('POST /api/tasks → 400 sin título', async () => {
  const reg = await register('Creador2', 'creador2@test.com');
  const res = await createTask(reg.body.token, { title: '   ' });
  assert.equal(res.status, 400);
});

test('GET /api/tasks/:id → 200 (ruta nueva que arregló bug B1)', async () => {
  const reg = await register('Get Test', 'get@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.get(`/api/tasks/${created.body.id}`).set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, created.body.id);
  assert.equal(res.body.title, 'Tarea de prueba');
});

test('GET /api/tasks/:id → 404 si no existe', async () => {
  const reg = await register('Get404', 'get404@test.com');
  const res = await api.get('/api/tasks/no-existe').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 404);
});

test('GET /api/tasks/:id → 403 para otro usuario', async () => {
  const owner = await register('Owner', 'owner@test.com');
  const created = await createTask(owner.body.token);
  const intruder = await register('Intruder', 'intruder@test.com');
  const res = await api.get(`/api/tasks/${created.body.id}`).set('Authorization', `Bearer ${intruder.body.token}`);
  assert.equal(res.status, 403);
});

test('PUT /api/tasks/:id → 200 actualiza título y prioridad', async () => {
  const reg = await register('Edit Test', 'edit@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.put(`/api/tasks/${created.body.id}`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ title: 'Título EDITADO', priority: 'CRITICAL' });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Título EDITADO');
  assert.equal(res.body.priority, 'CRITICAL');
});

test('PUT /api/tasks/:id → 403 si no es creador ni asignado', async () => {
  const owner = await register('Owner2', 'owner2@test.com');
  const created = await createTask(owner.body.token);
  const other = await register('Other2', 'other2@test.com');
  const res = await api.put(`/api/tasks/${created.body.id}`)
    .set('Authorization', `Bearer ${other.body.token}`)
    .send({ title: 'Hack' });
  assert.equal(res.status, 403);
});

// ═══════════════ SUBTAREAS ═══════════════

test('PATCH /api/tasks/:id/subtasks → 200 persiste sin notificar al propio usuario', async () => {
  const reg = await register('Sub Test', 'sub@test.com');
  const created = await createTask(reg.body.token, {
    subtasks: [{ id: 's1', title: 'Subtarea Uno', completed: false }]
  });
  const res = await api.patch(`/api/tasks/${created.body.id}/subtasks`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ subtasks: [{ id: 's1', title: 'Subtarea Uno', completed: true, toggledBy: reg.body.user.id }] });
  assert.equal(res.status, 200);
  assert.equal(res.body.subtasks[0].completed, true);
  // Creador completó su propia subtarea y no hay asignado → no debe haber notificación
  assert.equal(fakeDb._notifications.length, 0);
});

test('PATCH subtasks notifica al asignado cuando el creador completa', async () => {
  const creator = await register('Crea Sub', 'creasub@test.com');
  const assignee = await register('Asig Sub', 'asigsub@test.com');
  const created = await createTask(creator.body.token, {
    assigneeId: assignee.body.user.id,
    subtasks: [{ id: 's1', title: 'Subtarea Uno', completed: false }]
  });
  const res = await api.patch(`/api/tasks/${created.body.id}/subtasks`)
    .set('Authorization', `Bearer ${creator.body.token}`)
    .send({ subtasks: [{ id: 's1', title: 'Subtarea Uno', completed: true, toggledBy: creator.body.user.id }] });
  assert.equal(res.status, 200);
  const notif = fakeDb._notifications.find((n) => n.type === 'SUBTASK_COMPLETED');
  assert.ok(notif, 'debe crear notificación SUBTASK_COMPLETED');
  assert.equal(notif.userId, assignee.body.user.id);
});

test('PATCH subtasks → 400 si no es un array', async () => {
  const reg = await register('Sub400', 'sub400@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.patch(`/api/tasks/${created.body.id}/subtasks`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ subtasks: 'no-array' });
  assert.equal(res.status, 400);
});

// ═══════════════ ESTADO (status) ═══════════════

test('PATCH /api/tasks/:id/status → IN_PROGRESS (drag & drop)', async () => {
  const reg = await register('Status Test', 'status@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.patch(`/api/tasks/${created.body.id}/status`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ status: 'IN_PROGRESS' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'IN_PROGRESS');
});

test('PATCH status → DONE marca completedAt (finalización)', async () => {
  const reg = await register('Done Test', 'done@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.patch(`/api/tasks/${created.body.id}/status`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ status: 'DONE' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'DONE');
  assert.ok(res.body.completedAt, 'completedAt debe establecerse');
});

test('PATCH status → 400 con estado inválido', async () => {
  const reg = await register('Bad Status', 'badstatus@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.patch(`/api/tasks/${created.body.id}/status`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ status: 'IMPOSSIBLE' });
  assert.equal(res.status, 400);
});

test('PATCH status → 403 si no es creador ni asignado', async () => {
  const owner = await register('OwnerSt', 'ownerst@test.com');
  const created = await createTask(owner.body.token);
  const other = await register('OtherSt', 'otherst@test.com');
  const res = await api.patch(`/api/tasks/${created.body.id}/status`)
    .set('Authorization', `Bearer ${other.body.token}`)
    .send({ status: 'DONE' });
  assert.equal(res.status, 403);
});

// ═══════════════ COMPARTIR ═══════════════

test('POST /api/tasks/:id/share → 201 comparte y notifica SHARED', async () => {
  const owner = await register('Share Owner', 'shareowner@test.com');
  const friend = await register('Share Friend', 'sharefriend@test.com');
  const created = await createTask(owner.body.token);
  const res = await api.post(`/api/tasks/${created.body.id}/share`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ userId: friend.body.user.id });
  assert.equal(res.status, 201);
  const notif = fakeDb._notifications.find((n) => n.type === 'SHARED');
  assert.ok(notif, 'debe crear notificación SHARED');
  assert.equal(notif.userId, friend.body.user.id);
});

test('DELETE /api/tasks/:id → 200 solo el creador; 403 para otros', async () => {
  const owner = await register('Del Owner', 'delowner@test.com');
  const created = await createTask(owner.body.token);

  const other = await register('Del Other', 'delother@test.com');
  const forbidden = await api.delete(`/api/tasks/${created.body.id}`)
    .set('Authorization', `Bearer ${other.body.token}`);
  assert.equal(forbidden.status, 403);

  const ok = await api.delete(`/api/tasks/${created.body.id}`)
    .set('Authorization', `Bearer ${owner.body.token}`);
  assert.equal(ok.status, 200);
});

// ═══════════════ HEALTH ═══════════════

test('GET /api/health → 200 ok', async () => {
  const res = await api.get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

// ═══════════════ CORS ═══════════════

test('CORS → origen permitido recibe Access-Control-Allow-Origin', async () => {
  const res = await api.get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(res.status, 200);
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
});

test('CORS → origen no permitido NO recibe Access-Control-Allow-Origin', async () => {
  const res = await api.get('/api/health').set('Origin', 'https://evil.example.com');
  assert.equal(res.status, 200);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

// ═══════════════ PASSWORD RESET ═══════════════

test('POST /api/auth/forgot-password → 200 con resetLink en dev', async () => {
  await register('Reset User', 'reset@test.com');
  const res = await api.post('/api/auth/forgot-password').send({ email: 'reset@test.com' });
  assert.equal(res.status, 200);
  assert.match(res.body.message, /recibirás un enlace/);
  assert.ok(res.body.resetLink, 'en dev debe devolver resetLink');
  assert.match(res.body.resetLink, /resetToken=/);
});

test('POST /api/auth/forgot-password → 200 sin resetLink si el email no existe', async () => {
  const res = await api.post('/api/auth/forgot-password').send({ email: 'noexiste@test.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.resetLink, undefined);
});

test('POST /api/auth/forgot-password → en producción NO devuelve resetLink (seguridad)', async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await register('Prod Reset', 'prodreset@test.com');
    const res = await api.post('/api/auth/forgot-password').send({ email: 'prodreset@test.com' });
    assert.equal(res.status, 200);
    assert.equal(res.body.resetLink, undefined, 'el token no debe exponerse en producción');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('POST /api/auth/reset-password → 200 y permite login con la nueva contraseña', async () => {
  await register('Reset Flow', 'resetflow@test.com', 'oldpassword1');
  const forgot = await api.post('/api/auth/forgot-password').send({ email: 'resetflow@test.com' });
  const token = forgot.body.resetLink.split('resetToken=')[1];

  const res = await api.post('/api/auth/reset-password').send({
    token, newPassword: 'newpassword1', confirmPassword: 'newpassword1'
  });
  assert.equal(res.status, 200);

  const login = await api.post('/api/auth/login').send({ email: 'resetflow@test.com', password: 'newpassword1' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
});

test('POST /api/auth/reset-password → 400 con token inválido', async () => {
  const res = await api.post('/api/auth/reset-password').send({
    token: 'token-invalido', newPassword: 'newpassword1', confirmPassword: 'newpassword1'
  });
  assert.equal(res.status, 400);
});

test('POST /api/auth/reset-password → 400 si las contraseñas no coinciden', async () => {
  await register('Reset Mismatch', 'mismatch@test.com');
  const forgot = await api.post('/api/auth/forgot-password').send({ email: 'mismatch@test.com' });
  const token = forgot.body.resetLink.split('resetToken=')[1];
  const res = await api.post('/api/auth/reset-password').send({
    token, newPassword: 'newpassword1', confirmPassword: 'distinta'
  });
  assert.equal(res.status, 400);
});

// ═══════════════ LISTADO (GET /api/tasks) ═══════════════

test('GET /api/tasks → 200 lista solo las tareas del usuario', async () => {
  const reg = await register('List Test', 'list@test.com');
  await createTask(reg.body.token, { title: 'Tarea A' });
  await createTask(reg.body.token, { title: 'Tarea B' });

  const res = await api.get('/api/tasks').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
  assert.ok(res.body.some((t) => t.title === 'Tarea A'));
  assert.ok(res.body.some((t) => t.title === 'Tarea B'));
});

test('GET /api/tasks → 200 con paginación (limit/offset)', async () => {
  const reg = await register('Pag Test', 'pag@test.com');
  for (let i = 1; i <= 5; i++) {
    await createTask(reg.body.token, { title: `Tarea ${i}` });
  }

  const page1 = await api.get('/api/tasks?limit=2').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(page1.status, 200);
  assert.equal(page1.body.length, 2);

  const page2 = await api.get('/api/tasks?limit=2&offset=2').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(page2.status, 200);
  assert.equal(page2.body.length, 2);

  const rest = await api.get('/api/tasks?limit=2&offset=4').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(rest.body.length, 1);
});

test('GET /api/tasks → limit mayor a 500 se recorta a 500 (y no rompe)', async () => {
  const reg = await register('Limit Test', 'limit@test.com');
  await createTask(reg.body.token, { title: 'Tarea A' });
  await createTask(reg.body.token, { title: 'Tarea B' });

  const res = await api.get('/api/tasks?limit=9999').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
});

test('GET /api/tasks → no incluye tareas de otros usuarios', async () => {
  const alice = await register('Alice', 'alice@test.com');
  const bob = await register('Bob', 'bob@test.com');
  await createTask(alice.body.token, { title: 'Tarea de Alice' });

  const res = await api.get('/api/tasks').set('Authorization', `Bearer ${bob.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 0);
});

test('GET /api/tasks → 401 sin token', async () => {
  const res = await api.get('/api/tasks');
  assert.equal(res.status, 401);
});

// ═══════════════ NOTIFICACIÓN ASSIGNED ═══════════════

test('POST /api/tasks con asignado → crea notificación ASSIGNED', async () => {
  const creator = await register('Crea Assign', 'creaassign@test.com');
  const assignee = await register('Asig Assign', 'asigassign@test.com');
  const res = await createTask(creator.body.token, { assigneeId: assignee.body.user.id });
  assert.equal(res.status, 201);
  const notif = fakeDb._notifications.find((n) => n.type === 'ASSIGNED');
  assert.ok(notif, 'debe crear notificación ASSIGNED');
  assert.equal(notif.userId, assignee.body.user.id);
});

test('POST /api/tasks sin asignado → NO crea notificación ASSIGNED', async () => {
  const reg = await register('No Assign', 'noassign@test.com');
  const res = await createTask(reg.body.token);
  assert.equal(res.status, 201);
  assert.equal(fakeDb._notifications.length, 0);
});

test('POST /api/tasks asignándose a sí mismo → NO crea notificación ASSIGNED', async () => {
  const reg = await register('Self Assign', 'selfassign@test.com');
  const res = await createTask(reg.body.token, { assigneeId: reg.body.user.id });
  assert.equal(res.status, 201);
  assert.equal(fakeDb._notifications.length, 0);
});

// ═══════════════ NOTIFICACIONES ═══════════════

test('GET /api/notifications → 200 con lista y unreadCount', async () => {
  const creator = await register('Notif Creator', 'notifcreator@test.com');
  const assignee = await register('Notif Assignee', 'notifassignee@test.com');
  await createTask(creator.body.token, { assigneeId: assignee.body.user.id });

  const res = await api.get('/api/notifications')
    .set('Authorization', `Bearer ${assignee.body.token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.notifications));
  assert.equal(res.body.notifications.length, 1);
  assert.equal(res.body.notifications[0].type, 'ASSIGNED');
  assert.equal(res.body.notifications[0].read, false);
  assert.equal(res.body.unreadCount, 1);
});

test('GET /api/notifications → solo del propio usuario', async () => {
  const creator = await register('Notif C2', 'notifc2@test.com');
  const assignee = await register('Notif A2', 'notifa2@test.com');
  await createTask(creator.body.token, { assigneeId: assignee.body.user.id });

  // El creador no debe ver las notificaciones del asignado
  const res = await api.get('/api/notifications')
    .set('Authorization', `Bearer ${creator.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.notifications.length, 0);
  assert.equal(res.body.unreadCount, 0);
});

test('GET /api/notifications → 401 sin token', async () => {
  const res = await api.get('/api/notifications');
  assert.equal(res.status, 401);
});

test('PATCH /api/notifications/read → 200 marca todas como leídas', async () => {
  const creator = await register('Notif R C', 'notifrc@test.com');
  const assignee = await register('Notif R A', 'notifra@test.com');
  await createTask(creator.body.token, { assigneeId: assignee.body.user.id });

  const res = await api.patch('/api/notifications/read')
    .set('Authorization', `Bearer ${assignee.body.token}`);
  assert.equal(res.status, 200);

  const list = await api.get('/api/notifications')
    .set('Authorization', `Bearer ${assignee.body.token}`);
  assert.equal(list.body.notifications[0].read, true);
  assert.equal(list.body.unreadCount, 0);
});

test('DELETE /api/notifications/:id → 200 elimina la notificación', async () => {
  const creator = await register('Notif D C', 'notifdc@test.com');
  const assignee = await register('Notif D A', 'notifda@test.com');
  await createTask(creator.body.token, { assigneeId: assignee.body.user.id });

  const list = await api.get('/api/notifications')
    .set('Authorization', `Bearer ${assignee.body.token}`);
  const notifId = list.body.notifications[0].id;

  const res = await api.delete(`/api/notifications/${notifId}`)
    .set('Authorization', `Bearer ${assignee.body.token}`);
  assert.equal(res.status, 200);

  const after = await api.get('/api/notifications')
    .set('Authorization', `Bearer ${assignee.body.token}`);
  assert.equal(after.body.notifications.length, 0);
});

test('DELETE /api/notifications/:id → 404 si no existe', async () => {
  const reg = await register('Notif 404', 'notif404@test.com');
  const res = await api.delete('/api/notifications/no-existe')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 404);
});

test('DELETE /api/notifications/:id → 403 si es de otro usuario', async () => {
  const creator = await register('Notif F C', 'notiffc@test.com');
  const assignee = await register('Notif F A', 'notiffa@test.com');
  await createTask(creator.body.token, { assigneeId: assignee.body.user.id });

  const list = await api.get('/api/notifications')
    .set('Authorization', `Bearer ${assignee.body.token}`);
  const notifId = list.body.notifications[0].id;

  const res = await api.delete(`/api/notifications/${notifId}`)
    .set('Authorization', `Bearer ${creator.body.token}`);
  assert.equal(res.status, 403);
});

// ═══════════════ PERFIL (PUT /api/auth/profile) ═══════════════

test('PUT /api/auth/profile → 200 actualiza el nombre', async () => {
  const reg = await register('Perfil Viejo', 'perfilviejo@test.com');
  const res = await api.put('/api/auth/profile')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: 'Perfil Nuevo' });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Perfil Nuevo');
});

test('PUT /api/auth/profile → 200 actualiza profileImage', async () => {
  const reg = await register('Perfil Img', 'perfilimg@test.com');
  const res = await api.put('/api/auth/profile')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ profileImage: 'https://ejemplo.com/avatar.png' });
  assert.equal(res.status, 200);
  assert.equal(res.body.profileImage, 'https://ejemplo.com/avatar.png');
});

test('PUT /api/auth/profile → 200 cambia la contraseña y permite login nuevo', async () => {
  const reg = await register('Perfil Pass', 'perfilpass@test.com', 'vieja1234');
  const res = await api.put('/api/auth/profile')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ password: 'nueva1234' });
  assert.equal(res.status, 200);

  const oldLogin = await api.post('/api/auth/login').send({ email: 'perfilpass@test.com', password: 'vieja1234' });
  assert.equal(oldLogin.status, 401);

  const newLogin = await api.post('/api/auth/login').send({ email: 'perfilpass@test.com', password: 'nueva1234' });
  assert.equal(newLogin.status, 200);
  assert.ok(newLogin.body.token);
});

test('PUT /api/auth/profile → 400 sin campos', async () => {
  const reg = await register('Perfil Vacío', 'perfilvacio@test.com');
  const res = await api.put('/api/auth/profile')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({});
  assert.equal(res.status, 400);
});

test('PUT /api/auth/profile → 400 con nombre vacío', async () => {
  const reg = await register('Perfil Nmb', 'perfilnmb@test.com');
  const res = await api.put('/api/auth/profile')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: '   ' });
  assert.equal(res.status, 400);
});

test('PUT /api/auth/profile → 400 con contraseña corta', async () => {
  const reg = await register('Perfil Corta', 'perfilcorta@test.com');
  const res = await api.put('/api/auth/profile')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ password: '123' });
  assert.equal(res.status, 400);
});

test('PUT /api/auth/profile → 401 sin token', async () => {
  const res = await api.put('/api/auth/profile').send({ name: 'X' });
  assert.equal(res.status, 401);
});

// ═══════════════ UPLOAD (POST /api/upload/sign) ═══════════════

test('POST /api/upload/sign → 200 genera firma con folder y transformación por defecto', async () => {
  const reg = await register('Upload Test', 'upload@test.com');
  const res = await api.post('/api/upload/sign')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ fileName: 'mi-imagen.png' });
  assert.equal(res.status, 200);
  assert.equal(res.body.cloudName, 'test-cloud');
  assert.equal(res.body.apiKey, 'test-key');
  assert.ok(res.body.signature, 'debe devolver firma');
  assert.equal(res.body.folder, 'tasks');
  assert.equal(res.body.transformations, 'w_800,c_limit,f_auto,q_auto');
});

test('POST /api/upload/sign → 200 con prefix e imageType avatar', async () => {
  const reg = await register('Upload Avatar', 'uploadavatar@test.com');
  const res = await api.post('/api/upload/sign')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ fileName: 'avatar.png', prefix: 'profiles', imageType: 'avatar' });
  assert.equal(res.status, 200);
  assert.equal(res.body.folder, 'profiles');
  assert.equal(res.body.transformations, 'w_200,h_200,c_fill,f_auto,q_auto');
});

test('POST /api/upload/sign → 400 sin fileName', async () => {
  const reg = await register('Upload NoName', 'uploadnoname@test.com');
  const res = await api.post('/api/upload/sign')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({});
  assert.equal(res.status, 400);
});

test('POST /api/upload/sign → 401 sin token', async () => {
  const res = await api.post('/api/upload/sign').send({ fileName: 'x.png' });
  assert.equal(res.status, 401);
});

// ═══════════════ USERS (GET /api/users) ═══════════════

test('GET /api/users → 200 lista usuarios sin password ni email, ordenados por nombre', async () => {
  await register('Zoe Test', 'zoe@test.com');
  await register('Ana Test', 'ana2@test.com');
  const reg = await register('Listador', 'listador@test.com');

  const res = await api.get('/api/users')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 3);
  assert.equal(res.body[0].name, 'Ana Test');
  assert.equal(res.body[0].password, undefined);
  assert.equal(res.body[0].email, undefined);
  assert.ok(res.body.every((u) => u.id && u.name));
});

test('GET /api/users → 200 con paginación (limit/offset)', async () => {
  await register('Zoe Test', 'zoe2@test.com');
  await register('Ana Test', 'ana3@test.com');
  await register('Beto Test', 'beto@test.com');
  await register('Caro Test', 'caro@test.com');
  const reg = await register('Listador', 'listador2@test.com');

  const page1 = await api.get('/api/users?limit=2').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(page1.status, 200);
  assert.equal(page1.body.length, 2);
  assert.equal(page1.body[0].name, 'Ana Test');
  assert.equal(page1.body[1].name, 'Beto Test');

  const page2 = await api.get('/api/users?limit=2&offset=2').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(page2.status, 200);
  assert.equal(page2.body.length, 2);
  assert.equal(page2.body[0].name, 'Caro Test');

  const rest = await api.get('/api/users?limit=2&offset=4').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(rest.body.length, 1);
});

test('GET /api/users → limit mayor a 500 se recorta a 500 (y no rompe)', async () => {
  await register('Ana Cap', 'anacap@test.com');
  const reg = await register('Cap Test', 'captest@test.com');

  const res = await api.get('/api/users?limit=9999').set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
});

test('GET /api/users → 401 sin token', async () => {
  const res = await api.get('/api/users');
  assert.equal(res.status, 401);
});

// ═══════════════ QUITAR COMPARTIDO (DELETE /api/tasks/:id/share/:userId) ═══════════════

test('DELETE /api/tasks/:id/share/:userId → 200 y revoca acceso al invitado', async () => {
  const owner = await register('Share Del Owner', 'sharedelowner@test.com');
  const friend = await register('Share Del Friend', 'sharedelfriend@test.com');
  const created = await createTask(owner.body.token);

  // Compartir primero
  await api.post(`/api/tasks/${created.body.id}/share`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ userId: friend.body.user.id });

  // El amigo ve la tarea compartida
  const before = await api.get('/api/tasks').set('Authorization', `Bearer ${friend.body.token}`);
  assert.equal(before.body.length, 1);

  // Quitar el compartido
  const res = await api.delete(`/api/tasks/${created.body.id}/share/${friend.body.user.id}`)
    .set('Authorization', `Bearer ${owner.body.token}`);
  assert.equal(res.status, 200);

  // El amigo ya no la ve
  const after = await api.get('/api/tasks').set('Authorization', `Bearer ${friend.body.token}`);
  assert.equal(after.body.length, 0);
});

test('DELETE /api/tasks/:id/share/:userId → 403 si no es creador ni asignado', async () => {
  const owner = await register('Share Del O2', 'sharedelo2@test.com');
  const friend = await register('Share Del F2', 'sharedelf2@test.com');
  const intruder = await register('Share Del I2', 'sharedeli2@test.com');
  const created = await createTask(owner.body.token);
  await api.post(`/api/tasks/${created.body.id}/share`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ userId: friend.body.user.id });

  const res = await api.delete(`/api/tasks/${created.body.id}/share/${friend.body.user.id}`)
    .set('Authorization', `Bearer ${intruder.body.token}`);
  assert.equal(res.status, 403);
});

test('DELETE /api/tasks/:id/share/:userId → 404 si la tarea no existe', async () => {
  const reg = await register('Share Del 404', 'sharedel404@test.com');
  const res = await api.delete('/api/tasks/no-existe/share/u1')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 404);
});

test('DELETE /api/tasks/:id/share/:userId → 401 sin token', async () => {
  const res = await api.delete('/api/tasks/t1/share/u1');
  assert.equal(res.status, 401);
});

// ═══════════════ INVITACIONES POR URL ═══════════════

test('POST /api/tasks/:id/invite → 200 genera inviteUrl (rol assignee)', async () => {
  const reg = await register('Inv Owner', 'invowner@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ role: 'assignee' });
  assert.equal(res.status, 200);
  assert.match(res.body.inviteUrl, /\/\?invite=/);
  assert.equal(res.body.inviteRole, 'assignee');
});

test('POST /api/tasks/:id/invite → rol por defecto es share (edición)', async () => {
  const reg = await register('Inv Owner2', 'invowner2@test.com');
  const created = await createTask(reg.body.token);
  const res = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({});
  assert.equal(res.status, 200);
  assert.equal(res.body.inviteRole, 'share');
});

test('POST /api/tasks/:id/invite → 403 si no es creador ni asignado', async () => {
  const owner = await register('Inv Owner3', 'invowner3@test.com');
  const created = await createTask(owner.body.token);
  const other = await register('Inv Other', 'invother@test.com');
  const res = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${other.body.token}`)
    .send({ role: 'share' });
  assert.equal(res.status, 403);
});

test('POST /api/tasks/:id/invite → 404 si la tarea no existe', async () => {
  const reg = await register('Inv 404 Task', 'inv404task@test.com');
  const res = await api.post('/api/tasks/no-existe/invite')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ role: 'assignee' });
  assert.equal(res.status, 404);
});

test('GET /api/invites/:token → 200 con info pública', async () => {
  const reg = await register('Inv Pub', 'invpub@test.com');
  const created = await createTask(reg.body.token);
  const inv = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ role: 'assignee' });
  const token = inv.body.inviteUrl.split('invite=')[1];

  const res = await api.get(`/api/invites/${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.taskId, created.body.id);
  assert.equal(res.body.taskTitle, 'Tarea de prueba');
});

test('GET /api/invites/:token → 404 con token inválido', async () => {
  const res = await api.get('/api/invites/token-invalido');
  assert.equal(res.status, 404);
});

test('POST /api/invites/:token/accept → agrega como asignado (URL de creación)', async () => {
  const owner = await register('Inv A Owner', 'invaowner@test.com');
  const created = await createTask(owner.body.token);
  const inv = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ role: 'assignee' });
  const token = inv.body.inviteUrl.split('invite=')[1];

  const newUser = await register('Nuevo Invitado', 'nuevoinv@test.com');
  const res = await api.post(`/api/invites/${token}/accept`)
    .set('Authorization', `Bearer ${newUser.body.token}`);
  assert.equal(res.status, 200);

  // El nuevo usuario ahora es el asignado (puede ver la tarea)
  const detail = await api.get(`/api/tasks/${created.body.id}`)
    .set('Authorization', `Bearer ${newUser.body.token}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.assigneeId, newUser.body.user.id);
});

test('POST /api/invites/:token/accept → agrega como compartido (URL de edición)', async () => {
  const owner = await register('Inv S Owner', 'invsowner@test.com');
  const created = await createTask(owner.body.token);
  const inv = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ role: 'share' });
  const token = inv.body.inviteUrl.split('invite=')[1];

  const user = await register('Compartido Inv', 'compartidoinv@test.com');
  const res = await api.post(`/api/invites/${token}/accept`)
    .set('Authorization', `Bearer ${user.body.token}`);
  assert.equal(res.status, 200);

  // El usuario ve la tarea en su listado (como compartido)
  const list = await api.get('/api/tasks').set('Authorization', `Bearer ${user.body.token}`);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].id, created.body.id);
});

test('POST /api/invites/:token/accept → idempotente (ya es parte)', async () => {
  const owner = await register('Inv Id Owner', 'invidowner@test.com');
  const created = await createTask(owner.body.token);
  const inv = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ role: 'share' });
  const token = inv.body.inviteUrl.split('invite=')[1];

  const user = await register('Inv Id User', 'inviduser@test.com');
  await api.post(`/api/invites/${token}/accept`).set('Authorization', `Bearer ${user.body.token}`);
  const second = await api.post(`/api/invites/${token}/accept`).set('Authorization', `Bearer ${user.body.token}`);
  assert.equal(second.status, 200);
  assert.match(second.body.message, /Ya eres parte/);
});

test('POST /api/invites/:token/accept → notifica al creador (INVITE_ACCEPTED)', async () => {
  const owner = await register('Inv N Owner', 'invnowner@test.com');
  const created = await createTask(owner.body.token);
  const inv = await api.post(`/api/tasks/${created.body.id}/invite`)
    .set('Authorization', `Bearer ${owner.body.token}`)
    .send({ role: 'assignee' });
  const token = inv.body.inviteUrl.split('invite=')[1];

  const user = await register('Inv N User', 'invnuser@test.com');
  await api.post(`/api/invites/${token}/accept`).set('Authorization', `Bearer ${user.body.token}`);

  const notif = fakeDb._notifications.find((n) => n.type === 'INVITE_ACCEPTED');
  assert.ok(notif, 'debe crear notificación INVITE_ACCEPTED');
  assert.equal(notif.userId, owner.body.user.id);
});

test('POST /api/invites/:token/accept → 404 con token inválido', async () => {
  const reg = await register('Inv 404 Accept', 'inv404accept@test.com');
  const res = await api.post('/api/invites/token-invalido/accept')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 404);
});

test('POST /api/invites/:token/accept → 401 sin token', async () => {
  const res = await api.post('/api/invites/xxx/accept');
  assert.equal(res.status, 401);
});
