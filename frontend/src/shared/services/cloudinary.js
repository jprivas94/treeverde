// ─── Subida firmada a Cloudinary ──────────────────────────────────────
// Flujo común de los modales de imágenes y del perfil:
// 1) POST /api/upload/sign (autenticado) → firma + credenciales.
// 2) Upload directo del archivo a api.cloudinary.com con la firma.
// Devuelve la URL pública (secure_url) de la imagen subida.
// (Antes este flujo estaba duplicado en ImageUploadModal y EditProfileModal.)

const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || '/api';

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Sube `file` a Cloudinary y devuelve la URL pública.
 * - prefix: carpeta en Cloudinary ('tasks' | 'profiles').
 * - imageType: 'task' | 'avatar' (define la transformación en el sign).
 */
export async function uploadImageToCloudinary({ file, prefix = 'tasks', imageType = 'task' }) {
  const signRes = await fetch(`${API_BASE}/upload/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ fileName: file.name, prefix, imageType }),
  });
  if (!signRes.ok) {
    const errData = await signRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al preparar la subida');
  }

  const { cloudName, apiKey, signature, timestamp, folder, transformations } = await signRes.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('transformation', transformations);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => 'Error desconocido');
    throw new Error(`Error al subir la imagen: ${errText}`);
  }

  const uploadData = await uploadRes.json();
  return uploadData.secure_url;
}
