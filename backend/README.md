# Treeverde — Backend API

API RESTful para la aplicación **Treeverde**. Construida con **Express.js**, **Prisma ORM** y **JWT** para autenticación.

---

## 🧱 Stack

| Tecnología | Propósito |
|------------|-----------|
| **Node.js / Express** | Servidor HTTP y rutas |
| **Prisma ORM** | Modelado y acceso a base de datos |
| **PostgreSQL** (prod) / **SQLite** (dev) | Base de datos |
| **JWT (jsonwebtoken)** | Autenticación stateless |
| **bcryptjs** | Hash de contraseñas |

---

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL (SQLite por defecto)

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
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET  | `/api/auth/me` | Obtener datos del usuario autenticado |

### Tareas (`/api/tasks`) — requiere autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/tasks` | Obtener todas las tareas |
| POST   | `/api/tasks` | Crear una tarea |
| PUT    | `/api/tasks/:id` | Actualizar tarea completa |
| PATCH  | `/api/tasks/:id/status` | Cambiar estado (usado por Drag & Drop) |
| DELETE | `/api/tasks/:id` | Eliminar tarea |

### Usuarios (`/api/users`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/users` | Listar todos los usuarios |

### Health Check

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/health` | Verificar que el servidor está activo |

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
├── status      TODO | IN_PROGRESS | DONE
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
