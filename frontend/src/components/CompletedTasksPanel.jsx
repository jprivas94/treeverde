import { useState, useMemo } from 'react';
import ImageViewModal from './ImageViewModal';
import { PRIORITY_CONFIG } from '../constants/kanbanConfig';
import { parseDate, formatDateFull } from '../utils/date';
import Avatar from './Avatar';

function daysDiff(d1, d2) {
  const diff = d2.getTime() - d1.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function getTaskStatus(task) {
  const due = parseDate(task.dueDate);
  const completed = parseDate(task.completedAt || task.archivedAt || task.updatedAt);
  if (!completed || !due) return null;

  const diff = daysDiff(due, completed);
  if (diff < 0) {
    const early = Math.abs(diff);
    return {
      label: early <= 1 ? 'Anticipado' : `${early} días antes`,
      badge: 'Anticipado',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      rowColor: 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50',
      diff: diff
    };
  } else if (diff === 0) {
    return {
      label: 'Justo a tiempo',
      badge: 'A tiempo',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      rowColor: 'bg-blue-50/30 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
      diff: 0
    };
  } else {
    return {
      label: `${diff} día${diff !== 1 ? 's' : ''} después`,
      badge: 'Vencido',
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      rowColor: 'bg-red-50/30 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/50',
      diff: diff
    };
  }
}

const ITEMS_PER_PAGE = 5;

const PRIORITY_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'LOW', label: 'Baja', cls: 'text-green-600' },
  { value: 'MEDIUM', label: 'Media', cls: 'text-amber-600' },
  { value: 'HIGH', label: 'Alta', cls: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critica', cls: 'text-red-600' },
];

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'early', label: 'Anticipado' },
  { value: 'ontime', label: 'A tiempo' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'nodate', label: 'Sin fecha' },
];

export default function CompletedTasksPanel({ tasks, archivedTasks, onEditTask }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [viewingImageIndex, setViewingImageIndex] = useState(null);

  // Lista de imágenes de todas las tareas del historial
  const historyImagesList = useMemo(() => {
    const allDone = [
      ...tasks.filter((t) => t.status === 'DONE' || t.status === 'ARCHIVED'),
      ...(archivedTasks || []),
    ];
    // Eliminar duplicados por id
    const seen = new Set();
    return allDone
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        const imgs = Array.isArray(t.images) ? t.images.filter(Boolean) : [];
        return imgs.length > 0;
      })
      .flatMap((t) => {
        const imgs = Array.isArray(t.images) ? t.images.filter(Boolean) : [];
        return imgs.map((url) => ({ imageUrl: url, title: t.title }));
      });
  }, [tasks, archivedTasks]);

  const completedData = useMemo(() => {
    const completedTasks = tasks.filter(
      (t) => t.status === 'DONE' || t.status === 'ARCHIVED'
    );
    const allCompleted = [
      ...completedTasks,
      ...(archivedTasks || []).filter(
        (archived) => !completedTasks.some((t) => t.id === archived.id)
      )
    ];

    // Ordenar por última modificación (updatedAt)
    const sorted = [...allCompleted].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Filtrar por busqueda
    const q = search.toLowerCase().trim();
    let filtered = q
      ? sorted.filter((t) => {
          const title = (t.title || '').toLowerCase();
          const desc = (t.description || '').toLowerCase();
          const creator = (t.creator?.name || '').toLowerCase();
          const assignee = (t.assignee?.name || '').toLowerCase();
          const tags = (t.tags || '').toLowerCase();
          return (
            title.includes(q) ||
            desc.includes(q) ||
            creator.includes(q) ||
            assignee.includes(q) ||
            tags.includes(q)
          );
        })
      : sorted;

    // Filtrar por prioridad
    if (priorityFilter) {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    // Filtrar por estado (puntualidad)
    if (statusFilter) {
      filtered = filtered.filter((t) => {
        const info = getTaskStatus(t);
        if (statusFilter === 'nodate') return info === null;
        if (!info) return false;
        if (statusFilter === 'early') return info.diff < 0;
        if (statusFilter === 'ontime') return info.diff === 0;
        if (statusFilter === 'overdue') return info.diff > 0;
        return true;
      });
    }

    return { all: filtered };
  }, [tasks, archivedTasks, search, priorityFilter, statusFilter, sortOrder]);

  const resetPage = () => setPage(1);

  const totalCompleted = completedData.all.length;
  const totalPages = Math.max(1, Math.ceil(totalCompleted / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = completedData.all.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  if (totalCompleted === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto text-center py-10 sm:py-16">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📊</div>
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Historial de Tareas</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {search ? 'No se encontraron tareas con ese criterio.' : 'No hay tareas completadas aun.'}
          </p>
        </div>
      </div>
    );
  }

  return (      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">📊 Historial</h2>
            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
              {totalCompleted} tarea{totalCompleted !== 1 ? 's' : ''} completada{totalCompleted !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">{'\u{1F50D}'}</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Buscar por titulo, creador, etiquetas..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); resetPage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              &times;
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Prioridad */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{'\u{1F7E2}'}</span>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); resetPage(); }}
              className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none max-w-[100px] sm:max-w-none"
            >
              {PRIORITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value} className={f.cls || ''}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{'\u{1F3C6}'}</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
              className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none max-w-[100px] sm:max-w-none"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Orden */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{'\u{1F4C5}'}</span>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); resetPage(); }}
              className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="newest">Mas reciente</option>
              <option value="oldest">Mas antiguo</option>
            </select>
          </div>

          {/* Active filters indicator */}
          {(priorityFilter || statusFilter) && (
            <button
              onClick={() => { setPriorityFilter(''); setStatusFilter(''); setSortOrder('newest'); resetPage(); }}
              className="text-[11px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              {'\u2716'} Limpiar
            </button>
          )}
        </div>

        {/* Tabla de completadas */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-3 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-gray-900 flex items-center gap-1.5 sm:gap-2 border-b border-emerald-100 dark:border-emerald-900">
            <span className="text-[11px] sm:text-sm">✅</span>
            <span className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Completadas</span>
            <span className="ml-auto text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, totalCompleted)} de {totalCompleted}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarea</th><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Creador</th><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Asignado</th><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Prioridad</th><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Fecha limite</th><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Completado</th><th className="text-left px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th><th className="text-right px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Diferencia</th></tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {pageItems.map((task) => {
                  const info = getTaskStatus(task);
                  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                  const due = parseDate(task.dueDate);
                  const completed = parseDate(task.completedAt || task.archivedAt || task.updatedAt);

                  return (
                    <tr key={task.id} onClick={() => onEditTask?.(task)} className={`transition cursor-pointer ${info ? info.rowColor : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}><td className="px-3 sm:px-5 py-2.5 sm:py-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className={`w-1 h-1.5 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0 ${
                            task.priority === 'CRITICAL' ? 'bg-red-400' :
                            task.priority === 'HIGH' ? 'bg-orange-400' :
                            task.priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-green-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                              {(() => {
                                const imgs = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
                                if (imgs.length === 0) return null;
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const idx = historyImagesList.findIndex(
                                        (img) => img.imageUrl === imgs[0]
                                      );
                                      if (idx !== -1) setViewingImageIndex(idx);
                                    }}
                                    className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 px-1.5 py-0.5 rounded transition"
                                    title="Ver imagen"
                                  >
                                    👁️ {imgs.length > 1 ? `${imgs.length} imágenes` : 'Ver imagen'}
                                  </button>
                                );
                              })()}
                            </div>
                            {task.description && (
                              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden sm:table-cell">
                        {task.creator ? (
                          <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Avatar
                              user={task.creator}
                              sizeClass="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[7px] sm:text-[8px]"
                              fallbackClass="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300"
                            />
                            {task.creator.name}
                          </span>
                        ) : (
                          <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden sm:table-cell">
                        {task.assignee ? (
                          <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Avatar
                              user={task.assignee}
                              sizeClass="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[7px] sm:text-[8px]"
                              fallbackClass="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300"
                            />
                            {task.assignee.name}
                          </span>
                        ) : (
                          <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden md:table-cell">
                        <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${priority.class}`}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden lg:table-cell">
                        <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">{formatDateFull(due) || '—'}</span>
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden lg:table-cell">
                        <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">{formatDateFull(completed) || '—'}</span>
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                        {info ? (
                          <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 rounded-full ${info.badgeColor}`}>
                            {info.badge}
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right hidden sm:table-cell">{info ? (<span className={`text-[11px] sm:text-xs font-semibold ${info.diff < 0 ? 'text-emerald-600' : info.diff === 0 ? 'text-blue-600' : 'text-red-500'}`}>{info.label}</span>) : (<span className="text-[11px] sm:text-xs text-gray-400">—</span>)}</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginador */}
        <div className="flex flex-col items-center gap-2 pb-4">
          {/* Indicador de página */}
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Página {safePage} de {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Anterior */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
            >
              {'\u2190'} Anterior
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                const isCurrent = num === safePage;
                const show = totalPages <= 10 ||
                  num <= 2 ||
                  num >= totalPages - 1 ||
                  Math.abs(num - safePage) <= 1;
                const isEllipsisPrev = num === 3 && safePage > 4 && totalPages > 10;
                const isEllipsisNext = num === totalPages - 2 && safePage < totalPages - 3 && totalPages > 10;

                if (!show) {
                  if (isEllipsisPrev || isEllipsisNext) {
                    return (
                      <span key={num} className="px-1 py-1 text-xs text-gray-400 dark:text-gray-500 select-none">...</span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={`min-w-[32px] h-8 text-xs font-bold rounded-lg transition shadow-sm ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Siguiente */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
            >
              Siguiente {'\u2192'}
            </button>
          </div>
        </div>
      </div>

      {viewingImageIndex !== null && (
        <ImageViewModal
          images={historyImagesList}
          currentIndex={viewingImageIndex}
          onClose={() => setViewingImageIndex(null)}
          onNavigate={(idx) => setViewingImageIndex(idx)}
        />
      )}
    </div>
  );
}
