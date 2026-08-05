# Treeverde — Backend API

API RESTful para la aplicación **Treeverde**. Construida con **Express.js**, **Prisma ORM** y **JWT** para autenticación.

---

## 🧱 Stack

| Tecnología | Propósito |
|------------|-----------|
| **Node.js / Express** | Servidor HTTP y rutas |
| **Prisma ORM** | Modelado y acceso a base de datos |
| **PostgreSQL** | Base de datos (provider fijado en schema.prisma) |
| **JWT (jsonwebtoken)** | Autenticación stateless |
| **bcryptjs** | Hash de contraseñas |
| **express-rate-limit** | Rate limiting en login/register/forgot-password |
| **Resend** | Envío de correos de recuperación de contraseña (HTML con marca) |

---

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL (PostgreSQL)

# 3. Ejecutar migraciones
npx prisma migrate dev

# 4. (Opcional) Poblar con datos de prueba
npx prisma db seed

# 5. Iniciar servidor
npm run dev
```

Servidor disponible en `http://localhost:3001`.

---

## 📡 Endpoints

### Autenticación (`/api/auth`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario (rate limited) |
| POST | `/api/auth/login` | Iniciar sesión (rate limited) — devuelve `supabaseToken` |
| GET  | `/api/auth/me` | Obtener datos del usuario autenticado — devuelve `supabaseToken` |
| PUT  | `/api/auth/profile` | Actualizar nombre/contraseña/foto |
| POST | `/api/auth/forgot-password` | Solicitar reset: **envía el correo** con el enlace (Resend; rate limited) |
| POST | `/api/auth/reset-password` | Restablecer contraseña con token |

### Tareas (`/api/tasks`) — requiere autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/tasks` | Listar tareas (creador/asignado/compartido). Paginado: `?limit=100&offset=0` (máx 500 por página; sin limit = todas) |
| GET    | `/api/tasks/:id` | Detalle de una tarea (incluye creator, assignee y shares) |
| POST   | `/api/tasks` | Crear una tarea |
| PUT    | `/api/tasks/:id` | Actualizar tarea completa |
| PATCH  | `/api/tasks/:id/status` | Cambiar estado (usado por Drag & Drop) + notificaciones de completado |
| PATCH  | `/api/tasks/:id/subtasks` | Actualizar subtareas (toggle/agregar/eliminar) + notificar las recién completadas |
| POST   | `/api/tasks/:id/share` | Compartir tarea con otro usuario (upsert + notificación `SHARED`) |
| DELETE | `/api/tasks/:id/share/:userId` | Revocar compartición |
| DELETE | `/api/tasks/:id` | Eliminar tarea (solo el creador) |

### Usuarios (`/api/users`) — requiere autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/users` | Directorio de usuarios (id, nombre, foto; sin email). Paginado: `?limit=50&offset=0` (máx 500 por página; sin limit = todos) |

### Notificaciones (`/api/notifications`) — requiere autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/notifications` | Notificaciones del usuario (últimas 50) + `unreadCount` |
| PATCH  | `/api/notifications/read` | Marcar todas como leídas |
| DELETE | `/api/notifications/:id` | Eliminar una notificación (solo el dueño) |

### Upload (`/api/upload`) — requiere autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST   | `/api/upload/sign` | Firma Cloudinary para subida directa de imágenes |

### Health Check

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/health` | Verificar que el servidor está activo |

---

## 🔐 Seguridad

- **JWT_SECRET obligatorio en producción**: si falta con `NODE_ENV=production`, el servidor lanza un error al arrancar (sin fallback que permita forjar tokens).
- **Rate limiting**: `login`, `register` y `forgot-password` aceptan máx. **20 peticiones / 15 min por IP** (presupuesto combinado entre las 3 rutas). **Solo activo en `NODE_ENV=production`**: en test se desactiva para la suite hermética y en desarrollo para que la suite e2e de Playwright (~11 logins por run) sea repetible sin 429.
- **Mensaje de login unificado**: email inexistente y contraseña incorrecta devuelven el mismo error (`Email o contraseña incorrectos`) y el hash bcrypt dummy iguala el tiempo de respuesta → anti-enumeración de emails y anti timing attack.
- **CORS restringido**: solo se permite el/los origen(es) de `FRONTEND_URL` (separados por coma). En desarrollo se agregan los localhost automáticamente.
- **Realtime endurecido con RLS**: `login`/`register`/`me` devuelven un `supabaseToken` (JWT compatible con Supabase, HS256 con `SUPABASE_JWT_SECRET`) que el frontend usa para autenticar su conexión Realtime. Las políticas RLS (migración `20260801000002_add_realtime_rls`) filtran por `auth.uid()`, así cada usuario solo recibe sus notificaciones/tareas.
- **Recuperación de contraseña por correo (Resend)**: `forgot-password` envía un correo con diseño de marca (encabezado degradado, logo de árbol, botón "Restablecer contraseña") que enlaza a `${FRONTEND_URL}/?resetToken=…` — la misma ruta del frontend con el diseño del login. El correo expira en 1 hora y el token es de un solo uso. **Fallback**: si no hay `RESEND_API_KEY`, el enlace se loguea y solo en desarrollo se devuelve en la respuesta de la API (en producción nunca se devuelve).
- Configuración sensible centralizada en `src/utils/config.js` (`getJwtSecret`, `getAllowedOrigins`, `getFrontendUrl`), `src/utils/supabaseToken.js` (`createSupabaseToken`) y `src/utils/email.js` (plantillas + envío Resend).

---

## 🗄️ Modelo de datos

```
User
├── id          String (cuid)
├── name        String
├── email       String (único)
├── password    String (hasheado)
├── tasks       Task[]      (tareas asignadas)
└── createdTasks Task[]     (tareas creadas por él)

Task
├── id          String (cuid)
├── title       String
├── description String
├── status      TODO | IN_PROGRESS | DONE | ARCHIVED
├── priority    LOW | MEDIUM | HIGH | CRITICAL
├── dueDate     DateTime?   (fecha límite)
├── completedAt DateTime?   (fecha de finalización)
├── tags        String      (separadas por coma)
├── assignee    User?       (usuario asignado)
└── creator     User?       (usuario que creó la tarea)
```

---

## 🔐 Autenticación

Todas las rutas de tareas y usuarios requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

El token se obtiene al iniciar sesión (`POST /api/auth/login`).

---

## ✉️ Correo de recuperación (Resend)

El endpoint `POST /api/auth/forgot-password` envía el correo de recuperación con **Resend**. Configuración:

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend (https://resend.com/api-keys). Plan gratis: 100 emails/día |
| `EMAIL_FROM` | Remitente (defecto: `Treeverde <onboarding@resend.dev>`) |

> ⚠️ En el plan gratis de Resend solo puedes enviar **a tu propio email verificado** hasta configurar un dominio.
>
> Si no hay `RESEND_API_KEY`: el enlace se loguea y **solo en desarrollo** se devuelve en la respuesta de la API (para pruebas locales sin cuenta).

El correo incluye versión **HTML** (diseño de marca: logo de árbol, gradiente, botón de acción, nota de expiración) y **texto plano** (accesibilidad / clientes sin HTML). El nombre y el enlace se escapan a entidades HTML (anti-inyección).

---

## 🧪 Usuarios de prueba (seed)

```
jean@test.com  / 123456  (Jean)
alice@test.com / 123456  (Alice)
bob@test.com   / 123456  (Bob)
carol@test.com / 123456  (Carol)
```

---

## 📦 Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor con auto-reload |
| `npm run start` | Iniciar servidor en producción |
| `npm run db:migrate` | Ejecutar migraciones de Prisma |
| `npm run db:seed` | Poblar la base de datos |
| `npm run db:generate` | Regenerar Prisma Client |
| `npm test` | 106 tests (Supertest + unitarios, incluye módulo de email) |
