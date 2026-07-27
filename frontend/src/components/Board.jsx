import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';
import CreateTaskModal from './CreateTaskModal';
import CompletedTasksPanel from './CompletedTasksPanel';
import EditProfileModal from './EditProfileModal';
import GoodbyeModal from './GoodbyeModal';
import TaskCompleteModal from './TaskCompleteModal';
import ImageViewModal from './ImageViewModal';
import NotificationPanel from './NotificationPanel';
import EditTaskModal, { getUserColor } from './EditTaskModal';
import useKanbanStore from '../store/kanbanStore';
import { tasksApi } from '../services/api';
import logger from '../services/logger';

export default function Board() {
  const { user, logout } = useKanbanStore();
  const tasks = useKanbanStore((s) => s.tasks);
  const archivedTasks = useKanbanStore((s) => s.archivedTasks);
  const setTasks = useKanbanStore((s) => s.setTasks);
  const updateTaskStatus = useKanbanStore((s) => s.updateTaskStatus);
  const removeTask = useKanbanStore((s) => s.removeTask);
  const archiveTask = useKanbanStore((s) => s.archiveTask);
  const getColumns = useKanbanStore((s) => s.getColumns);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);
  const menuRef = useRef(null);
  const scrollRef = useRef(null);
  const todoColumnRef = useRef(null);
  const [activeColumn, setActiveColumn] = useState(0);
  const [referenceHeight, setReferenceHeight] = useState(null);

  const columns = getColumns();

  // Medir la altura de la columna TODO para que las demás columnas la igualen
  useEffect(() => {
    const el = todoColumnRef.current;
    if (!el) return;

    const updateHeight = () => {
      const height = el.offsetHeight;
      if (height > 0) setReferenceHeight(height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tasks]);

  // Lista de imágenes de todas las tareas visibles para navegación
  const imagesList = useMemo(() =>
    tasks.filter((t) => t.imageUrl).map((t) => ({
      imageUrl: t.imageUrl,
      title: t.title,
      taskId: t.id
    })),
    [tasks]
  );

  const handleViewImage = useCallback((task) => {
    const idx = imagesList.findIndex((img) => img.taskId === task.id);
    if (idx !== -1) setViewingImageIndex(idx);
  }, [imagesList]);

  const handleNavigateImage = useCallback((newIndex) => {
    setViewingImageIndex(newIndex);
  }, []);

  // Detectar columna activa en scroll horizontal (mobile)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const colWidth = el.children[0]?.offsetWidth || 1;
    const gap = 16;
    const idx = Math.round(el.scrollLeft / (colWidth + gap));
    setActiveColumn(Math.min(idx, columns.length - 1));
  }, [columns.length]);

  const scrollToColumn = useCallback((index) => {
    const el = scrollRef.current;
    if (!el) return;
    const colWidth = el.children[0]?.offsetWidth || 1;
    const gap = 16;
    el.scrollTo({ left: index * (colWidth + gap), behavior: 'smooth' });
    setActiveColumn(index);
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cargar tareas al montar
  useEffect(() => {
    tasksApi.getAll()
      .then(setTasks)
      .catch(console.error);
  }, [setTasks]);

  // ─── Helpers de permisos ──────────────────────
  const isSharedUserForTask = useCallback((task) => {
    if (!user || !task) return false;
    return task.creator?.id !== user.id &&
      task.assignee?.id !== user.id &&
      task.shares?.some((s) => s.user?.id === user.id || s.userId === user.id);
  }, [user]);

  // Asignado pero no creador: solo puede mover hasta DONE (Revisión)
  const isAssigneeOnly = useCallback((task) => {
    if (!user || !task) return false;
    return task.assignee?.id === user.id && task.creator?.id !== user.id;
  }, [user]);

  // ─── Drag & Drop handler ──────────────────────
  const onDragEnd = useCallback(async (result) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Bloquear drag para usuarios compartidos
    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (draggedTask && isSharedUserForTask(draggedTask)) return;

    // Bloquear ARCHIVED para asignados (solo el creador puede finalizar)
    if (destination.droppableId === 'ARCHIVED') {
      const taskToComplete = tasks.find((t) => t.id === draggableId);
      if (!taskToComplete) return;
      if (isAssigneeOnly(taskToComplete)) return; // Asignado no puede archivar
      setCompletingTask({ task: taskToComplete, sourceId: source.droppableId });
      return;
    }

    // Optimistic UI: actualizar inmediatamente
    const newStatus = destination.droppableId;
    updateTaskStatus(draggableId, newStatus);

    // Persistir en backend
    try {
      await tasksApi.updateStatus(draggableId, newStatus);
    } catch (err) {
      logger.error('Error al actualizar estado vía drag & drop', err, {
        taskId: draggableId,
        fromStatus: source.droppableId,
        toStatus: newStatus,
      });
      // Rollback: revertir al estado anterior
      updateTaskStatus(draggableId, source.droppableId);
    }
  }, [updateTaskStatus, tasks, setCompletingTask, isSharedUserForTask]);

  // ─── Movimiento con botones (mobile y desktop) ──────
  const handleMoveTask = useCallback(async (task, newStatus) => {
    // Bloquear movimiento para usuarios compartidos
    if (isSharedUserForTask(task)) return;
    // Asignado no puede mover a ARCHIVED (solo el creador finaliza)
    if (newStatus === 'ARCHIVED' && isAssigneeOnly(task)) return;

    const taskId = task.id;
    const oldStatus = task.status;

    // Si la tarea se mueve a ARCHIVED → mostrar modal de finalización
    if (newStatus === 'ARCHIVED') {
      setCompletingTask({ task, sourceId: oldStatus });
      return;
    }

    // Optimistic UI
    updateTaskStatus(taskId, newStatus);

    // Persistir
    try {
      await tasksApi.updateStatus(taskId, newStatus);
    } catch (err) {
      logger.error('Error al mover tarea con botones', err, { taskId, fromStatus: oldStatus, toStatus: newStatus });
      updateTaskStatus(taskId, oldStatus);
    }
  }, [updateTaskStatus, setCompletingTask, isSharedUserForTask]);

  // ─── Handlers ─────────────────────────────────
  const handleEditTask = (task) => {
    // Detectar si el usuario actual es un usuario compartido (solo puede ver y togglear subtareas)
    const isSharedUser = user &&
      task.creator?.id !== user.id &&
      task.assignee?.id !== user.id &&
      task.shares?.some((s) => s.user?.id === user.id || s.userId === user.id);

    if (isSharedUser) {
      const color = getUserColor(user.id);
      setViewingTask({ ...task, _sharedView: true, _userColor: color });
    } else {
      setEditingTask(task);
    }
  };

  const handleViewTask = (task) => {
    setViewingTask({ ...task, _sharedView: false });
  };

  const handleCancelComplete = (task, sourceId) => {
    // ── Archivar: cambiar status a ARCHIVED y remover del tablero ──
    const taskId = task.id;

    // 1. Cambiar status a ARCHIVED en el store
    updateTaskStatus(taskId, 'ARCHIVED');

    // 2. Remover inmediatamente del tablero (no se acumula en la columna Terminado)
    removeTask(taskId);

    // 3. Guardar en archivedTasks para el historial inmediato
    archiveTask(task);

    // 4. Cerrar modal
    setCompletingTask(null);

    // 5. Persistir en backend (PATCH en vez de DELETE)
    tasksApi.updateStatus(taskId, 'ARCHIVED').catch((err) => {
      logger.error('Error al archivar tarea (PATCH ARCHIVED)', err, {
        taskId,
        taskTitle: task.title,
        sourceStatus: sourceId,
      });
      // Rollback: restaurar al estado anterior
      // Nota: updateTaskStatus no funciona porque removeTask ya eliminó la tarea de tasks[]
      useKanbanStore.setState((s) => ({
        tasks: [...s.tasks, { ...task, status: sourceId }],
        archivedTasks: s.archivedTasks.filter((t) => t.id !== taskId),
      }));
    });
  };

  const handleLogout = () => {
    setShowGoodbye(true);
  };

  // Auto-logout 2 segundos después de mostrar el modal de despedida
  useEffect(() => {
    if (showGoodbye) {
      const timer = setTimeout(() => {
        logout();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showGoodbye, logout]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">📋</span>
          <h1 className="hidden sm:block text-lg font-bold text-gray-900">Treeverde</h1>
          <span className="hidden sm:inline-block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {showHistory ? 'Historial' : 'Tablero'}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {user && <NotificationPanel />}
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-1 sm:gap-3 pr-2 sm:pr-3 border-r border-gray-200 cursor-pointer hover:opacity-80 transition"
              >
                <div className="relative">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold overflow-hidden bg-emerald-500">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</span>
                  <span className="text-[11px] text-gray-400 leading-tight">{user.email}</span>
                </div>
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fade-scale-in z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); setShowEditProfile(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
                    >
                      <span className="text-base">⚙️</span>
                      Editar perfil
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition font-medium"
                    >
                      <span className="text-base">🚪</span>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón Historial */}
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition shadow-sm ${
              showHistory
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <span className="sm:hidden">{showHistory ? '\u2190' : '\u{1F4CA}'}</span>
            <span className="hidden sm:inline">{showHistory ? '\u2190 Volver' : '\u{1F4CA} Historial'}</span>
          </button>

          {!showHistory && (
            <button
              onClick={() => setShowModal(true)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition shadow-sm"
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">+ Añadir Tarea</span>
            </button>
          )}


        </div>
      </header>

      {/* Contenido: Kanban o Historial */}
      {showHistory ? (
        <CompletedTasksPanel tasks={tasks} archivedTasks={archivedTasks} onEditTask={handleViewTask} currentUser={user} />
      ) : tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl sm:text-7xl mb-4">📋</div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No hay tareas visibles</h2>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Aún no tienes tareas creadas, asignadas o compartidas contigo.
            ¡Crea tu primera tarea para empezar!
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
          >
            + Crear primera tarea
          </button>
        </div>
      ) : (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 min-h-0">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-4 sm:gap-5 overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory sm:snap-none pb-2 sm:pb-0 scroll-smooth column-scroll flex-1 h-full"
            >
              {columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  onEditTask={handleEditTask}
                  onMoveTask={handleMoveTask}
                  onViewImage={handleViewImage}
                  fixedHeight={column.id !== 'TODO' ? referenceHeight : undefined}
                  todoRef={column.id === 'TODO' ? todoColumnRef : undefined}
                />
              ))}
            </div>
            {/* Dots de navegacion (solo mobile) */}
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 sm:hidden">
              {columns.map((col, i) => (
                <button
                  key={col.id}
                  onClick={() => scrollToColumn(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeColumn
                      ? 'bg-emerald-500 w-3'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Ir a ${col.title}`}
                />
              ))}
            </div>
          </div>
          </DragDropContext>

          {showModal && <CreateTaskModal onClose={() => setShowModal(false)} />}
        </>
      )}

      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onViewImage={handleViewImage} />}
      {viewingTask && (
        viewingTask._sharedView ? (
          <EditTaskModal task={viewingTask} onClose={() => setViewingTask(null)} sharedView userColor={viewingTask._userColor} onViewImage={handleViewImage} />
        ) : (
          <EditTaskModal task={viewingTask} onClose={() => setViewingTask(null)} readOnly onViewImage={handleViewImage} />
        )
      )}

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showGoodbye && <GoodbyeModal />}
      {completingTask && (
        <TaskCompleteModal
          task={completingTask.task}
          onCancel={() => handleCancelComplete(completingTask.task, completingTask.sourceId)}
        />
      )}

      {viewingImageIndex !== null && (
        <ImageViewModal
          images={imagesList.map(({ imageUrl, title }) => ({ imageUrl, title }))}
          currentIndex={viewingImageIndex}
          onClose={() => setViewingImageIndex(null)}
          onNavigate={handleNavigateImage}
        />
      )}
    </div>
  );
}
