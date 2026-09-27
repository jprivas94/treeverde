import useClipboard from '../hooks/useClipboard';

// Campo de solo lectura con un enlace + botón "Copiar" (enlaces de invitación).
export default function CopyLinkField({ url, ariaLabel = 'Enlace de invitación' }) {
  const { copied, copy } = useClipboard();

  return (
    <div className="flex items-center gap-2 text-left">
      <div className="flex-1 min-w-0 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-2">
        <span className="text-emerald-500 text-sm" aria-hidden="true">{'\u{1F517}'}</span>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 bg-transparent text-xs text-gray-700 dark:text-gray-200 font-medium outline-none"
          aria-label={ariaLabel}
        />
      </div>
      <button
        type="button"
        onClick={() => copy(url)}
        className={`px-3 sm:px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 shadow-sm ${
          copied
            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
        }`}
      >
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
