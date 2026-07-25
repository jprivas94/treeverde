import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';

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

export default function EditTaskModal({ task, onClose }) {
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
  const { token } = useKanbanStore();
  const titleRef = useRef(null);

  // Auto-foco y selección del texto al abrir el modal
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, []);

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
          imageUrl: imageUrl || null
        })
      });
      const updated = await res.json();
      useKanbanStore.setState({ tasks: useKanbanStore.getState().tasks.map((t) => (t.id === task.id ? updated : t)) });
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Editar Tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
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

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              rows={2}
            />
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

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleDelete}
              className="py-2 px-3 text-xs border border-red-200 rounded-lg text-red-600 font-medium hover:bg-red-50 transition">Eliminar</button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition">
              {saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
