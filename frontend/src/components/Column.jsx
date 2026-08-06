import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { getStatusConfig } from '../constants/kanbanConfig';

export default function Column({ column, onEditTask, onMoveTask, onViewImage, onDeleteTask, canDeleteForTask, fixedHeight, todoRef, isSharedUserForTask }) {
  const colors = getStatusConfig(column.id);

  return (
    <div
      ref={todoRef}
      style={fixedHeight ? { minHeight: fixedHeight + 'px' } : undefined}
      className={`flex flex-col rounded-2xl ${colors.bg} w-[80vw] h-full sm:max-h-full shrink-0 snap-start ${
        column.id === 'TODO'
          ? 'sm:w-72 sm:min-w-[280px] sm:flex-none'
          : 'sm:w-auto sm:flex-1 sm:min-w-[200px]'
      }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-t-2xl ${colors.header}`}>
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
            className={`flex-1 p-3 space-y-2 sm:space-y-3 overflow-y-auto column-scroll min-h-[80px] sm:min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-black/5 dark:bg-white/10' : ''
            }`}
          >
            {column.tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-24 text-xs text-gray-400 dark:text-gray-500 italic">
                Arrastra tareas aquí
              </div>
            )}
            {column.tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onEdit={onEditTask} onMove={onMoveTask} onViewImage={onViewImage} onDelete={canDeleteForTask?.(task) ? onDeleteTask : undefined} isSharedUser={isSharedUserForTask?.(task)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
