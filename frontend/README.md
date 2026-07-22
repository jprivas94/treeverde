# Treeverde — Frontend

Tablero interactivo para gestión de tareas. Construido con **React 19**, **Vite**, **Tailwind CSS** y **@hello-pangea/dnd**.

---

## 🧱 Stack

| Tecnología | Propósito |
|------------|-----------|
| **React 19** | UI y componentes |
| **Vite** | Bundler y dev server |
| **Tailwind CSS** | Estilos utilitarios |
| **@hello-pangea/dnd** | Drag & Drop accesible |
| **Zustand** | Estado global |

---

## ✨ Funcionalidades

### 📋 Tablero de Tareas
- Cuatro columnas: **Por Hacer → En Progreso → Revisión → Terminado**
- Arrastra y suelta tareas entre columnas
- Actualización optimista con rollback automático
- Indicador visual de arrastre (sombra + rotación)

### 📝 Gestión de Tareas
- **Crear** tareas con título, descripción, prioridad, fecha límite, etiquetas y asignado
- **Editar** al hacer clic en cualquier tarea
- **Eliminar** tareas desde el modal de edición
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
- Protección de rutas automática

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
│   ├── Board.jsx              # Tablero Kanban principal
│   ├── Column.jsx             # Columna droppable
│   ├── TaskCard.jsx           # Tarjeta de tarea (arrastrable y clickeable)
│   ├── CreateTaskModal.jsx    # Modal para crear tareas
│   ├── EditTaskModal.jsx      # Modal para editar tareas
│   ├── CompletedTasksPanel.jsx # Panel de historial con tabla
│   ├── LoginForm.jsx          # Formulario de inicio de sesión
│   └── RegisterForm.jsx       # Formulario de registro
├── hooks/
│   └── useAuth.js             # Hook de autenticación
├── services/
│   └── api.js                 # Cliente HTTP para la API
├── store/
│   └── kanbanStore.js         # Estado global (Zustand)
├── App.jsx                    # Componente raíz
└── main.jsx                   # Entry point
```

---

## 🌐 Despliegue

### Frontend → Vercel
```bash
npm run build    # Genera ./dist/
```
Conectar repositorio a [vercel.com](https://vercel.com) y listo.

### Backend → Vercel Serverless o Railway
Ver [README del backend](../backend/README.md) para más detalles.

---

## 🧪 Usuarios de prueba (seed)

```
jean@test.com  / 123456  (Jean)
alice@test.com / 123456  (Alice)
bob@test.com   / 123456  (Bob)
carol@test.com / 123456  (Carol)
```
