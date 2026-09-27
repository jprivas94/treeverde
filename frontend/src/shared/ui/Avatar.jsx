import { getCloudinaryThumb } from '../utils/images';

// ─── Avatar ───────────────────────────────────────────────────────────
// Avatar reutilizable: foto de perfil (miniatura de Cloudinary) o la
// inicial del nombre con color de fondo. Antes el mismo bloque estaba
// duplicado en ~8 componentes con variantes de clases.
//
// Props:
// - user: { name, profileImage }
// - sizeClass: clases de tamaño + tamaño de texto del fallback
//   (p. ej. "w-4 h-4 text-[8px]").
// - fallbackClass: fondo/color del círculo sin foto
//   (default: esmeralda sólido con texto blanco).
// - style: estilos inline (avatares coloreados por usuario con getUserColor).
export default function Avatar({ user, sizeClass = 'w-6 h-6 text-xs', fallbackClass = 'bg-emerald-500 text-white', style }) {
  const name = user?.name || '?';
  return (
    <span
      style={style}
      className={`rounded-full flex items-center justify-center overflow-hidden shrink-0 font-bold select-none ${fallbackClass} ${sizeClass}`}
    >
      {user?.profileImage ? (
        <img
          src={getCloudinaryThumb(user.profileImage, 64)}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
