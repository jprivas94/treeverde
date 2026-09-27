// Aviso flotante superior (p. ej. "🎉 Te uniste al tablero") con botón de cierre.
export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100%-2rem)] bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-3 animate-fade-scale-in">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-emerald-100 hover:text-white transition text-base leading-none"
        aria-label="Cerrar aviso"
      >
        &times;
      </button>
    </div>
  );
}
