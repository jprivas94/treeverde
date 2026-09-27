import { Draggable } from '@hello-pangea/dnd';
import {
  STATUS_DOTS, STATUS_LABELS, PRIORITY_CONFIG, BOARD_STATUSES, TRANSITION_LABELS, STATUS_BTN_COLORS,
} from '../../shared/constants/kanbanConfig';
import { getCloudinaryThumb } from '../../shared/utils/images';
import { parseSubtasks, getTaskImages } from '../../shared/utils/tasks';
import { formatDateShort, isOverdue } from '../../shared/utils/date';
import Avatar from '../../shared/ui/Avatar';

const MAX_THUMBS = 2;
const hoverReveal = 'sm:opacity-0 sm:group-hover/card:opacity-100';

// ─── TaskCard ─────────────────────────────────────────────────────────
// Tarjeta arrastrable de una tarea: estado, prioridad, descripción, progreso
// de subtareas, imágenes, etiquetas, personas, fecha y botones para moverla.
export default function TaskCard({ task, index, onEdit, onMove, onViewImage, onDelete, isSharedUser }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const dueDateStr = formatDateShort(task.dueDate);
  const overdue = isOverdue(task.dueDate);
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const subtasks = parseSubtasks(task.subtasks);
  const imgs = getTaskImages(task);

  // Transiciones válidas (una columna a la izquierda / derecha)
  const idx = BOARD_STATUSES.indexOf(task.status);
  const prevStatus = idx > 0 ? BOARD_STATUSES[idx - 1] : null;
  const nextStatus = idx < BOARD_STATUSES.length - 1 && task.status !== 'ARCHIVED' ? BOARD_STATUSES[idx + 1] : null;

  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const viewImage = stop(() => onViewImage?.(task));

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit?.(task)}
          className={`bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 pb-2 sm:pb-3 shadow-sm border border-gray-200 dark:border-gray-700 transition select-none group/card ${
            snapshot.isDragging ? 'shadow-xl rotate-2 border-emerald-400' : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
          }`}
        >
          {/* Header: asa decorativa + estado + prioridad */}
          <div className="flex items-start gap-2 mb-2">
            <div className="mt-0.5 flex-shrink-0 flex flex-col gap-0.5 opacity-30">
              {[0, 1, 2].map((i) => <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />)}
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOTS[task.status] || 'bg-gray-400'}`} />
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.class}`}>{priority.label}</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 whitespace-pre-wrap">{task.description}</p>
          )}

          <SubtaskProgress subtasks={subtasks} />

          {imgs.length > 0 && (
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {imgs.slice(0, MAX_THUMBS).map((url, i) => (
                <div key={i} className="relative group cursor-pointer" onClick={viewImage}>
                  <img
                    src={getCloudinaryThumb(url, 160)}
                    alt={`${task.title} ${i + 1}`}
                    className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700 transition group-hover:shadow-md group-hover:border-gray-300 dark:group-hover:border-gray-600"
                    draggable={false}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition flex items-center justify-center pointer-events-none">
                    <span className="text-white text-[9px] font-medium opacity-0 group-hover:opacity-100 transition bg-black/50 px-1.5 py-0.5 rounded-md">Ver</span>
                  </div>
                </div>
              ))}
              {imgs.length > MAX_THUMBS && (
                <div
                  className="w-14 h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={viewImage}
                >
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">+{imgs.length - MAX_THUMBS}</span>
                </div>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag, i) => (
                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{tag}</span>
              ))}
            </div>
          )}

          {/* Footer: creador + asignado + fecha */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              {task.creator && (
                <Person user={task.creator} title={`Creado por ${task.creator.name}`} className="text-gray-400 dark:text-gray-500" avatarClass="bg-indigo-400 text-white" />
              )}
              {task.assignee ? (
                <Person user={task.assignee} title={`Asignado a ${task.assignee.name}`} className="text-gray-500 dark:text-gray-400" avatarClass="bg-emerald-500 text-white" />
              ) : task.creator ? (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Sin asignar</span>
              ) : null}
            </div>
            {dueDateStr && (
              <span className={`text-[11px] font-medium flex items-center gap-1 shrink-0 ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                <span>{overdue ? '⚠️' : '📅'}</span>
                {dueDateStr}
              </span>
            )}
          </div>

          {/* Mover ← | Eliminar (solo creador) | → — oculto para usuarios compartidos */}
          {!isSharedUser && (prevStatus || nextStatus || onDelete) && (
            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
              {prevStatus && (
                <div className="flex flex-1 justify-start gap-1">
                  <MoveButton task={task} to={prevStatus} onClick={stop(() => onMove?.(task, prevStatus))} />
                </div>
              )}
              {onDelete && (
                <button
                  onClick={stop(() => onDelete(task))}
                  title="Eliminar"
                  aria-label="Eliminar"
                  className={`text-[10px] font-medium px-2 py-1 rounded-md transition shrink-0 text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-950/70 ${hoverReveal}`}
                >
                  Eliminar
                </button>
              )}
              {nextStatus && (
                <div className="flex flex-1 justify-end gap-1">
                  <MoveButton task={task} to={nextStatus} onClick={stop(() => onMove?.(task, nextStatus))} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function SubtaskProgress({ subtasks }) {
  if (subtasks.length === 0) return null;
  const done = subtasks.filter((st) => st.completed).length;
  const pct = Math.round((done / subtasks.length) * 100);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
        <span>{'\u{1F4CB}'} Sub-tareas</span>
        <span className="font-medium">{done}/{subtasks.length}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: pct + '%', backgroundColor: pct === 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#E5E7EB' }}
        />
      </div>
    </div>
  );
}

function Person({ user, title, className, avatarClass }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] ${className}`} title={title}>
      <Avatar user={user} sizeClass="w-4 h-4 text-[7px]" fallbackClass={avatarClass} />
      <span className="truncate max-w-[60px]">{user.name}</span>
    </span>
  );
}

// Botón de transición (← Volver a..., Terminar →) con los colores del estado destino
function MoveButton({ task, to, onClick }) {
  const c = STATUS_BTN_COLORS[to] || {};
  const label = TRANSITION_LABELS[`${task.status}->${to}`] || to;
  const isBack = BOARD_STATUSES.indexOf(to) < BOARD_STATUSES.indexOf(task.status);
  return (
    <button onClick={onClick} className={`text-[8px] font-medium px-2 py-1 rounded-md transition ${c.bg} ${c.text} ${c.hoverBg} ${c.hoverText} ${hoverReveal}`}>
      {isBack ? `← ${label}` : `${label} →`}
    </button>
  );
}
