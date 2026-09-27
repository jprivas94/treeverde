import { useCallback, useRef, useState } from 'react';
import useClickOutside from '../../shared/hooks/useClickOutside';
import Avatar from '../../shared/ui/Avatar';
import { BOARD_COLORS } from '../../shared/constants/kanbanConfig';

// Tarjeta de un tablero en el panel: cabecera con su gradiente, conteos,
// miembros y (solo dueño) menú ⋯ con invitar/editar/eliminar.
export default function BoardCard({ board, isOwner, onOpen, onInvite, onEdit, onDelete }) {
  const c = BOARD_COLORS[board.color] || BOARD_COLORS.emerald;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, closeMenu, menuOpen);

  const menuAction = (fn) => () => { closeMenu(); fn(board); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(board.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(board.id); } }}
      className={`group relative cursor-pointer text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${c.border} ${menuOpen ? 'z-20' : ''}`}
    >
      <div className={`h-16 rounded-t-2xl bg-gradient-to-br ${c.gradient} flex items-center gap-3 px-4 ${isOwner ? 'pr-14' : ''}`}>
        <span className="text-2xl drop-shadow-sm" aria-hidden="true">{board.icon || '🗂'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white truncate drop-shadow-sm">{board.name}</h3>
          {board.description && <p className="text-[11px] text-white/85 truncate">{board.description}</p>}
        </div>
      </div>

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

      {isOwner && (
        <div ref={menuRef} className="absolute top-[18px] right-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 shrink-0 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition"
            aria-label={`Opciones de ${board.name}`}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute top-8 right-0 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 animate-fade-scale-in z-30">
              <MenuItem icon="👥" onClick={menuAction(onInvite)}>Invitar personas</MenuItem>
              <MenuItem icon="✏️" onClick={menuAction(onEdit)}>Editar proyecto</MenuItem>
              <MenuItem icon="🗑" danger onClick={menuAction(onDelete)}>Eliminar proyecto</MenuItem>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, danger = false, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      <span>{icon}</span> {children}
    </button>
  );
}
