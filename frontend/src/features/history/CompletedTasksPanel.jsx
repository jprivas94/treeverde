import { useState, useMemo } from 'react';
import { PRIORITY_CONFIG } from '../../shared/constants/kanbanConfig';
import { parseDate, formatDateFull } from '../../shared/utils/date';
import { getTaskImages } from '../../shared/utils/tasks';
import Avatar from '../../shared/ui/Avatar';
import Pagination from '../../shared/ui/Pagination';
import ImageViewModal from '../tasks/ImageViewModal';
import useImageGallery from '../tasks/useImageGallery';
import BoardBadge from '../boards/BoardBadge';
import {
  ITEMS_PER_PAGE, PRIORITY_FILTERS, STATUS_FILTERS, SORT_OPTIONS,
  completedTasks, filterHistory, getTaskTiming, completedDate,
} from './historyUtils';

const DEFAULT_FILTERS = { search: '', priority: '', timing: '', sort: 'newest' };
const PRIORITY_DOT = { CRITICAL: 'bg-red-400', HIGH: 'bg-orange-400', MEDIUM: 'bg-amber-400' };
const selectClass = 'px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none';
const cell = 'px-3 sm:px-5 py-2.5 sm:py-3';
const dash = <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">—</span>;

// Columnas de la tabla: [título, visibilidad responsive, alineación]
const COLUMNS = [
  ['Tarea', ''], ['Creador', 'hidden sm:table-cell'], ['Asignado', 'hidden sm:table-cell'],
  ['Prioridad', 'hidden md:table-cell'], ['Fecha limite', 'hidden lg:table-cell'],
  ['Completado', 'hidden lg:table-cell'], ['Estado', ''], ['Diferencia', 'hidden sm:table-cell', 'text-right'],
];

// ─── CompletedTasksPanel (Historial) ──────────────────────────────────
// Tabla paginada de tareas completadas con búsqueda, filtros de prioridad
// y puntualidad, y orden por fecha. La lógica pura vive en historyUtils.
export default function CompletedTasksPanel({ tasks, archivedTasks, onEditTask, showBoard = false }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };

  const allCompleted = useMemo(() => completedTasks(tasks, archivedTasks || []), [tasks, archivedTasks]);
  const rows = useMemo(() => filterHistory(allCompleted, filters), [allCompleted, filters]);
  const gallery = useImageGallery(allCompleted);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = rows.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  if (total === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto text-center py-10 sm:py-16">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📊</div>
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Historial de Tareas</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {filters.search ? 'No se encontraron tareas con ese criterio.' : 'No hay tareas completadas aun.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">📊 Historial</h2>
          <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            {total} tarea{total !== 1 ? 's' : ''} completada{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Buscador */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">{'\u{1F50D}'}</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search')(e.target.value)}
            placeholder="Buscar por titulo, creador, etiquetas..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search')('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              &times;
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <FilterSelect icon={'\u{1F7E2}'} value={filters.priority} onChange={setFilter('priority')} options={PRIORITY_FILTERS} narrow />
          <FilterSelect icon={'\u{1F3C6}'} value={filters.timing} onChange={setFilter('timing')} options={STATUS_FILTERS} narrow />
          <FilterSelect icon={'\u{1F4C5}'} value={filters.sort} onChange={setFilter('sort')} options={SORT_OPTIONS} />
          {(filters.priority || filters.timing) && (
            <button
              onClick={() => { setFilters((f) => ({ ...DEFAULT_FILTERS, search: f.search })); setPage(1); }}
              className="text-[11px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              {'✖'} Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-3 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-gray-900 flex items-center gap-1.5 sm:gap-2 border-b border-emerald-100 dark:border-emerald-900">
            <span className="text-[11px] sm:text-sm">✅</span>
            <span className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Completadas</span>
            <span className="ml-auto text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, total)} de {total}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  {COLUMNS.map(([title, cls, align = 'text-left']) => (
                    <th key={title} className={`${align} px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${cls}`}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {pageItems.map((task) => (
                  <HistoryRow key={task.id} task={task} showBoard={showBoard} onOpen={() => onEditTask?.(task)} onViewImages={() => gallery.openForTask(task)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>

      {gallery.isOpen && <ImageViewModal {...gallery.modalProps} />}
    </div>
  );
}

function FilterSelect({ icon, value, onChange, options, narrow = false }) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <span>{icon}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} ${narrow ? 'max-w-[100px] sm:max-w-none' : ''}`}>
        {options.map((o) => <option key={o.value} value={o.value} className={o.cls || ''}>{o.label}</option>)}
      </select>
    </div>
  );
}

function HistoryPerson({ user, avatarClass }) {
  if (!user) return dash;
  return (
    <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
      <Avatar user={user} sizeClass="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[7px] sm:text-[8px]" fallbackClass={avatarClass} />
      {user.name}
    </span>
  );
}

function HistoryRow({ task, onOpen, onViewImages, showBoard }) {
  const timing = getTaskTiming(task);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const imgCount = getTaskImages(task).length;
  const dateText = 'text-[11px] sm:text-sm text-gray-600 dark:text-gray-400';

  return (
    <tr onClick={onOpen} className={`transition cursor-pointer ${timing ? timing.rowColor : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      <td className={cell}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`w-1 h-1.5 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-green-400'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
              {imgCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onViewImages(); }}
                  className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 px-1.5 py-0.5 rounded transition"
                  title="Ver imagen"
                >
                  👁️ {imgCount > 1 ? `${imgCount} imágenes` : 'Ver imagen'}
                </button>
              )}
            </div>
            {showBoard && <div className="mt-1"><BoardBadge board={task.board} /></div>}
            {task.description && (
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className={`${cell} hidden sm:table-cell`}>
        <HistoryPerson user={task.creator} avatarClass="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300" />
      </td>
      <td className={`${cell} hidden sm:table-cell`}>
        <HistoryPerson user={task.assignee} avatarClass="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300" />
      </td>
      <td className={`${cell} hidden md:table-cell`}>
        <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${priority.class}`}>{priority.label}</span>
      </td>
      <td className={`${cell} hidden lg:table-cell`}>
        <span className={dateText}>{formatDateFull(parseDate(task.dueDate)) || '—'}</span>
      </td>
      <td className={`${cell} hidden lg:table-cell`}>
        <span className={dateText}>{formatDateFull(completedDate(task)) || '—'}</span>
      </td>
      <td className={cell}>
        {timing
          ? <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 rounded-full ${timing.badgeColor}`}>{timing.badge}</span>
          : <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500">—</span>}
      </td>
      <td className={`${cell} text-right hidden sm:table-cell`}>
        {timing ? <span className={`text-[11px] sm:text-xs font-semibold ${timing.textColor}`}>{timing.label}</span> : dash}
      </td>
    </tr>
  );
}
