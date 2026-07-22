import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';
import CreateTaskModal from './CreateTaskModal';
import CompletedTasksPanel from './CompletedTasksPanel';
import EditTaskModal from './EditTaskModal';
import GoodbyeModal from './GoodbyeModal';
import TaskCompleteModal from './TaskCompleteModal';
import useKanbanStore from '../store/kanbanStore';
import { tasksApi } from '../services/api';

export default function Board() {
  const { user, logout } = useKanbanStore();
  const tasks = useKanbanStore((s) => s.tasks);
  const archivedTasks = useKanbanStore((s) => s.archivedTasks);
  const setTasks = useKanbanStore((s) => s.setTasks);
  const setShowWelcome = useKanbanStore((s) => s.setShowWelcome);
  const updateTaskStatus = useKanbanStore((s) => s.updateTaskStatus);
  const removeTask = useKanbanStore((s) => s.removeTask);
  const archiveTask = useKanbanStore((s) => s.archiveTask);
  const getColumns = useKanbanStore((s) => s.getColumns);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const menuRef = useRef(null);

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

  const columns = getColumns();

  // Cargar tareas al montar
  useEffect(() => {
    tasksApi.getAll()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setShowWelcome(false));
  }, [setTasks, setShowWelcome]);

  // ─── Drag & Drop handler ──────────────────────
  const onDragEnd = useCallback(async (result) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Si es la columna ARCHIVED (Terminado) → mostrar modal de finalización
    if (destination.droppableId === 'ARCHIVED') {
      const taskToComplete = tasks.find((t) => t.id === draggableId);
      if (taskToComplete) {
        setCompletingTask({ task: taskToComplete, sourceId: source.droppableId });
      }
      return;
    }

    // Optimistic UI: actualizar inmediatamente
    const newStatus = destination.droppableId;
    updateTaskStatus(draggableId, newStatus);

    // Persistir en backend
    try {
      await tasksApi.updateStatus(draggableId, newStatus);
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      // Rollback: revertir al estado anterior
      updateTaskStatus(draggableId, source.droppableId);
    }
  }, [updateTaskStatus, tasks, setCompletingTask]);

  // ─── Handlers ─────────────────────────────────
  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleCancelComplete = (task, sourceId) => {
    // También archiva al cerrar: la tarea se archiva igualmente
    archiveTask(task);
    removeTask(task.id);
    setCompletingTask(null);
    tasksApi.remove(task.id).catch((err) => {
      console.error('Error al eliminar tarea:', err);
      updateTaskStatus(task.id, sourceId);
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
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <h1 className="text-lg font-bold text-gray-900">Treeverde</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {showHistory ? 'Historial' : 'Tablero'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-3 pr-3 border-r border-gray-200 cursor-pointer hover:opacity-80 transition"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</span>
                  <span className="text-[11px] text-gray-400 leading-tight">{user.email}</span>
                </div>
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fade-scale-in z-50">
                  {/* Cabecera del dropdown */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                  </div>
                  {/* Acciones */}
                  <div className="py-1">
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
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition shadow-sm ${
              showHistory
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {showHistory ? '← Volver' : '📊 Historial'}
          </button>

          {!showHistory && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
            >
              + Añadir Tarea
            </button>
          )}


        </div>
      </header>

      {/* Contenido: Kanban o Historial */}
      {showHistory ? (
        <CompletedTasksPanel tasks={tasks} archivedTasks={archivedTasks} onEditTask={handleEditTask} currentUser={user} />
      ) : (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-hidden p-6">
            <div className="flex gap-5 h-full items-start justify-center">
              {columns.map((column) => (
                <Column key={column.id} column={column} onEditTask={handleEditTask} />
              ))}
            </div>
          </div>
          </DragDropContext>

          {showModal && <CreateTaskModal onClose={() => setShowModal(false)} />}
        </>
      )}

      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />}

      {showGoodbye && <GoodbyeModal />}
      {completingTask && (
        <TaskCompleteModal
          task={completingTask.task}
          onCancel={() => handleCancelComplete(completingTask.task, completingTask.sourceId)}
        />
      )}
    </div>
  );
}
