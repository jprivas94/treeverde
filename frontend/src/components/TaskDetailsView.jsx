import { useState } from 'react';
import ImageViewModal from './ImageViewModal';
import { getUserColor, PRIORITIES } from '../constants/kanbanConfig';
import { getCloudinaryThumb } from '../utils/images';

function parseSubtasks(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * Vista de solo lectura de una tarea.
 * sharedView: permite togglear subtareas (con bloqueo de las completadas por otros).
 * readOnly: vista estática completa (prioridad, fecha, estado, compartidos).
 */
export default function TaskDetailsView({ task, user, sharedView, userColor, onToggleSubtask, onClose }) {
  const [viewingTaskImages, setViewingTaskImages] = useState([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);

  const sharedUsers = task.shares?.map((s) => s.user) || [];
  const subtasks = parseSubtasks(task.subtasks);
  const completedCount = subtasks.filter((st) => st.completed).length;
  const imgs = Array.isArray(task.images) ? task.images.filter(Boolean) : [];

  const isSubtaskLocked = (st) => {
    if (!sharedView) return false;
    if (!st.completed) return false;
    return st.toggledBy && st.toggledBy !== user?.id;
  };

  const openImage = (idx) => {
    setViewingTaskImages(imgs);
    setViewingImageIndex(idx);
  };

  const renderSubtaskCheck = (st) => {
    const locked = isSubtaskLocked(st);
    const color = st.toggledBy ? getUserColor(st.toggledBy) : (userColor || '#10B981');
    return (
      <button
        type="button"
        disabled={locked}
        title={locked ? 'Completado por otro usuario' : 'Marcar/desmarcar'}
        onClick={() => onToggleSubtask?.(st.id)}
        className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          st.completed ? 'text-white' : 'border-gray-300 hover:opacity-80'
        } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          backgroundColor: st.completed ? color : 'transparent',
          borderColor: st.completed ? color : (color + '60')
        }}
      >
        {st.completed && (
          <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  };

  const renderStaticSubtaskCheck = (st) => {
    return (
      <span
        className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${st.completed ? '' : 'border-gray-300'}`}
        style={st.completed ? {
          backgroundColor: st.toggledBy ? getUserColor(st.toggledBy) : '#10B981',
          borderColor: st.toggledBy ? getUserColor(st.toggledBy) : '#10B981'
        } : undefined}
      >
        {st.completed && (
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    );
  };

  const renderSubtasks = (interactive) => (
    <>
      <div className="border-t border-gray-100" />
      <div className="px-3 py-1.5 space-y-1">
        {subtasks.map((st) => (
          <div key={st.id} className="flex items-center gap-2">
            {interactive ? renderSubtaskCheck(st) : renderStaticSubtaskCheck(st)}
            <span className={`text-xs ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {st.title}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  const renderCreatorAssignee = () => (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F464}'} Creado por</label>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
          {task.creator?.profileImage ? (
            <img src={getCloudinaryThumb(task.creator.profileImage, 64)} alt="" className="w-4 h-4 rounded-full object-cover" loading="lazy" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-violet-400 text-white flex items-center justify-center text-[8px] font-bold">
              {task.creator?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
          <span className="text-[11px] text-gray-700 font-medium">{task.creator?.name || 'Desconocido'}</span>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F91D}'} Asignado a</label>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
          {task.assignee ? (
            <>
              {task.assignee.profileImage ? (
                <img src={getCloudinaryThumb(task.assignee.profileImage, 64)} alt="" className="w-4 h-4 rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-emerald-400 text-white flex items-center justify-center text-[8px] font-bold">
                  {task.assignee.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-[11px] text-gray-700 font-medium">{task.assignee.name}</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-400">Sin asignar</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderImages = () => {
    if (imgs.length === 0) return null;
    return (
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F4F7}'} Imágenes ({imgs.length})</label>
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {imgs.map((url, idx) => (
            <div
              key={idx}
              className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 shrink-0 mt-1"
              onClick={() => openImage(idx)}
            >
              <img src={getCloudinaryThumb(url, 160)} alt={`${task.title} ${idx + 1}`} className="w-16 h-16 object-cover" draggable={false} loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition flex items-center justify-center pointer-events-none">
                <span className="text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition bg-black/60 px-1.5 py-0.5 rounded-md pointer-events-auto select-none">
                  {'\u{1F441}\uFE0F'} Ver
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSharedWith = (withCount = false) => {
    if (sharedUsers.length === 0) return null;
    return (
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-1">
          {'\u{1F91D}'} Compartida con {withCount ? `${sharedUsers.length} usuario${sharedUsers.length !== 1 ? 's' : ''}` : ''}
        </label>
        <div className="flex flex-wrap gap-1">
          {sharedUsers.map((u) => {
            const color = getUserColor(u.id);
            return (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{ backgroundColor: color + '18', borderColor: color + '40', color }}
              >
                {u.profileImage ? (
                  <img src={getCloudinaryThumb(u.profileImage, 64)} alt="" className="w-3 h-3 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white" style={{ backgroundColor: color }}>
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{u.name}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Título (read-only) */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0">Título</label>
        <p className="text-sm font-semibold text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">{task.title}</p>
      </div>

      {renderCreatorAssignee()}

      {/* Descripción + Sub-tareas */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0">
          Descripción {subtasks.length > 0 && (
            <span className="text-[10px] text-gray-400 font-normal ml-1">&middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}</span>
          )}
        </label>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          {task.description ? (
            <p className="px-3 py-1.5 text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="px-3 py-1.5 text-sm text-gray-400 italic">Sin descripción</p>
          )}
          {subtasks.length > 0 && renderSubtasks(sharedView)}
        </div>
      </div>

      {/* sharedView: solo subtareas interactivas + imágenes + compartidos */}
      {!sharedView && (
        <>
          {/* Prioridad y Fecha */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0">Prioridad</label>
              <p className="text-sm px-3 py-1.5 bg-gray-50 rounded-lg">{PRIORITIES.find((p) => p.value === task.priority)?.label || task.priority || 'Media'}</p>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0">Fecha límite</label>
              <p className="text-sm px-3 py-1.5 bg-gray-50 rounded-lg">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">Etiquetas</label>
            <p className="text-sm px-3 py-1.5 bg-gray-50 rounded-lg">{task.tags || '—'}</p>
          </div>

          {/* Estado (completado) */}
          {(task.completedAt || task.status === 'DONE' || task.status === 'ARCHIVED') && (
            <div className="border-t border-gray-100 pt-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0">Estado</label>
              <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
                {'\u2705'} Completada {task.completedAt && (
                  <span className="text-xs text-gray-400 font-normal">
                    el {new Date(task.completedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </p>
            </div>
          )}
        </>
      )}

      {renderImages()}

      {sharedView ? renderSharedWith(true) : renderSharedWith(false)}

      <button
        type="button"
        onClick={onClose}
        className={`w-full py-1.5 text-xs font-semibold rounded-lg transition text-white ${sharedView ? 'bg-gray-600 hover:bg-gray-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
      >
        Cerrar
      </button>

      {viewingImageIndex !== null && (
        <ImageViewModal
          images={viewingTaskImages.map((url, i) => ({ imageUrl: url, title: `Imagen ${i + 1}` }))}
          currentIndex={viewingImageIndex}
          onClose={() => {
            setViewingImageIndex(null);
            setViewingTaskImages([]);
          }}
          onNavigate={(idx) => setViewingImageIndex(idx)}
        />
      )}
    </div>
  );
}
