import { useEffect } from 'react';

// ─── ConfirmClearBoardModal ───────────────────────────────────────────
// Modal de confirmación para eliminar todas las tareas de golpe: vaciar
// un tablero concreto (scope 'board') o todas las tareas del usuario
// (scope 'all', vista "Todas las tareas"). Patrón visual de
// ConfirmDeleteModal: header rojo, ESC/overlay = cancelar, spinner.
export default function ConfirmClearBoardModal({ boardName, scope = 'board', taskCount = 0, onConfirm, onCancel, loading = false }) {
  // Cerrar con tecla ESC (bloqueado mientras se eliminan las tareas)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, loading]);

  const isAll = scope === 'all';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      {/* Overlay: clic fuera cancela (bloqueado mientras se eliminan) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!loading) onCancel(); }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-label={isAll ? 'Confirmar eliminación de todas las tareas' : 'Confirmar vaciado del tablero'} aria-busy={loading}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl mx-auto max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header con gradiente rojo */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-6 text-center">
          <div className="text-4xl mb-2">{isAll ? '🗑️' : '🧹'}</div>
          <h2 className="text-lg font-bold text-white">{isAll ? '¿Eliminar todas tus tareas?' : '¿Vaciar el tablero?'}</h2>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
            {isAll ? (
              <>
                Se eliminarán <strong className="text-gray-900 dark:text-gray-100">todas tus tareas</strong> (activas y archivadas)
                {taskCount > 0 && <>: <strong className="text-gray-900 dark:text-gray-100">{taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}</strong></>}.{' '}
                Las tareas asignadas por otras personas o solo compartidas contigo no se ven afectadas. Esta acción no se puede deshacer.
              </>
            ) : (
              <>
                Se eliminarán <strong className="text-gray-900 dark:text-gray-100">todas las tareas</strong> del tablero{' '}
                <strong className="text-gray-900 dark:text-gray-100">«{boardName}»</strong>
                {taskCount > 0 && <> ({taskCount} {taskCount === 1 ? 'tarea' : 'tareas'})</>}.{' '}
                Esta acción no se puede deshacer.
              </>
            )}
          </p>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              autoFocus
              className="py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { if (!loading) onConfirm(); }}
              disabled={loading}
              className="py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-wait text-white rounded-xl transition shadow-lg shadow-red-600/25 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Eliminando...
                </>
              ) : (isAll ? 'Eliminar todo' : 'Eliminar todas')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
