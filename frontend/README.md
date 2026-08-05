# Treeverde — Frontend

Tablero interactivo para gestión de tareas. Construido con **React 19**, **Vite**, **Tailwind CSS**, **@hello-pangea/dnd** y **Zustand**.

---

## 🧱 Stack

| Tecnología | Propósito |
|------------|-----------|
| **React 19** | UI y componentes |
| **Vite 8** | Bundler y dev server |
| **Tailwind CSS** | Estilos utilitarios |
| **@hello-pangea/dnd** | Drag & Drop accesible |
| **Zustand** | Estado global |
| **@supabase/supabase-js** | Realtime (notificaciones y tablero en vivo) |

---

## ✨ Funcionalidades

### 📋 Tablero de Tareas
- Cuatro columnas: **Por Hacer → En Progreso → Revisión → Terminado**
- Arrastra y suelta tareas entre columnas
- Actualización optimista con rollback automático
- Indicador visual de arrastre (sombra + rotación)

### ⚡ Rendimiento
- **Code-splitting**: los 7 modales/paneles se cargan con `React.lazy` + `Suspense` bajo demanda
- **Chunks separados** en el build (`react-vendor`, `dnd`, `zustand`) vía `manualChunks`
- **Carga inicial paralela**: `/auth/me` y `/tasks` corren a la vez con un **skeleton del tablero** (`BoardSkeleton`) en vez de una pantalla de carga bloqueante
- **Imágenes optimizadas**: `loading="lazy"` en tarjetas y avatares + miniaturas Cloudinary (`w_160`/`w_64`) con `getCloudinaryThumb()`
- **Paginación**: el tablero carga las primeras 100 tareas y ofrece **"Cargar más"** bajo las columnas (`TASKS_PAGE_SIZE`)

### 📝 Gestión de Tareas
- **Crear** tareas con título, descripción, prioridad, fecha límite, etiquetas, subtareas y asignado
- **Editar** al hacer clic en cualquier tarea
- **Eliminar** tareas desde el modal de edición
- **Compartir** tareas con otros usuarios (con notificaciones)
- **Invitar por enlace**: al crear una tarea (modo invitación) se genera una URL que redirige al registro y agrega al nuevo usuario como asignado; en la edición se genera una URL que agrega como compartido. También funciona para usuarios ya registrados (se unen al abrirla)
- Prioridades: Baja 🟢 / Media 🟡 / Alta 🟠 / Crítica 🔴
- Etiquetas personalizadas separadas por coma

### 📊 Panel de Historial
- Vista completa de **tareas completadas** con tabla de datos
- Vista de **tareas pendientes** con días restantes
- Estados: **Anticipado 🏆** / **A tiempo ✅** / **Vencido ⚠️**
- Comparativa de fecha límite vs completado
- Agrupación por usuario con stats individuales
- Columna **Creador** que muestra quién asignó la tarea

### 🔐 Autenticación
- Registro e inicio de sesión con JWT
- Sesión persistente (localStorage)
- Menú de usuario con cierre de sesión
- **Sesión sincronizada entre pestañas** (BroadcastChannel): al iniciar sesión en una pestaña, las demás cargan la sesión automáticamente (token propagado + restauración); al cerrar sesión, todas cierran al instante, sin sesiones huérfanas. Los cambios de perfil (nombre/foto) también se propagan al instante. El canal nativo `BroadcastChannel` entrega cada mensaje solo a las OTRAS pestañas del mismo origen (nunca a la que lo publica) — inmune a bucles
- Protección de rutas automática
- **Mensaje de login unificado** (`Email o contraseña incorrectos`) coherente con la anti-enumeración del backend
- **Recuperación de contraseña** (forgot/reset) con token de un solo uso

### 🔔 Notificaciones
- Panel de notificaciones con contador de no leídas (asignaciones, completados, compartidos, subtareas)
- Marcar todas como leídas y eliminar individualmente
- **Leídas sincronizadas entre pestañas**: al abrir el panel (que marca como leídas), las demás pestañas actualizan el contador al instante vía BroadcastChannel

### ⚡ Realtime (Supabase)
- **Notificaciones al instante**: al llegar un INSERT en la tabla `Notification` filtrado por `userId`, el contador y la lista se actualizan solos
- **Tablero en vivo**: INSERT/UPDATE/DELETE en `Task` (filtrado por `creatorId`/`assigneeId`) actualiza tarjetas, columnas y el historial sin recargar
- **RLS por usuario**: la conexión se autentica con el `supabaseToken` (JWT compatible con Supabase acuñado por el backend) vía `realtime.setAuth()`; las políticas RLS evalúan `auth.uid()` y un cliente nunca recibe filas de otros usuarios
- Conexión gestionada en `services/realtime.js` con desconexión limpia al cerrar sesión
- **Degradación elegante**: sin credenciales o sin `supabaseToken` (backend sin `SUPABASE_JWT_SECRET`) la app usa el polling de 30s existente

### 🎨 UI/UX
- Diseño responsivo (adaptable a móvil)
- Gradientes y sombras suaves
- Animaciones y micro-interacciones
- Indicador de tareas vencidas ⚠️
- Badges de prioridad y estado

---

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

La app se abre en `http://localhost:5173`.  
Asegúrate de que el backend esté corriendo en `http://localhost:3001`.

---

## 🏗️ Estructura del proyecto

```
src/
├── components/
│   ├── Board.jsx              # Tablero Kanban principal (lazy + Suspense para modales)
│   ├── BoardSkeleton.jsx      # Skeleton del tablero durante la carga inicial
│   ├── Column.jsx             # Columna droppable
│   ├── TaskCard.jsx           # Tarjeta de tarea (arrastrable y clickeable)
│   ├── CreateTaskModal.jsx    # Modal para crear tareas
│   ├── EditTaskModal.jsx      # Modal para editar tareas
│   ├── TaskFormFields.jsx     # Formulario compartido (crear/editar)
│   ├── TaskDetailsView.jsx    # Vista de solo lectura / compartida
│   ├── CompletedTasksPanel.jsx # Panel de historial con tabla
│   ├── NotificationPanel.jsx  # Panel de notificaciones
│   ├── SearchableUserSelect.jsx # Selector de usuarios con búsqueda
│   ├── LoginForm.jsx          # Formulario de inicio de sesión
│   └── RegisterForm.jsx       # Formulario de registro
├── constants/
│   └── kanbanConfig.js        # Config central (estados, colores, TASKS_PAGE_SIZE)
├── hooks/
│   └── useAuth.js             # Hook de autenticación
├── services/
│   ├── api.js                 # Cliente HTTP para la API
│   ├── realtime.js            # Realtime de Supabase (notificaciones + tablero en vivo)
│   └── sessionSync.js         # Sincronización de sesión entre pestañas (BroadcastChannel)
├── store/
│   └── kanbanStore.js         # Estado global (Zustand) + paginación (tasksHasMore)
├── utils/
│   └── images.js              # getCloudinaryThumb() — miniaturas de Cloudinary
├── App.jsx                    # Componente raíz (carga paralela + skeleton)
└── main.jsx                   # Entry point
```

---

## 🌐 Despliegue

### Frontend → Vercel
```bash
npm run build    # Genera ./dist/
```
Conectar repositorio a [vercel.com](https://vercel.com) y listo.
En producción define `VITE_API_URL` apuntando al dominio del backend (en dev se usa el proxy de Vite: `/api` → `http://localhost:3001`).
Para **realtime**, define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Dashboard → Project Settings → API) y, en el backend, `SUPABASE_JWT_SECRET` (mismo dashboard) para que el servidor acuñe el token que autentica la conexión con RLS.

### Backend → Vercel Serverless o Railway
Ver [README del backend](../backend/README.md) para más detalles.

---

## 🧪 Tests y lint

| Comando | Descripción |
|---------|-------------|
| `npm test` | 66 tests con `node:test` (store, config, imágenes, api, realtime, sesión + e2e de dos pestañas con login/logout/perfil/leídas) |
| `npm run test:e2e` | 3 tests e2e reales con Playwright (`e2e/session-sync.spec.js`): dos pestañas reales — login/logout, perfil y notificaciones leídas propagados por BroadcastChannel. Requiere el backend en :3001 con la BD sembrada y el frontend en :5173 (el `webServer` de `playwright.config.js` los levanta solo si no están). Cada run hace ~6 logins; el rate limiter de login (20 req/15 min por IP) solo aplica en producción, en dev la suite es repetible sin 429 |
| `npm run lint` | ESLint (react, react-hooks) |
| `npm run build` | Build de producción Vite |

---

## 🧪 Usuarios de prueba (seed)

```
jean@test.com  / 123456  (Jean)
alice@test.com / 123456  (Alice)
bob@test.com   / 123456  (Bob)
carol@test.com / 123456  (Carol)
```
