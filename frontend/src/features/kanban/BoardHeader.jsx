import AppHeader from '../layout/AppHeader';
import Avatar from '../../shared/ui/Avatar';
import HeaderGhostButton from '../../shared/ui/HeaderGhostButton';
import { BOARD_COLORS } from '../../shared/constants/kanbanConfig';
import ColumnNav from './ColumnNav';

const btn = 'px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition shadow-sm';
const greyBtn = 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600';

// ─── BoardHeader ──────────────────────────────────────────────────────
// Header del tablero Kanban. Con tablero activo toma el gradiente de su
// color; en "Todas las tareas" usa el header blanco/gris.
export default function BoardHeader({
  activeBoard, showHistory, columnNav, isDark, onToggleTheme, onLogout,
  onBackToBoards, onToggleHistory, onInvite, onClear, onAddTask,
}) {
  const onColor = Boolean(activeBoard);
  const gradient = activeBoard ? (BOARD_COLORS[activeBoard.color] || BOARD_COLORS.emerald).header : '';

  const left = (
    <>
      <button
        onClick={onBackToBoards}
        className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full transition ${
          onColor && !showHistory
            ? 'text-white bg-white/20 hover:bg-white/35'
            : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Volver a mis proyectos"
      >
        {showHistory ? 'Historial' : activeBoard ? (
          <>
            <span aria-hidden="true">{activeBoard.icon || '🗂'}</span>
            <span className="font-semibold">{activeBoard.name}</span>
          </>
        ) : 'Todas las tareas'}
        <span className="text-[10px]">▼</span>
      </button>

      {/* Miembros del tablero activo (acceso rápido a invitar) */}
      {activeBoard && !showHistory && activeBoard.members?.length > 0 && (
        <button
          type="button"
          onClick={onInvite}
          className="hidden md:flex items-center -space-x-1.5 cursor-pointer hover:opacity-90 transition pl-1 py-0.5 focus:outline-none"
          title={`Ver miembros e invitar a ${activeBoard.name}`}
          aria-label={`Ver miembros del proyecto ${activeBoard.name}`}
        >
          {activeBoard.members.slice(0, 3).map((m) => (
            <Avatar key={m.id} user={m} sizeClass="w-6 h-6 text-[9px] ring-2 ring-white/30" fallbackClass="bg-white/20 text-white" />
          ))}
          {activeBoard.members.length > 3 && (
            <span className="text-[10px] text-white/90 pl-2">+{activeBoard.members.length - 3}</span>
          )}
        </button>
      )}

      {!showHistory && <ColumnNav {...columnNav} />}
    </>
  );

  const right = (
    <>
      {activeBoard && !showHistory && (
        <HeaderGhostButton onColor data-testid="invite-board-button" onClick={onInvite} title={`Invitar al proyecto ${activeBoard.name}`}>
          <span aria-hidden="true">👥</span>
          <span className="hidden sm:inline">Invitar</span>
        </HeaderGhostButton>
      )}

      {/* Vaciar: con tablero activo vacía ese tablero; en "Todas" elimina todas las tareas del usuario */}
      {!showHistory && (
        <HeaderGhostButton
          onColor={onColor}
          data-testid={activeBoard ? 'clear-board-button' : 'clear-all-button'}
          onClick={onClear}
          title={activeBoard ? `Eliminar todas las tareas de ${activeBoard.name}` : 'Eliminar todas tus tareas'}
        >
          <span aria-hidden="true">🧹</span>
          <span className="hidden sm:inline">Vaciar</span>
        </HeaderGhostButton>
      )}

      {/* Mis Proyectos: vuelve a la lista de proyectos (tablero e historial) */}
      <button
        onClick={onBackToBoards}
        data-testid="my-projects-button"
        title="Ir a la lista de proyectos"
        aria-label="Mis Proyectos"
        className={`${btn} ${onColor ? 'text-white bg-white/15 hover:bg-white/30' : greyBtn}`}
      >
        <span className="sm:hidden">🗂</span>
        <span className="hidden sm:inline">🗂 Mis Proyectos</span>
      </button>

      <button onClick={onToggleHistory} className={`${btn} ${showHistory ? greyBtn : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
        <span className="sm:hidden">{showHistory ? '←' : '📊'}</span>
        <span className="hidden sm:inline">{showHistory ? '← Volver' : '📊 Historial'}</span>
      </button>

      {!showHistory && (
        <button onClick={onAddTask} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
          <span className="sm:hidden">+</span>
          <span className="hidden sm:inline">+ Añadir Tarea</span>
        </button>
      )}
    </>
  );

  return (
    <AppHeader gradient={gradient} isDark={isDark} onToggleTheme={onToggleTheme} onLogout={onLogout} left={left} right={right} />
  );
}
