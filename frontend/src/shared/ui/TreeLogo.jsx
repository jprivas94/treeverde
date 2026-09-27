// ─── TreeLogo ─────────────────────────────────────────────────────────
// Logo de Treeverde: un árbol "normal" (tronco + copa redondeada) en SVG.
// Usa currentColor para adaptarse a cualquier contexto: blanco sobre el
// gradiente del login, verde en el tablero, etc.

export default function TreeLogo({ className = 'w-6 h-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Copa del árbol: tres círculos superpuestos forman la silueta */}
      <g fill="currentColor">
        <circle cx="12" cy="9" r="6" />
        <circle cx="8" cy="11.5" r="3.6" />
        <circle cx="16" cy="11.5" r="3.6" />
      </g>
      {/* Tronco */}
      <path
        d="M12 14v6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10.4 21.2h3.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
