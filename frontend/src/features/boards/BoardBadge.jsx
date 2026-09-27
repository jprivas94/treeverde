import { BOARD_COLORS } from '../../shared/constants/kanbanConfig';

// Etiqueta con el tablero (proyecto) al que pertenece una tarea: icono + nombre
// con el color del tablero. Sin tablero → "Personal".
export default function BoardBadge({ board }) {
  if (!board) {
    return (
      <span className="inline-flex items-center gap-1 max-w-full text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" title="Tarea personal (sin tablero)">
        <span aria-hidden="true">👤</span>
        <span className="truncate">Personal</span>
      </span>
    );
  }

  const c = BOARD_COLORS[board.color] || BOARD_COLORS.emerald;
  return (
    <span className={`inline-flex items-center gap-1 max-w-full text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.soft} ${c.text}`} title={`Tablero: ${board.name}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      <span aria-hidden="true">{board.icon || '🗂'}</span>
      <span className="truncate">{board.name}</span>
    </span>
  );
}
