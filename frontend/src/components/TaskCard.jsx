import { Draggable } from '@hello-pangea/dnd';
import {
  STATUS_DOTS,
  STATUS_LABELS,
  PRIORITY_CONFIG,
  BOARD_STATUSES,
  TRANSITION_LABELS,
  STATUS_BTN_COLORS,
} from '../constants/kanbanConfig';
import { getCloudinaryThumb } from '../utils/images';
import { parseSubtasks } from '../utils/tasks';
import { formatDateShort, isOverdue } from '../utils/date';
import Avatar from './Avatar';

export default function TaskCard({ task, index, onEdit, onMove, onViewImage, onDelete, isSharedUser }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const dueDateStr = formatDateShort(task.dueDate);
  const overdue = isOverdue(task.dueDate);
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const subtasks = parseSubtasks(task.subtasks);

  // Determinar transiciones válidas
  const idx = BOARD_STATUSES.indexOf(task.status);
  const canMoveLeft = idx > 0;
  const canMoveRight = idx < BOARD_STATUSES.length - 1 && task.status !== 'ARCHIVED';
  const prevStatus = canMoveLeft ? BOARD_STATUSES[idx - 1] : null;
  const nextStatus = canMoveRight ? BOARD_STATUSES[idx + 1] : null;
  const prevLabel = prevStatus ? TRANSITION_LABELS[`${task.status}->${prevStatus}`] : null;
  const nextLabel = nextStatus ? TRANSITION_LABELS[`${task.status}->${nextStatus}`] : null;

  const handleClick = (e, status) => {
    e.stopPropagation();
    onMove?.(task, status);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(task);
  };

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
          {/* Header: Estado + Prioridad + asa visual */}
          <div className="flex items-start gap-2 mb-2">
            {/* Asa visual (solo decorativa) */}
            <div className="mt-0.5 flex-shrink-0 flex flex-col gap-0.5 opacity-30 transition">
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <div className="w-1 h-1 rounded-full bg-gray-400" />
            </div>

            {/* Estado + Prioridad */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOTS[task.status] || 'bg-gray-400'}`} />
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.class}`}>
                {priority.label}
              </span>
            </div>
          </div>

          {/* Título */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{task.title}</h3>

          {/* Descripción (completa, sin truncar) */}
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 whitespace-pre-wrap">{task.description}</p>
          )}

          {/* Progreso de sub-tareas */}
          {(() => {
            const total = subtasks.length;
            if (total === 0) return null;
            const done = subtasks.filter((st) => st.completed).length;
            const pct = Math.round((done / total) * 100);
            return (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>{'\u{1F4CB}'} Sub-tareas</span>
                  <span className="font-medium">{done}/{total}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: pct + '%',
                      backgroundColor: pct === 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#E5E7EB'
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Imágenes */}
          {(() => {
            const imgs = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
            if (imgs.length === 0) return null;
            const maxShow = 2;
            return (
              <div className="mt-2">
                <div className="flex gap-1.5 flex-wrap">
                  {imgs.slice(0, maxShow).map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImage?.(task);
                      }}
                    >
                      <img
                        src={getCloudinaryThumb(url, 160)}
                        alt={`${task.title} ${idx + 1}`}
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700 transition group-hover:shadow-md group-hover:border-gray-300 dark:group-hover:border-gray-600"
                        draggable={false}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition flex items-center justify-center pointer-events-none">
                        <span className="text-white text-[9px] font-medium opacity-0 group-hover:opacity-100 transition bg-black/50 px-1.5 py-0.5 rounded-md">
                          Ver
                        </span>
                      </div>
                    </div>
                  ))}
                  {imgs.length > maxShow && (
                    <div
                      className="w-14 h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImage?.(task);
                      }}
                    >
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">+{imgs.length - maxShow}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Etiquetas */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: Creador + Asignado + Fecha */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              {/* Creador */}
              {task.creator && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500" title={`Creado por ${task.creator.name}`}>
                  <Avatar user={task.creator} sizeClass="w-4 h-4 text-[7px]" fallbackClass="bg-indigo-400 text-white" />
                  <span className="truncate max-w-[60px]">{task.creator.name}</span>
                </span>
              )}
              {/* Asignado */}
              {task.assignee ? (
                <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400" title={`Asignado a ${task.assignee.name}`}>
                  <Avatar user={task.assignee} sizeClass="w-4 h-4 text-[7px]" fallbackClass="bg-emerald-500 text-white" />
                  <span className="truncate max-w-[60px]">{task.assignee.name}</span>
                </span>
              ) : task.creator ? (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Sin asignar</span>
              ) : null}
            </div>

            {dueDateStr && (
              <span className={`text-[11px] font-medium flex items-center gap-1 shrink-0 ${
                overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
              }`}>
                <span>{overdue ? '⚠️' : '📅'}</span>
                {dueDateStr}
              </span>
            )}
          </div>

          {/* Botones de movimiento (mobile: visible, desktop: hover) — Oculto para usuarios compartidos.
              El botón Eliminar va EN MEDIO de los 2 botones de movimiento, solo si onDelete existe (creador). */}
          {!isSharedUser && (canMoveLeft || canMoveRight || onDelete) && (
            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
              {canMoveLeft && (
                <div className="flex flex-1 justify-start gap-1">
                  {(() => {
                    const c = STATUS_BTN_COLORS[prevStatus] || {};
                    return (
                      <button
                        onClick={(e) => handleClick(e, prevStatus)}
                        className={`text-[8px] font-medium px-2 py-1 rounded-md transition
                          ${c.bg} ${c.text} ${c.hoverBg} ${c.hoverText}
                          sm:opacity-0 sm:group-hover/card:opacity-100`}
                      >
                        {'\u2190'} {prevLabel || prevStatus}
                      </button>
                    );
                  })()}
                </div>
              )}

              {onDelete && (
                <button
                  onClick={handleDelete}
                  title="Eliminar"
                  aria-label="Eliminar"
                  className="text-[10px] font-medium px-2 py-1 rounded-md transition shrink-0
                    text-red-500 bg-red-50 hover:bg-red-100
                    dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-950/70
                    sm:opacity-0 sm:group-hover/card:opacity-100"
                >
                  Eliminar
                </button>
              )}

              {canMoveRight && (
                <div className="flex flex-1 justify-end gap-1">
                  {(() => {
                    const c = STATUS_BTN_COLORS[nextStatus] || {};
                    return (
                      <button
                        onClick={(e) => handleClick(e, nextStatus)}
                        className={`text-[8px] font-medium px-2 py-1 rounded-md transition
                          ${c.bg} ${c.text} ${c.hoverBg} ${c.hoverText}
                          sm:opacity-0 sm:group-hover/card:opacity-100`}
                      >
                        {nextLabel || nextStatus} {'\u2192'}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
