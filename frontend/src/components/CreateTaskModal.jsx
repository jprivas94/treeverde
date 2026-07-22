import { useState, useEffect } from 'react';
import useKanbanStore from '../store/kanbanStore';
import DatePickerModal from './DatePickerModal';

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
  const { addTask, token } = useKanbanStore();

  // Cargar usuarios del sistema
  useEffect(() => {
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {});
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          tags: tagsInput.trim(),
          assigneeId: assigneeId || null
        })
      });
      const task = await res.json();
      addTask(task);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Nueva Tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Ej: Implementar login"
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              rows={3}
              placeholder="Descripción opcional..."
            />
          </div>

          {/* Prioridad y Fecha - lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
              <input
                type="text" readOnly value={dueDate ? new Date(dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                onClick={() => setShowDatePicker(true)}
                placeholder="Seleccionar fecha"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Etiquetas</label>
            <input
              type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Ej: frontend, bug, urgente (separadas por coma)"
            />
          </div>

          {/* Asignar a */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
            <select
              value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition">
              {saving ? 'Guardando...' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
