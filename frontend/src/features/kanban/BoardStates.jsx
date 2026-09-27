import TreeLogo from '../../shared/ui/TreeLogo';
import TreeSpinner from '../../shared/ui/TreeSpinner';

// Estados del contenido del tablero: cargando, vacío y "Cargar más".

export function TasksLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-5">
        <TreeSpinner size="xl" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cargando tareas</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Obteniendo tus tareas del servidor...</p>
        </div>
        <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full animate-loading-bar" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  );
}

export function EmptyBoard({ onAddTask }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center mb-5">
        <TreeLogo className="w-11 h-11 sm:w-14 sm:h-14 text-emerald-500" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No hay tareas visibles</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        Aún no tienes tareas creadas, asignadas o compartidas contigo.
        ¡Crea tu primera tarea para empezar!
      </p>
      <button
        onClick={onAddTask}
        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
      >
        + Crear primera tarea
      </button>
    </div>
  );
}

export function LoadMoreButton({ loading, onClick }) {
  return (
    <div className="flex justify-center pb-3">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-emerald-700 dark:text-emerald-400 rounded-xl shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <><TreeSpinner size="xs" /> Cargando...</> : <><span>⬇️</span> Cargar más tareas</>}
      </button>
    </div>
  );
}
