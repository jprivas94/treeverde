import { useState, useEffect, useRef, useCallback } from 'react';
import useKanbanStore from '../store/kanbanStore';
import TaskFormFields from './TaskFormFields';
import TaskDetailsView from './TaskDetailsView';
import SearchableUserSelect from './SearchableUserSelect';
import { getUserColor } from '../constants/kanbanConfig';
import { tasksApi, usersApi } from '../services/api';
import { parseSubtasks } from '../utils/tasks';
import { formatDateForInput } from '../utils/date';
import Avatar from './Avatar';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function EditTaskModal({ task, onClose, readOnly, sharedView, userColor }) {
  const user = useKanbanStore((s) => s.user);
  const canManageShares = user?.id === task.creator?.id || user?.id === task.assignee?.id;
  // El asignado (que no es el creador) no puede cambiar a quién asignar ni la fecha límite
  const isAssigneeOnly = user?.id === task.assignee?.id && user?.id !== task.creator?.id;

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sharedUsers, setSharedUsers] = useState(task.shares?.map((s) => s.user) || []);
  // Select para elegir con quién compartir
  const [inviteUserId, setInviteUserId] = useState('');
  // Invitación por URL (edición): quien acepte el enlace queda como compartido
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const titleRef = useRef(null);
  // El foco inicial lo maneja TaskFormFields vía autoFocus + titleRef

  useEffect(() => {
    usersApi.getAll().then(setUsers).catch(() => {});
  }, []);

  // Búsqueda server-side con debounce (desde SearchableUserSelect).
  // El contador descarta respuestas fuera de orden al escribir rápido.
  const searchSeq = useRef(0);
  const handleUserSearch = useCallback(async (q) => {
    const seq = ++searchSeq.current;
    const data = await usersApi.getAll({ search: q }).catch(() => null);
    if (data && seq === searchSeq.current) setUsers(data);
  }, []);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showDeleteConfirm) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showDeleteConfirm]);

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
  // Compartir con un usuario elegido en el select (se comparte al instante)
  const handleAddShare = async (userId) => {
    if (!userId) return;
    const target = users.find((u) => u.id === userId);
    if (!target || target.id === user?.id) return;
    setInviteUserId('');
    setSharedUsers((prev) => (prev.some((u) => u.id === userId) ? prev : [...prev, target]));
    try {
      await tasksApi.share(task.id, userId);
      useKanbanStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? { ...t, shares: [...(t.shares || []).filter((s) => s.userId !== userId && s.user?.id !== userId), { userId, user: target }] }
            : t
        )
      }));
    } catch (err) {
      console.error(err);
      // Rollback del chip optimista si la compartición no se pudo persistir
      setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

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
    setShowDeleteConfirm(false);
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
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Ver Tarea</h2>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
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
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Editar Tarea</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* ── Creado por ── */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0">{'\u{1F464}'} Creado por</label>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Avatar user={task.creator} sizeClass="w-4 h-4 text-[8px]" fallbackClass="bg-violet-400 text-white" />
                <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">{task.creator?.name || 'Desconocido'}</span>
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
              isAssigneeOnly={isAssigneeOnly}
              onUserSearch={handleUserSearch}
            />

            {/* ── Compartir con otros usuarios ── */}
            <div className="pt-2 mt-2">
              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
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
                        <Avatar user={u} sizeClass="w-3 h-3 text-[6px]" fallbackClass="text-white" style={{ backgroundColor: color }} />
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
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 italic">No compartida con nadie</p>
              )}
              {canManageShares && (
                <>
                  {/* Select: elegir con quién compartir */}
                  <div className="mt-1">
                    <SearchableUserSelect
                      value={inviteUserId}
                      onChange={handleAddShare}
                      users={users}
                      placeholder="Seleccionar usuario..."
                      size="small"
                      onSearch={handleUserSearch}
                      filter={(u) => u.id !== user?.id && !sharedUsers.some((su) => su.id === u.id)}
                    />
                  </div>

                  {/* Botón Generar: centrado, debajo del select. Desaparece al generarse el enlace */}
                  {!inviteUrl && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={handleGenerateInvite}
                        disabled={inviteLoading}
                        title="Generar una URL para compartir esta tarea"
                        className="flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 rounded-lg transition disabled:opacity-60"
                      >
                        {inviteLoading ? (
                          <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando enlace...</>
                        ) : (
                          <>🔗 Generar enlace para compartir la tarea</>
                        )}
                      </button>
                    </div>
                  )}

                  {inviteUrl && (
                    <div className="space-y-1.5 pt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">ENLACE URL:</span>
                        <input
                          readOnly
                          value={inviteUrl}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 outline-none"
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
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={"grid gap-2 pt-0.5 " + (user?.id === task.creator?.id ? 'grid-cols-3' : 'grid-cols-2')}>
              <button type="button" onClick={onClose}
                className="py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              {user?.id === task.creator?.id && (
                <button type="button" onClick={() => setShowDeleteConfirm(true)}
                  className="py-1.5 text-xs border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/40 transition">Eliminar</button>
              )}
              <button type="submit" disabled={saving}
                className="py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando</>
                ) : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDeleteModal task={task} onConfirm={handleDelete} onCancel={onClose} />
      )}
    </div>
  );
}
