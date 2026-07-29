import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';
import ImageViewModal from './ImageViewModal';
import SearchableUserSelect from './SearchableUserSelect';

// Paleta de colores para usuarios compartidos
const USER_COLORS = [
  '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4',
];

export function getUserColor(userId) {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
}

function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const PRIORITIES = [
  { value: 'LOW', label: '🟢 Baja', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'MEDIUM', label: '🟡 Media', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'HIGH', label: '🟠 Alta', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'CRITICAL', label: '🔴 Crítica', color: 'text-red-600 bg-red-50 border-red-200' },
];

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export default function EditTaskModal({ task, onClose, readOnly, sharedView, userColor, onViewImage }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagsInput, setTagsInput] = useState(task.tags || '');
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || '');
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [images, setImages] = useState(() => Array.isArray(task.images) ? task.images.filter(Boolean) : []);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);
  const [viewingTaskImages, setViewingTaskImages] = useState([]);
  const [sharedUsers, setSharedUsers] = useState(task.shares?.map((s) => s.user) || []);
  const [inviteUserId, setInviteUserId] = useState('');

  const [subtasks, setSubtasks] = useState(() => {
    try {
      const parsed = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : task.subtasks;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [sharing, setSharing] = useState(false);

  const { token, user } = useKanbanStore();
  // Solo el creador o asignado puede invitar/eliminar invitados
  const canManageShares = user?.id === task.creator?.id || user?.id === task.assignee?.id;
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  // Auto-foco y selección del texto al abrir el modal (solo si no es readOnly)
  useEffect(() => {
    if (titleRef.current && !readOnly) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [readOnly]);

  // Auto-ajuste de altura del textarea según su contenido
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [description]);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    fetch('/api/users', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => r.json()).then(setUsers).catch(() => {});
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasks/' + task.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          tags: tagsInput.trim(),
          assigneeId: assigneeId || null,
          images,
          subtasks
        })
      });
      const updated = await res.json();
      // El PUT ya devuelve shares actualizados del backend; no sobrescribir con datos viejos
      const merged = { ...updated, subtasks };
      useKanbanStore.setState({ tasks: useKanbanStore.getState().tasks.map((t) => (t.id === task.id ? merged : t)) });
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleRemoveShare = async (userId) => {
    try {
      await fetch('/api/tasks/' + task.id + '/share/' + userId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
      // Actualizar store inmediatamente
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? { ...t, shares: (t.shares || []).filter((s) => s.userId !== userId && s.user?.id !== userId) }
            : t
        )
      }));
    } catch (err) { console.error(err); }
  };

  // ─── Sub-tareas ──────────────────────────────
  let subtaskIdCounter = subtasks.reduce((max, st) => Math.max(max, parseInt(st.id) || 0), 0);

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    subtaskIdCounter++;
    setSubtasks((prev) => [...prev, { id: String(subtaskIdCounter), title, completed: false }]);
    setNewSubtaskTitle('');
  };

  // Un usuario compartido NO puede desmarcar una subtarea completada por OTRO usuario
  const isSubtaskLocked = (st) => {
    if (!sharedView) return false; // Creador/asignado siempre puede
    if (!st.completed) return false; // Incompleta: cualquiera puede marcarla
    // Completada por otro usuario compartido: bloqueada
    return st.toggledBy && st.toggledBy !== user?.id;
  };

  const handleToggleSubtask = (subtaskId) => {
    const subtask = subtasks.find((st) => st.id === subtaskId);
    if (!subtask || isSubtaskLocked(subtask)) return; // Bloquear si no puede modificarla

    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed, toggledBy: !st.completed ? user.id : null } : st
    );
    setSubtasks(updated);
    // Persistir cambio al instante y actualizar store
    fetch('/api/tasks/' + task.id + '/subtasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ subtasks: updated })
    }).then(() => {
      // Sincronizar store para que al cerrar/reabrir el modal se vea el cambio
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, subtasks: updated } : t
        )
      }));
    }).catch(console.error);
  };

  const handleRemoveSubtask = (subtaskId) => {
    const updated = subtasks.filter((st) => st.id !== subtaskId);
    setSubtasks(updated);
    fetch('/api/tasks/' + task.id + '/subtasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ subtasks: updated })
    }).then(() => {
      // Sincronizar store
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, subtasks: updated } : t
        )
      }));
    }).catch(console.error);
  };

  const completedCount = subtasks.filter((st) => st.completed).length;

  const handleDelete = () => {
    if (!confirm('Eliminar esta tarea?')) return;
    fetch('/api/tasks/' + task.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    }).then(() => {
      useKanbanStore.setState({ tasks: useKanbanStore.getState().tasks.filter((t) => t.id !== task.id) });
      onClose();
    }).catch(console.error);
  };

  const renderModalContent = () => {
    if (sharedView) {
      return (
        <div className="space-y-2">
          {/* Título (read-only) */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">Título</label>
            <p className="text-sm font-semibold text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">{task.title}</p>
          </div>

          {/* Creado por + Asignado a */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F464}'} Creado por</label>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                {task.creator?.profileImage ? (
                  <img src={task.creator.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
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
                      <img src={task.assignee.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
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

          {/* Descripción (read-only) */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">Descripción {subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                &middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}
              </span>
            )}</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {task.description ? (
                <p className="px-3 py-1.5 text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="px-3 py-1.5 text-sm text-gray-400 italic">Sin descripción</p>
              )}
              {/* Sub-tareas — ÚNICO elemento modificable */}
              {subtasks.length > 0 && (
                <>
                  <div className="border-t border-gray-100" />
                  <div className="px-3 py-1.5 space-y-1">                        {subtasks.map((st) => {
                    const locked = isSubtaskLocked(st);
                    return (
                      <div key={st.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={locked}
                          title={locked ? 'Completado por otro usuario' : 'Marcar/desmarcar'}
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            st.completed
                              ? 'text-white'
                              : 'border-gray-300 hover:opacity-80'
                          } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          style={{
                            backgroundColor: st.completed ? (st.toggledBy ? getUserColor(st.toggledBy) : (userColor || '#10B981')) : 'transparent',
                            borderColor: st.completed ? (st.toggledBy ? getUserColor(st.toggledBy) : (userColor || '#10B981')) : ((st.toggledBy ? getUserColor(st.toggledBy) : (userColor || '#10B981')) + '60')
                          }}
                        >
                          {st.completed && (
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span
                          className={`text-xs ${
                            st.completed ? 'line-through text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Imágenes */}
          {(() => {
            const imgs = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
            if (imgs.length === 0) return null;
            return (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F4F7}'} Imágenes ({imgs.length})</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                  {imgs.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 shrink-0 mt-1"
                      onClick={() => {
                        setViewingTaskImages(imgs);
                        setViewingImageIndex(idx);
                      }}
                    >
                      <img
                        src={url}
                        alt={`${task.title} ${idx + 1}`}
                        className="w-16 h-16 object-cover"
                        draggable={false}
                      />
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
          })()}

          {/* Compartido con X usuarios */}
          {sharedUsers.length > 0 && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">{'\u{1F91D}'} Compartida con {sharedUsers.length} usuario{sharedUsers.length !== 1 ? 's' : ''}</label>
              <div className="flex flex-wrap gap-1">
                {sharedUsers.map((u) => {
                  const color = getUserColor(u.id);
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: color + '18',
                        borderColor: color + '40',
                        color: color
                      }}
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-3 h-3 rounded-full object-cover" />
                      ) : (
                        <span
                          className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{u.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <button type="button" onClick={onClose}
            className="w-full py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition">Cerrar</button>
        </div>
      );
    }

    if (readOnly) {
      return (
        <div className="space-y-2">
          {/* Título */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">Título</label>
            <p className="text-sm font-semibold text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">{task.title}</p>
          </div>

          {/* Descripción + Sub-tareas */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">Descripción {subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                &middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}
              </span>
            )}</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {task.description ? (
                <p className="px-3 py-1.5 text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="px-3 py-1.5 text-sm text-gray-400 italic">Sin descripción</p>
              )}
              {/* Sub-tareas en modo vista */}
              {subtasks.length > 0 && (
                <>
                  <div className="border-t border-gray-100" />
                  <div className="px-3 py-1.5 space-y-1">
                    {subtasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                            st.completed ? '' : 'border-gray-300'
                          }`}
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
                        <span className={`text-xs ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Prioridad y Fecha */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0">Prioridad</label>
              <p className="text-sm px-3 py-1.5 bg-gray-50 rounded-lg">{PRIORITIES.find(p => p.value === task.priority)?.label || task.priority || 'Media'}</p>
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

          {/* Creado por */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F464}'} Creado por</label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
              {task.creator?.profileImage ? (
                <img src={task.creator.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-violet-400 text-white flex items-center justify-center text-[8px] font-bold">
                  {task.creator?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="text-[11px] text-gray-700 font-medium">{task.creator?.name || 'Desconocido'}</span>
            </div>
          </div>

          {/* Asignado a */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F91D}'} Asignado a</label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
              {task.assignee ? (
                <>
                  {task.assignee.profileImage ? (
                    <img src={task.assignee.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
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

          {/* Imágenes */}
          {(() => {
            const imgs = Array.isArray(task.images) ? task.images.filter(Boolean) : [];
            if (imgs.length === 0) return null;
            return (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F4F7}'} Imágenes ({imgs.length})</label>
                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                  {imgs.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 shrink-0 mt-1"
                      onClick={() => {
                        setViewingTaskImages(imgs);
                        setViewingImageIndex(idx);
                      }}
                    >
                      <img
                        src={url}
                        alt={`Imagen ${idx + 1}`}
                        className="w-14 h-14 object-cover"
                        draggable={false}
                      />
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
          })()}

          {/* Compartido con */}
          {sharedUsers.length > 0 && (
            <div className="border-t border-gray-100 pt-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-1">{'\u{1F91D}'} Compartida con</label>
              <div className="flex flex-wrap gap-1">
                {sharedUsers.map((u) => {
                  const color = getUserColor(u.id);
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: color + '18',
                        borderColor: color + '40',
                        color: color
                      }}
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-3 h-3 rounded-full object-cover" />
                      ) : (
                        <span
                          className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{u.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

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

          <button type="button" onClick={onClose}
            className="w-full py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition">Cerrar</button>
        </div>
      );
    }

    // Modo edición
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* ── Creado por ── */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-0">{'\u{1F464}'} Creado por</label>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
            {task.creator?.profileImage ? (
              <img src={task.creator.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-violet-400 text-white flex items-center justify-center text-[8px] font-bold">
                {task.creator?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
            <span className="text-[11px] text-gray-700 font-medium">{task.creator?.name || 'Desconocido'}</span>
          </div>
        </div>

        {/* ── Layout de dos columnas ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {/* ═══ LADO IZQUIERDO: Título + Descripción ═══ */}
          <div className="md:col-span-3 bg-gray-50/70 border border-gray-100 rounded-xl p-3 h-full flex flex-col gap-2">
            {/* Título */}
            <div className="shrink-0">
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Título *</label>
              <input
                ref={titleRef}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                placeholder="Título de la tarea"
              />
            </div>

            {/* Descripción + Sub-tareas */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-[10px] font-medium text-gray-600 mb-0 shrink-0">
                Descripción {subtasks.length > 0 && (
                  <span className="text-[10px] text-gray-400 font-normal ml-1">
                    &middot; {'\uD83D\uDCCB'} {completedCount}/{subtasks.length}
                  </span>
                )}
              </label>
              <div className="flex-1 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden bg-white flex flex-col min-h-0">
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full flex-1 min-h-0 px-3 py-1.5 text-sm border-0 outline-none resize-none focus:ring-0"
                  placeholder="Descripción..."
                />

                {/* Separador y sub-tareas */}
                <div className="shrink-0">
                  <div className="border-t border-gray-100" />
                  <div className="px-1.5 py-1">
                    {/* Lista de sub-tareas */}
                    {subtasks.length > 0 && (
                      <div className="space-y-0 mb-0.5">
                        {subtasks.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg hover:bg-gray-50 transition group"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(st.id)}
                              className={`w-3 h-3 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                st.completed
                                  ? 'text-white'
                                  : 'border-gray-300 hover:border-emerald-400'
                              }`}
                              style={st.completed ? {
                                backgroundColor: st.toggledBy ? getUserColor(st.toggledBy) : '#10B981',
                                borderColor: st.toggledBy ? getUserColor(st.toggledBy) : '#10B981'
                              } : undefined}
                            >
                              {st.completed && (
                                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <span
                              className={`text-[10px] flex-1 ${
                                st.completed ? 'line-through text-gray-400' : 'text-gray-700'
                              }`}
                            >
                              {st.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(st.id)}
                              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-[10px] leading-none"
                              title="Eliminar"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input para nueva sub-tarea */}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                        className="flex-1 px-1.5 py-0.5 text-[10px] border border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Nueva sub-tarea..."
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        className="px-1.5 py-0.5 text-[9px] font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ LADO DERECHO: Asignar a, Prioridad, Fecha, Etiquetas, Imagen ═══ */}
          <div className="md:col-span-2 h-full">
            <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 h-full flex flex-col justify-center space-y-1.5">
              {/* Asignar a */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0">Asignar a</label>
                <SearchableUserSelect
                  value={assigneeId}
                  onChange={setAssigneeId}
                  users={users}
                  placeholder="Sin asignar"
                  size="small"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0">Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={'w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ' + (PRIORITIES.find((p) => p.value === priority)?.color || 'bg-white border-gray-200 text-gray-700')}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Fecha límite */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0">Fecha l&iacute;mite</label>
                <input
                  type="text" readOnly value={dueDate ? parseLocalDate(dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                  onClick={() => setShowDatePicker(true)}
                  placeholder="Seleccionar"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer bg-white"
                />
                {showDatePicker && (
                  <DatePickerModal
                    value={dueDate ? parseLocalDate(dueDate) : null}
                    onSelect={(date) => setDueDate(date ? formatLocalDate(date) : '')}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}
              </div>

              {/* Etiquetas */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0">Etiquetas</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="frontend, bug, urgente"
                />
              </div>

              {/* Imágenes */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0">Imágenes</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowImageUpload(true)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
                  >
                    <span>{'\u{1F4F7}'}</span>
                    Subir
                  </button>
                  {images.length > 0 && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">
                      {images.length} {'\u2705'}
                    </span>
                  )}
                </div>
                {images.length > 0 && (
                  <div className="flex gap-1 mt-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                    {images.map((url, idx) => (
                      <div key={idx} className="relative group shrink-0 mt-1 cursor-pointer">
                        <img src={url} alt={`Img ${idx+1}`} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        <div
                          onClick={() => setViewingImageIndex(idx)}
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition flex items-center justify-center pointer-events-none"
                        >
                          <span className="text-white text-[8px] font-semibold opacity-0 group-hover:opacity-100 transition bg-black/60 px-1.5 py-0.5 rounded-md pointer-events-auto select-none">
                            {'\u{1F441}\uFE0F'} Ver
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[7px] flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition z-10"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compartir con otros usuarios */}
        <div className="pt-2 mt-2">
          <label className="block text-[10px] font-medium text-gray-600 mb-1">
            {'\u{1F91D}'} {canManageShares ? 'Compartir con' : 'Compartida con'}
          </label>
          {sharedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {sharedUsers.map((u) => {
                const color = getUserColor(u.id);
                return (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: color + '18',
                      borderColor: color + '40',
                      color: color
                    }}
                  >
                    {u.profileImage ? (
                      <img src={u.profileImage} alt="" className="w-3 h-3 rounded-full object-cover" />
                    ) : (
                      <span
                        className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{u.name}</span>
                    {canManageShares && (
                      <button
                        onClick={() => handleRemoveShare(u.id)}
                        className="ml-0.5 transition"
                        style={{ color: color }}
                        title="Eliminar"
                      >
                        &times;
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          {sharedUsers.length === 0 && (
            <p className="text-[10px] text-gray-400 mb-1 italic">No compartida con nadie</p>
          )}
          {canManageShares && (
            <div className="flex-1 relative">
              <SearchableUserSelect
                value={inviteUserId}
                onChange={async (userId) => {
                  if (!userId) return;
                  setSharing(true);
                  try {
                    const shareRes = await fetch('/api/tasks/' + task.id + '/share', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                      body: JSON.stringify({ userId })
                    });
                    const shareData = await shareRes.json();
                    const invitedUser = users.find((u) => u.id === userId);
                    if (invitedUser) {
                      setSharedUsers((prev) => [...prev.filter((u) => u.id !== userId), invitedUser]);
                    }
                    setInviteUserId('');
                    useKanbanStore.setState((state) => ({
                      tasks: state.tasks.map((t) =>
                        t.id === task.id
                          ? { ...t, shares: [...(t.shares || []), shareData] }
                          : t
                      )
                    }));
                  } catch (err) { console.error(err); }
                  finally { setSharing(false); }
                }}
                users={users}
                placeholder="Seleccionar usuario..."
                size="small"
                filter={(u) => u.id !== task.creator?.id && u.id !== task.assignee?.id && u.id !== user?.id && !sharedUsers.some((su) => su.id === u.id)}
              />
              {sharing && (
                <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

        {showImageUpload && (
          <ImageUploadModal
            currentImages={images}
            onSave={(newImages) => {
              setImages(newImages);
              setShowImageUpload(false);
            }}
            onClose={() => setShowImageUpload(false)}
          />
        )}

        {user?.id === task.creator?.id && (
          <button type="button" onClick={handleDelete}
            className="w-full py-2 text-xs border border-red-200 rounded-lg text-red-600 font-medium hover:bg-red-50 transition">Eliminar tarea</button>
        )}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button type="button" onClick={onClose}
            className="py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">Cancelar</button>
          <button type="submit" disabled={saving}
            className="py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando</>
            ) : 'Guardar'}</button>
        </div>
        </form>
      );
    };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900">{readOnly ? 'Ver Tarea' : 'Editar Tarea'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div>
          {renderModalContent()}
        </div>
      </div>

      {viewingImageIndex !== null && (
        <ImageViewModal
          images={(viewingTaskImages.length > 0 ? viewingTaskImages : images).map((url, i) => ({ imageUrl: url, title: `Imagen ${i + 1}` }))}
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
