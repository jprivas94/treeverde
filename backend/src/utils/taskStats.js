// ─── Estadísticas de tareas (panel de proyectos) ──────────────────────
// Resume una lista de tareas { status, dueDate, updatedAt } para el panel:
// pendientes, terminadas, vencidas, que vencen en los próximos 7 días y
// fecha de la última actividad.

const DONE_STATUSES = new Set(['DONE', 'ARCHIVED']);
const DUE_SOON_DAYS = 7;

export function summarizeTasks(tasks, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueSoonLimit = new Date(startOfToday);
  dueSoonLimit.setDate(dueSoonLimit.getDate() + DUE_SOON_DAYS);

  const stats = { total: tasks.length, pending: 0, done: 0, overdue: 0, dueSoon: 0, lastActivity: null };

  for (const t of tasks) {
    if (DONE_STATUSES.has(t.status)) {
      stats.done++;
    } else {
      stats.pending++;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (due < startOfToday) stats.overdue++;
        else if (due < dueSoonLimit) stats.dueSoon++;
      }
    }
    if (t.updatedAt && (!stats.lastActivity || new Date(t.updatedAt) > new Date(stats.lastActivity))) {
      stats.lastActivity = new Date(t.updatedAt).toISOString();
    }
  }
  return stats;
}
