import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import TaskFormFields, { formatDateForInput } from './TaskFormFields';
import TaskDetailsView from './TaskDetailsView';
import { getUserColor } from '../constants/kanbanConfig';
import { getCloudinaryThumb } from '../utils/images';
import { tasksApi, usersApi } from '../services/api';

function parseSubtasks(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export default function EditTaskModal({ task, onClose, readOnly, sharedView, userColor }) {
  const { user } = useKanbanStore();
  const canManageShares = user?.id === task.creator?.id || user?.id === task.assignee?.id;

  // Subtareas de la vista (sharedView) — estado propio para reflejar toggles al instante
  const [viewSubtasks, setViewSubtasks] = useState(() => parseSubtasks(task.subtasks));

  // Formulario de edición
  const [form, setForm] = useState(() => ({
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'MEDIUM',
    dueDate: formatDateForInput(task.dueDate),
    tags: task.tags || '',
    assigneeId: task.assignee?.id || '',
    images: Array.isArray(task.images) ? task.images.filter(Boolean) : [],
    subtasks: parseSubtasks(task.subtasks),
  }));
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sharedUsers, setSharedUsers] = useState(task.shares?.map((s) => s.user) || []);
  // Invitación por URL (edición): quien acepte el enlace queda como compartido
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const titleRef = useRef(null);
  // El foco inicial lo maneja TaskFormFields vía autoFocus + titleRef

  useEffect(() => {
    usersApi.getAll().then(setUsers).catch(() => {});
  }, []);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ─── sharedView: toggle de subtarea con persistencia inmediata ───
  const handleViewSubtaskToggle = async (stId) => {
    const st = viewSubtasks.find((s) => s.id === stId);
    if (!st) return;
    // Bloquear si fue completada por otro usuario
    if (st.completed && st.toggledBy && st.toggledBy !== user?.id) return;
    const updated = viewSubtasks.map((s) =>
      s.id === stId ? { ...s, completed: !s.completed, toggledBy: !s.completed ? user?.id : null } : s
    );
    setViewSubtasks(updated);
    try {
      await tasksApi.updateSubtasks(task.id, updated);
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, subtasks: updated } : t))
      }));
    } catch (err) { console.error(err); }
  };

  // ─── modo edición: submit ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const updated = await tasksApi.update(task.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
        tags: form.tags.trim(),
        assigneeId: form.assigneeId || null,
        images: form.images,
        subtasks: form.subtasks,
      });
      const merged = { ...updated, subtasks: form.subtasks };
      useKanbanStore.setState({ tasks: useKanbanStore.getState().tasks.map((t) => (t.id === task.id ? merged : t)) });
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ─── Compartir ──────────────────────────────
  const handleRemoveShare = async (userId) => {
    try {
      await tasksApi.unshare(task.id, userId);
      setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? { ...t, shares: (t.shares || []).filter((s) => s.userId !== userId && s.user?.id !== userId) }
            : t
        )
      }));
    } catch (err) { console.error(err); }
  };

  // Generar (o regenerar) el enlace de invitación de la tarea (rol: compartido)
  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const inv = await tasksApi.getInviteUrl(task.id, 'share');
      setInviteUrl(inv.inviteUrl);
      setInviteCopied(false);
    } catch (err) { console.error(err); }
    finally { setInviteLoading(false); }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // portapapeles bloqueado: noop
    }
  };

  // Persistencia inmediata de subtareas en modo edición (toggle)
  const handleSubtaskToggle = (next) => {
    tasksApi.updateSubtasks(task.id, next).catch(console.error);
  };

  const handleDelete = async () => {
    if (!window.confirm('Eliminar esta tarea?')) return;
    try {
      await tasksApi.remove(task.id);
      useKanbanStore.setState({ tasks: useKanbanStore.getState().tasks.filter((t) => t.id !== task.id) });
      onClose();
    } catch (err) { console.error(err); }
  };

  // ─── Vistas de solo lectura (sharedView / readOnly) ────────────
  if (sharedView || readOnly) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">Ver Tarea</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <TaskDetailsView
            task={{ ...task, subtasks: viewSubtasks }}
            user={user}
            sharedView={sharedView}
            userColor={userColor}
            onToggleSubtask={sharedView ? handleViewSubtaskToggle : undefined}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  // ─── Modo edición ────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900">Editar Tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* ── Creado por ── */}
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

            {/* ── Formulario compartido (dos columnas) ── */}
            <TaskFormFields
              values={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              users={users}
              user={user}
              autoFocus
              titleRef={titleRef}
              onSubtaskToggle={handleSubtaskToggle}
            />

            {/* ── Compartir con otros usuarios ── */}
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
                        {canManageShares && (
                          <button onClick={() => handleRemoveShare(u.id)} className="ml-0.5 transition" style={{ color }} title="Eliminar">
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
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleGenerateInvite}
                    disabled={inviteLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition disabled:opacity-60"
                  >
                    {inviteLoading ? (
                      <><div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Generando...</>
                    ) : (
                      <>📨 Generar enlace de invitación (compartido)</>
                    )}
                  </button>
                  {inviteUrl && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <input
                          readOnly
                          value={inviteUrl}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg text-gray-700 outline-none"
                          aria-label="Enlace de invitación"
                        />
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="px-2.5 py-1.5 text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shrink-0"
                        >
                          {inviteCopied ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleGenerateInvite}
                          className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800 underline transition"
                        >
                          Generar otro enlace
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-400 leading-relaxed">
                        Quien abra el enlace se registra (o inicia sesión) y queda
                        como usuario compartido de la tarea.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

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
        </div>
      </div>
    </div>
  );
}
