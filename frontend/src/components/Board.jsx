import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import { getUserColor } from '../constants/kanbanConfig';
import useKanbanStore from '../store/kanbanStore';
import { tasksApi } from '../services/api';
import { STATUS_NAV, TASKS_PAGE_SIZE } from '../constants/kanbanConfig';
import logger from '../services/logger';
import TreeLogo from './TreeLogo';
import TreeSpinner from './TreeSpinner';
import Avatar from './Avatar';

// ─── Code-splitting: modales y paneles secundarios se cargan bajo demanda ──
const CreateTaskModal = lazy(() => import('./CreateTaskModal'));
const CompletedTasksPanel = lazy(() => import('./CompletedTasksPanel'));
const EditProfileModal = lazy(() => import('./EditProfileModal'));
const GoodbyeModal = lazy(() => import('./GoodbyeModal'));
const TaskCompleteModal = lazy(() => import('./TaskCompleteModal'));
const ImageViewModal = lazy(() => import('./ImageViewModal'));
const EditTaskModal = lazy(() => import('./EditTaskModal'));
const ConfirmDeleteModal = lazy(() => import('./ConfirmDeleteModal'));

// Fallback mientras se descarga un chunk diferido
function ModalLoading() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <TreeSpinner size="lg" light />
    </div>
  );
}

export default function Board({ isDark, onToggleTheme }) {
  const user = useKanbanStore((s) => s.user);
  const logout = useKanbanStore((s) => s.logout);
  const tasks = useKanbanStore((s) => s.tasks);
  const archivedTasks = useKanbanStore((s) => s.archivedTasks);
  const setTasks = useKanbanStore((s) => s.setTasks);
  const tasksLoaded = useKanbanStore((s) => s.tasksLoaded);
  const tasksHasMore = useKanbanStore((s) => s.tasksHasMore);
  const appendTasks = useKanbanStore((s) => s.appendTasks);
  const updateTaskStatus = useKanbanStore((s) => s.updateTaskStatus);
  const removeTask = useKanbanStore((s) => s.removeTask);
  const archiveTask = useKanbanStore((s) => s.archiveTask);
  const restoreTask = useKanbanStore((s) => s.restoreTask);
  const getColumns = useKanbanStore((s) => s.getColumns);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);
  const menuRef = useRef(null);
  const scrollRef = useRef(null);
  const todoColumnRef = useRef(null);
  const [activeColumn, setActiveColumn] = useState(0);
  const [referenceHeight, setReferenceHeight] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(!tasksLoaded);
  const [loadingMore, setLoadingMore] = useState(false);

  // getColumns() agrupa y ordena: memoizarlo evita recalcular en cada render.
  // Lee el estado actual del store vía get(); `tasks` en la llamada solo
  // declara la dependencia real (recalcular cuando cambian las tareas).
  // La columna ARCHIVED (Terminado) se muestra en el tablero pero vacía: las
  // tareas terminadas se archivan y viven en archivedTasks (historial), no en
  // la columna. El drag/botón a Terminado abre el modal de finalización y al
  // confirmar la tarea sale del tablero y queda solo en el historial.
  const columns = useMemo(() => getColumns(tasks), [getColumns, tasks]);

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
    tasks.flatMap((t) => {
      const imgs = Array.isArray(t.images) ? t.images.filter(Boolean) : [];
      return imgs.map((url) => ({ imageUrl: url, title: t.title }));
    }),
    [tasks]
  );

  const handleViewImage = useCallback((task) => {
    const imgs = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
    if (imgs.length === 0) return;
    const idx = imagesList.findIndex((img) => img.imageUrl === imgs[0]);
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

  // Cargar tareas al montar (solo si no fueron precargadas en paralelo)
  useEffect(() => {
    if (tasksLoaded) return;
    setTasksLoading(true);
    tasksApi.getAll({ limit: TASKS_PAGE_SIZE })
      .then((data) => {
        setTasks(data, data.length === TASKS_PAGE_SIZE);
        setTasksLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setTasksLoading(false);
      });
  }, [setTasks, tasksLoaded]);

  // ─── Cargar más tareas (paginación) ────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    const offset = tasks.length + archivedTasks.length;
    setLoadingMore(true);
    try {
      const data = await tasksApi.getAll({ limit: TASKS_PAGE_SIZE, offset });
      appendTasks(data, data.length === TASKS_PAGE_SIZE);
    } catch (err) {
      logger.error('Error al cargar más tareas', err, { offset });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, tasks.length, archivedTasks.length, appendTasks]);

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
  }, [updateTaskStatus, tasks, setCompletingTask, isSharedUserForTask, isAssigneeOnly]);

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
  }, [updateTaskStatus, setCompletingTask, isSharedUserForTask, isAssigneeOnly]);

  // ─── Handlers ─────────────────────────────────
  const handleEditTask = (task) => {
    // Detectar si el usuario actual es un usuario compartido (solo puede ver y togglear subtareas)
    if (isSharedUserForTask(task)) {
      const color = getUserColor(user.id);
      setViewingTask({ ...task, _sharedView: true, _userColor: color });
    } else {
      setEditingTask(task);
    }
  };

  const handleViewTask = (task) => {
    setViewingTask({ ...task, _sharedView: false });
  };

  const handleArchiveTask = (task, sourceId) => {
    // ── Archivar: cambiar status a ARCHIVED y remover del tablero ──
    const taskId = task.id;
    const now = new Date().toISOString();

    // 1. Cambiar status a ARCHIVED en el store
    updateTaskStatus(taskId, 'ARCHIVED');

    // 2. Remover inmediatamente del tablero (no se acumula en la columna Terminado)
    removeTask(taskId);

    // 3. Guardar en archivedTasks para el historial inmediato (estado ya actualizado)
    archiveTask({
      ...task,
      status: 'ARCHIVED',
      completedAt: task.completedAt || now,
      archivedAt: now,
      updatedAt: now
    });

    // 4. Cerrar modal
    setCompletingTask(null);

    // 5. Persistir en backend (PATCH en vez de DELETE)
    tasksApi.updateStatus(taskId, 'ARCHIVED').catch((err) => {
      logger.error('Error al archivar tarea (PATCH ARCHIVED)', err, {
        taskId,
        taskTitle: task.title,
        sourceStatus: sourceId,
      });
      // Rollback: restaurar al estado anterior usando la acción del store
      restoreTask(task, sourceId);
    });
  };

  const handleDeleteTask = async (task) => {
    try {
      await tasksApi.remove(task.id);
      removeTask(task.id);
      setDeletingTask(null);
    } catch (err) {
      logger.error('Error al eliminar tarea', err, { taskId: task.id, taskTitle: task.title });
      setDeletingTask(null);
    }
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
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <TreeLogo className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
          <h1 className="hidden sm:block text-lg font-bold text-gray-900 dark:text-gray-100">Treeverde</h1>
          <span className="hidden sm:inline-block text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {showHistory ? 'Historial' : 'Tablero'}
          </span>

          {/* Navegación de columnas (solo mobile) */}
          {!showHistory && (
            <div className="flex items-center gap-1 sm:hidden">
              {columns.map((col, i) => {
                const isActive = i === activeColumn;
                const navStyle = STATUS_NAV[col.id] || {};
                return (
                  <button
                    key={col.id}
                    onClick={() => scrollToColumn(i)}
                    className={`flex items-center gap-1 rounded-lg transition-all duration-200 ${
                      isActive
                        ? `${navStyle.bg} ${navStyle.text} px-2 py-1 text-[10px] font-bold`
                        : 'px-1.5 py-1'
                    }`}
                    aria-label={`Ir a ${navStyle.label}`}
                  >
                    {isActive ? (
                      <>
                        <span className={`w-2 h-2 rounded-full ${navStyle.dot}`} />
                        <span>{navStyle.label}</span>
                      </>
                    ) : (
                      <span className={`w-3 h-3 rounded-sm ${navStyle.dot}`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {user && <NotificationPanel />}
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                data-testid="user-menu-button"
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-1 sm:gap-3 pr-2 sm:pr-3 border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition"
              >
                <div className="relative">
                  <Avatar user={user} sizeClass="w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm" fallbackClass="bg-emerald-500 text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 border-2 border-white dark:border-gray-900 rounded-full" />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span data-testid="user-menu-name" className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{user.name}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{user.email}</span>
                </div>
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 animate-fade-scale-in z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <Avatar user={user} sizeClass="w-9 h-9 text-sm" fallbackClass="bg-emerald-500 text-white" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      data-testid="edit-profile-button" onClick={() => { setShowUserMenu(false); setShowEditProfile(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                    >
                      <span className="text-base">⚙️</span>
                      Editar perfil
                    </button>
                    <button
                      data-testid="logout-button" onClick={() => { setShowUserMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition font-medium"
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
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
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
      {tasksLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="flex flex-col items-center gap-5">
            {/* Spinner principal con logo de árbol */}
            <TreeSpinner size="xl" />
            {/* Texto */}
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cargando tareas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Obteniendo tus tareas del servidor...</p>
            </div>
            {/* Barra de progreso indeterminada */}
            <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-loading-bar" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      ) : showHistory ? (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8">
          <TreeSpinner size="lg" />
        </div>}>
          <CompletedTasksPanel tasks={tasks} archivedTasks={archivedTasks} onEditTask={handleViewTask} />
        </Suspense>
      ) : tasks.length === 0 && archivedTasks.length === 0 && !tasksHasMore ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center mb-4">
            <TreeLogo className="w-11 h-11 sm:w-14 sm:h-14 text-emerald-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No hay tareas visibles</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
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
                  onDeleteTask={setDeletingTask}
                  canDeleteForTask={(task) => user?.id === task.creator?.id}
                  fixedHeight={column.id !== 'TODO' ? referenceHeight : undefined}
                  todoRef={column.id === 'TODO' ? todoColumnRef : undefined}
                  isSharedUserForTask={isSharedUserForTask}
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
                      : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                  aria-label={`Ir a ${col.title}`}
                />
              ))}
            </div>
          </div>
          </DragDropContext>

          {/* Cargar más tareas (paginación) */}
          {tasksHasMore && (
            <div className="flex justify-center pb-3">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-emerald-700 dark:text-emerald-400 rounded-xl shadow-sm hover:bg-emerald-50 dark:hover:bg-gray-700 hover:border-emerald-200 dark:hover:border-emerald-900 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <TreeSpinner size="xs" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <span>⬇️</span>
                    Cargar más tareas
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <Suspense fallback={<ModalLoading />}>
          <CreateTaskModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}

      {editingTask && (
        <Suspense fallback={<ModalLoading />}>
          <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
        </Suspense>
      )}
      {viewingTask && (
        <Suspense fallback={<ModalLoading />}>
          {viewingTask._sharedView ? (
            <EditTaskModal task={viewingTask} onClose={() => setViewingTask(null)} sharedView userColor={viewingTask._userColor} />
          ) : (
            <EditTaskModal task={viewingTask} onClose={() => setViewingTask(null)} readOnly />
          )}
        </Suspense>
      )}

      {deletingTask && (
        <Suspense fallback={<ModalLoading />}>
          <ConfirmDeleteModal
            task={deletingTask}
            onConfirm={() => handleDeleteTask(deletingTask)}
            onCancel={() => setDeletingTask(null)}
          />
        </Suspense>
      )}

      {showEditProfile && (
        <Suspense fallback={<ModalLoading />}>
          <EditProfileModal onClose={() => setShowEditProfile(false)} />
        </Suspense>
      )}
      {showGoodbye && (
        <Suspense fallback={<ModalLoading />}>
          <GoodbyeModal />
        </Suspense>
      )}
      {completingTask && (
        <Suspense fallback={<ModalLoading />}>
          <TaskCompleteModal
            task={completingTask.task}
            onConfirm={() => handleArchiveTask(completingTask.task, completingTask.sourceId)}
          />
        </Suspense>
      )}

      {viewingImageIndex !== null && (
        <Suspense fallback={<ModalLoading />}>
          <ImageViewModal
            images={imagesList.map(({ imageUrl, title }) => ({ imageUrl, title }))}
            currentIndex={viewingImageIndex}
            onClose={() => setViewingImageIndex(null)}
            onNavigate={handleNavigateImage}
          />
        </Suspense>
      )}
    </div>
  );
}
