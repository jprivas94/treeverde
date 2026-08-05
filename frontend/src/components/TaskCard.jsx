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

const priorityDot = STATUS_DOTS;
const statusLabels = STATUS_LABELS;
const priorityConfig = PRIORITY_CONFIG;
const STATUS_ORDER = BOARD_STATUSES;
const transitionLabels = TRANSITION_LABELS;
const columnBtnColors = STATUS_BTN_COLORS;

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d < new Date(new Date().toDateString());
}

export default function TaskCard({ task, index, onEdit, onMove, onViewImage, isSharedUser }) {
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const dueDateStr = formatDate(task.dueDate);
  const overdue = isOverdue(task.dueDate);
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  // Determinar transiciones válidas
  const idx = STATUS_ORDER.indexOf(task.status);
  const canMoveLeft = idx > 0;
  const canMoveRight = idx < STATUS_ORDER.length - 1 && task.status !== 'ARCHIVED';
  const prevStatus = canMoveLeft ? STATUS_ORDER[idx - 1] : null;
  const nextStatus = canMoveRight ? STATUS_ORDER[idx + 1] : null;
  const prevLabel = prevStatus ? transitionLabels[`${task.status}->${prevStatus}`] : null;
  const nextLabel = nextStatus ? transitionLabels[`${task.status}->${nextStatus}`] : null;

  const handleClick = (e, status) => {
    e.stopPropagation();
    onMove?.(task, status);
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit?.(task)}
          className={`bg-white rounded-xl p-3 sm:p-4 pb-2 sm:pb-3 shadow-sm border border-gray-200 transition select-none group/card ${
            snapshot.isDragging ? 'shadow-xl rotate-2 border-emerald-400' : 'hover:shadow-md hover:border-gray-300 cursor-pointer'
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
                <span className={`w-2.5 h-2.5 rounded-full ${priorityDot[task.status] || 'bg-gray-400'}`} />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {statusLabels[task.status] || task.status}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.class}`}>
                {priority.label}
              </span>
            </div>
          </div>

          {/* Título */}
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{task.title}</h3>

          {/* Descripción (completa, sin truncar) */}
          {task.description && (
            <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap">{task.description}</p>
          )}

          {/* Progreso de sub-tareas */}
          {(() => {
            let stArr = [];
            try {
              stArr = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : (task.subtasks || []);
            } catch { stArr = []; }
            if (!Array.isArray(stArr)) stArr = [];
            const total = stArr.length;
            if (total === 0) return null;
            const done = stArr.filter((st) => st.completed).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>{'\u{1F4CB}'} Sub-tareas</span>
                  <span className="font-medium">{done}/{total}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 transition group-hover:shadow-md group-hover:border-gray-300"
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
                      className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImage?.(task);
                      }}
                    >
                      <span className="text-[10px] font-bold text-gray-500">+{imgs.length - maxShow}</span>
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
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: Creador + Asignado + Fecha */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              {/* Creador */}
              {task.creator && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400" title={`Creado por ${task.creator.name}`}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold overflow-hidden shrink-0">
                    {task.creator.profileImage ? (
                      <img src={getCloudinaryThumb(task.creator.profileImage, 64)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center bg-indigo-400">
                        {task.creator.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-[60px]">{task.creator.name}</span>
                </span>
              )}
              {/* Asignado */}
              {task.assignee ? (
                <span className="flex items-center gap-1 text-[10px] text-gray-500" title={`Asignado a ${task.assignee.name}`}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold overflow-hidden shrink-0">
                    {task.assignee.profileImage ? (
                      <img src={getCloudinaryThumb(task.assignee.profileImage, 64)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center bg-emerald-500">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-[60px]">{task.assignee.name}</span>
                </span>
              ) : task.creator ? (
                <span className="text-[10px] text-gray-400 italic">Sin asignar</span>
              ) : null}
            </div>

            {dueDateStr && (
              <span className={`text-[11px] font-medium flex items-center gap-1 shrink-0 ${
                overdue ? 'text-red-500' : 'text-gray-400'
              }`}>
                <span>{overdue ? '⚠️' : '📅'}</span>
                {dueDateStr}
              </span>
            )}
          </div>

          {/* Botones de movimiento (mobile: visible, desktop: hover) — Oculto para usuarios compartidos */}
          {!isSharedUser && (canMoveLeft || canMoveRight) && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <div className="flex gap-1">
              {canMoveLeft && (() => {
                const c = columnBtnColors[prevStatus] || {};
                return (
                  <button
                    onClick={(e) => handleClick(e, prevStatus)}
                    className={`text-[10px] font-medium px-2 py-1 rounded-md transition
                      ${c.bg} ${c.text} ${c.hoverBg} ${c.hoverText}
                      sm:opacity-0 sm:group-hover/card:opacity-100`}
                  >
                    {'\u2190'} {prevLabel || prevStatus}
                  </button>
                );
              })()}
            </div>
            <div className="flex gap-1">
              {canMoveRight && (() => {
                const c = columnBtnColors[nextStatus] || {};
                return (
                  <button
                    onClick={(e) => handleClick(e, nextStatus)}
                    className={`text-[10px] font-medium px-2 py-1 rounded-md transition
                      ${c.bg} ${c.text} ${c.hoverBg} ${c.hoverText}
                      sm:opacity-0 sm:group-hover/card:opacity-100`}
                  >
                    {nextLabel || nextStatus} {'\u2192'}
                  </button>
                );
              })()}
            </div>
          </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
