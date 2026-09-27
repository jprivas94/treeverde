const navBtn = 'px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm';

// Páginas visibles: todas si son ≤10; si no, extremos + vecinas de la actual,
// con "..." en los huecos.
function visiblePages(page, total) {
  const pages = [];
  for (let n = 1; n <= total; n++) {
    const show = total <= 10 || n <= 2 || n >= total - 1 || Math.abs(n - page) <= 1;
    if (show) pages.push(n);
    else if ((n === 3 && page > 4) || (n === total - 2 && page < total - 3)) pages.push(`gap-${n}`);
  }
  return pages;
}

// ─── Pagination ───────────────────────────────────────────────────────
export default function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="flex flex-col items-center gap-2 pb-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Página {page} de {totalPages}</div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className={navBtn}>
          {'←'} Anterior
        </button>
        <div className="flex items-center gap-1">
          {visiblePages(page, totalPages).map((n) =>
            typeof n === 'string' ? (
              <span key={n} className="px-1 py-1 text-xs text-gray-400 dark:text-gray-500 select-none">...</span>
            ) : (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`min-w-[32px] h-8 text-xs font-bold rounded-lg transition shadow-sm ${
                  n === page
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {n}
              </button>
            )
          )}
        </div>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={navBtn}>
          Siguiente {'→'}
        </button>
      </div>
    </div>
  );
}
