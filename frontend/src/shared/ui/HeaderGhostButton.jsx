// ─── HeaderGhostButton ────────────────────────────────────────────────
// Botón "fantasma" del header (Invitar, Vaciar…): translúcido sobre el
// gradiente del tablero activo y gris sobre el header claro/oscuro.
//
// Atributo onColor: cambia el color de la LETRA según el fondo del header:
//   - onColor=true  → letra blanca (header teñido por el tablero activo)
//   - onColor=false → letra oscura en claro / clara en oscuro
//                     (header blanco de "Todas las tareas")
// El icono hereda el color del texto (currentColor), como el resto.
export default function HeaderGhostButton({ onColor = false, title, 'data-testid': testId, onClick, children }) {
  const colorClasses = onColor
    ? 'text-white bg-white/20 hover:bg-white/35 border-white/25'
    : 'text-gray-900 dark:text-gray-100 bg-gray-100 hover:bg-gray-200 border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700';

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      title={title}
      className={`px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition shadow-sm flex items-center gap-1.5 border backdrop-blur-xs ${colorClasses}`}
    >
      {children}
    </button>
  );
}
