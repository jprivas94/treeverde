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
- **Modal de creación**: Título, descripción, prioridad, fecha límite, etiquetas y asignado
- **Edición con clic**: Toda la tarjeta es clickeable para editar

### 📊 Panel de Historial
- **Tabla de datos** con tareas completadas y pendientes
- **Estados**: Anticipado 🏆 | A tiempo ✅ | Vencido ⚠️
- **Línea de tiempo** visual comparando fecha límite vs completado
- **Stats por usuario** con conteo de anticipadas, a tiempo y vencidas
- **Columna Creador** que muestra quién asignó cada tarea
- **Días restantes** para tareas pendientes

### 🔐 Autenticación
- Registro e inicio de sesión con **JWT**
- Sesión persistente con **localStorage**
- Menú de usuario con cierre de sesión
- Protección automática de rutas

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
│   │   ├── routes/    # Rutas (auth, tasks, users)
│   │   ├── middleware/ # Autenticación JWT
│   │   └── index.js   # Entry point
│   ├── prisma/        # Schema y migraciones
│   ├── .gitignore
│   └── package.json
│
├── frontend/          # UI (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/ # Componentes React
│   │   ├── hooks/      # Hooks personalizados
│   │   ├── services/   # Cliente HTTP
│   │   ├── store/      # Estado global (Zustand)
│   │   ├── App.jsx     # Componente raíz
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
| Vite | 6 | Bundler |
| Tailwind CSS | 3 | Estilos |
| @hello-pangea/dnd | 18 | Drag & Drop |
| Zustand | 5 | Estado global |

### Backend
| Paquete | Versión | Uso |
|---------|---------|-----|
| Express | 4.21 | Servidor HTTP |
| Prisma | 6 | ORM (PostgreSQL/SQLite) |
| jsonwebtoken | 9 | JWT Auth |
| bcryptjs | 3 | Hash de contraseñas |

### Base de datos
- **Desarrollo**: SQLite (`prisma/dev.db`)
- **Producción**: PostgreSQL (recomendado: Supabase)

---

## 🌐 Despliegue

| Servicio | Componente | Costo |
|----------|-----------|-------|
| **Vercel** | Frontend | $0/mes |
| **Vercel** (Serverless) | Backend | $0/mes |
| **Supabase** | PostgreSQL | $0/mes (Free) / $25/mes (Pro) |

### Deploy rápido

```bash
# 1. Crear base de datos en Supabase
# 2. Actualizar DATABASE_URL en backend/.env
# 3. Subir backend/ a Vercel como Serverless Function
# 4. Subir frontend/ a Vercel como proyecto Vite
```

---

## 📡 API (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Registrar usuario |
| POST | `/api/auth/login` | ❌ | Iniciar sesión |
| GET | `/api/auth/me` | ✅ | Datos del usuario |
| GET | `/api/tasks` | ✅ | Todas las tareas |
| POST | `/api/tasks` | ✅ | Crear tarea |
| PUT | `/api/tasks/:id` | ✅ | Actualizar tarea |
| PATCH | `/api/tasks/:id/status` | ✅ | Cambiar estado |
| DELETE | `/api/tasks/:id` | ✅ | Eliminar tarea |
| GET | `/api/users` | ✅ | Listar usuarios |
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

### Frontend
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Build producción |
| `npm run preview` | Preview del build |

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
