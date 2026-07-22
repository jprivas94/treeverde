import { useMemo } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function fmt(d) {
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysDiff(d1, d2) {
  const diff = d2.getTime() - d1.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function getTaskStatus(task) {
  const due = formatDate(task.dueDate);
  const completed = formatDate(task.completedAt || task.archivedAt || task.updatedAt);
  if (!completed || !due) return null;

  const diff = daysDiff(due, completed);
  if (diff < 0) {
    const early = Math.abs(diff);
    return {
      label: early <= 1 ? 'Anticipado' : `${early} días antes`,
      badge: 'Anticipado',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      rowColor: 'bg-emerald-50/50 hover:bg-emerald-50',
      diff: diff
    };
  } else if (diff === 0) {
    return {
      label: 'Justo a tiempo',
      badge: 'A tiempo',
      badgeColor: 'bg-blue-100 text-blue-700',
      rowColor: 'bg-blue-50/30 hover:bg-blue-50',
      diff: 0
    };
  } else {
    return {
      label: `${diff} día${diff !== 1 ? 's' : ''} después`,
      badge: 'Vencido',
      badgeColor: 'bg-red-100 text-red-700',
      rowColor: 'bg-red-50/30 hover:bg-red-50',
      diff: diff
    };
  }
}

const priorityConfig = {
  LOW: { label: 'Baja', class: 'text-green-600 bg-green-100' },
  MEDIUM: { label: 'Media', class: 'text-amber-600 bg-amber-100' },
  HIGH: { label: 'Alta', class: 'text-orange-600 bg-orange-100' },
  CRITICAL: { label: 'Crítica', class: 'text-red-600 bg-red-100' },
};

export default function CompletedTasksPanel({ tasks, archivedTasks, onEditTask, currentUser }) {
  const { completedData, pendingData } = useMemo(() => {
    // ── Completadas ────────────────────────────
    const doneTasks = tasks.filter((t) => t.status === 'DONE');
    const allCompleted = [...doneTasks, ...(archivedTasks || [])];

    const completedGrouped = {};
    allCompleted.forEach((task) => {
      const name = task.assignee ? task.assignee.name : 'Sin asignar';
      if (!completedGrouped[name]) completedGrouped[name] = [];
      completedGrouped[name].push(task);
    });

    const completedStats = {};
    Object.entries(completedGrouped).forEach(([name, userTasks]) => {
      let early = 0, onTime = 0, overdue = 0, noDue = 0;
      userTasks.forEach((t) => {
        const info = getTaskStatus(t);
        if (!info) { noDue++; return; }
        if (info.diff < 0) early++;
        else if (info.diff === 0) onTime++;
        else overdue++;
      });
      completedStats[name] = { total: userTasks.length, early, onTime, overdue, noDue };
    });

    // ── Pendientes ────────────────────────────
    const pendingTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS');
    const pendingGrouped = {};
    pendingTasks.forEach((task) => {
      const name = task.assignee ? task.assignee.name : 'Sin asignar';
      if (!pendingGrouped[name]) pendingGrouped[name] = [];
      pendingGrouped[name].push(task);
    });

    const pendingStats = {};
    Object.entries(pendingGrouped).forEach(([name, userTasks]) => {
      pendingStats[name] = { total: userTasks.length };
    });

    return {
      completedData: { all: allCompleted, grouped: completedGrouped, stats: completedStats },
      pendingData: { all: pendingTasks, grouped: pendingGrouped, stats: pendingStats }
    };
  }, [tasks, archivedTasks]);

  const currentUserName = currentUser?.name || '';
  const allUsers = new Set([
    ...Object.keys(completedData.grouped),
    ...Object.keys(pendingData.grouped)
  ]);
  const sortedUsers = [...allUsers].sort((a) => (a === currentUserName ? -1 : 1));

  const totalCompleted = completedData.all.length;
  const totalPending = pendingData.all.length;

  if (totalCompleted === 0 && totalPending === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Historial de Tareas</h2>
          <p className="text-sm text-gray-500">No hay tareas aún.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header global */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">📊 Panel de Tareas</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalCompleted} completa{totalCompleted !== 1 ? 'das' : 'da'} • {totalPending} pendiente{totalPending !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {sortedUsers.map((userName) => {
          const isCurrentUser = userName === currentUserName;
          const pendingTasks = pendingData.grouped[userName] || [];
          const completedTasks = completedData.grouped[userName] || [];
          const pendingStats = pendingData.stats[userName] || { total: 0 };
          const completedStats = completedData.stats[userName] || { total: 0, early: 0, onTime: 0, overdue: 0 };

          if (pendingTasks.length === 0 && completedTasks.length === 0) return null;

          return (
            <div key={userName} className="space-y-3">
              {/* ── Encabezado del usuario ── */}
              <div className={`flex items-center gap-3 px-1 ${isCurrentUser ? '' : 'opacity-60'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  isCurrentUser ? 'bg-emerald-500' : 'bg-gray-400'
                }`}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-gray-900">{userName}</span>
                {isCurrentUser && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">TÚ</span>
                )}
                <span className="text-xs text-gray-400">
                  {completedStats.total} completa{completedStats.total !== 1 ? 'das' : ''} • {pendingStats.total} pendiente{pendingStats.total !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ── PENDIENTES ── */}
              {pendingTasks.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-2 bg-gradient-to-r from-amber-50 to-white flex items-center gap-2 border-b border-amber-100">
                    <span className="text-sm">⏳</span>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Por Terminar</span>
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-auto">
                      {pendingTasks.length} tarea{pendingTasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-amber-100 bg-amber-50/50">
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Tarea</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider hidden sm:table-cell">Creador</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider hidden sm:table-cell">Prioridad</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider hidden md:table-cell">Fecha límite</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Estado</th>
                          <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider hidden sm:table-cell">Restan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                        {pendingTasks.map((task) => {
                          const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                          const due = formatDate(task.dueDate);
                          const daysRemaining = due ? daysDiff(new Date(), due) : null;
                          const isOverdue = daysRemaining !== null && daysRemaining < 0;

                          return (
                            <tr
                              key={task.id}
                              onClick={() => onEditTask?.(task)}
                              className="transition cursor-pointer hover:bg-amber-50/50"
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-400 animate-pulse' : 'bg-gray-300'
                                  }`} />
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                    {task.description && (
                                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell">
                                {task.creator ? (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                      {task.creator.name.charAt(0).toUpperCase()}
                                    </span>
                                    {task.creator.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priority.class}`}>
                                  {priority.label}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell">
                                <span className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                                  {due ? fmt(due) : '—'}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  task.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {task.status === 'IN_PROGRESS' ? 'En progreso' : 'Por hacer'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right hidden sm:table-cell">
                                {daysRemaining !== null ? (
                                  <span className={`text-xs font-semibold ${
                                    isOverdue ? 'text-red-500' :
                                    daysRemaining <= 2 ? 'text-amber-600' :
                                    'text-emerald-600'
                                  }`}>
                                    {isOverdue
                                      ? `⚠️ ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) !== 1 ? 's' : ''} atrasado`
                                      : daysRemaining === 0
                                      ? 'Hoy vence'
                                      : `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`
                                    }
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">Sin fecha</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── COMPLETADAS ── */}
              {completedTasks.length > 0 && (
                <div className={`rounded-xl border overflow-hidden ${
                  isCurrentUser
                    ? 'border-emerald-200 bg-white shadow-md'
                    : 'border-gray-200 bg-white/80 shadow-sm'
                }`}>
                  <div className={`px-5 py-2 flex items-center gap-2 border-b ${
                    isCurrentUser ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className="text-sm">✅</span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Completadas</span>
                    <div className="ml-auto flex items-center gap-2 text-[11px]">
                      {completedStats.early > 0 && (
                        <span className="font-semibold text-emerald-600">🏆 {completedStats.early}</span>
                      )}
                      {completedStats.onTime > 0 && (
                        <span className="font-semibold text-blue-600">✅ {completedStats.onTime}</span>
                      )}
                      {completedStats.overdue > 0 && (
                        <span className="font-semibold text-red-500">⚠️ {completedStats.overdue}</span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tarea</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Creador</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Prioridad</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Fecha límite</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Completado</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {completedTasks.map((task) => {
                          const info = getTaskStatus(task);
                          const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                          const due = formatDate(task.dueDate);
                          const completed = formatDate(task.completedAt || task.archivedAt || task.updatedAt);

                          return (
                            <tr
                              key={task.id}
                              onClick={() => onEditTask?.(task)}
                              className={`transition cursor-pointer ${
                                info ? info.rowColor : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    task.priority === 'CRITICAL' ? 'bg-red-400' :
                                    task.priority === 'HIGH' ? 'bg-orange-400' :
                                    task.priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-green-400'
                                  }`} />
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                    {task.description && (
                                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell">
                                {task.creator ? (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                      {task.creator.name.charAt(0).toUpperCase()}
                                    </span>
                                    {task.creator.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priority.class}`}>
                                  {priority.label}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden lg:table-cell">
                                <span className="text-sm text-gray-600">{due ? fmt(due) : '—'}</span>
                              </td>
                              <td className="px-5 py-3 hidden lg:table-cell">
                                <span className="text-sm text-gray-600">{completed ? fmt(completed) : '—'}</span>
                              </td>
                              <td className="px-5 py-3">
                                {info ? (
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${info.badgeColor}`}>
                                    {info.badge}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                {info ? (
                                  <span className={`text-xs font-semibold ${
                                    info.diff < 0 ? 'text-emerald-600' :
                                    info.diff === 0 ? 'text-blue-600' : 'text-red-500'
                                  }`}>
                                    {info.label}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
