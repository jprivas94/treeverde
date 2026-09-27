// ─── Miniaturas de Cloudinary ─────────────────────────────────────
// Genera URLs de Cloudinary con ancho reducido (ej: w_160) para las
// miniaturas y avatares del tablero. Las originales se suben con
// w_800 (tareas) o w_200 (avatares), y descargar ese tamaño completo
// en una tarjeta de 56px desperdicia ancho de banda en cada render.

const CLOUDINARY_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;
// Segmento de versión: v<dígitos>/ (anclado al inicio o tras un slash)
const VERSION_RE = /(^|\/)v\d+\//;
// Transformación real de Cloudinary: key_value[,key_value...]/ (p. ej. w_800,c_limit)
const TRANSFORM_SEGMENT_RE = /^[a-z]+_[a-z0-9]+(?:,[a-z]+_[a-z0-9]+)*\//;

/**
 * Devuelve la URL de Cloudinary redimensionada a `width` px (mantiene la
 * proporción y optimiza formato/calidad). Si la URL no es de Cloudinary
 * (p. ej. un data URL local de FileReader), la devuelve sin cambios.
 *
 * Soporta URLs con y sin segmento de versión, descartando cualquier
 * transformación previa (ej: w_800,c_limit) para evitarla duplicar.
 */
export function getCloudinaryThumb(url, width = 160) {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(CLOUDINARY_RE);
  if (!match) return url;

  const [, base, rest] = match;
  let pathPart;

  const versionMatch = rest.match(VERSION_RE);
  if (versionMatch) {
    // Con versión: descartar lo que venga antes (la transformación previa).
    // El match puede incluir el '/' previo; tomar desde 'v' exactamente.
    const vStart = versionMatch.index + (versionMatch[0][0] === '/' ? 1 : 0);
    pathPart = rest.slice(vStart);
  } else {
    // Sin versión: descartar una transformación inicial si existe
    pathPart = rest.replace(TRANSFORM_SEGMENT_RE, '');
  }

  return `${base}w_${width},q_auto,f_auto/${pathPart}`;
}
