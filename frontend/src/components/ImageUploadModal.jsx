import { useState, useEffect, useRef } from 'react';
import ImageViewModal from './ImageViewModal';
import { getCloudinaryThumb } from '../utils/images';
import { uploadImageToCloudinary } from '../services/cloudinary';

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGES = 5;

export default function ImageUploadModal({ currentImages = [], onSave, onClose }) {
  const [images, setImages] = useState(
    Array.isArray(currentImages) ? currentImages.filter(Boolean) : []
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const sliderRef = useRef(null);
  const [viewingIndex, setViewingIndex] = useState(null);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    if (images.length >= MAX_IMAGES) {
      setError(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      return;
    }

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
    if (images.length >= MAX_IMAGES) {
      setError(`Máximo ${MAX_IMAGES} imágenes`);
      return;
    }
    setUploading(true);
    setError('');
    setProgress(20);
    try {
      const publicUrl = await uploadImageToCloudinary({ file, prefix: 'tasks', imageType: 'task' });
      setProgress(100);
      setImages((prev) => [...prev, publicUrl]);
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error('[Treeverde] Error al subir imagen:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = () => {
    onSave(images);
    onClose();
  };

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-base">{'\u{1F4F7}'}</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Imágenes {images.length > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal">({images.length}/{MAX_IMAGES})</span>}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Drop zone */}
          {canAddMore && (
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ' +
                (preview
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800')
              }
            >
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="max-h-24 mx-auto rounded-md object-contain" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setPreview(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <span className="text-2xl block mb-1">{'\u{1F4E4}'}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Arrastra o haz clic para subir</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{images.length}/{MAX_IMAGES} usadas - JPG, PNG, WebP, GIF (max 10 MB)</p>
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
          )}

          {!canAddMore && (
            <div className="border-2 border-dashed rounded-lg p-4 text-center border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-400 dark:text-gray-500">Límite de {MAX_IMAGES} imágenes alcanzado</p>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <span>{'\u26A0\uFE0F'}</span>
              {error}
            </div>
          )}

          {uploading && (
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: progress + '%' }} />
            </div>
          )}

          {/* Slider de imágenes subidas */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Imágenes subidas:</p>
              <div
                ref={sliderRef}
                className="flex gap-2 overflow-x-auto pb-1 scroll-smooth"
                style={{ scrollbarWidth: 'thin', paddingTop: '0.38rem' }}
              >
                {images.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setViewingIndex(idx)}
                    className="relative group shrink-0 cursor-pointer mt-1"
                  >
                    <img
                      src={getCloudinaryThumb(url, 160)}
                      alt={`Imagen ${idx + 1}`}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                      loading="lazy"
                    />
                    {/* Overlay Ver más */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition flex items-center justify-center pointer-events-none">
                      <span className="text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition bg-black/60 px-2 py-1 rounded-md pointer-events-auto select-none">
                        {'\u{1F441}\uFE0F'} Ver
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                      title="Eliminar"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2">
            {file && !uploading && (
              <button
                onClick={handleUpload}
                disabled={!canAddMore}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                Subir
              </button>
            )}
            {uploading && (
              <button
                disabled
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-500 rounded-lg flex items-center justify-center gap-1.5 opacity-80 cursor-wait"
              >
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Subiendo
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition"
            >
              {uploading ? 'Subiendo...' : 'Listo'}
            </button>
          </div>
        </div>
      </div>

      {viewingIndex !== null && (
        <ImageViewModal
          images={images.map((url, i) => ({ imageUrl: url, title: `Imagen ${i + 1}` }))}
          currentIndex={viewingIndex}
          onClose={() => setViewingIndex(null)}
          onNavigate={(idx) => setViewingIndex(idx)}
        />
      )}
    </div>
  );
}
