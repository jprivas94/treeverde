export default function TaskCompleteModal({ task, onCancel }) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;

  let completedEarly = false;
  let completedLate = false;
  let diffDays = 0;

  if (dueDate && completedAt) {
    // Comparar solo fechas (sin hora)
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const done = new Date(completedAt.getFullYear(), completedAt.getMonth(), completedAt.getDate());
    diffDays = Math.round((done - due) / (1000 * 60 * 60 * 24));
    completedEarly = done <= due;
    completedLate = done > due;
  } else if (dueDate && !completedAt) {
    // No hay completedAt (no pasó por DONE) - usar fecha actual
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    diffDays = Math.round((today - due) / (1000 * 60 * 60 * 24));
    completedEarly = today <= due;
    completedLate = today > due;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // Determinar estilo según resultado
  const emoji = completedEarly ? '🎉' : completedLate ? '⚠️' : '📋';
  const title = completedEarly ? '¡Tarea completada a tiempo!' : completedLate ? 'Tarea completada con retraso' : 'Tarea completada';
  const gradient = completedEarly
    ? 'from-emerald-400 to-teal-500'
    : completedLate
    ? 'from-red-400 to-rose-500'
    : 'from-blue-400 to-indigo-500';
  const badgeGradient = completedEarly
    ? 'from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200'
    : completedLate
    ? 'from-red-100 to-rose-100 text-red-800 border-red-200'
    : 'from-blue-100 to-indigo-100 text-blue-800 border-blue-200';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl mx-4 max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header con gradiente */}
        <div className={`bg-gradient-to-r ${gradient} px-6 py-8 text-center`}>
          <div className="text-5xl mb-3">{emoji}</div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          {/* Nombre de la tarea */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Tarea</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{task.title}</p>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-xl border ${completedEarly ? 'bg-emerald-50 border-emerald-200' : completedLate ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">📅 Fecha límite</p>
              <p className="text-sm font-semibold text-gray-800">{formatDate(task.dueDate)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${completedEarly ? 'bg-emerald-50 border-emerald-200' : completedLate ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">✅ Completado</p>
              <p className="text-sm font-semibold text-gray-800">{formatDate(task.completedAt)}</p>
            </div>
          </div>

          {/* Resultado */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border bg-gradient-to-r ${badgeGradient}`}>
            {completedEarly && (
              <>
                <span className="text-lg">🏆</span>
                <span className="text-sm font-semibold">
                  ¡Completado {diffDays === 0 ? 'el mismo día' : `${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''} antes de la fecha`}!
                </span>
              </>
            )}
            {completedLate && (
              <>
                <span className="text-lg">⏰</span>
                <span className="text-sm font-semibold">
                  Completado con {Math.abs(diffDays)} día{Math.abs(diffDays) !== 1 ? 's' : ''} de retraso
                </span>
              </>
            )}
            {!completedEarly && !completedLate && (
              <>
                <span className="text-lg">📌</span>
                <span className="text-sm font-semibold">
                  Tarea sin fecha límite
                </span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onCancel}
            className={`w-full py-2.5 text-white font-semibold rounded-xl transition ${
              completedEarly
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : completedLate
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {completedEarly ? '🎉 Entendido' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
}
