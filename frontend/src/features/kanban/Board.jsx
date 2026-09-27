import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import useKanbanStore from '../../store/kanbanStore';
import { getUserColor } from '../../shared/constants/kanbanConfig';
import { isCreator, isSharedUser } from '../../shared/utils/tasks';
import LazyModal from '../../shared/ui/LazyModal';
import TreeSpinner from '../../shared/ui/TreeSpinner';
import useImageGallery from '../tasks/useImageGallery';
import { refreshBoards } from '../boards/boardService';
import BoardHeader from './BoardHeader';
import Column from './Column';
import ColumnNav from './ColumnNav';
import { TasksLoading, EmptyBoard, LoadMoreButton } from './BoardStates';
import useBoardTasks from './useBoardTasks';
import useTaskActions from './useTaskActions';
import useColumnScroll from './useColumnScroll';

// ─── Code-splitting: modales y paneles secundarios se cargan bajo demanda ──
const CreateTaskModal = lazy(() => import('../tasks/CreateTaskModal'));
const EditTaskModal = lazy(() => import('../tasks/EditTaskModal'));
const TaskCompleteModal = lazy(() => import('../tasks/TaskCompleteModal'));
const ConfirmDeleteModal = lazy(() => import('../tasks/ConfirmDeleteModal'));
const ImageViewModal = lazy(() => import('../tasks/ImageViewModal'));
const CompletedTasksPanel = lazy(() => import('../history/CompletedTasksPanel'));
const InviteBoardModal = lazy(() => import('../boards/InviteBoardModal'));
const ConfirmClearBoardModal = lazy(() => import('./ConfirmClearBoardModal'));
const GoodbyeModal = lazy(() => import('../profile/GoodbyeModal'));

// ─── Board ────────────────────────────────────────────────────────────
// Vista del tablero Kanban (o del historial). Solo compone: la lógica vive
// en useBoardTasks (carga), useTaskActions (acciones) y useColumnScroll (layout).
export default function Board({ isDark, onToggleTheme, onBackToBoards }) {
  const user = useKanbanStore((s) => s.user);
  const tasks = useKanbanStore((s) => s.tasks);
  const archivedTasks = useKanbanStore((s) => s.archivedTasks);
  const tasksHasMore = useKanbanStore((s) => s.tasksHasMore);
  const boards = useKanbanStore((s) => s.boards);
  const activeBoardId = useKanbanStore((s) => s.activeBoardId);
  const getColumns = useKanbanStore((s) => s.getColumns);
  const logout = useKanbanStore((s) => s.logout);

  const activeBoard = useMemo(() => boards.find((b) => b.id === activeBoardId) || null, [boards, activeBoardId]);
  // La columna Terminado se muestra vacía: las archivadas viven en el historial.
  const columns = useMemo(() => getColumns(tasks), [getColumns, tasks]);

  const [showHistory, setShowHistory] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'view' | 'invite', task? }
  const [showGoodbye, setShowGoodbye] = useState(false);
  const closeModal = () => setModal(null);

  const { loading, loadingMore, loadMore } = useBoardTasks();
  const actions = useTaskActions();
  const layout = useColumnScroll(columns.length, tasks);
  const gallery = useImageGallery(tasks);

  // Despedida: cerrar sesión 2s después de mostrar el modal
  useEffect(() => {
    if (!showGoodbye) return undefined;
    const timer = setTimeout(logout, 2000);
    return () => clearTimeout(timer);
  }, [showGoodbye, logout]);

  // Los usuarios solo compartidos ven la tarea (y marcan subtareas); el resto la edita
  const openTask = (task) =>
    setModal(isSharedUser(task, user) ? { type: 'view', task, shared: true } : { type: 'edit', task });

  const isEmpty = tasks.length === 0 && archivedTasks.length === 0 && !tasksHasMore;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      <BoardHeader
        activeBoard={activeBoard}
        showHistory={showHistory}
        columnNav={{ columns, activeColumn: layout.activeColumn, onSelect: layout.scrollToColumn }}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onLogout={() => setShowGoodbye(true)}
        onBackToBoards={onBackToBoards}
        onToggleHistory={() => setShowHistory((v) => !v)}
        onInvite={() => setModal({ type: 'invite' })}
        onClear={() => actions.requestClear(activeBoard ? 'board' : 'all')}
        onAddTask={() => setModal({ type: 'create' })}
      />

      {loading ? (
        <TasksLoading />
      ) : showHistory ? (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><TreeSpinner size="lg" /></div>}>
          <CompletedTasksPanel tasks={tasks} archivedTasks={archivedTasks} onEditTask={(task) => setModal({ type: 'view', task })} />
        </Suspense>
      ) : (
        <>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tablero</h2>
          </div>

          {isEmpty ? (
            <EmptyBoard onAddTask={() => setModal({ type: 'create' })} />
          ) : (
            <>
              <DragDropContext onDragEnd={actions.onDragEnd}>
                <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 min-h-0">
                  <div
                    ref={layout.scrollRef}
                    onScroll={layout.handleScroll}
                    className="flex gap-4 sm:gap-5 overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory sm:snap-none pb-2 sm:pb-0 scroll-smooth column-scroll flex-1 h-full"
                  >
                    {columns.map((column) => (
                      <Column
                        key={column.id}
                        column={column}
                        onEditTask={openTask}
                        onMoveTask={actions.moveTask}
                        onViewImage={gallery.openForTask}
                        onDeleteTask={actions.requestDelete}
                        canDeleteForTask={(task) => isCreator(task, user)}
                        isSharedUserForTask={(task) => isSharedUser(task, user)}
                        fixedHeight={column.id !== 'TODO' ? layout.referenceHeight : undefined}
                        todoRef={column.id === 'TODO' ? layout.todoColumnRef : undefined}
                      />
                    ))}
                  </div>
                  <ColumnNav variant="dots" columns={columns} activeColumn={layout.activeColumn} onSelect={layout.scrollToColumn} />
                </div>
              </DragDropContext>

              {tasksHasMore && <LoadMoreButton loading={loadingMore} onClick={loadMore} />}
            </>
          )}
        </>
      )}

      {/* ─── Modales ─── */}
      <LazyModal>
        {modal?.type === 'create' && <CreateTaskModal onClose={closeModal} />}
        {modal?.type === 'edit' && <EditTaskModal task={modal.task} onClose={closeModal} />}
        {modal?.type === 'view' && (
          modal.shared
            ? <EditTaskModal task={modal.task} onClose={closeModal} sharedView userColor={getUserColor(user.id)} />
            : <EditTaskModal task={modal.task} onClose={closeModal} readOnly />
        )}
        {modal?.type === 'invite' && activeBoard && (
          <InviteBoardModal board={activeBoard} onClose={closeModal} onMembersChanged={refreshBoards} />
        )}
        {actions.deletingTask && (
          <ConfirmDeleteModal task={actions.deletingTask} onConfirm={actions.confirmDelete} onCancel={actions.cancelDelete} loading={actions.busy} />
        )}
        {actions.completing && <TaskCompleteModal task={actions.completing.task} onConfirm={actions.confirmArchive} />}
        {actions.clearScope && (
          <ConfirmClearBoardModal
            boardName={activeBoard?.name || ''}
            scope={actions.clearScope}
            taskCount={actions.clearScope === 'all' ? tasks.length + archivedTasks.length : tasks.length}
            onConfirm={actions.confirmClear}
            onCancel={actions.cancelClear}
            loading={actions.busy}
          />
        )}
        {gallery.isOpen && <ImageViewModal {...gallery.modalProps} />}
        {showGoodbye && <GoodbyeModal />}
      </LazyModal>
    </div>
  );
}
