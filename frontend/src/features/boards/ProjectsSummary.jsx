// Saludo + métricas del panel de proyectos. Cada métrica tiene su color
// (tinte suave de fondo + burbuja de icono saturada) para darle vida al panel.
const METRICS = [
  { key: 'projects', label: 'Proyectos', icon: '🗂', card: 'bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900', bubble: 'bg-violet-500', value: 'text-violet-700 dark:text-violet-300' },
  { key: 'pending', label: 'Pendientes', icon: '📌', card: 'bg-sky-50 border-sky-100 dark:bg-sky-950/40 dark:border-sky-900', bubble: 'bg-sky-500', value: 'text-sky-700 dark:text-sky-300' },
  { key: 'dueSoon', label: 'Vencen pronto', icon: '⏰', card: 'bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900', bubble: 'bg-amber-500', value: 'text-amber-700 dark:text-amber-300' },
  { key: 'done', label: 'Terminadas', icon: '✅', card: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900', bubble: 'bg-emerald-500', value: 'text-emerald-700 dark:text-emerald-300' },
];

export default function ProjectsSummary({ userName, projectCount, summary, onCreate }) {
  const values = { projects: projectCount, pending: summary.pending, dueSoon: summary.dueSoon, done: summary.done };
  const firstName = (userName || '').split(' ')[0];

  return (
    <section className="mb-6 sm:mb-8">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-violet-500 bg-clip-text text-transparent">
              ¡Hola{firstName ? `, ${firstName}` : ''}!
            </span>{' '}
            <span aria-hidden="true">👋</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {summary.pending > 0
              ? <>Tienes <strong className="text-gray-800 dark:text-gray-200">{summary.pending} {summary.pending === 1 ? 'tarea pendiente' : 'tareas pendientes'}</strong>{summary.overdue > 0 && <> · <span className="text-rose-600 dark:text-rose-400 font-semibold">{summary.overdue} {summary.overdue === 1 ? 'vencida' : 'vencidas'}</span></>}</>
              : 'Estás al día. Elige un proyecto para seguir avanzando.'}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5"
        >
          <span className="text-lg leading-none">+</span> Nuevo proyecto
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((m) => (
          <div key={m.key} data-testid={`metric-${m.key}`} className={`flex items-center gap-3 rounded-2xl border p-3 sm:p-4 ${m.card}`}>
            <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg shadow-sm ${m.bubble}`} aria-hidden="true">{m.icon}</span>
            <div className="min-w-0">
              <p className={`text-2xl font-bold leading-none ${m.value}`}>{values[m.key]}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{m.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
