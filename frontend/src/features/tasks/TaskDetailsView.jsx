import { useState } from 'react';
import { getUserColor, PRIORITIES } from '../../shared/constants/kanbanConfig';
import { getCloudinaryThumb } from '../../shared/utils/images';
import { parseSubtasks, getTaskImages } from '../../shared/utils/tasks';
import { formatDateFull } from '../../shared/utils/date';
import UserChip from '../../shared/ui/UserChip';
import ImageViewModal from './ImageViewModal';
import { PersonField } from './TaskModalParts';

const label = 'block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0';
const value = 'text-sm px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg';
const DEFAULT_COLOR = '#10B981';

const CheckIcon = ({ className = 'w-2 h-2' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * Vista de solo lectura de una tarea.
 * sharedView: permite marcar subtareas (bloqueando las completadas por otros).
 * readOnly: vista estática completa (prioridad, fecha, estado, compartidos).
 */
export default function TaskDetailsView({ task, user, sharedView, userColor, onToggleSubtask, onClose }) {
  const [imageIndex, setImageIndex] = useState(null);
  const sharedUsers = task.shares?.map((s) => s.user) || [];
  const subtasks = parseSubtasks(task.subtasks);
  const completedCount = subtasks.filter((st) => st.completed).length;
  const imgs = getTaskImages(task);

  return (
    <div className="space-y-2">
      <div>
        <label className={label}>Título</label>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">{task.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PersonField label={'\u{1F464} Creado por'} user={task.creator} />
        <PersonField label={'\u{1F91D} Asignado a'} user={task.assignee} fallback="Sin asignar" avatarClass="bg-emerald-400 text-white" />
      </div>

      {/* Descripción + subtareas */}
      <div>
        <label className={label}>
          Descripción {subtasks.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal ml-1">&middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}</span>
          )}
        </label>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
          {task.description
            ? <p className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description}</p>
            : <p className="px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 italic">Sin descripción</p>}
          {subtasks.length > 0 && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-700" />
              <div className="px-3 py-1.5 space-y-1">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <SubtaskCheck st={st} user={user} interactive={sharedView} userColor={userColor} onToggle={onToggleSubtask} />
                    <span className={`text-xs ${st.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {!sharedView && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Prioridad</label>
              <p className={value}>{PRIORITIES.find((p) => p.value === task.priority)?.label || task.priority || 'Media'}</p>
            </div>
            <div>
              <label className={label}>Fecha límite</label>
              <p className={value}>{formatDateFull(task.dueDate) || '—'}</p>
            </div>
          </div>

          <div>
            <label className={label}>Etiquetas</label>
            <p className={value}>{task.tags || '—'}</p>
          </div>

          {(task.completedAt || task.status === 'DONE' || task.status === 'ARCHIVED') && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
              <label className={label}>Estado</label>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                {'✅'} Completada {task.completedAt && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">el {formatDateFull(task.completedAt)}</span>
                )}
              </p>
            </div>
          )}
        </>
      )}

      {imgs.length > 0 && (
        <div>
          <label className={label}>{'\u{1F4F7}'} Imágenes ({imgs.length})</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {imgs.map((url, idx) => (
              <div
                key={idx}
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 mt-1"
                onClick={() => setImageIndex(idx)}
              >
                <img src={getCloudinaryThumb(url, 160)} alt={`${task.title} ${idx + 1}`} className="w-16 h-16 object-cover" draggable={false} loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition flex items-center justify-center pointer-events-none">
                  <span className="text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition bg-black/60 px-1.5 py-0.5 rounded-md pointer-events-auto select-none">
                    {'\u{1F441}️'} Ver
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sharedUsers.length > 0 && (
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            {'\u{1F91D}'} Compartida con {sharedView ? `${sharedUsers.length} usuario${sharedUsers.length !== 1 ? 's' : ''}` : ''}
          </label>
          <div className="flex flex-wrap gap-1">
            {sharedUsers.map((u) => <UserChip key={u.id} user={u} />)}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className={`w-full py-1.5 text-xs font-semibold rounded-lg transition text-white ${sharedView ? 'bg-gray-600 hover:bg-gray-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
      >
        Cerrar
      </button>

      {imageIndex !== null && (
        <ImageViewModal
          images={imgs.map((url, i) => ({ imageUrl: url, title: `Imagen ${i + 1}` }))}
          currentIndex={imageIndex}
          onClose={() => setImageIndex(null)}
          onNavigate={setImageIndex}
        />
      )}
    </div>
  );
}

// Casilla de subtarea: interactiva (sharedView) o estática, coloreada por
// quien la completó. Las completadas por otro usuario quedan bloqueadas.
function SubtaskCheck({ st, user, interactive, userColor, onToggle }) {
  const doneColor = st.toggledBy ? getUserColor(st.toggledBy) : DEFAULT_COLOR;

  if (!interactive) {
    return (
      <span
        className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${st.completed ? '' : 'border-gray-300 dark:border-gray-600'}`}
        style={st.completed ? { backgroundColor: doneColor, borderColor: doneColor } : undefined}
      >
        {st.completed && <CheckIcon className="w-2 h-2 text-white" />}
      </span>
    );
  }

  const locked = st.completed && st.toggledBy && st.toggledBy !== user?.id;
  const color = st.toggledBy ? doneColor : (userColor || DEFAULT_COLOR);
  return (
    <button
      type="button"
      disabled={locked}
      title={locked ? 'Completado por otro usuario' : 'Marcar/desmarcar'}
      onClick={() => onToggle?.(st.id)}
      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        st.completed ? 'text-white' : 'border-gray-300 dark:border-gray-600 hover:opacity-80'
      } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ backgroundColor: st.completed ? color : 'transparent', borderColor: st.completed ? color : (color + '60') }}
    >
      {st.completed && <CheckIcon />}
    </button>
  );
}
