import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import useKanbanStore from '../store/kanbanStore';
import { boardsApi } from '../services/api';
import { BOARD_COLORS, BOARD_ICONS } from '../constants/kanbanConfig';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import TreeLogo from './TreeLogo';
import TreeSpinner from './TreeSpinner';

const EditProfileModal = lazy(() => import('./EditProfileModal'));
const InviteBoardModal = lazy(() => import('./InviteBoardModal'));

// ─── BoardsPanel ──────────────────────────────────────────────────────
// Panel principal tras iniciar sesión: lista los tableros donde el usuario
// es dueño o miembro, permite abrir uno y crear/editar/eliminar tableros.
export default function BoardsPanel({ isDark, onToggleTheme, onSelectBoard, onSelectAll }) {
  const user = useKanbanStore((s) => s.user);
  const boards = useKanbanStore((s) => s.boards);
  const setBoards = useKanbanStore((s) => s.setBoards);
  const addBoard = useKanbanStore((s) => s.addBoard);
  const updateBoard = useKanbanStore((s) => s.updateBoard);
  const removeBoard = useKanbanStore((s) => s.removeBoard);
  const logout = useKanbanStore((s) => s.logout);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [invitingBoard, setInvitingBoard] = useState(null);
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [menuBoardId, setMenuBoardId] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (!e.target.closest?.('[data-board-menu]')) {
        setMenuBoardId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDeleteBoard = async () => {
    if (!deletingBoard || deleting) return;
    setDeleting(true);
    try {
      await boardsApi.remove(deletingBoard.id);
      removeBoard(deletingBoard.id);
      setDeletingBoard(null);
    } catch {
      // si falla, dejamos el modal abierto para reintentar
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <TreeLogo className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
          <h1 className="hidden sm:block text-lg font-bold text-gray-900 dark:text-gray-100">Treeverde</h1>
          <span className="hidden sm:inline-block text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            Mis tableros
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationPanel />
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 pr-1 cursor-pointer hover:opacity-80 transition"
                aria-label="Menú de usuario"
              >
                <Avatar user={user} sizeClass="w-8 h-8 text-sm" fallbackClass="bg-emerald-500 text-white" />
                <span className="hidden sm:block text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 animate-fade-scale-in z-50">
                  <button
                    onClick={() => { setShowUserMenu(false); setShowEditProfile(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                  >
                    <span className="text-base">⚙️</span>
                    Editar perfil
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition font-medium"
                  >
                    <span className="text-base">🚪</span>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Elige un tablero</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Todos los tableros donde trabajas, en un solo lugar.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/25 transition flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span> Nuevo tablero
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tarjeta: Todas las tareas (vista sin filtro de tablero) */}
          <button
            onClick={onSelectAll}
            className="group text-left bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 p-5 transition shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">📋</span>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Todas las tareas</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todo lo tuyo, sin filtro de tablero</p>
              </div>
            </div>
          </button>

          {/* Tarjetas de tableros */}
          {boards.map((board) => {
            const c = BOARD_COLORS[board.color] || BOARD_COLORS.emerald;
            const isOwner = board.ownerId === user?.id;
            return (
              <div
                key={board.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectBoard(board.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectBoard(board.id); } }}
                className={`group relative cursor-pointer text-left bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${c.border}`}
              >
                {/* Cabecera con gradiente del color elegido */}
                <div className={`h-16 bg-gradient-to-br ${c.gradient} flex items-center gap-3 px-4`}>
                  <span className="text-2xl drop-shadow-sm" aria-hidden="true">{board.icon || '🗂'}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white truncate drop-shadow-sm">{board.name}</h3>
                    {board.description && (
                      <p className="text-[11px] text-white/85 truncate">{board.description}</p>
                    )}
                  </div>
                  {/* Menú del dueño (editar/eliminar) */}
                  {isOwner && (
                    <button
                      data-board-menu
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuBoardId((v) => (v === board.id ? null : board.id));
                      }}
                      className="w-7 h-7 shrink-0 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition"
                      aria-label={`Opciones de ${board.name}`}
                    >
                      ⋯
                    </button>
                  )}
                </div>

                {/* Cuerpo: conteos + miembros */}
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{board.taskCount}</span>{' '}
                    {board.taskCount === 1 ? 'tarea' : 'tareas'} ·{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{board.doneCount}</span> terminadas
                  </div>
                  <div className="flex items-center gap-1">
                    {board.members?.slice(0, 3).map((m) => (
                      <Avatar key={m.id} user={m} sizeClass="w-6 h-6 text-[9px]" fallbackClass="bg-gray-400 text-white" />
                    ))}
                    {board.members?.length > 3 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">+{board.members.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Dropdown de opciones del tablero */}
                {menuBoardId === board.id && (
                  <div
                    data-board-menu
                    className="absolute top-12 right-3 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 animate-fade-scale-in z-30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setMenuBoardId(null); setInvitingBoard(board); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <span>👥</span> Invitar personas
                    </button>
                    <button
                      onClick={() => { setMenuBoardId(null); setEditingBoard(board); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <span>✏️</span> Editar tablero
                    </button>
                    <button
                      onClick={() => { setMenuBoardId(null); setDeletingBoard(board); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <span>🗑</span> Eliminar tablero
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tarjeta: nuevo tablero */}
          <button
            onClick={() => setShowCreate(true)}
            className="group flex flex-col items-center justify-center gap-2 min-h-[130px] bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 p-5 transition shadow-sm"
          >
            <span className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl leading-none group-hover:scale-110 transition">+</span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Nuevo tablero</span>
          </button>
        </div>
      </main>

      {showCreate && (
        <BoardFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(board) => {
            addBoard(board);
            setShowCreate(false);
          }}
        />
      )}

      {editingBoard && (
        <BoardFormModal
          board={editingBoard}
          onClose={() => setEditingBoard(null)}
          onSaved={(board) => {
            updateBoard(board.id, board);
            setEditingBoard(null);
          }}
        />
      )}

      {deletingBoard && (
        <ConfirmDeleteBoard
          board={deletingBoard}
          loading={deleting}
          onConfirm={handleDeleteBoard}
          onCancel={() => setDeletingBoard(null)}
        />
      )}

      {showEditProfile && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <TreeSpinner size="lg" light />
          </div>
        }>
          <EditProfileModal onClose={() => setShowEditProfile(false)} />
        </Suspense>
      )}

      {invitingBoard && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <TreeSpinner size="lg" light />
          </div>
        }>
          <InviteBoardModal
            board={invitingBoard}
            onClose={() => setInvitingBoard(null)}
            onMembersChanged={() => {
              // Refrescar la lista para mostrar los miembros actualizados
              boardsApi.getAll().then(setBoards).catch(() => {});
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

// ─── Modal crear/editar tablero (con preview en vivo) ────────────────
function BoardFormModal({ board, onClose, onSaved }) {
  const isEdit = Boolean(board);
  const [name, setName] = useState(board?.name || '');
  const [description, setDescription] = useState(board?.description || '');
  const [color, setColor] = useState(board?.color || 'emerald');
  const [icon, setIcon] = useState(board?.icon || '🗂');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const c = BOARD_COLORS[color] || BOARD_COLORS.emerald;

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = isEdit
        ? await boardsApi.update(board.id, { name: name.trim(), description: description.trim(), color, icon })
        : await boardsApi.create({ name: name.trim(), description: description.trim(), color, icon });
      onSaved(saved);
    } catch (err) {
      setError(err.message || (isEdit ? 'No se pudo guardar el tablero' : 'No se pudo crear el tablero'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 px-5 sm:px-6 pt-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Editar tablero' : 'Nuevo tablero'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none" aria-label="Cerrar">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-5 space-y-4">
          {/* ── Preview en vivo ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Vista previa</label>
            <div className={`rounded-xl overflow-hidden bg-gradient-to-br ${c.gradient} shadow-md transition-all duration-300`}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="text-2xl drop-shadow-sm">{icon}</span>
                <div className="min-w-0">
                  <p className="font-bold text-white truncate drop-shadow-sm">{name.trim() || 'Nombre del tablero'}</p>
                  <p className="text-[11px] text-white/85 truncate">{description.trim() || 'Una breve descripción…'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Nombre ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nombre</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Ej. Proyecto Alpha, Sprint 12..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 transition"
            />
          </div>

          {/* ── Descripción ── */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              <span>Descripción <span className="font-normal text-gray-400">(opcional)</span></span>
              <span className={`text-[10px] font-normal ${description.length > 180 ? 'text-amber-500' : 'text-gray-400'}`}>{description.length}/200</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="¿De qué trata este tablero?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 transition resize-none"
            />
          </div>

          {/* ── Color ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Color</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {Object.entries(BOARD_COLORS).map(([key, cc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={`Color ${key}`}
                  title={key}
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cc.gradient} shadow-sm transition-all duration-200 ${
                    color === key
                      ? `ring-2 ring-offset-2 dark:ring-offset-gray-900 ${cc.ring} scale-110`
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── Icono ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Icono</label>
            <div className="grid grid-cols-6 gap-1.5">
              {BOARD_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  aria-label={`Icono ${ic}`}
                  className={`h-9 rounded-lg text-lg flex items-center justify-center transition-all duration-150 ${
                    icon === ic
                      ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-emerald-400 scale-105'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando</>
              ) : isEdit ? 'Guardar cambios' : 'Crear tablero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirmación de eliminación de tablero ──────────────────────────
function ConfirmDeleteBoard({ board, loading, onConfirm, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-2xl mb-3">🗑</div>
        <h2 className="text-center text-base font-bold text-gray-900 dark:text-gray-100">¿Eliminar «{board.name}»?</h2>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          Se eliminará el tablero y <strong className="text-red-600 dark:text-red-400">todas sus tareas</strong>.
          Esta acción no se puede deshacer.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="py-2 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Eliminando</>
            ) : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
