import { useState, useEffect, useRef } from 'react';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';
import ImageViewModal from './ImageViewModal';
import SearchableUserSelect from './SearchableUserSelect';
import { PRIORITIES } from '../constants/kanbanConfig';
import { getCloudinaryThumb } from '../utils/images';

export function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Formulario de tarea reutilizable (dos columnas).
 * Controlado: recibe `values` y `onChange(patch)` — sin estado interno propio.
 * Renderiza: Título, Descripción + Sub-tareas | Asignar, Prioridad, Fecha, Etiquetas, Imágenes.
 */
export default function TaskFormFields({
  values,
  onChange,
  users,
  user, // para registrar quién completa una subtarea (notificaciones)
  autoFocus = false,
  titleRef,
  descriptionRef,
  onSubtaskToggle, // opcional: se llama con la nueva lista tras un toggle (persistencia inmediata)
  disableAssignee = false, // true → el asignado se definirá vía enlace de invitación (creación)
}) {
  const {
    title, description, priority, dueDate, tags,
    assigneeId, images, subtasks,
  } = values;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const internalTitleRef = useRef(null);
  const internalDescRef = useRef(null);
  const titleRefFinal = titleRef || internalTitleRef;
  const descRefFinal = descriptionRef || internalDescRef;

  // Auto-foco
  useEffect(() => {
    if (autoFocus && titleRefFinal.current) titleRefFinal.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-ajuste del textarea
  useEffect(() => {
    const el = descRefFinal.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [description, descRefFinal]);

  const set = (field, value) => onChange({ [field]: value });

  // ─── Sub-tareas ──────────────────────────────
  const subtaskList = Array.isArray(subtasks) ? subtasks : [];
  const completedCount = subtaskList.filter((st) => st.completed).length;

  const handleAddSubtask = () => {
    const stTitle = newSubtaskTitle.trim();
    if (!stTitle) return;
    const id = String(Date.now());
    set('subtasks', [...subtaskList, { id, title: stTitle, completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (stId) => {
    const next = subtaskList.map((st) =>
      st.id === stId
        ? { ...st, completed: !st.completed, toggledBy: !st.completed ? user?.id || null : null }
        : st
    );
    set('subtasks', next);
    onSubtaskToggle?.(next);
  };

  const handleRemoveSubtask = (stId) => {
    set('subtasks', subtaskList.filter((st) => st.id !== stId));
  };

  const imagesList = Array.isArray(images) ? images.filter(Boolean) : [];

  return (
    <>
      {/* ── Layout de dos columnas: Izquierda (Título + Descripción) | Derecha (resto) ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {/* ═══ LADO IZQUIERDO: Título + Descripción ═══ */}
        <div className="md:col-span-3 bg-gray-50/70 border border-gray-100 rounded-xl p-3 h-full flex flex-col gap-2">
          {/* Título */}
          <div className="shrink-0">
            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Título *</label>
            <input
              ref={titleRefFinal}
              type="text"
              required
              value={title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              placeholder="Ej: Implementar login"
            />
          </div>

          {/* Descripción + Sub-tareas */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-[10px] font-medium text-gray-600 mb-0 shrink-0">
              Descripción {subtaskList.length > 0 && (
                <span className="text-[10px] text-gray-400 font-normal ml-1">
                  &middot; {'\uD83D\uDCCB'} {completedCount}/{subtaskList.length}
                </span>
              )}
            </label>
            <div className="flex-1 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden bg-white flex flex-col min-h-0">
              <textarea
                ref={descRefFinal}
                value={description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full flex-1 min-h-0 px-3 py-1.5 text-sm border-0 outline-none resize-none focus:ring-0"
                placeholder="Descripción..."
              />

              {/* Separador y sub-tareas */}
              <div className="shrink-0">
                <div className="border-t border-gray-100" />
                <div className="px-1.5 py-1">
                  {subtaskList.length > 0 && (
                    <div className="space-y-0 mb-0.5">
                      {subtaskList.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg hover:bg-gray-50 transition group"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(st.id)}
                            className={`w-3 h-3 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              st.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            {st.completed && (
                              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span
                            className={`text-[10px] flex-1 ${
                              st.completed ? 'line-through text-gray-400' : 'text-gray-700'
                            }`}
                          >
                            {st.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(st.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-[10px] leading-none"
                            title="Eliminar"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input para nueva sub-tarea */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                      className="flex-1 px-1.5 py-0.5 text-[10px] border border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="Nueva sub-tarea..."
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim()}
                      className="px-1.5 py-0.5 text-[9px] font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      + Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ LADO DERECHO: Asignar a, Prioridad, Fecha, Etiquetas, Imagen ═══ */}
        <div className="md:col-span-2 h-full">
          <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 h-full flex flex-col justify-center space-y-1.5">
            {/* Asignar a */}
            <div className={disableAssignee ? 'pointer-events-none opacity-50 select-none' : ''}>
              <label className="block text-[10px] font-medium text-gray-600 mb-0">Asignar a</label>
              <SearchableUserSelect
                value={assigneeId}
                onChange={(v) => set('assigneeId', v)}
                users={users}
                placeholder="Sin asignar"
                size="small"
              />
              {disableAssignee && (
                <p className="text-[9px] text-emerald-700 mt-0.5">
                  {'\u{1F4E8}'} Se asignará vía enlace de invitación
                </p>
              )}
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => set('priority', e.target.value)}
                className={'w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ' + (PRIORITIES.find((p) => p.value === priority)?.color || 'bg-white border-gray-200 text-gray-700')}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Fecha límite */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0">Fecha l&iacute;mite</label>
              <input
                type="text" readOnly value={dueDate ? parseLocalDate(dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                onClick={() => setShowDatePicker(true)}
                placeholder="Seleccionar"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer bg-white"
              />
              {showDatePicker && (
                <DatePickerModal
                  value={dueDate ? parseLocalDate(dueDate) : null}
                  onSelect={(date) => set('dueDate', date ? formatLocalDate(date) : '')}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>

            {/* Etiquetas */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0">Etiquetas</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => set('tags', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="frontend, bug, urgente"
              />
            </div>

            {/* Imágenes */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0">Imágenes</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowImageUpload(true)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
                >
                  <span>{'\u{1F4F7}'}</span>
                  Subir
                </button>
                {imagesList.length > 0 && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">
                    {imagesList.length} {'\u2705'}
                  </span>
                )}
              </div>
              {imagesList.length > 0 && (
                <div className="flex gap-1 mt-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                  {imagesList.map((url, idx) => (
                    <div key={idx} className="relative group shrink-0 mt-1 cursor-pointer">
                      <img src={getCloudinaryThumb(url, 160)} alt={`Img ${idx+1}`} className="w-10 h-10 rounded-lg object-cover border border-gray-200" loading="lazy" />
                      <div
                        onClick={() => setViewingImageIndex(idx)}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition flex items-center justify-center pointer-events-none"
                      >
                        <span className="text-white text-[8px] font-semibold opacity-0 group-hover:opacity-100 transition bg-black/60 px-1.5 py-0.5 rounded-md pointer-events-auto select-none">
                          {'\u{1F441}\uFE0F'} Ver
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => set('images', imagesList.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[7px] flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition z-10"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showImageUpload && (
        <ImageUploadModal
          currentImages={imagesList}
          onSave={(newImages) => {
            set('images', newImages);
            setShowImageUpload(false);
          }}
          onClose={() => setShowImageUpload(false)}
        />
      )}

      {viewingImageIndex !== null && (
        <ImageViewModal
          images={imagesList.map((url, i) => ({ imageUrl: url, title: `Imagen ${i + 1}` }))}
          currentIndex={viewingImageIndex}
          onClose={() => setViewingImageIndex(null)}
          onNavigate={(idx) => setViewingImageIndex(idx)}
        />
      )}
    </>
  );
}
