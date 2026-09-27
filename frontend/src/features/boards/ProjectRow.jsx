import { useCallback, useRef, useState } from 'react';
import useClickOutside from '../../shared/hooks/useClickOutside';
import Avatar from '../../shared/ui/Avatar';
import { BOARD_COLORS } from '../../shared/constants/kanbanConfig';
import { timeAgo } from '../../shared/utils/date';

// Estado del proyecto a la derecha: vencidas > vencen pronto > al día > última actividad
function StatusBadge({ stats, total, done }) {
  const base = 'text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap';
  if (stats?.overdue > 0) {
    return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300`}>⚠️ {stats.overdue} {stats.overdue === 1 ? 'vencida' : 'vencidas'}</span>;
  }
  if (stats?.dueSoon > 0) {
    return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`}>⏰ {stats.dueSoon} {stats.dueSoon === 1 ? 'vence pronto' : 'vencen pronto'}</span>;
  }
  if (total > 0 && done === total) {
    return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300`}>✓ Al día</span>;
  }
  if (stats?.lastActivity) {
    return <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">🕒 {timeAgo(stats.lastActivity)}</span>;
  }
  return null;
}

/** Barra de progreso con el degradado del proyecto. */
export function ProgressBar({ done, total, gradient }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 max-w-[220px] h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {total > 0 ? `${done} de ${total} terminadas` : 'Sin tareas aún'}
      </span>
    </div>
  );
}

// ─── ProjectRow ───────────────────────────────────────────────────────
// Fila de un proyecto: franja e icono con su color, progreso, estado,
// miembros y (solo dueño) menú ⋯ con invitar / editar / eliminar.
export default function ProjectRow({ board, isOwner, onOpen, onInvite, onEdit, onDelete }) {
  const c = BOARD_COLORS[board.color] || BOARD_COLORS.emerald;
  const total = board.myTaskCount ?? 0;
  const done = board.doneCount ?? 0;
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
      className={`group relative flex items-center gap-3 sm:gap-4 pl-5 pr-3 sm:pr-4 py-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200 ${c.border} ${menuOpen ? 'z-20' : ''}`}
    >
      {/* Franja lateral con el color del proyecto */}
      <span className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-gradient-to-b ${c.gradient}`} aria-hidden="true" />

      <span className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition`} aria-hidden="true">
        {board.icon || '🗂'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{board.name}</p>
        {board.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{board.description}</p>}
        <ProgressBar done={done} total={total} gradient={c.gradient} />
        {/* En móvil el estado va bajo el progreso (a la derecha no cabe) */}
        <div className="sm:hidden mt-1.5 empty:hidden"><StatusBadge stats={board.stats} total={total} done={done} /></div>
      </div>

      <div className="hidden sm:block"><StatusBadge stats={board.stats} total={total} done={done} /></div>

      <div className="hidden md:flex items-center -space-x-1.5">
        {board.members?.slice(0, 3).map((m) => (
          <Avatar key={m.id} user={m} sizeClass="w-7 h-7 text-[10px] ring-2 ring-white dark:ring-gray-900" fallbackClass={`${c.soft} ${c.text}`} />
        ))}
        {board.members?.length > 3 && (
          <span className="pl-2.5 text-[11px] text-gray-400 dark:text-gray-500">+{board.members.length - 3}</span>
        )}
      </div>

      {isOwner ? (
        <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 flex items-center justify-center transition"
            aria-label={`Opciones de ${board.name}`}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute top-9 right-0 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 animate-fade-scale-in z-30">
              <MenuItem icon="👥" onClick={menuAction(onInvite)}>Invitar personas</MenuItem>
              <MenuItem icon="✏️" onClick={menuAction(onEdit)}>Editar proyecto</MenuItem>
              <MenuItem icon="🗑" danger onClick={menuAction(onDelete)}>Eliminar proyecto</MenuItem>
            </div>
          )}
        </div>
      ) : (
        <span className="w-8 text-center text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition" aria-hidden="true">›</span>
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
