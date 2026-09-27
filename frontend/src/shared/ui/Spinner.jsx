// Spinner circular mínimo para botones ("Guardando", "Eliminando"...).
// `className` define tamaño y color del borde (por defecto blanco, 16px).
export default function Spinner({ className = 'w-4 h-4 border-white' }) {
  return <div className={`${className} border-2 border-t-transparent rounded-full animate-spin`} />;
}
