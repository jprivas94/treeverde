import { useState } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import { tasksApi } from '../../shared/services/api';
import { parseSubtasks, getTaskImages, isCreator, isAssigneeOnly } from '../../shared/utils/tasks';
import { formatDateForInput } from '../../shared/utils/date';
import CopyLinkField from '../../shared/ui/CopyLinkField';
import Spinner from '../../shared/ui/Spinner';
import TaskFormFields from './TaskFormFields';
import TaskDetailsView from './TaskDetailsView';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { TaskModal, PersonField, FormActions, ShareSection } from './TaskModalParts';
import { patchTaskInStore } from './taskService';
import useUserSearch from './useUserSearch';
import useTaskInvite from './useTaskInvite';

const sameUser = (userId) => (s) => s.userId === userId || s.user?.id === userId;

// ─── EditTaskModal ────────────────────────────────────────────────────
// readOnly / sharedView → vista de detalle (TaskViewModal).
// Resto → formulario de edición con compartir, enlace de invitación y eliminar.
export default function EditTaskModal({ task, onClose, readOnly, sharedView, userColor }) {
  if (sharedView || readOnly) {
    return <TaskViewModal task={task} onClose={onClose} sharedView={sharedView} userColor={userColor} />;
  }
  return <TaskEditForm task={task} onClose={onClose} />;
}

// ─── Vista de solo lectura (sharedView permite marcar subtareas) ───
function TaskViewModal({ task, onClose, sharedView, userColor }) {
  const user = useKanbanStore((s) => s.user);
  const [subtasks, setSubtasks] = useState(() => parseSubtasks(task.subtasks));

  const handleToggle = async (stId) => {
    const st = subtasks.find((s) => s.id === stId);
    if (!st || (st.completed && st.toggledBy && st.toggledBy !== user?.id)) return; // completada por otro
    const updated = subtasks.map((s) =>
      s.id === stId ? { ...s, completed: !s.completed, toggledBy: !s.completed ? user?.id : null } : s
    );
    setSubtasks(updated);
    try {
      await tasksApi.updateSubtasks(task.id, updated);
      patchTaskInStore(task.id, (t) => ({ ...t, subtasks: updated }));
    } catch (err) { console.error(err); }
  };

  return (
    <TaskModal title="Ver Tarea" onClose={onClose}>
      <TaskDetailsView
        task={{ ...task, subtasks }}
        user={user}
        sharedView={sharedView}
        userColor={userColor}
        onToggleSubtask={sharedView ? handleToggle : undefined}
        onClose={onClose}
      />
    </TaskModal>
  );
}

// ─── Formulario de edición ───
function TaskEditForm({ task, onClose }) {
  const user = useKanbanStore((s) => s.user);
  const creator = isCreator(task, user);
  const canManageShares = creator || user?.id === task.assignee?.id;
  const { users, search } = useUserSearch();
  const invite = useTaskInvite('share');

  const [form, setForm] = useState(() => ({
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'MEDIUM',
    dueDate: formatDateForInput(task.dueDate),
    tags: task.tags || '',
    assigneeId: task.assignee?.id || '',
    images: getTaskImages(task),
    subtasks: parseSubtasks(task.subtasks),
  }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sharedUsers, setSharedUsers] = useState(task.shares?.map((s) => s.user) || []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const updated = await tasksApi.update(task.id, {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags.trim(),
        dueDate: form.dueDate || null,
        assigneeId: form.assigneeId || null,
      });
      patchTaskInStore(task.id, () => ({ ...updated, subtasks: form.subtasks }));
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // Compartir al instante (chip optimista con rollback si falla)
  const handleAddShare = async (target) => {
    if (target.id === user?.id) return;
    setSharedUsers((prev) => (prev.some((u) => u.id === target.id) ? prev : [...prev, target]));
    try {
      await tasksApi.share(task.id, target.id);
      patchTaskInStore(task.id, (t) => ({
        ...t,
        shares: [...(t.shares || []).filter((s) => !sameUser(target.id)(s)), { userId: target.id, user: target }],
      }));
    } catch (err) {
      console.error(err);
      setSharedUsers((prev) => prev.filter((u) => u.id !== target.id));
    }
  };

  const handleRemoveShare = async (userId) => {
    try {
      await tasksApi.unshare(task.id, userId);
      setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
      patchTaskInStore(task.id, (t) => ({ ...t, shares: (t.shares || []).filter((s) => !sameUser(userId)(s)) }));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await tasksApi.remove(task.id);
      useKanbanStore.getState().removeTask(task.id);
      onClose();
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  return (
    <TaskModal title="Editar Tarea" onClose={onClose} dismissible={!confirmingDelete}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <PersonField label={'\u{1F464} Creado por'} user={task.creator} />

        <TaskFormFields
          values={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          users={users}
          user={user}
          autoFocus
          // Persistencia inmediata al marcar una subtarea
          onSubtaskToggle={(next) => tasksApi.updateSubtasks(task.id, next).catch(console.error)}
          isAssigneeOnly={isAssigneeOnly(task, user)}
          onUserSearch={search}
        />

        <ShareSection
          label={canManageShares ? 'Compartir con' : 'Compartida con'}
          emptyText="No compartida con nadie"
          sharedUsers={sharedUsers}
          users={users}
          onSearch={search}
          currentUserId={user?.id}
          onAdd={canManageShares ? handleAddShare : undefined}
          onRemove={handleRemoveShare}
        >
          {canManageShares && (
            invite.url ? (
              <div className="space-y-1.5 pt-2">
                <CopyLinkField url={invite.url} />
                <button
                  type="button"
                  onClick={() => invite.generate(task.id)}
                  className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800 underline transition"
                >
                  Generar otro enlace
                </button>
              </div>
            ) : (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => invite.generate(task.id)}
                  disabled={invite.generating}
                  title="Generar una URL para compartir esta tarea"
                  className="flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 rounded-lg transition disabled:opacity-60"
                >
                  {invite.generating
                    ? <><Spinner className="w-3.5 h-3.5 border-white" /> Generando enlace...</>
                    : <>🔗 Generar enlace para compartir la tarea</>}
                </button>
              </div>
            )
          )}
        </ShareSection>

        <FormActions
          onCancel={onClose}
          saving={saving}
          submitLabel="Guardar"
          extra={creator && (
            <button type="button" onClick={() => setConfirmingDelete(true)}
              className="py-1.5 text-xs border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/40 transition">
              Eliminar
            </button>
          )}
        />
      </form>

      {confirmingDelete && (
        <ConfirmDeleteModal task={task} onConfirm={handleDelete} onCancel={onClose} loading={deleting} />
      )}
    </TaskModal>
  );
}
