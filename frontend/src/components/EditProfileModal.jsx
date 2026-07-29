import { useState, useEffect, useRef } from "react";
import useKanbanStore from "../store/kanbanStore";
import { profileApi } from "../services/api";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("token");
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function EditProfileModal({ onClose }) {
  const user = useKanbanStore((s) => s.user);
  const updateUser = useKanbanStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    setImageError("");
    if (!selectedFile) return;
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setImageError("Solo se permiten: JPG, PNG, WebP, GIF");
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setImageError("La imagen no debe superar 10 MB");
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUploadImage = async () => {
    if (!file) return;
    setUploadingImage(true);
    setImageError('');
    setProgress(20);
    try {
      const token = getToken();
      const signRes = await fetch(API_BASE + '/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ fileName: file.name, prefix: 'profiles', imageType: 'avatar' }),
      });
      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al preparar la subida');
      }
      const { cloudName, apiKey, signature, timestamp, folder, transformations } = await signRes.json();
      setProgress(40);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('transformation', transformations);
      const uploadRes = await fetch('https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => 'Error desconocido');
        throw new Error('Error al subir la imagen: ' + errText);
      }
      const uploadData = await uploadRes.json();
      const publicUrl = uploadData.secure_url;
      setProgress(100);
      setProfileImage(publicUrl);
      setFile(null);
    } catch (err) {
      console.error('[Treeverde] Error al subir imagen:', err);
      setImageError(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    if (password && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password && password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSaving(true);
    try {
      const data = {};
      if (name.trim() !== user?.name) data.name = name.trim();
      if (password) data.password = password;
      if (profileImage !== user?.profileImage) data.profileImage = profileImage;
      if (Object.keys(data).length === 0) {
        setError("No hay cambios para guardar");
        setSaving(false);
        return;
      }
      const updatedUser = await profileApi.update(data);
      updateUser({
        name: updatedUser.name,
        profileImage: updatedUser.profileImage,
      });
      setSuccessMsg("Perfil actualizado exitosamente");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || "Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRemoveImage = () => {
    setFile(null);
    setPreview(null);
    setProfileImage("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#x1F464;</span>
            <h2 className="text-base font-bold text-gray-900">Editar Perfil</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition">&times;</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="flex flex-col items-center">
            <div ref={dropRef} onDrop={handleDrop} onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer group">
              <div className={"w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-2 transition-all duration-200 " + (preview ? "border-emerald-400 shadow-md" : "border-gray-200 bg-emerald-500 hover:border-emerald-300")}>
                {preview ? <img src={preview} alt="Profile" className="w-full h-full object-cover" /> : (user?.name?.charAt(0).toUpperCase() || "&#x1F464;")}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-200">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {preview ? "Cambiar" : "Subir foto"}
                </span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
            <p className="text-[11px] text-gray-400 mt-1.5">JPG, PNG, WebP, GIF (max 10 MB)</p>
            {file && !uploadingImage && (
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={handleUploadImage} className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">Subir imagen</button>
                <button type="button" onClick={() => { setFile(null); setPreview(user?.profileImage || null); }} className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancelar</button>
              </div>
            )}
            {profileImage && !file && <button type="button" onClick={handleRemoveImage} className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium transition">Quitar foto</button>}
            {uploadingImage && (
              <div className="w-full max-w-[200px] mt-2">
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: progress + "%" }} />
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-0.5">Subiendo...</p>
              </div>
            )}
            {imageError && <p className="mt-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">{imageError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <div className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500">{user?.email}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="Tu nombre" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contrase&ntilde;a <span className="text-gray-400 font-normal">(dejar vac&iacute;o para mantener)</span></label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="M&iacute;nimo 6 caracteres" minLength={6} />
          </div>
          {password && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contrase&ntilde;a</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={"w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition " + (confirmPassword && password !== confirmPassword ? "border-red-300 bg-red-50" : "border-gray-200")} placeholder="Repite la contrase&ntilde;a" />
              {confirmPassword && password !== confirmPassword && <p className="mt-1 text-xs text-red-500">Las contrase&ntilde;as no coinciden</p>}
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-lg flex items-center gap-1.5 border border-red-100">
              <span>&#x26A0;&#xFE0F;</span>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2.5 rounded-lg flex items-center gap-1.5 border border-emerald-100">
              <span>&#x2705;</span>
              {successMsg}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={saving || uploadingImage} className="flex-1 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
