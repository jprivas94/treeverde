import { useState, useEffect, useRef } from 'react';
import useKanbanStore from '../store/kanbanStore';
import TaskFormFields from './TaskFormFields';
import SearchableUserSelect from './SearchableUserSelect';
import { tasksApi, usersApi } from '../services/api';
import { getCloudinaryThumb } from '../utils/images';

export default function CreateTaskModal({ onClose }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', dueDate: '',
    tags: '', assigneeId: '', images: [], subtasks: [],
  });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  // Compartir
  const [sharedUsers, setSharedUsers] = useState([]);
  const [inviteUserId, setInviteUserId] = useState('');

  // Invitación por URL: el asignado se define con el enlace (deshabilita
  // el selector de asignado y el de compartidos; se pueden generar varias URLs)
  const [inviteMode, setInviteMode] = useState(false);
  const [createdTask, setCreatedTask] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const { addTask, user } = useKanbanStore();
  const titleRef = useRef(null);
  // El foco inicial lo maneja TaskFormFields vía autoFocus + titleRef

  useEffect(() => {
    usersApi.getAll().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const task = await tasksApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
        tags: form.tags.trim(),
        assigneeId: inviteMode ? null : (form.assigneeId || null),
        images: form.images,
        subtasks: form.subtasks
      });

      // Modo invitación: generar el enlace (como asignado) y mostrar el panel
      if (inviteMode) {
        const inv = await tasksApi.getInviteUrl(task.id, 'assignee');
        addTask(task);
        setCreatedTask(task);
        setInviteUrl(inv.inviteUrl);
        return;
      }

      // Compartir con los usuarios seleccionados después de crear
      if (sharedUsers.length > 0) {
        for (const su of sharedUsers) {
          // Buscar el userId real del usuario compartido
          const targetUser = users.find((u) => u.name === su.name || u.id === su.id);
          if (targetUser && targetUser.id !== user?.id) {
            await tasksApi.share(task.id, targetUser.id).catch(() => {});
          }
        }
        // Recargar tarea para incluir los shares
        try {
          const reloaded = await tasksApi.getById(task.id);
          addTask(reloaded);
          onClose();
          return;
        } catch { /* si falla la recarga, se usa la tarea original */ }
      }

      addTask(task);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShare = (userId) => {
    setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Regenerar el enlace de invitación (el creador puede crear las veces que quiera)
  const handleGenerateInvite = async () => {
    if (!createdTask) return;
    setGeneratingInvite(true);
    try {
      const inv = await tasksApi.getInviteUrl(createdTask.id, 'assignee');
      setInviteUrl(inv.inviteUrl);
      setInviteCopied(false);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingInvite(false);
    }
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

  // ─── Panel de éxito con el enlace de invitación ───
  if (createdTask) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto border border-emerald-100 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Encabezado en degradado ── */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-5 sm:px-6 pt-7 sm:pt-8 pb-14 text-center">
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center text-lg leading-none transition"
              aria-label="Cerrar"
            >
              &times;
            </button>
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 shadow-lg flex items-center justify-center text-3xl">
              {'\u2705'}
            </div>
            <h2 className="mt-3 text-xl font-bold text-white tracking-tight">¡Tarea creada!</h2>
            <p className="mt-1 text-sm text-emerald-50/95 font-medium truncate px-2">«{createdTask.title}»</p>
          </div>

          {/* ── Contenido centrado ── */}
          <div className="px-6 pb-6 -mt-7">
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-xl p-4 sm:p-5 space-y-4 text-center mt-10">
              <p className="text-sm text-gray-600 leading-relaxed mt-2.5">
                Comparte este enlace: quien lo abra podrá iniciar sesión o crear
                una cuenta y quedará como <strong className="text-emerald-700">asignado</strong> de la tarea.
              </p>

              <div className="flex items-center gap-2 text-left">
                <div className="flex-1 min-w-0 flex items-center gap-2 bg-emerald-50 border-2 border-emerald-200 focus-within:border-emerald-400 hover:border-emerald-300 rounded-xl px-3 py-2 transition">
                  <span className="text-emerald-500 text-sm" aria-hidden="true">{'\u{1F517}'}</span>
                  <input
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 bg-transparent text-xs text-gray-700 font-medium outline-none"
                    aria-label="Enlace de invitación"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className={`px-3 sm:px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 shadow-sm ${
                    inviteCopied
                      ? 'bg-teal-100 text-teal-700 border border-teal-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  }`}
                >
                  {inviteCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-0 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 underline underline-offset-2 disabled:opacity-50 transition text-center"
                >
                  {generatingInvite ? 'Generando...' : 'Generar otro enlace'}
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
        </div>
      </div>
    );
  }

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
                <img src={getCloudinaryThumb(user.profileImage, 64)} alt="" className="w-4 h-4 rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-violet-400 text-white flex items-center justify-center text-[8px] font-bold">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="text-[11px] text-gray-700 font-medium">{user?.name || 'Tú'}</span>
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
            disableAssignee={inviteMode}
          />

          {/* ── Invitación por URL / Compartir con otros usuarios ── */}
          <div className="pt-2 mt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
              <input
                type="checkbox"
                checked={inviteMode}
                onChange={(e) => setInviteMode(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-600"
              />
              <span className="text-[10px] font-medium text-gray-600">
                {'\u{1F4E8}'} Crear enlace de invitación (el asignado se elige con el enlace)
              </span>
            </label>

            {inviteMode ? (
              <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 leading-relaxed">
                En modo invitación el selector de asignado y el de compartidos quedan
                deshabilitados. El enlace se genera al crear la tarea.
              </p>
            ) : (
            <>
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
                      <img src={getCloudinaryThumb(u.profileImage, 64)} alt="" className="w-3 h-3 rounded-full object-cover" loading="lazy" />
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
            </>
            )}
          </div>

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
