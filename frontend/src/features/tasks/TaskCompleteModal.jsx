import { useEffect } from 'react';
import useEscapeKey from '../../shared/hooks/useEscapeKey';

const DAY_MS = 1000 * 60 * 60 * 24;
const dateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const plural = (n) => `${n} día${n !== 1 ? 's' : ''}`;

// Estilos según el resultado: a tiempo / con retraso / sin fecha límite
const TONES = {
  early: {
    emoji: '🎉', title: '¡Tarea completada a tiempo!', gradient: 'from-emerald-400 to-teal-500',
    box: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
    badge: 'from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200 dark:from-emerald-950/60 dark:to-teal-950/60 dark:text-emerald-300 dark:border-emerald-900',
    button: 'bg-emerald-600 hover:bg-emerald-700', buttonLabel: '🎉 Entendido',
  },
  late: {
    emoji: '⚠️', title: 'Tarea completada con retraso', gradient: 'from-red-400 to-rose-500',
    box: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900',
    badge: 'from-red-100 to-rose-100 text-red-800 border-red-200 dark:from-red-950/60 dark:to-rose-950/60 dark:text-red-300 dark:border-red-900',
    button: 'bg-indigo-600 hover:bg-indigo-700', buttonLabel: 'Entendido',
  },
  nodate: {
    emoji: '📋', title: 'Tarea completada', gradient: 'from-blue-400 to-indigo-500',
    box: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900',
    badge: 'from-blue-100 to-indigo-100 text-blue-800 border-blue-200 dark:from-blue-950/60 dark:to-indigo-950/60 dark:text-blue-300 dark:border-blue-900',
    button: 'bg-blue-600 hover:bg-blue-700', buttonLabel: 'Entendido',
  },
};

const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

// ─── TaskCompleteModal ────────────────────────────────────────────────
// Resumen al finalizar una tarea (¿a tiempo o con retraso?). Se confirma
// con el botón, ESC, clic fuera o automáticamente a los 5 segundos.
export default function TaskCompleteModal({ task, onConfirm }) {
  useEscapeKey(onConfirm);
  useEffect(() => {
    const timer = setTimeout(onConfirm, 5000);
    return () => clearTimeout(timer);
  }, [onConfirm]);

  // Días entre la fecha límite y la de completado (o hoy si no pasó por DONE)
  let tone = 'nodate';
  let diffDays = 0;
  if (task.dueDate) {
    const due = dateOnly(new Date(task.dueDate));
    const done = dateOnly(task.completedAt ? new Date(task.completedAt) : new Date());
    diffDays = Math.round((done - due) / DAY_MS);
    tone = done <= due ? 'early' : 'late';
  }
  const t = TONES[tone];
  const days = Math.abs(diffDays);

  const result = {
    early: ['🏆', `¡Completado ${diffDays === 0 ? 'el mismo día' : `${plural(days)} antes de la fecha`}!`],
    late: ['⏰', `Completado con ${plural(days)} de retraso`],
    nodate: ['📌', 'Tarea sin fecha límite'],
  }[tone];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onConfirm} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl mx-4 max-w-md w-full overflow-hidden animate-scale-in">
        <div className={`bg-gradient-to-r ${t.gradient} px-6 py-8 text-center`}>
          <div className="text-5xl mb-3">{t.emoji}</div>
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Tarea</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{task.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[['📅 Fecha límite', task.dueDate], ['✅ Completado', task.completedAt]].map(([label, date]) => (
              <div key={label} className={`p-3 rounded-xl border ${t.box}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(date)}</p>
              </div>
            ))}
          </div>

          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border bg-gradient-to-r ${t.badge}`}>
            <span className="text-lg">{result[0]}</span>
            <span className="text-sm font-semibold">{result[1]}</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onConfirm} className={`w-full py-2.5 text-white font-semibold rounded-xl transition ${t.button}`}>
            {t.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
