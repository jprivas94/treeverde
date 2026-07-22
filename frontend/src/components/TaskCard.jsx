import { Draggable } from '@hello-pangea/dnd';

const priorityDot = {
  TODO: 'bg-amber-400',
  IN_PROGRESS: 'bg-blue-400',
  DONE: 'bg-emerald-400',
  ARCHIVED: 'bg-red-400'
};

const statusLabels = {
  TODO: 'Por Hacer',
  IN_PROGRESS: 'En Progreso',
  DONE: 'Revisión',
  ARCHIVED: 'Terminado'
};

const priorityConfig = {
  LOW: { label: 'Baja', class: 'text-green-700 bg-green-100' },
  MEDIUM: { label: 'Media', class: 'text-amber-700 bg-amber-100' },
  HIGH: { label: 'Alta', class: 'text-orange-700 bg-orange-100' },
  CRITICAL: { label: 'Crítica', class: 'text-red-700 bg-red-100' },
};

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

export default function TaskCard({ task, index, onEdit }) {
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const dueDateStr = formatDate(task.dueDate);
  const overdue = isOverdue(task.dueDate);
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit?.(task)}
          className={`bg-white rounded-xl p-4 pb-3 shadow-sm border border-gray-200 transition select-none ${
            snapshot.isDragging ? 'shadow-xl rotate-2 border-emerald-400' : 'hover:shadow-md hover:border-gray-300 cursor-pointer'
          }`}
        >
          {/* Header: Estado + Prioridad + asa visual */}
          <div className="flex items-start gap-2 mb-2">
            {/* Asa visual (solo decorativa) */}
            <div className="mt-0.5 flex-shrink-0 flex flex-col gap-0.5 opacity-30 group-hover/card:opacity-60 transition">
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

          {/* Descripción */}
          {task.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{task.description}</p>
          )}

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

          {/* Footer: Asignado + Fecha */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-600">{task.assignee.name}</span>
                </>
              ) : (
                <span className="text-xs text-gray-400 italic">Sin asignar</span>
              )}
            </div>

            {dueDateStr && (
              <span className={`text-[11px] font-medium flex items-center gap-1 ${
                overdue ? 'text-red-500' : 'text-gray-400'
              }`}>
                <span>{overdue ? '⚠️' : '📅'}</span>
                {dueDateStr}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
