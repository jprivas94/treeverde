# 🌳 Treeverde

**Treeverde** es una aplicación moderna para la gestión de tareas y proyectos. Permite organizar el trabajo en tableros visuales con columnas arrastrables, tracking de fechas límite, prioridades, etiquetas y un panel de historial con estadísticas de rendimiento.

![Version](https://img.shields.io/badge/version-1.0.0-emerald)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

---

## 📸 Capturas

| Tablero de Tareas | Panel de Historial |
|:--------------:|:------------------:|
| *(pendiente)* | *(pendiente)* |

---

## ✨ Funcionalidades

### 📋 Tablero de Tareas
- **4 columnas**: Por Hacer → En Progreso → Revisión → Terminado
- **Drag & Drop**: Arrastra tareas entre columnas con feedback visual
- **Actualización optimista**: Cambios instantáneos con rollback automático
- **Modal de creación**: Título, descripción, prioridad, fecha límite, etiquetas, subtareas y asignado
- **Compartir tareas** con otros usuarios (con notificaciones)
- **Invitar por enlace**: al crear una tarea se genera una URL que lleva a quien la abre al registro y lo agrega como **asignado** (o como **compartido** desde la edición); también funciona para usuarios ya registrados
- **Edición con clic**: Toda la tarjeta es clickeable para editar

### ⚡ Rendimiento
- **Carga inicial paralela** de `/auth/me` + `/tasks` con **skeleton del tablero** (sin pantalla de carga bloqueante)
- **Code-splitting** con `React.lazy` + `Suspense` para los modales y chunks separados en el build (`dnd`, `react-vendor`)
- **Imágenes optimizadas**: `loading="lazy"` + miniaturas Cloudinary (`getCloudinaryThumb`)
- **Paginación**: las primeras 100 tareas y botón **"Cargar más"** en el tablero

### 📊 Panel de Historial
- **Tabla de datos** con tareas completadas y pendientes
- **Estados**: Anticipado 🏆 | A tiempo ✅ | Vencido ⚠️
- **Línea de tiempo** visual comparando fecha límite vs completado
- **Stats por usuario** con conteo de anticipadas, a tiempo y vencidas
- **Columna Creador** que muestra quién asignó cada tarea
- **Días restantes** para tareas pendientes

### 🔐 Autenticación y seguridad
- Registro e inicio de sesión con **JWT**
- Sesión persistente con **localStorage**
- Menú de usuario con cierre de sesión
- Protección automática de rutas
- **Recuperación de contraseña por correo** (Resend): al pedir "olvidé mi contraseña" se envía un **correo con diseño de marca** (logo de árbol, gradiente, botón "Restablecer contraseña") con un enlace que abre la ruta de restablecer (mismo diseño que el login). Token de un solo uso, válido 1 hora. Sin API key, en dev se devuelve el enlace en la API
- **Rate limiting** en login/register/forgot-password (20 req / 15 min por IP)
- **Mensaje de login unificado** (anti-enumeración de emails) y `JWT_SECRET` obligatorio en producción
- **CORS restringido** a los orígenes de `FRONTEND_URL`

### 🔔 Notificaciones y tablero en tiempo real
- Panel de **notificaciones** con contador de no leídas
- **Realtime con Supabase**: notificaciones (asignaciones, completados, compartidos, subtareas) y cambios del tablero (crear/editar/mover/eliminar tareas) llegan **al instante**, sin recargar
- Filtros por usuario (`userId`/`creatorId`/`assigneeId`) vía `postgres_changes` **+ políticas RLS** por `userId`: cada usuario solo recibe sus notificaciones/tareas (el backend acuña un JWT compatible con Supabase con `SUPABASE_JWT_SECRET`)
- Si no hay credenciales de Supabase configuradas, la app degrada a polling automáticamente

### 🎨 UI/UX
- Diseño **responsivo** adaptable a móvil
- **Gradientes**, sombras y animaciones suaves
- **Badges** de prioridad y estado
- Indicador de tareas **vencidas** ⚠️
- Indicador de **progreso** en tareas en curso

---

## 🧱 Arquitectura

```
treeverde/
├── backend/           # API REST (Express + Prisma)
│   ├── src/           # Código fuente
│   │   ├── routes/    # Rutas (auth, tasks, users, upload, notifications)
│   │   ├── middleware/ # Autenticación JWT
│   │   ├── utils/     # config.js (JWT_SECRET/CORS), permisos, notificaciones
│   │   └── index.js   # Entry point
│   ├── prisma/        # Schema y migraciones (PostgreSQL + índices)
│   ├── tests/         # 106 tests (Supertest + unitarios)
│   ├── .gitignore
│   └── package.json
│
├── frontend/          # UI (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/ # Componentes React (+ BoardSkeleton)
│   │   ├── constants/  # Config central del tablero (kanbanConfig.js)
│   │   ├── hooks/      # Hooks personalizados
│   │   ├── services/   # Cliente HTTP
│   │   ├── store/      # Estado global (Zustand) con paginación
│   │   ├── utils/      # images.js (miniaturas Cloudinary)
│   │   ├── App.jsx     # Componente raíz (carga paralela + skeleton)
│   │   └── main.jsx    # Entry point
│   ├── .gitignore
│   └── package.json
│
└── README.md           # Este archivo
```

---

## 🚀 Inicio rápido (desarrollo local)

### Requisitos
- **Node.js** 18+
- **npm**

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # Editar DATABASE_URL si es necesario
npx prisma migrate dev  # Crear tablas
npx prisma db seed      # Datos de prueba (opcional)
npm run dev             # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

### 3. Abrir
Ve a **http://localhost:5173** e inicia sesión con:

```
jean@test.com / 123456  (Jean)
alice@test.com / 123456 (Alice)
bob@test.com / 123456   (Bob)
carol@test.com / 123456 (Carol)
```

---

## 🛠️ Stack tecnológico

### Frontend
| Paquete | Versión | Uso |
|---------|---------|-----|
| React | 19 | UI |
| Vite | 8 | Bundler |
| Tailwind CSS | 3 | Estilos |
| @hello-pangea/dnd | 18 | Drag & Drop |
| Zustand | 5 | Estado global |
| @supabase/supabase-js | 2 | Realtime (notificaciones y tablero en vivo) |

### Backend
| Paquete | Versión | Uso |
|---------|---------|-----|
| Express | 4.21 | Servidor HTTP |
| Prisma | 6 | ORM (PostgreSQL) |
| jsonwebtoken | 9 | JWT Auth |
| bcryptjs | 3 | Hash de contraseñas |
| express-rate-limit | 8 | Rate limiting en auth |
| cloudinary | 2 | Subida de imágenes firmada |
| resend | 6 | Correos de recuperación de contraseña (HTML con marca) |

### Base de datos
- **PostgreSQL** (provider fijado en schema.prisma; recomendado: Supabase) — dev y producción

---

## 🌐 Despliegue

| Servicio | Componente | Costo |
|----------|-----------|-------|
| **Vercel** | Frontend | $0/mes |
| **Vercel** (Serverless) | Backend | $0/mes |
| **Supabase** | PostgreSQL + RLS | $0/mes (Free) / $25/mes (Pro) |
| **Supabase Realtime** | Realtime (notificaciones + tablero) | $0/mes (Free) / $25/mes (Pro) |

### ✅ Checklist de despliegue

> **Requisito previo:** commitear y pushear el repo a GitHub antes de conectar Vercel (los despliegues se disparan desde el repo).

#### Paso 0 — Preparación
- [ ] `git add -A && git commit -m "feat: deploy" && git push origin main`
- [ ] Node.js 18+ (solo necesario localmente para aplicar migraciones)

#### Paso 1 — Supabase (Base de datos + Realtime)
- [ ] Crear proyecto en [supabase.com](https://supabase.com) (plan Free alcanza)
- [ ] Copiar el **connection string**: Dashboard → Project Settings → Database → *Connection string* (modo transaction)
- [ ] Aplicar migraciones apuntando a Supabase:
  ```bash
  cd backend
  # backend/.env → DATABASE_URL="postgresql://postgres:...@db.xxx.supabase.co:5432/postgres?schema=public"
  npx prisma migrate deploy   # tablas + índices + realtime + RLS
  npx prisma db seed          # opcional: usuarios de prueba
  ```
- [ ] Habilitar **Realtime Replication**: Database → Replication → marcar `Notification` y `Task`
- [ ] Copiar credenciales (Project Settings → API): **URL**, **anon key** y **JWT Secret**

#### Paso 2 — Cloudinary (imágenes)
- [ ] Crear cuenta en [cloudinary.com](https://cloudinary.com)
- [ ] Copiar **Cloud Name**, **API Key** y **API Secret**

#### Paso 2.5 — Resend (correos de recuperación)
- [ ] Crear cuenta gratis en [resend.com](https://resend.com)
- [ ] Generar una **API key** en https://resend.com/api-keys
- [ ] (Opcional) Verificar tu dominio o usar `onboarding@resend.dev` como remitente en el plan gratis (solo envía a tu email verificado hasta configurar dominio)

#### Paso 3 — Backend en Vercel
- [ ] Importar el repo en [vercel.com](https://vercel.com) → **Root Directory = `backend/`**
- [ ] Build automático: `vercel-build` = `prisma migrate deploy && prisma generate` (ya en `package.json`)
- [ ] Variables de entorno (Settings → Environment Variables):

  | Variable | Valor |
  |---|---|
  | `DATABASE_URL` | Connection string de Supabase |
  | `JWT_SECRET` | Frase larga aleatoria — **obligatoria en producción** (fail-hard al arrancar) |
  | `FRONTEND_URL` | URL final del frontend (CORS + enlace de reset) |
  | `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Credenciales de Cloudinary |
  | `SUPABASE_JWT_SECRET` | JWT Secret de Supabase (Realtime + RLS) |
  | `RESEND_API_KEY` | API key de Resend (correos de recuperación) |
  | `EMAIL_FROM` | Remitente de los correos (defecto: `Treeverde <onboarding@resend.dev>`) |

#### Paso 4 — Frontend en Vercel
- [ ] Segundo proyecto → **Root Directory = `frontend/`**
- [ ] Build: `npm run build` (Vite) → Output Directory: `dist/`
- [ ] Variables de entorno:

  | Variable | Valor |
  |---|---|
  | `VITE_API_URL` | URL del backend desplegado **terminando en `/api`** (ej. `https://backend.vercel.app/api`) — en prod no hay proxy de Vite |
  | `VITE_SUPABASE_URL` | URL del proyecto Supabase |
  | `VITE_SUPABASE_ANON_KEY` | Anon key de Supabase |

#### Paso 5 — Verificación final
- [ ] Login con un usuario del seed (o registrado)
- [ ] Drag & drop entre columnas (persiste al recargar)
- [ ] Subir imagen de perfil / de tarea (Cloudinary)
- [ ] Notificaciones en tiempo real entre 2 pestañas (Realtime + RLS)
- [ ] Recuperar contraseña — el correo con el enlace de reset llega al email del usuario (Resend); en dev sin API key se devuelve el enlace en la respuesta de la API
- [ ] Confirmar que el **rate limiter de login** está activo (20 req / 15 min por IP, solo en producción)

---

## 📡 API (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Registrar usuario (rate limited) |
| POST | `/api/auth/login` | ❌ | Iniciar sesión (rate limited) |
| GET | `/api/auth/me` | ✅ | Datos del usuario |
| PUT | `/api/auth/profile` | ✅ | Actualizar perfil |
| POST | `/api/auth/forgot-password` | ❌ | Solicitar reset (rate limited) |
| POST | `/api/auth/reset-password` | ❌ | Restablecer contraseña |
| GET | `/api/tasks` | ✅ | Tareas (paginado: `?limit=&offset=`) |
| GET | `/api/tasks/:id` | ✅ | Detalle de tarea |
| POST | `/api/tasks` | ✅ | Crear tarea |
| PUT | `/api/tasks/:id` | ✅ | Actualizar tarea |
| PATCH | `/api/tasks/:id/status` | ✅ | Cambiar estado |
| PATCH | `/api/tasks/:id/subtasks` | ✅ | Actualizar subtareas |
| POST | `/api/tasks/:id/share` | ✅ | Compartir tarea |
| DELETE | `/api/tasks/:id/share/:userId` | ✅ | Quitar compartición |
| POST | `/api/tasks/:id/invite` | ✅ | Generar enlace de invitación (`role`: assignee/share) |
| GET | `/api/invites/:token` | ❌ | Info pública de la invitación (banner de registro) |
| POST | `/api/invites/:token/accept` | ✅ | Aceptar invitación y unirse a la tarea |
| DELETE | `/api/tasks/:id` | ✅ | Eliminar tarea |
| GET | `/api/users` | ✅ | Listar usuarios (paginado: `?limit=&offset=`) |
| GET | `/api/notifications` | ✅ | Notificaciones + unreadCount |
| POST | `/api/upload/sign` | ✅ | Firma Cloudinary |
| GET | `/api/health` | ❌ | Health check |

---

## 📦 Scripts útiles

### Backend
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con auto-reload |
| `npm run start` | Servidor producción |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:seed` | Datos de prueba |
| `npm run db:generate` | Regenerar Prisma Client |
| `npm test` | 106 tests (Supertest + unitarios, incluye módulo de email) |
| `npm run lint` | ESLint |

### Frontend
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Build producción |
| `npm run preview` | Preview del build |
| `npm test` | 66 tests con `node:test` |
| `npm run test:e2e` | 3 tests e2e reales con Playwright (sincronización de sesión entre pestañas por BroadcastChannel: login/logout, perfil y leídas) |
| `npm run lint` | ESLint |

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/mejora`)
3. Commit (`git commit -m "feat: agrega mejora"`)
4. Push (`git push origin feature/mejora`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT
