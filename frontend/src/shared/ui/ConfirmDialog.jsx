import useEscapeKey from '../hooks/useEscapeKey';
import Spinner from './Spinner';

// ─── ConfirmDialog ────────────────────────────────────────────────────
// Confirmación de acciones destructivas (eliminar tarea, vaciar tablero,
// eliminar tablero): header rojo, ESC/overlay = cancelar, spinner mientras
// `loading` (que además bloquea el cierre).
export default function ConfirmDialog({ icon, title, ariaLabel, confirmLabel = 'Aceptar', loading = false, onConfirm, onCancel, children }) {
  const cancel = () => { if (!loading) onCancel(); };
  useEscapeKey(cancel);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancel} />

      <div role="dialog" aria-modal="true" aria-label={ariaLabel} aria-busy={loading}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl mx-auto max-w-md w-full overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-6 text-center">
          <div className="text-4xl mb-2">{icon}</div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">{children}</p>

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
              {loading ? <><Spinner className="w-3.5 h-3.5 border-white" /> Eliminando...</> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Texto resaltado dentro del mensaje de confirmación.
export function Strong({ children }) {
  return <strong className="text-gray-900 dark:text-gray-100">{children}</strong>;
}
