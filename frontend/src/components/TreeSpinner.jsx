import TreeLogo from './TreeLogo';

// Tamaños predefinidos para el spinner
const SIZES = {
  xs: { wrap: 'h-4 w-4', ring: 'border-[2px]', inner: 'inset-[3px]' },
  sm: { wrap: 'h-5 w-5', ring: 'border-2', inner: 'inset-[4px]' },
  md: { wrap: 'h-7 w-7', ring: 'border-[3px]', inner: 'inset-[5px]' },
  lg: { wrap: 'h-10 w-10', ring: 'border-[3px]', inner: 'inset-[7px]' },
  xl: { wrap: 'h-16 w-16', ring: 'border-4', inner: 'inset-[10px]' },
};

// ─── TreeSpinner ──────────────────────────────────────────────────────
// Anillo giratorio con el logo de árbol en el centro.
// - size: xs | sm | md | lg | xl
// - light: variante para fondos oscuros (anillo blanco + logo blanco)
export default function TreeSpinner({ size = 'md', light = false, className = '' }) {
  const s = SIZES[size] || SIZES.md;
  const ringColor = light
    ? 'border-white/30 border-t-white'
    : 'border-emerald-100 border-t-emerald-600';
  const treeColor = light ? 'text-white' : 'text-emerald-600';

  return (
    <div
      className={`relative ${s.wrap} ${className}`}
      role="status"
      aria-label="Cargando"
    >
      <div className={`absolute inset-0 rounded-full border ${s.ring} ${ringColor} animate-spin`} />
      <div className={`absolute ${s.inner} flex items-center justify-center`}>
        <TreeLogo className={`w-full h-full ${treeColor}`} />
      </div>
    </div>
  );
}
