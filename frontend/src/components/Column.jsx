import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

const columnColors = {
  TODO: {
    bg: 'bg-amber-50',
    header: 'bg-amber-100',
    dot: 'bg-amber-500',
    text: 'text-amber-800'
  },
  IN_PROGRESS: {
    bg: 'bg-blue-50',
    header: 'bg-blue-100',
    dot: 'bg-blue-500',
    text: 'text-blue-800'
  },
  DONE: {
    bg: 'bg-emerald-50',
    header: 'bg-emerald-100',
    dot: 'bg-emerald-500',
    text: 'text-emerald-800'
  },
  ARCHIVED: {
    bg: 'bg-red-50',
    header: 'bg-red-100',
    dot: 'bg-red-500',
    text: 'text-red-800'
  }
};

export default function Column({ column, onEditTask }) {
  const colors = columnColors[column.id] || columnColors.TODO;

  return (
    <div className={`flex flex-col rounded-2xl ${colors.bg} flex-1 min-w-[220px] max-h-full`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 rounded-t-2xl ${colors.header}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
          <h2 className={`text-sm font-bold uppercase tracking-wide ${colors.text}`}>
            {column.title}
          </h2>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {column.tasks.length}
        </span>
      </div>

      {/* Lista de tareas (droppable) */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 space-y-3 overflow-y-auto column-scroll min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-black/5' : ''
            }`}
          >
            {column.tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-24 text-xs text-gray-400 italic">
                Arrastra tareas aquí
              </div>
            )}
            {column.tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onEdit={onEditTask} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
