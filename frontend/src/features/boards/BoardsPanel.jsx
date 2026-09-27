import { useState, lazy } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import { boardsApi } from '../../shared/services/api';
import ConfirmDialog, { Strong } from '../../shared/ui/ConfirmDialog';
import LazyModal from '../../shared/ui/LazyModal';
import AppHeader from '../layout/AppHeader';
import BoardCard from './BoardCard';
import BoardFormModal from './BoardFormModal';
import { refreshBoards } from './boardService';

const InviteBoardModal = lazy(() => import('./InviteBoardModal'));

// ─── BoardsPanel ──────────────────────────────────────────────────────
// Pantalla inicial tras iniciar sesión: lista los tableros donde el usuario
// es dueño o miembro, permite abrir uno y crear/editar/eliminar tableros.
export default function BoardsPanel({ isDark, onToggleTheme, onSelectBoard, onSelectAll }) {
  const user = useKanbanStore((s) => s.user);
  const boards = useKanbanStore((s) => s.boards);
  const logout = useKanbanStore((s) => s.logout);
  // Diálogo abierto: { type: 'create' | 'edit' | 'invite' | 'delete', board? }
  const [dialog, setDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const close = () => setDialog(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await boardsApi.remove(dialog.board.id);
      useKanbanStore.getState().removeBoard(dialog.board.id);
      close();
    } catch {
      // si falla, el diálogo queda abierto para reintentar
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => setDialog({ type: 'create' });

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      <AppHeader
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onLogout={() => logout()}
        left={
          <span className="hidden sm:inline-block text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            Mis tableros
          </span>
        }
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Elige un tablero</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Todos los tableros donde trabajas, en un solo lugar.</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/25 transition flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span> Nuevo tablero
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Todas las tareas (sin filtro de tablero) */}
          <button
            onClick={onSelectAll}
            className="group text-left bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 p-5 transition shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">📋</span>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Todas las tareas</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todo lo tuyo, sin filtro de tablero</p>
              </div>
            </div>
          </button>

          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              isOwner={board.ownerId === user?.id}
              onOpen={onSelectBoard}
              onInvite={(b) => setDialog({ type: 'invite', board: b })}
              onEdit={(b) => setDialog({ type: 'edit', board: b })}
              onDelete={(b) => setDialog({ type: 'delete', board: b })}
            />
          ))}

          <button
            onClick={openCreate}
            className="group flex flex-col items-center justify-center gap-2 min-h-[130px] bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 p-5 transition shadow-sm"
          >
            <span className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl leading-none group-hover:scale-110 transition">+</span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Nuevo tablero</span>
          </button>
        </div>
      </main>

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <BoardFormModal
          board={dialog.board}
          onClose={close}
          onSaved={(saved) => {
            const { addBoard, updateBoard } = useKanbanStore.getState();
            if (dialog.board) updateBoard(saved.id, saved);
            else addBoard(saved);
            close();
          }}
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          icon="🗑"
          title={`¿Eliminar «${dialog.board.name}»?`}
          ariaLabel="Confirmar eliminación del tablero"
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={close}
        >
          Se eliminará el tablero y <Strong>todas sus tareas</Strong>. Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}

      {dialog?.type === 'invite' && (
        <LazyModal>
          <InviteBoardModal board={dialog.board} onClose={close} onMembersChanged={refreshBoards} />
        </LazyModal>
      )}
    </div>
  );
}
