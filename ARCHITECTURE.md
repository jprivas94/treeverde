# 🏗️ Arquitectura de Treeverde

> Documento técnico de arquitectura del proyecto **Treeverde** — un tablero Kanban colaborativo para gestión de tareas.

---

## 1. Resumen ejecutivo

**Treeverde** es una aplicación web de gestión de tareas tipo **Kanban** con colaboración (compartir tareas, asignaciones y notificaciones). Está construida como un **monorepo** con dos aplicaciones independientes:

| Aplicación | Tecnología | Propósito |
|---|---|---|
| `frontend/` | React 19 + Vite + Zustand + Tailwind CSS | SPA (Single Page Application) |
| `backend/` | Node.js + Express 4 + Prisma ORM | API REST |

La comunicación entre ambas es **HTTP + JSON** con autenticación **JWT stateless**. El backend se puede desplegar en **Vercel** como funciones serverless, y el frontend como SPA estática.

```
┌─────────────────────────────┐       HTTP + JSON        ┌──────────────────────────────┐
│        FRONTEND (SPA)       │   ───────────────────►   │         BACKEND (API)        │
│  React 19 + Vite            │     Authorization:      │  Express 4                   │
│  Zustand (estado global)    │     Bearer <JWT>        │  Prisma ORM                  │
│  Tailwind CSS               │   ◄───────────────────  │  Middleware de auth (JWT)    │
│  @hello-pangea/dnd          │         JSON            │  Logging estructurado        │
└─────────────┬───────────────┘                         └──────────────┬───────────────┘
              │  Puerto 5173 (dev)                                     │ Puerto 3001 (dev)
              │  Proxy de Vite: /api → localhost:3001                  │ Prisma
              │                                                       ▼
              │                              ┌────────────────────────────────────────────┐
              │                              │  PostgreSQL (dev y prod)                  │
              │                              │  (provider fijado en schema.prisma)       │
              │                              │  Cloudinary (almacenamiento de imágenes)   │
              └────────────────────────────►└────────────────────────────────────────────┘
```

---

## 2. Stack tecnológico

### 2.1 Frontend (`frontend/`)

| Dependencia | Versión | Uso |
|---|---|---|
| `react` / `react-dom` | 19.x | UI declarativa con hooks |
| `vite` | 8.x | Bundler y servidor de desarrollo (HMR) |
| `@vitejs/plugin-react` | 6.x | Soporte JSX/ESM para Vite |
| `zustand` | 5.x | Estado global (store único) |
| `@hello-pangea/dnd` | 18.x | Drag & drop de tarjetas entre columnas |
| `@supabase/supabase-js` | 2.x | Realtime (notificaciones y tablero en vivo vía postgres_changes) |
| `tailwindcss` | 3.4.x | CSS utilitario (postcss + autoprefixer) |
| `eslint` + plugins | 9.x | Linting (react, react-hooks) |

### 2.2 Backend (`backend/`)

| Dependencia | Versión | Uso |
|---|---|---|
| `express` | 4.21 | Servidor HTTP y enrutado |
| `@prisma/client` / `prisma` | 6.x | ORM y migraciones |
| `jsonwebtoken` | 9.x | Emisión/verificación de JWT |
| `bcryptjs` | 3.x | Hash de contraseñas |
| `cloudinary` | 2.x | Firmas para subida directa de imágenes |
| `cors` | 2.8 | Control de acceso cross-origin (restringido a FRONTEND_URL) |
| `express-rate-limit` | 8.x | Rate limiting en login/register/forgot-password |
| `crypto` (nativo) | — | Generación de tokens de reset de contraseña |

> **Nota de ESM:** ambos paquetes usan `"type": "module"`, por lo que todo el código usa `import`/`export` modernos.

---

## 3. Estructura de directorios

```
treeverdev1/
├── ARCHITECTURE.md          ← este documento
├── README.md                ← guía de inicio rápido
├── backend/
│   ├── api/
│   │   └── index.js         ← entry point para Vercel (importa la app Express)
│   ├── prisma/
│   │   ├── schema.prisma    ← modelo de datos (fuente de verdad)
│   │   ├── migrations/      ← migraciones SQL versionadas
│   │   └── seed.js          ← datos de prueba
│   ├── src/
│   │   ├── index.js         ← arranque de Express (monta rutas, middleware, 404 + error handler central)
│   │   ├── db.js            ← singleton de PrismaClient (una sola instancia por proceso)
│   │   ├── middleware/
│   │   │   └── auth.js      ← autenticación JWT
│   │   ├── routes/          ← módulos de rutas por dominio
│   │   │   ├── auth.js
│   │   │   ├── tasks.js
│   │   │   ├── users.js
│   │   │   ├── notifications.js
│   │   │   └── upload.js
│   │   ├── utils/
│   │   │   ├── config.js      ← configuración sensible centralizada (JWT_SECRET, CORS origins, FRONTEND_URL)
│   │   │   ├── logger.js      ← logging estructurado
│   │   │   ├── permissions.js ← helpers de autorización por recurso
│   │   │   └── notifications.js ← helpers de creación segura de notificaciones
│   ├── tests/               ← tests con node:test
│   │   ├── api.test.js       ← tests de integración (Supertest + mock de Prisma)
│   │   ├── permissions.test.js
│   │   └── notifications.test.js
│   ├── vercel.json          ← config de despliegue serverless
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js       ← puerto 5173 + proxy /api → :3001
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx         ← bootstrap de React
        ├── App.jsx          ← máquina de estados de auth + enrutado condicional
        ├── index.css
        ├── hooks/
        │   └── useAuth.js   ← hook de login/logout
        ├── services/
        │   ├── api.js       ← cliente HTTP con reintentos y timeout (authApi, tasksApi, usersApi…)
        │   ├── realtime.js  ← Realtime de Supabase (suscribe Notification y Task por usuario)
        │   ├── sessionSync.js ← sincronización de sesión entre pestañas (BroadcastChannel)
        │   └── logger.js    ← logging en consola del frontend
        ├── constants/
        │   ├── kanbanConfig.js ← config central del tablero (estados, colores, prioridades)
        │   └── kanbanConfig.test.js ← tests de la config (node:test)
        ├── store/
        │   ├── kanbanStore.js ← store global de Zustand
        │   └── kanbanStore.test.js ← tests del store (node:test)
        └── components/      ← UI: Board, Column, TaskCard, TaskFormFields, TaskDetailsView, modales…
```

---

## 4. Frontend (SPA)

### 4.1 Estado global con Zustand

El estado vive en un **único store** (`store/kanbanStore.js`) con los siguientes dominios:

- **Auth:** `user`, `token` (persistido en `localStorage`), `setUser`, `logout`.
- **Tareas:** `tasks`, `archivedTasks`, `setTasks`, `addTask`, `updateTaskStatus`, `removeTask`, `archiveTask`, `restoreTask` (rollback al restaurar una tarea archivada).
- **Usuarios:** `users` (directorio para asignar/compartir), `updateUser` (propaga nombre/foto a todas las tareas donde el usuario es creador/asignado).
- **Notificaciones:** `notifications`, `unreadCount`, `markAllRead`.
- **UI:** `loading`, `error`, `showWelcome`.

**Detalle clave:** las tareas `ARCHIVED` no viven en el tablero; `setTasks` las separa en `archivedTasks` para el historial. `getColumns()` agrupa las tareas por `status` (TODO → IN_PROGRESS → DONE → ARCHIVED) y las ordena por `updatedAt` descendente.

**Config centralizada (`constants/kanbanConfig.js`):** estados, etiquetas, colores de columnas, botones de transición y prioridades viven en un único módulo compartido por `kanbanStore`, `Column`, `TaskCard`, `Board` y los modales. Antes esta config estaba duplicada en 4+ archivos (D3 de la revisión).

### 4.2 Cliente HTTP (`services/api.js`)

Wrapper propio sobre `fetch` (sin librerías externas de HTTP) con:

- **Base URL:** `import.meta.env.VITE_API_URL || '/api'` — en desarrollo usa el proxy de Vite; en producción apunta al dominio de la API.
- **Inyección de token:** añade `Authorization: Bearer <token>` desde `localStorage` automáticamente.
- **Timeout de 30s** mediante `AbortController`.
- **Reintentos (máx. 2):** ante errores de red `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`, con backoff progresivo (1.2s → 2.4s).
- **Módulos por dominio:** `authApi`, `tasksApi` (CRUD completo, share, subtasks), `usersApi`, `notificationsApi`, `profileApi`, `passwordApi`. Todos los componentes usan este cliente (ya no hay `fetch` directo en los modales — bug B2).

### 4.3 Flujo de autenticación (`App.jsx`)

**Sin router de URLs** — el enrutado es condicional por estado local:

```
token en localStorage
        │
        ├─ NO ──► authView = 'login' | 'register' | 'forgot-password'
        │               │
        │               └── ¿resetToken en la URL? ──► ResetPasswordForm
        │
        └─ SÍ ──► ¿user cargado?
                     ├─ NO ──► GET /auth/me (restaurar sesión) ──► error → logout
                     └─ SÍ ──► Board + WelcomeModal (si aplica)
```

- Al detectar `?resetToken=` en la URL, se extrae el token, se limpia la URL con `history.replaceState` (sin recargar) y se muestra el formulario de reset.
- **Sincronización de sesión entre pestañas:** `App.jsx` inicializa `initSessionSync({ onLogout, onLogin, onProfileUpdate, onNotificationsRead })` (canal `treeverde-session-sync`). **Logout:** cuando una pestaña llama a `logout()` (que emite `broadcastLogout()`), las demás reciben el evento y ejecutan `logout({ broadcast: false })` — el flag evita un bucle infinito de avisos. **Login:** `useAuth` emite `broadcastLogin(token)` tras login/register; las demás pestañas aplican el token con `setToken()` y el efecto de restauración (`token && !user`) carga la sesión completa (`/me` + tareas) por sí solo. **Perfil:** `EditProfileModal` emite `broadcastProfileUpdate({ name, profileImage })` al guardar; las demás pestañas aplican `updateUser(updates)` (propaga también a tareas asignadas/creadas). **Notificaciones leídas:** al abrir el panel, `NotificationPanel` emite `broadcastNotificationsRead()` tras marcar en el backend; las demás pestañas aplican `markAllRead()` localmente. **Transporte (BroadcastChannel):** el canal nativo `BroadcastChannel` entrega cada mensaje solo a las OTRAS pestañas del mismo origen (nunca a la que lo publica) → inmune a bucles; sin soporte (SSR/Node) degrada a noop. **Verificación e2e real (Playwright):** `frontend/e2e/session-sync.spec.js` abre dos pestañas reales contra los servidores locales y verifica login/logout, perfil y notificaciones leídas con el transporte BroadcastChannel (`npm run test:e2e`).
- Los errores globales (window errors y promesas no manejadas) se registran con el logger del frontend.

### 4.4 Interacción Kanban

`Board.jsx` usa `@hello-pangea/dnd` (fork mantenido de `react-beautiful-dnd`) con **drag & drop optimista**: al soltar una tarjeta en otra columna, el estado se actualiza al instante y se sincroniza con `PATCH /tasks/:id/status`; ante error se hace rollback. El flujo de finalización archiva la tarea vía `archiveTask`/`restoreTask` del store (rollback encapsulado, ya no en el componente — bug B3).

### 4.5 Formularios compartidos

- `TaskFormFields.jsx` — formulario de tarea reutilizable (título, descripción, subtareas, asignación, prioridad, fecha, etiquetas, imágenes). **Componente controlado**: recibe `values` + `onChange(patch)` sin estado interno, usado por `CreateTaskModal` y `EditTaskModal` (elimina ~60% de duplicación, D2).
- `TaskDetailsView.jsx` — vista de solo lectura (`readOnly` y `sharedView` para usuarios compartidos) extraída del antiguo `EditTaskModal`, que pasó de ~985 a ~250 líneas (D1).

---

## 5. Backend (API REST)

### 5.1 Bootstrap (`src/index.js`)

1. Crea la app Express y aplica `cors()` + `express.json()`.
2. Middleware de **logging de peticiones**: mide duración con `Date.now()` y registra método, ruta, status y userId al finalizar (`res.on('finish')`).
3. Monta los routers bajo `/api/*`.
4. Expone `GET /api/health` (healthcheck).
5. **404 + error handler central:** las rutas desconocidas bajo `/api` responden `404 { error }` JSON y un middleware de error de 4 args registra excepciones no controladas y responde `500` (antes cada handler repetía try/catch → D8).
6. **Dual mode:** `export default app` para Vercel; `app.listen()` solo si `process.env.VERCEL` no está definido (desarrollo local).

> **Singleton de Prisma:** `src/db.js` exporta una única instancia de `PrismaClient` importada por todas las rutas (evita 4 instancias separadas — D4, relevante en serverless para no agotar conexiones).

### 5.2 Tabla de rutas

| Ruta | Método | Protegida | Responsabilidad |
|---|---|---|---|
| `/api/auth/register` | POST | — | Registro (hash bcrypt cost 12, JWT 7d) |
| `/api/auth/login` | POST | — | Login (verifica hash, emite JWT 7d) |
| `/api/auth/me` | GET | `authenticate` | Devuelve el usuario del token |
| `/api/auth/profile` | PUT | `authenticate` | Actualiza nombre/contraseña/foto |
| `/api/auth/forgot-password` | POST | — | Genera token de reset (1h), devuelve enlace solo en dev |
| `/api/auth/reset-password` | POST | — | Valida token, hashea nueva contraseña |
| `/api/tasks` | GET/POST | `authenticate` | Listar (creador/asignado/compartido) y crear tarea |
| `/api/tasks/:id/status` | PATCH | `authenticate` | Cambio de estado (D&D) + notificaciones |
| `/api/tasks/:id` | GET | `authenticate` | Detalle de una tarea (verifica `canViewTask`, incluye shares) — ruta añadida en la refactorización |
| `/api/tasks/:id` | PUT/DELETE | `authenticate` | Actualización completa / borrado (solo creador) |
| `/api/tasks/:id/share` | POST | `authenticate` | Compartir tarea (upsert + notificación) |
| `/api/tasks/:id/share/:userId` | DELETE | `authenticate` | Revocar compartición |
| `/api/tasks/:id/invite` | POST | `authenticate` | Generar enlace de invitación (`role` assignee/share; regenerable) |
| `/api/invites/:token` | GET | — | Info pública de la invitación (banner registro/login) |
| `/api/invites/:token/accept` | POST | `authenticate` | Aceptar invitación: asigna o comparte la tarea + notifica al creador |
| `/api/tasks/:id/subtasks` | PATCH | `authenticate` | Actualizar subtareas + notificar completadas |
| `/api/users` | GET | `authenticate` | Directorio de usuarios |
| `/api/upload/sign` | POST | `authenticate` | Firma Cloudinary para subida directa |
| `/api/notifications` | GET | `authenticate` | Notificaciones del usuario (últimas 50) + unreadCount |
| `/api/notifications/read` | PATCH | `authenticate` | Marcar todas como leídas |
| `/api/notifications/:id` | DELETE | `authenticate` | Eliminar notificación (solo dueño) |
| `/api/health` | GET | — | Healthcheck de la API (status + timestamp) |

### 5.3 Modelo de permisos (tareas)

La lógica de autorización es **por recurso** (no por rol) y está centralizada en `src/utils/permissions.js` (`canViewTask`, `canEditTask`, `canEditSubtasks`, `canDeleteTask`) — antes reimplementada inline en cada endpoint (D6):

| Acción | Quién puede |
|---|---|
| Ver tarea | Creador, asignado o usuario compartido (`TaskShare`) |
| Cambiar estado / editar | Creador o asignado |
| Editar subtareas | Creador, asignado o compartido |
| Compartir | Creador o asignado |
| Eliminar | Solo el creador |

> **Matiz de edición (2026-08):** el asignado que no es el creador puede editar título/descripción/etiquetas/imágenes/subtareas y cambiar el estado, pero **no** puede reasignar la tarea, cambiar la fecha límite ni la prioridad, ni generar enlaces de invitación con rol `assignee`. Esos cambios quedan reservados al creador: el `PUT /api/tasks/:id` ignora `assigneeId`/`dueDate`/`priority` para el asignado (validado en `backend/tests/api.test.js`) y `POST /api/tasks/:id/invite` responde 403 si un asignado pide rol `assignee`.

### 5.4 Notificaciones (efectos colaterales)

El backend genera notificaciones de forma **transaccional** dentro de los handlers (no hay sistema de eventos/colas):

- `ASSIGNED` — al crear o reasignar una tarea.
- `COMPLETED` — al pasar una tarea a `DONE`/`ARCHIVED`.
- `SHARED` — al compartir una tarea.
- `SUBTASK_COMPLETED` — al marcar una subtarea completada (con detección de transición `no-completada → completada`).

Las notificaciones se crean a través de `src/utils/notifications.js` (`notifyAssigned`, `notifyCompleted`, `notifyShared`, `notifySubtaskCompleted`), que envuelven cada creación en un `safeCreate` con try/catch para **no romper la operación principal si fallan** (D7).

### 5.5 Realtime (Supabase)

El frontend recibe **notificaciones y cambios de tareas en vivo** sin depender de conexiones persistentes en el backend serverless:

1. La migración `20260801000001_add_supabase_realtime` añade las tablas `"Notification"` y `"Task"` a la publicación `supabase_realtime` (idempotente) y fija `REPLICA IDENTITY FULL` en `Task` para que los eventos `DELETE` incluyan la fila completa y sean filtrables.
2. `frontend/src/services/realtime.js` (`connectRealtime(userId)`) suscribe con `postgres_changes` a:
   - `Notification` — INSERT filtrado por `userId=eq.<id>` → `addNotification` (prepend + `unreadCount`).
   - `Task` — INSERT/UPDATE/DELETE filtrado por `creatorId` **o** `assigneeId` → `upsertTask`/`removeTask` (el detalle se re-fetchea si la tarea no estaba cargada, para conservar relaciones).
3. `App.jsx` conecta el canal al iniciar sesión y lo desconecta al cerrar (`removeChannel`).
4. **Degradación elegante:** si faltan `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` o el `supabaseToken` (backend sin `SUPABASE_JWT_SECRET`), `connectRealtime` devuelve un noop y la app conserva el polling de 30s del `NotificationPanel`.

### 5.6 RLS (Row Level Security) para Realtime

Para evitar que un cliente con la anon key lea canales de otros usuarios, el acceso realtime está **endurecido con RLS**:

1. El backend acuña un **JWT compatible con Supabase** (`src/utils/supabaseToken.js`): HS256 firmado con `SUPABASE_JWT_SECRET` (del dashboard), con `sub: userId`, `role: 'authenticated'`, `aud: 'authenticated'`, `iss: 'supabase'`. Se devuelve en `login`/`register`/`me` como `supabaseToken`.
2. El frontend autentica la conexión con `supabase.realtime.setAuth(supabaseToken)` (en `services/realtime.js`), por lo que `auth.uid()` = userId real.
3. La migración `20260801000002_add_realtime_rls` habilita RLS y crea políticas `FOR SELECT` por `auth.uid()`:
   - `Notification` → `"userId" = auth.uid()` (cada usuario ve solo las suyas).
   - `Task` → creador, asignado o con una `TaskShare` activa.
   - `TaskShare` → `"userId" = auth.uid()`.
4. El guard del DO block verifica que exista el schema `auth` (proyecto Supabase); en un Postgres local sin Supabase las políticas se omiten y realtime local sigue sin RLS.
5. El rol postgres/superuser de Prisma (DATABASE_URL) hace BYPASS de RLS → el backend no se ve afectado.

> **Cobertura:** los filtros de `postgres_changes` se aplican server-side **y además** RLS filtra por `auth.uid()`, de modo que un cliente no puede leer filas de otros usuarios aunque conozca su id.

---

## 6. Modelo de datos (Prisma)

**Fuente de verdad:** `backend/prisma/schema.prisma` — PostgreSQL en producción.

### ERD simplificado

```
┌───────────────┐     ┌────────────────┐     ┌──────────────────┐
│     User      │     │      Task      │     │  Notification    │
├───────────────┤     ├────────────────┤     ├──────────────────┤
│ id (cuid) PK  │     │ id (cuid) PK   │     │ id (cuid) PK     │
│ name          │     │ title          │     │ userId FK ──────► User
│ email UNIQUE  │     │ description    │     │ taskId FK ──────► Task (nullable)
│ password      │     │ status         │     │ type             │
│ profileImage? │     │ priority       │     │ message          │
│ resetToken?   │     │ dueDate?       │     │ read (bool)      │
│ resetTokenExp?│     │ completedAt?   │     │ createdAt        │
│ createdAt     │     │ archivedAt?    │     └──────────────────┘
│ updatedAt     │     │ images (Json)  │     @@index([userId, read])
└───────────────┘     │ tags (String)  │
                      │ subtasks (Json)│     ┌──────────────────┐
                      │ assigneeId FK ─┼───► │     TaskShare    │
                      │ creatorId FK ──┼───► │ taskId+userId PK │
                      └────────────────┘     └──────────────────┘
```

### Detalles relevantes

| Campo | Tipo | Notas |
|---|---|---|
| `Task.status` | String | `TODO` / `IN_PROGRESS` / `DONE` / `ARCHIVED` (validado en la API) |
| `Task.images` | Json | Array de URLs de Cloudinary (`[]` por defecto) |
| `Task.subtasks` | Json | Array de `{id, title, completed, toggledBy}` |
| `Task.tags` | String | Tags separados (formato simple) |
| `User.password` | String | Hash bcrypt (cost 12), nunca se serializa |
| `User.resetToken` | String? UNIQUE | Token de restablecimiento de contraseña (1h de validez) |
| `TaskShare` | — | `@@unique([taskId, userId])` → comparticiones sin duplicados |
| Relaciones | — | `onDelete: Cascade` en shares/notifications; `SetNull` en assignee/creator |

> **Trade-off de diseño:** los campos flexibles (`images`, `subtasks`) se guardan como **JSON** en lugar de tablas normalizadas. Esto simplifica el modelo para el alcance actual, a costa de perder consultas relacionales sobre ese contenido.

---

## 7. Autenticación y seguridad

### Flujo JWT

1. El cliente envía credenciales a `/auth/login` (o `/auth/register`).
2. El backend verifica el hash bcrypt y firma un JWT: `jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })`.
3. El token se guarda en `localStorage` del navegador y se envía en cada petición como `Authorization: Bearer <token>`.
4. El middleware `authenticate` verifica la firma y deja `req.userId` para los handlers.

### Medidas aplicadas

- **Hash de contraseñas** con bcrypt (cost 12).
- **JWT_SECRET obligatorio en producción:** `src/utils/config.js` (`getJwtSecret`) lanza un error al arrancar si falta `JWT_SECRET` con `NODE_ENV=production` — sin fallback que permita forjar tokens.
- **Rate limiting** (`express-rate-limit`): `login`, `register` y `forgot-password` limitados a **20 peticiones / 15 min por IP** (presupuesto combinado entre las 3 rutas, una sola instancia compartida). **Solo activo en `NODE_ENV=production`**: en `test` se desactiva para la suite hermética y en `development` para que la suite e2e de Playwright (~11 logins por run) sea repetible dentro de la ventana de 15 min sin 429. Requiere `app.set('trust proxy', 1)` para leer la IP real detrás del proxy de Vercel.
- **CORS restringido:** `src/utils/config.js` (`getAllowedOrigins`) permite solo los orígenes de `FRONTEND_URL` (separados por coma) y agrega localhost en desarrollo.
- **Login anti-enumeración:** email inexistente y contraseña incorrecta devuelven el mismo mensaje (`Email o contraseña incorrectos`) y la comparación usa un hash bcrypt dummy para igualar el tiempo de respuesta (anti timing attack).
- **Respuesta uniforme en forgot-password:** siempre devuelve éxito aunque el email no exista (evita enumeración de usuarios). El enlace de reset solo se devuelve en desarrollo.
- **Tokens de reset de un solo uso:** se invalidan (`null`) tras usarse y expiran a la 1h.
- **Permisos por recurso** en cada endpoint de tareas (403 si no hay relación creador/asignado/compartido).
- **Secrets en variables de entorno** (nunca en el código): `DATABASE_URL`, `JWT_SECRET`, credenciales de Cloudinary, `FRONTEND_URL`.

### Consideraciones pendientes (roadmap de seguridad)

- JWT en `localStorage` es vulnerable a XSS (alternativa: httpOnly cookies + CSRF).
- No hay refresco de sesión (token único de 7 días).
- El reset de contraseña no envía email en producción (el enlace solo se devuelve en desarrollo).

---

## 8. Subida de imágenes (Cloudinary)

Patrón de **subida directa firmada** (el navegador no pasa el archivo por el backend):

1. El frontend pide a `POST /api/upload/sign` una firma para `{fileName, prefix, imageType}`.
2. El backend calcula la firma HMAC con `api_sign_request` (timestamp + folder + transformación) usando el `api_secret`.
3. El frontend sube el archivo directamente a Cloudinary con esa firma.
4. Se guarda la URL resultante en `profileImage` o `Task.images`.

Transformaciones por tipo:
- **Avatar:** `w_200,h_200,c_fill,f_auto,q_auto` (recorte cuadrado).
- **Tareas:** `w_800,c_limit,f_auto,q_auto` (redimensiona, no recorta).

> Si Cloudinary no está configurado, el endpoint responde `501` y la subida se deshabilita con un warning en el arranque.

---

## 9. Despliegue (Vercel)

### Backend — Serverless

`vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.js" }]
}
```

`api/index.js` importa la app Express como **default export** (patrón de Vercel Node). El build corre `prisma migrate deploy && prisma generate` (`vercel-build`), de modo que las migraciones pendientes (p. ej. la de índices `20260801000000_add_task_indexes`) se aplican en cada despliegue de producción; al no existir `process.env.VERCEL` en local, la app también arranca con `app.listen()` en dev.

### Frontend — SPA estática

Build de Vite + `vite preview`. En producción debe definirse `VITE_API_URL` apuntando al dominio del backend (en dev se usa el proxy de Vite, que reenvía `/api` → `http://localhost:3001` con `agent: false` para evitar conexiones stale `ECONNRESET`).

### Variables de entorno

| Variable | Dónde | Propósito |
|---|---|---|
| `DATABASE_URL` | backend | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | backend | Firma de tokens (¡obligatoria en prod!) |
| `CLOUDINARY_CLOUD_NAME` | backend | Subida de imágenes |
| `CLOUDINARY_API_KEY` | backend | Subida de imágenes |
| `CLOUDINARY_API_SECRET` | backend | Firma de subida firmada |
| `FRONTEND_URL` | backend | Base URL del enlace de reset (default `http://localhost:5173`) |
| `SUPABASE_JWT_SECRET` | backend | JWT Secret del proyecto Supabase (acuña el token de Realtime/RLS) |
| `VITE_SUPABASE_URL` | frontend | URL del proyecto Supabase (Realtime) |
| `VITE_SUPABASE_ANON_KEY` | frontend | Anon key de Supabase (Realtime) |
| `VITE_API_URL` | frontend | Base URL de la API (default `/api`) |
| `PORT` | backend | Puerto dev (default 3001) |

---

## 10. Flujo de desarrollo

### Scripts

| Comando | Proyecto | Descripción |
|---|---|---|
| `npm run dev` | backend | `node --watch src/index.js` (auto-reload, puerto 3001) |
| `npm run dev` | frontend | Vite con HMR (puerto 5173 + proxy `/api`) |
| `npm run db:migrate` | backend | `prisma migrate dev` |
| `npm run db:seed` | backend | Datos de prueba |
| `npm run db:generate` | backend | Regenerar Prisma Client |
| `npm run lint` | ambos | ESLint |
| `npm test` | backend | `node --experimental-test-module-mocks --test` — 122 tests: integración con Supertest (auth, tareas, subtasks, status, password reset, share, notificaciones, perfil, upload, users, búsqueda de usuarios, CORS, mensaje unificado de login, restricciones del asignado, validación de payloads) + unitarios (permisos, notificaciones, config, supabaseToken, paginación, validación) |
| `npm test` | frontend | Tests `node:test` — 78 tests: config del tablero, store, imágenes, helpers de fecha y tareas, sesión (`sessionSync.test.js`: login/logout/perfil/leídas entre pestañas por BroadcastChannel, idempotencia y limpieza) y e2e de dos pestañas simulado (`sessionSync.e2e.test.js`: login/logout/perfil/leídas propagados por BroadcastChannel) |
| `npm run test:components` | frontend | 85 tests de componentes con `node:test` + tsx + jsdom + Testing Library (Avatar, SearchableUserSelect, TaskFormFields, DatePickerModal, CompletedTasksPanel, NotificationPanel, CreateTaskModal, EditTaskModal, Board, LoginForm, RegisterForm) — usa `--experimental-test-module-mocks` (igual que el backend) para mockear `@hello-pangea/dnd` en `Board.test.jsx` y capturar el `onDragEnd`, y `useAuth` en los tests de formularios; el setup de DOM (`src/test/setupDom.js`) debe importarse antes que react-dom para que React active el soporte nativo del evento `input` |
| `npm run test:e2e` | frontend | Tests e2e reales con Playwright (`e2e/session-sync.spec.js`, 3 tests: dos pestañas reales — login/logout, perfil y notificaciones leídas propagados por BroadcastChannel). Requiere backend en :3001 con la BD sembrada y frontend en :5173 (el `webServer` de la config los levanta solo si no están). Cada run hace ~6 logins; el rate limiter de login solo está activo en producción, así que en dev la suite es repetible sin 429 |
| `npm run build` | frontend | Build de producción Vite |

> Nota: el backend ejecuta `prisma generate` automáticamente tras `npm install` (script `postinstall`).

### Pipeline de una petición (ejemplo: cambiar estado de tarea)

```
Drag & drop en Board.jsx
        │
        ▼
updateTaskStatus (Zustand) ──► render optimista inmediato
        │
        ▼
tasksApi.updateStatus(id, status) ──► PATCH /api/tasks/:id/status
        │                                    │
        │                              authenticate (JWT → req.userId)
        │                                    │
        │                              validar status ∈ {TODO, IN_PROGRESS, DONE, ARCHIVED}
        │                                    │
        │                              verificar permiso (creador o asignado)
        │                                    │
        │                              actualizar completedAt si aplica
        │                                    │
        │                              crear Notification (COMPLETED) si aplica
        │                                    │
        ▼                                    ▼
  rollback si error ◄────────────── JSON actualizado (task + relations)
```

---

## 11. Decisiones de arquitectura (ADR resumido)

| # | Decisión | Alternativa descartada | Justificación |
|---|---|---|---|
| 1 | SPA + API REST monolítica | Next.js SSR / microservicios | Simplicidad y velocidad para el alcance actual; separación clara de responsabilidades |
| 2 | Estado global con Zustand | Redux / Context | Menos boilerplate, store simple, sin providers anidados |
| 3 | Sin router de URLs en auth | react-router | Solo hay ~4 vistas de auth; estado local basta y evita dependencias |
| 4 | Cliente HTTP propio sobre `fetch` | axios | Control total de reintentos/timeout sin dependencia extra |
| 5 | Campos flexibles como JSON en Prisma | Tablas normalizadas | Alcance actual; reduce complejidad de migraciones |
| 6 | Upload directo firmado a Cloudinary | Proxy del archivo por el backend | Ahorra ancho de banda y cómputo en el servidor |
| 7 | ESM (`"type": "module"`) | CommonJS | Sintaxis moderna y alineada con el tooling actual |
| 8 | Drag & drop con `@hello-pangea/dnd` | dnd-kit | Fork mantenido de react-beautiful-dnd, API estable |
| 9 | Config del tablero centralizada en `kanbanConfig.js` | Config duplicada en 4+ archivos | Una única fuente de verdad para estados/colores/prioridades |
| 10 | Tests con `node:test` (sin runner externo) | Jest / Vitest | Cero dependencias nuevas; suficiente para helpers, store y tests de integración |
| 11 | Tests de integración con Supertest + `mock.module` | BD real en los tests / fixtures SQL | Herméticos y rápidos: mockean el singleton de Prisma en memoria, ejercitan la app Express real (rutas, auth, permisos, notificaciones) sin BD ni red |

---

## 12. Límites y roadmap

**Límites actuales:**
- Autenticación solo por email/contraseña (sin OAuth).
- El logging no persiste (solo stdout).
- El reset de contraseña no envía email en producción.

**Hecho (2026-07/08):**
- Paginación en `GET /tasks` (`limit`/`offset`, máx 500) y en `GET /users`, con botón "Cargar más" en el tablero.
- Índices de Prisma para `Task.creatorId`, `Task.assigneeId` y `TaskShare.userId` (migración `20260801000000_add_task_indexes`).
- Seguridad: JWT_SECRET fail-hard en producción, CORS restringido, rate limiting en auth, login con mensaje unificado y anti timing attack.
- Realtime con Supabase: notificaciones y tablero en vivo (migraciones `20260801000001_add_supabase_realtime` + `20260801000002_add_realtime_rls` + `services/realtime.js` + `utils/supabaseToken.js`), con **RLS por `userId`** para endurecer el acceso a los canales.

**Posibles evoluciones:**
- OAuth (Google/GitHub) y refresh tokens.
- Migrar a `react-router` cuando crezcan las vistas.
- Rate limiting + refresh tokens.
- Más tests: el backend ya cuenta con un test de integración real de Cloudinary (`tests/cloudinary.integration.test.js`, opt-in: se salta sin `CLOUDINARY_*` en el entorno y sube+elimina un PNG 1×1) y 85 tests de componentes con Testing Library (incl. `Board.test.jsx` con 12 tests: columna Terminado visible, flujo de archivado, drag & drop vía `onDragEnd` capturado con `mock.module` de `@hello-pangea/dnd`, el botón Historial con su estado vacío y la eliminación desde la tarjeta con `ConfirmDeleteModal` solo para el creador; `LoginForm.test.jsx` y `RegisterForm.test.jsx` con `useAuth` mockeado vía `mock.module`/`exports`; `EditTaskModal.test.jsx` cubre el flujo de eliminación con el modal de confirmación; helpers compartidos en `src/test/boardTestUtils.js`).

**Hecho en la refactorización R1–R6 (2026-07):** suite de tests (`node:test`), singleton de Prisma, helpers de permisos/notificaciones, error handler central, config centralizada del tablero, formulario compartido, cliente API unificado y 3 bugs corregidos (B1–B3). *(Los conteos de tests evolucionan con cada cambio — ver sección 10 para el estado actual: 122 backend (+1 Cloudinary opt-in) / 78 frontend + 53 de componentes.)*

> **Tests de integración (`backend/tests/api.test.js`):** usan Supertest contra la app Express real con el módulo `db.js` (singleton de Prisma) interceptado por `mock.module` (requiere el flag `--experimental-test-module-mocks`). Cubren auth (register/login/me/forgot/reset-password), tareas (CRUD, GET /:id, listado con aislamiento), subtasks (con notificación SUBTASK_COMPLETED), status (con completedAt), share y quitar compartido (con notificación SHARED), ASSIGNED al crear tarea, notificaciones (GET, marcar leídas, eliminar), perfil (PUT /auth/profile), upload (POST /upload/sign con Cloudinary de prueba) y usuarios (GET /api/users). Son herméticos: no requieren BD ni red.

---

*Documento generado para facilitar la incorporación de nuevos desarrolladores al proyecto. Mantener actualizado ante cambios de arquitectura.*
