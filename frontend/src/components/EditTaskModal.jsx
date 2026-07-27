import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';

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
  const [imageUrl, setImageUrl] = useState(task.imageUrl || '');
  const [sharedUsers, setSharedUsers] = useState(task.shares?.map((s) => s.user) || []);
  const [inviteUserId, setInviteUserId] = useState('');
  const [sharing, setSharing] = useState(false);

  const [subtasks, setSubtasks] = useState(() => {
    try {
      const parsed = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : task.subtasks;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

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
          imageUrl: imageUrl || null,
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

  const handleInvite = async () => {
    if (!inviteUserId) return;
    setSharing(true);
    try {
      const shareRes = await fetch('/api/tasks/' + task.id + '/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ userId: inviteUserId })
      });
      const shareData = await shareRes.json();
      const invitedUser = users.find((u) => u.id === inviteUserId);
      if (invitedUser) {
        setSharedUsers((prev) => [...prev.filter((u) => u.id !== inviteUserId), invitedUser]);
      }
      setInviteUserId('');
      // Actualizar store inmediatamente
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? { ...t, shares: [...(t.shares || []), shareData] }
            : t
        )
      }));
    } catch (err) { console.error(err); }
    finally { setSharing(false); }
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
        <div className="space-y-2.5">
          {/* Título (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Título</label>
            <p className="text-sm font-semibold text-gray-900 px-3 py-2 bg-gray-50 rounded-lg">{task.title}</p>
          </div>

          {/* Creado por + Asignado a */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F464}'} Creado por</label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
                {task.creator?.profileImage ? (
                  <img src={task.creator.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-violet-400 text-white flex items-center justify-center text-[9px] font-bold">
                    {task.creator?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
                <span className="text-xs text-gray-700 font-medium">{task.creator?.name || 'Desconocido'}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F91D}'} Asignado a</label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
                {task.assignee ? (
                  <>
                    {task.assignee.profileImage ? (
                      <img src={task.assignee.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-emerald-400 text-white flex items-center justify-center text-[9px] font-bold">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs text-gray-700 font-medium">{task.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Sin asignar</span>
                )}
              </div>
            </div>
          </div>

          {/* Descripción (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Descripción {subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                &middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}
              </span>
            )}</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {task.description ? (
                <p className="px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="px-3 py-2 text-sm text-gray-400 italic">Sin descripción</p>
              )}
              {/* Sub-tareas — ÚNICO elemento modificable */}
              {subtasks.length > 0 && (
                <>
                  <div className="border-t border-gray-100" />
                  <div className="px-3 py-2 space-y-1">                        {subtasks.map((st) => {
                    const locked = isSubtaskLocked(st);
                    return (
                      <div key={st.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={locked}
                          title={locked ? 'Completado por otro usuario' : 'Marcar/desmarcar'}
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
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
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span
                          className={`text-sm ${
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

          {/* Imagen (click para ver pantalla completa) */}
          {task.imageUrl && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Imagen</label>
              <div
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewImage?.(task);
                }}
              >
                <img
                  src={task.imageUrl}
                  alt={task.title}
                  className="w-full max-h-32 object-contain bg-gray-50"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition bg-black/50 px-2 py-1 rounded-md">
                    Ver imagen completa
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Compartido con X usuarios */}
          {sharedUsers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{'\u{1F91D}'} Compartida con {sharedUsers.length} usuario{sharedUsers.length !== 1 ? 's' : ''}</label>
              <div className="flex flex-wrap gap-1.5">
                {sharedUsers.map((u) => {
                  const color = getUserColor(u.id);
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border"
                      style={{
                        backgroundColor: color + '18',
                        borderColor: color + '40',
                        color: color
                      }}
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      ) : (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
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
            className="w-full py-2 text-xs bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition">Cerrar</button>
        </div>
      );
    }

    if (readOnly) {
      return (
        <div className="space-y-2.5">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Título</label>
            <p className="text-sm font-semibold text-gray-900 px-3 py-2 bg-gray-50 rounded-lg">{task.title}</p>
          </div>

          {/* Descripción + Sub-tareas */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Descripción {subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                &middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}
              </span>
            )}</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {task.description ? (
                <p className="px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="px-3 py-2 text-sm text-gray-400 italic">Sin descripción</p>
              )}
              {/* Sub-tareas en modo vista */}
              {subtasks.length > 0 && (
                <>
                  <div className="border-t border-gray-100" />
                  <div className="px-3 py-2 space-y-1">
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
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Prioridad</label>
              <p className="text-sm px-3 py-2 bg-gray-50 rounded-lg">{PRIORITIES.find(p => p.value === task.priority)?.label || task.priority || 'Media'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Fecha límite</label>
              <p className="text-sm px-3 py-2 bg-gray-50 rounded-lg">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Etiquetas</label>
            <p className="text-sm px-3 py-2 bg-gray-50 rounded-lg">{task.tags || '—'}</p>
          </div>

          {/* Asignado a */}
          {/* Creado por */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F464}'} Creado por</label>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
              {task.creator?.profileImage ? (
                <img src={task.creator.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-violet-400 text-white flex items-center justify-center text-[9px] font-bold">
                  {task.creator?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="text-xs text-gray-700 font-medium">{task.creator?.name || 'Desconocido'}</span>
            </div>
          </div>

          {/* Asignado a */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F91D}'} Asignado a</label>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
              {task.assignee ? (
                <>
                  {task.assignee.profileImage ? (
                    <img src={task.assignee.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-white flex items-center justify-center text-[9px] font-bold">
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs text-gray-700 font-medium">{task.assignee.name}</span>
                </>
              ) : (
                <span className="text-xs text-gray-400">Sin asignar</span>
              )}
            </div>
          </div>

          {/* Imagen */}
          {task.imageUrl && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Imagen</label>
              <img src={task.imageUrl} alt="Task" className="max-h-32 rounded-lg object-contain bg-gray-50" />
            </div>
          )}

          {/* Compartido con */}
          {sharedUsers.length > 0 && (
            <div className="border-t border-gray-100 pt-2.5">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{'\u{1F91D}'} Compartida con</label>
              <div className="flex flex-wrap gap-1.5">
                {sharedUsers.map((u) => {
                  const color = getUserColor(u.id);
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border"
                      style={{
                        backgroundColor: color + '18',
                        borderColor: color + '40',
                        color: color
                      }}
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      ) : (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
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
            <div className="border-t border-gray-100 pt-2.5">
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Estado</label>
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
            className="w-full py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition">Cerrar</button>
        </div>
      );
    }

    // Modo edición
    return (
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Creado por (informativo) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F464}'} Creado por</label>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
              {task.creator?.profileImage ? (
                <img src={task.creator.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-violet-400 text-white flex items-center justify-center text-[9px] font-bold">
                  {task.creator?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="text-xs text-gray-700 font-medium">{task.creator?.name || 'Desconocido'}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F91D}'} Asignado actual</label>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
              {task.assignee ? (
                <>
                  {task.assignee.profileImage ? (
                    <img src={task.assignee.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-white flex items-center justify-center text-[9px] font-bold">
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs text-gray-700 font-medium">{task.assignee.name}</span>
                </>
              ) : (
                <span className="text-xs text-gray-400">Sin asignar</span>
              )}
            </div>
          </div>
        </div>

        {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Título *</label>
            <input
              ref={titleRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Descripción + Sub-tareas integradas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Descripción {subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                &middot; {'\u{1F4CB}'} {completedCount}/{subtasks.length}
              </span>
            )}</label>
            <div className="border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden">
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border-0 outline-none resize-none focus:ring-0 overflow-hidden"
                rows={1}
                placeholder="Descripción..."
              />

              {/* Separador y sub-tareas */}
              <>
                <div className="border-t border-gray-100" />
                <div className="px-2 py-1.5">
                  {/* Lista de sub-tareas */}
                  {subtasks.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                    {/* Lista de sub-tareas */}
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50 transition group"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
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
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span
                          className={`text-[11px] flex-1 ${
                            st.completed ? 'line-through text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {st.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-xs leading-none"
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
                        className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Nueva sub-tarea..."
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        className="px-2 py-1 text-[10px] font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                </>
              
            </div>
          </div>

          {/* Prioridad y Fecha - lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Fecha límite</label>
              <input
                type="text" readOnly value={dueDate ? parseLocalDate(dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                onClick={() => setShowDatePicker(true)}
                placeholder="Seleccionar"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer bg-white"
              />
              {showDatePicker && (
                <DatePickerModal
                  value={dueDate ? parseLocalDate(dueDate) : null}
                  onSelect={(date) => setDueDate(date ? formatLocalDate(date) : '')}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Etiquetas</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="frontend, bug, urgente"
            />
          </div>

          {/* Asignar a + Imagen - misma fila alineada */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Asignar a</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="">{'\u{1F464}'} Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Imagen</label>
              <div className="flex items-center gap-2 flex-1 min-h-[36px]">
                <button
                  type="button"
                  onClick={() => setShowImageUpload(true)}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition h-[34px]"
                >
                  <span>{'\u{1F4F7}'}</span>
                  Img
                </button>
                {imageUrl && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {'\u2705'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compartir con otros usuarios */}
          <div className="border-t border-gray-100 pt-2.5">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {'\u{1F91D}'} {canManageShares ? 'Compartir con' : 'Compartida con'}
            </label>
            {sharedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {sharedUsers.map((u) => {
                  const color = getUserColor(u.id);
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border"
                      style={{
                        backgroundColor: color + '18',
                        borderColor: color + '40',
                        color: color
                      }}
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      ) : (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
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
              <p className="text-[10px] text-gray-400 mb-2 italic">No compartida con nadie</p>
            )}
            {canManageShares && (
              <div className="flex items-center gap-1.5">
                <select
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">Seleccionar usuario...</option>
                  {users
                    .filter((u) => u.id !== task.creator?.id && u.id !== task.assignee?.id && u.id !== user?.id && !sharedUsers.some((su) => su.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={!inviteUserId || sharing}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {sharing ? '...' : 'Invitar'}
                </button>
              </div>
            )}
          </div>

          {showImageUpload && (
            <ImageUploadModal
              taskId={task.id}
              currentImage={imageUrl}
              onSave={(url) => {
                setImageUrl(url);
                setShowImageUpload(false);
              }}
              onClose={() => setShowImageUpload(false)}
            />
          )}

          <div className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
            <button type="button" onClick={handleDelete}
              className="w-full sm:w-auto py-2 px-3 text-xs border border-red-200 rounded-lg text-red-600 font-medium hover:bg-red-50 transition">Eliminar</button>
            <button type="button" onClick={onClose}
              className="w-full sm:flex-1 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={saving}
              className="w-full sm:flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition">
              {saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      );
    };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">{readOnly ? 'Ver Tarea' : 'Editar Tarea'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-3">
          {renderModalContent()}
        </div>
      </div>
    </div>
  );
}
