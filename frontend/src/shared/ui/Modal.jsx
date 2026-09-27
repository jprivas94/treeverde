import useEscapeKey from '../hooks/useEscapeKey';

// ─── Modal ────────────────────────────────────────────────────────────
// Overlay + panel centrado. Cierra con clic en el overlay o con ESC
// (desactivable con `dismissible={false}`, p. ej. con otro modal encima).
// `className` define el panel (ancho, padding, bordes...).
export default function Modal({
  onClose,
  className = 'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto animate-scale-in',
  dismissible = true,
  children,
}) {
  useEscapeKey(onClose, dismissible);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={className} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Encabezado estándar: título + botón ×.
export function ModalHeader({
  title,
  onClose,
  className = 'flex items-center justify-between mb-2',
  titleClassName = 'text-sm font-bold text-gray-900 dark:text-gray-100',
}) {
  return (
    <div className={className}>
      <h2 className={titleClassName}>{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
        aria-label="Cerrar"
      >
        &times;
      </button>
    </div>
  );
}
