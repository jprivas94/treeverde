import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';
import ImageViewModal from './ImageViewModal';
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
  const [images, setImages] = useState([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);

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
          images,
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900">Nueva Tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div>
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* ── Creado por ── */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{'\u{1F464}'} Creado por</label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-violet-400 text-white flex items-center justify-center text-[8px] font-bold">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="text-[11px] text-gray-700 font-medium">{user?.name || 'Tú'}</span>
            </div>
          </div>

          {/* ── Layout de dos columnas: Izquierda (Título + Descripción) | Derecha (resto) ── */}
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
                  placeholder="Ej: Implementar login"
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
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-gray-300 hover:border-emerald-400'
                                }`}
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

          {/* ── Compartir con otros usuarios ── */}
          <div className="pt-2 mt-2">
            <label className="block text-[10px] font-medium text-gray-600 mb-1">
              {'\u{1F91D}'} Compartir con
            </label>
            {sharedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {sharedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    {u.profileImage ? (
                      <img src={u.profileImage} alt="" className="w-3 h-3 rounded-full object-cover" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-indigo-400 text-white flex items-center justify-center text-[6px] font-bold">
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
              currentImages={images}
              onSave={(newImages) => {
                setImages(newImages);
                setShowImageUpload(false);
              }}
              onClose={() => setShowImageUpload(false)}
            />
          )}

          {viewingImageIndex !== null && (
            <ImageViewModal
              images={images.map((url, i) => ({ imageUrl: url, title: `Imagen ${i + 1}` }))}
              currentIndex={viewingImageIndex}
              onClose={() => setViewingImageIndex(null)}
              onNavigate={(idx) => setViewingImageIndex(idx)}
            />
          )}

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button type="button" onClick={onClose}
              className="py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={saving}
              className="py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
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
