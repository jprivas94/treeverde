import { STATUS_NAV } from '../../shared/constants/kanbanConfig';

// Navegación entre columnas en móvil (el tablero hace scroll horizontal).
// variant 'chips': chips de estado en el header · 'dots': puntos bajo las columnas.
export default function ColumnNav({ columns, activeColumn, onSelect, variant = 'chips' }) {
  if (variant === 'dots') {
    return (
      <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 sm:hidden">
        {columns.map((col, i) => (
          <button
            key={col.id}
            onClick={() => onSelect(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeColumn ? 'bg-emerald-500 w-3' : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
            }`}
            aria-label={`Ir a ${col.title}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:hidden">
      {columns.map((col, i) => {
        const isActive = i === activeColumn;
        const nav = STATUS_NAV[col.id] || {};
        return (
          <button
            key={col.id}
            onClick={() => onSelect(i)}
            className={`flex items-center gap-1 rounded-lg transition-all duration-200 ${
              isActive ? `${nav.bg} ${nav.text} px-2 py-1 text-[10px] font-bold` : 'px-1.5 py-1'
            }`}
            aria-label={`Ir a ${nav.label}`}
          >
            {isActive ? (
              <>
                <span className={`w-2 h-2 rounded-full ${nav.dot}`} />
                <span>{nav.label}</span>
              </>
            ) : (
              <span className={`w-3 h-3 rounded-sm ${nav.dot}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
