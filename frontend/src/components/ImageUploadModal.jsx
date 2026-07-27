import { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ImageUploadModal({ currentImage, onSave, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState(currentImage || '');
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Solo se permiten: JPG, PNG, WebP, GIF');
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setError('La imagen no debe superar 10 MB');
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

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(20);
    try {
      const token = getToken();
      const signRes = await fetch(API_BASE + '/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ fileName: file.name, prefix: 'tasks', imageType: 'task' }),
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
      setProgress(80);
      await onSave(publicUrl);
      setUploadedUrl(publicUrl);
      setProgress(100);
      setTimeout(function () { onClose(); }, 800);
    } catch (err) {
      console.error('[Treeverde] Error al subir imagen:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(currentImage || null);
    setUploadedUrl('');
    onSave('');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-base">{'\u{1F4F7}'}</span>
            <h3 className="text-sm font-bold text-gray-900">Imagen</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ' +
              (preview
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50')
            }
          >
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-28 mx-auto rounded-md object-contain"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(currentImage || null);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="py-3">
                <span className="text-2xl block mb-1">{'\u{1F4E4}'}</span>
                <p className="text-xs text-gray-500">Arrastra o haz clic para subir</p>
                <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WebP, GIF (max 10 MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <span>{'\u26A0\uFE0F'}</span>
              {error}
            </div>
          )}

          {uploading && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: progress + '%' }}
              />
            </div>
          )}

          <div className="flex gap-2">
            {uploadedUrl && !file && (
              <button
                onClick={handleRemove}
                className="flex-1 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                Quitar imagen
              </button>
            )}
            {file && !uploading && (
              <button
                onClick={handleUpload}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                Subir imagen
              </button>
            )}
            {!file && !uploadedUrl && currentImage && (
              <div className="flex-1 py-2 text-xs text-gray-400 text-center">
                Imagen actual
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              {uploading ? 'Subiendo...' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
