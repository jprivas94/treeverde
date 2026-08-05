// ─── BoardSkeleton ────────────────────────────────────────────────
// Esqueleto del tablero Kanban: se muestra mientras se restaura la
// sesión y se cargan las tareas en paralelo (evita la pantalla de
// carga bloqueante y da feedback visual del layout real).

const SKELETON_COLUMNS = [
  { title: 'Por Hacer', dot: 'bg-amber-400' },
  { title: 'En Progreso', dot: 'bg-blue-400' },
  { title: 'Revisión', dot: 'bg-emerald-400' },
  { title: 'Terminado', dot: 'bg-red-400' },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 pb-2 sm:pb-3 shadow-sm border border-gray-200 space-y-2">
      <div className="flex items-center justify-between">
        <div className="w-16 h-2.5 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-10 h-3.5 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="w-3/4 h-3.5 bg-gray-200 rounded animate-pulse" />
      <div className="w-full h-2.5 bg-gray-100 rounded animate-pulse" />
      <div className="w-2/3 h-2.5 bg-gray-100 rounded animate-pulse" />
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse" />
          <div className="w-8 h-2 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="w-10 h-2.5 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function BoardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header skeleton */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="hidden sm:block w-24 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="hidden sm:inline-block w-16 h-4 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="w-16 sm:w-20 h-8 bg-indigo-200 rounded-lg animate-pulse" />
          <div className="w-16 sm:w-24 h-8 bg-emerald-200 rounded-lg animate-pulse" />
        </div>
      </header>

      {/* Columnas skeleton (scroll horizontal en móvil, igual que el Board real) */}
      <div className="flex-1 flex gap-4 sm:gap-5 p-4 sm:p-6 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
        {SKELETON_COLUMNS.map((col) => (
          <div
            key={col.title}
            className="flex-1 min-w-[220px] bg-gray-50 rounded-2xl p-3 sm:p-4 flex flex-col gap-3"
            aria-hidden="true"
          >
            <div className="flex items-center gap-2 px-1">
              <span className={`w-2.5 h-2.5 rounded-full ${col.dot} opacity-40`} />
              <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
              <div className="ml-auto w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}
