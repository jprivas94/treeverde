import { useState } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import { tasksApi } from '../../shared/services/api';
import Modal from '../../shared/ui/Modal';
import CopyLinkField from '../../shared/ui/CopyLinkField';
import TaskFormFields from './TaskFormFields';
import { TaskModal, PersonField, FormActions, ShareSection } from './TaskModalParts';
import useUserSearch from './useUserSearch';
import useTaskInvite from './useTaskInvite';

const EMPTY_FORM = {
  title: '', description: '', priority: 'MEDIUM', dueDate: '',
  tags: '', assigneeId: '', images: [], subtasks: [],
};

// ─── CreateTaskModal ──────────────────────────────────────────────────
// Crea una tarea en el tablero activo. Opcionalmente la comparte con otros
// usuarios o, en "modo invitación", genera un enlace para que quien lo abra
// quede como asignado (se muestra en un panel de éxito).
export default function CreateTaskModal({ onClose }) {
  const user = useKanbanStore((s) => s.user);
  const activeBoardId = useKanbanStore((s) => s.activeBoardId);
  const { users, search } = useUserSearch();
  const invite = useTaskInvite('assignee');

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [inviteMode, setInviteMode] = useState(false);
  const [createdTask, setCreatedTask] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const { addTask } = useKanbanStore.getState();
    try {
      let task = await tasksApi.create({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags.trim(),
        dueDate: form.dueDate || null,
        assigneeId: inviteMode ? null : (form.assigneeId || null),
        ...(activeBoardId ? { boardId: activeBoardId } : {}),
      });

      if (inviteMode) {
        await invite.generate(task.id);
        addTask(task);
        setCreatedTask(task);
        return;
      }

      // Compartir con los usuarios elegidos y recargar la tarea con sus shares
      if (sharedUsers.length > 0) {
        for (const u of sharedUsers) {
          if (u.id !== user?.id) await tasksApi.share(task.id, u.id).catch(() => {});
        }
        task = await tasksApi.getById(task.id).catch(() => task);
      }
      addTask(task);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Panel de éxito con el enlace de invitación ───
  if (createdTask) {
    return (
      <Modal onClose={onClose} className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto border border-emerald-100 dark:border-emerald-900 animate-scale-in">
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-5 sm:px-6 pt-7 sm:pt-8 pb-14 text-center">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center text-lg leading-none transition"
            aria-label="Cerrar"
          >
            &times;
          </button>
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 shadow-lg flex items-center justify-center text-3xl">
            {'✅'}
          </div>
          <h2 className="mt-3 text-xl font-bold text-white tracking-tight">¡Tarea creada!</h2>
          <p className="mt-1 text-sm text-emerald-50/95 font-medium truncate px-2">«{createdTask.title}»</p>
        </div>

        <div className="px-6 pb-6 -mt-7">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-xl p-4 sm:p-5 space-y-4 text-center mt-10">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2.5">
              Comparte este enlace: quien lo abra podrá iniciar sesión o crear
              una cuenta y quedará como <strong className="text-emerald-700 dark:text-emerald-400">asignado</strong> de la tarea.
            </p>
            <CopyLinkField url={invite.url} />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-0 pt-1">
              <button
                type="button"
                onClick={() => invite.generate(createdTask.id)}
                disabled={invite.generating}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-2 disabled:opacity-50 transition text-center"
              >
                {invite.generating ? 'Generando...' : 'Generar otro enlace'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md shadow-emerald-600/25 transition w-full sm:w-auto"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <TaskModal title="Nueva Tarea" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <PersonField label={'\u{1F464} Creado por'} user={user} fallback="Tú" />

        <TaskFormFields
          values={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          users={users}
          user={user}
          autoFocus
          disableAssignee={inviteMode}
          onUserSearch={search}
        />

        <div className="pt-2 mt-2">
          <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
            <input
              type="checkbox"
              checked={inviteMode}
              onChange={(e) => setInviteMode(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-600"
            />
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
              {'\u{1F4E8}'} Crear enlace de invitación (el asignado se elige con el enlace)
            </span>
          </label>

          {inviteMode ? (
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2 leading-relaxed">
              En modo invitación el selector de asignado y el de compartidos quedan
              deshabilitados. El enlace se genera al crear la tarea.
            </p>
          ) : (
            <ShareSection
              label="Compartir con"
              sharedUsers={sharedUsers}
              users={users}
              onSearch={search}
              currentUserId={user?.id}
              onAdd={(u) => setSharedUsers((prev) => [...prev.filter((x) => x.id !== u.id), u])}
              onRemove={(id) => setSharedUsers((prev) => prev.filter((x) => x.id !== id))}
            />
          )}
        </div>

        <FormActions onCancel={onClose} saving={saving} submitLabel="Crear Tarea" />
      </form>
    </TaskModal>
  );
}
