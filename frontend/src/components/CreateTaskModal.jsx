import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';
import SearchableUserSelect from './SearchableUserSelect';

function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const PRIORITIES = [
  { value: 'LOW', label: '\uD83D\uDFE2 Baja', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'MEDIUM', label: '\uD83D\uDFE1 Media', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'HIGH', label: '\uD83D\uDFE0 Alta', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'CRITICAL', label: '\uD83D\uDD34 Cr\u00edtica', color: 'text-red-600 bg-red-50 border-red-200' },
];

export default function CreateTaskModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Subtareas
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  let subtaskIdCounter = 0;

  // Compartir
  const [sharedUsers, setSharedUsers] = useState([]);
  const [inviteUserId, setInviteUserId] = useState('');

  const { addTask, token, user } = useKanbanStore();
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus();
  }, []);

  // Auto-ajuste textarea
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [description]);

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
      const res = await fetch('/api/tasks', {
        method: 'POST',
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
      const task = await res.json();

      // Compartir con los usuarios seleccionados después de crear
      if (sharedUsers.length > 0) {
        for (const su of sharedUsers) {
          // Buscar el userId real del usuario compartido
          const targetUser = users.find((u) => u.name === su.name || u.id === su.id);
          if (targetUser && targetUser.id !== user?.id) {
            await fetch('/api/tasks/' + task.id + '/share', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
              body: JSON.stringify({ userId: targetUser.id })
            }).catch(() => {});
          }
        }
        // Recargar tarea para incluir los shares
        const reloadRes = await fetch('/api/tasks/' + task.id, {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (reloadRes.ok) {
          const reloaded = await reloadRes.json();
          addTask(reloaded);
          onClose();
          return;
        }
      }

      addTask(task);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Sub-tareas ──────────────────────────────
  const handleAddSubtask = () => {
    const stTitle = newSubtaskTitle.trim();
    if (!stTitle) return;
    subtaskIdCounter++;
    setSubtasks((prev) => [...prev, { id: String(subtaskIdCounter + Date.now()), title: stTitle, completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (stId) => {
    setSubtasks((prev) => prev.map((st) =>
      st.id === stId ? { ...st, completed: !st.completed } : st
    ));
  };

  const handleRemoveSubtask = (stId) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== stId));
  };

  const completedCount = subtasks.filter((st) => st.completed).length;

  // ─── Compartir ───────────────────────────────
  const handleRemoveShare = (userId) => {
    setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Nueva Tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* ── Creado por ── */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">{'\u{1F464}'} Creado por</label>
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 rounded-lg">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-violet-400 text-white flex items-center justify-center text-[9px] font-bold">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="text-xs text-gray-700 font-medium">{user?.name || 'Tú'}</span>
            </div>
          </div>

          {/* ── Layout de dos columnas: Izquierda (Título + Descripción) | Derecha (resto) ── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* ═══ LADO IZQUIERDO: Título + Descripción ═══ */}
            <div className="md:col-span-3 bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 h-full flex flex-col gap-2.5">
              {/* Título */}
              <div className="shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Título *</label>
                <input
                  ref={titleRef}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  placeholder="Ej: Implementar login"
                />
              </div>

              {/* Descripción + Sub-tareas */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-xs font-medium text-gray-600 mb-0.5 shrink-0">
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
                    className="w-full flex-1 min-h-0 px-3 py-2 text-sm border-0 outline-none resize-none focus:ring-0"
                    placeholder="Descripción..."
                  />

                  {/* Separador y sub-tareas */}
                  <div className="shrink-0">
                    <div className="border-t border-gray-100" />
                    <div className="px-2 py-1.5">
                      {/* Lista de sub-tareas */}
                      {subtasks.length > 0 && (
                        <div className="space-y-0.5 mb-1">
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
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-gray-300 hover:border-emerald-400'
                                }`}
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
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ LADO DERECHO: Asignar a, Prioridad, Fecha, Etiquetas, Imagen ═══ */}
            <div className="md:col-span-2 h-full">
              <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 h-full flex flex-col justify-center space-y-2.5">
                {/* Asignar a */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Asignar a</label>
                  <SearchableUserSelect
                    value={assigneeId}
                    onChange={setAssigneeId}
                    users={users}
                    placeholder="{'\u{1F464}'} Sin asignar"
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha límite */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Fecha l&iacute;mite</label>
                  <input
                    type="text" readOnly value={dueDate ? parseLocalDate(dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    onClick={() => setShowDatePicker(true)}
                    placeholder="Seleccionar"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer bg-white"
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
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Etiquetas</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="frontend, bug, urgente"
                  />
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Imagen</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImageUpload(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
                    >
                      <span>{'\u{1F4F7}'}</span>
                      {imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                    </button>
                    {imageUrl && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                        {'\u2705'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Compartir con otros usuarios ── */}
          <div className="pt-2.5 mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {'\u{1F91D}'} Compartir con
            </label>
            {sharedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {sharedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    {u.profileImage ? (
                      <img src={u.profileImage} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-indigo-400 text-white flex items-center justify-center text-[7px] font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{u.name}</span>
                    <button
                      onClick={() => handleRemoveShare(u.id)}
                      className="ml-0.5 text-indigo-400 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex-1">
              <SearchableUserSelect
                value={inviteUserId}
                onChange={(userId) => {
                  if (userId) {
                    const invitedUser = users.find((u) => u.id === userId);
                    if (invitedUser) {
                      setSharedUsers((prev) => [...prev.filter((u) => u.id !== userId), invitedUser]);
                    }
                    setInviteUserId('');
                  }
                }}
                users={users}
                placeholder="Seleccionar usuario..."
                size="small"
                filter={(u) => u.id !== user?.id && !sharedUsers.some((su) => su.id === u.id)}
              />
            </div>
          </div>

          {showImageUpload && (
            <ImageUploadModal
              currentImage={imageUrl}
              onSave={(url) => {
                setImageUrl(url);
                setShowImageUpload(false);
              }}
              onClose={() => setShowImageUpload(false)}
            />
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="py-2.5 text-xs border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={saving}
              className="py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando</>
              ) : 'Crear Tarea'}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
