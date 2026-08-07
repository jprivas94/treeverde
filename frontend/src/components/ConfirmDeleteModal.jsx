import { useEffect } from 'react';

// ─── ConfirmDeleteModal ────────────────────────────────────────────────
// Modal de confirmación para eliminar una tarea: pregunta si el usuario
// está seguro y ofrece Aceptar (elimina) o Cancelar (vuelve al board).
// Se cierra con ESC o clic en el overlay (equivale a Cancelar).
export default function ConfirmDeleteModal({ task, onConfirm, onCancel, loading = false }) {
  // Cerrar con tecla ESC (bloqueado mientras se elimina)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, loading]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      {/* Overlay: clic fuera cancela (bloqueado mientras se elimina) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!loading) onCancel(); }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-label="Confirmar eliminación" aria-busy={loading}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl mx-auto max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header con gradiente rojo */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-6 text-center">
          <div className="text-4xl mb-2">🗑️</div>
          <h2 className="text-lg font-bold text-white">¿Eliminar tarea?</h2>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
            ¿Estás seguro de que quieres eliminar la tarea{' '}
            <strong className="text-gray-900 dark:text-gray-100">«{task.title}»</strong>?
            Esta acción no se puede deshacer.
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
              ) : 'Aceptar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
