import { useState, lazy } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import { boardsApi } from '../../shared/services/api';
import ConfirmDialog, { Strong } from '../../shared/ui/ConfirmDialog';
import LazyModal from '../../shared/ui/LazyModal';
import AppHeader from '../layout/AppHeader';
import ProjectRow, { ProgressBar } from './ProjectRow';
import ProjectsSummary from './ProjectsSummary';
import useProjectsSummary from './useProjectsSummary';
import BoardFormModal from './BoardFormModal';
import { refreshBoards } from './boardService';

const InviteBoardModal = lazy(() => import('./InviteBoardModal'));

const SCOPES = [['all', 'Todos'], ['mine', 'Míos'], ['shared', 'Compartidos']];

// ─── BoardsPanel ──────────────────────────────────────────────────────
// Panel de proyectos (pantalla inicial): resumen con métricas, buscador con
// filtros y lista de proyectos con su progreso. Crear/editar/invitar/eliminar.
export default function BoardsPanel({ isDark, onToggleTheme, onSelectBoard, onSelectAll }) {
  const user = useKanbanStore((s) => s.user);
  const boards = useKanbanStore((s) => s.boards);
  const logout = useKanbanStore((s) => s.logout);
  // Diálogo abierto: { type: 'create' | 'edit' | 'invite' | 'delete', board? }
  const [dialog, setDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all'); // all | mine | shared
  const summary = useProjectsSummary();
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

  // Filtro (Todos / Míos / Compartidos) + búsqueda por nombre o descripción
  const q = search.trim().toLowerCase();
  const visibleBoards = boards
    .filter((b) => scope === 'all' || (scope === 'mine' ? b.ownerId === user?.id : b.ownerId !== user?.id))
    .filter((b) => !q || `${b.name} ${b.description || ''}`.toLowerCase().includes(q));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/70 via-gray-50 to-violet-50/70 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <AppHeader
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onLogout={() => logout()}
        left={
          <span className="hidden sm:inline-block text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
            Mis Proyectos
          </span>
        }
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <ProjectsSummary userName={user?.name} projectCount={boards.length} summary={summary} onCreate={openCreate} />

        {/* Buscador + filtros */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proyecto"
              aria-label="Buscar proyecto"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 transition"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" role="group" aria-label="Filtrar proyectos">
            {SCOPES.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                aria-pressed={scope === value}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  scope === value
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Todas las tareas (sin filtro de proyecto) */}
          <button
            onClick={onSelectAll}
            className="group w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 text-left rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xl group-hover:scale-105 transition" aria-hidden="true">📋</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">Todas las tareas</p>
              <ProgressBar done={summary.done} total={summary.total} gradient="from-emerald-500 via-teal-500 to-violet-500" />
            </div>
            {summary.personal > 0 && (
              <span className="hidden sm:inline text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                👤 {summary.personal} {summary.personal === 1 ? 'personal' : 'personales'}
              </span>
            )}
            <span className="w-8 text-center text-emerald-400 group-hover:text-emerald-600 transition" aria-hidden="true">›</span>
          </button>

          {visibleBoards.map((board) => (
            <ProjectRow
              key={board.id}
              board={board}
              isOwner={board.ownerId === user?.id}
              onOpen={onSelectBoard}
              onInvite={(b) => setDialog({ type: 'invite', board: b })}
              onEdit={(b) => setDialog({ type: 'edit', board: b })}
              onDelete={(b) => setDialog({ type: 'delete', board: b })}
            />
          ))}

          {visibleBoards.length === 0 && (
            <div className="text-center py-10 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-3xl mb-2" aria-hidden="true">{boards.length === 0 ? '🌱' : '🔎'}</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {boards.length === 0 ? 'Crea tu primer proyecto' : 'Ningún proyecto coincide'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {boards.length === 0 ? 'Agrupa tus tareas e invita a tu equipo.' : 'Prueba con otro nombre o cambia el filtro.'}
              </p>
            </div>
          )}
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
          ariaLabel="Confirmar eliminación del proyecto"
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={close}
        >
          Se eliminará el proyecto y <Strong>todas sus tareas</Strong>. Esta acción no se puede deshacer.
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
