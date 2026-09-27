import { useState, useEffect, useRef } from 'react';
import DatePickerModal from './DatePickerModal';
import ImageUploadModal from './ImageUploadModal';
import ImageViewModal from './ImageViewModal';
import SearchableUserSelect from './SearchableUserSelect';
import { PRIORITIES } from '../../shared/constants/kanbanConfig';
import { getCloudinaryThumb } from '../../shared/utils/images';
import { parseLocalDate, formatLocalDate } from '../../shared/utils/date';

const label = 'block text-[10px] font-medium text-gray-600 dark:text-gray-400';
const input = 'w-full px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dark:bg-gray-800 dark:text-gray-100';
const panel = 'bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-3 h-full';

// Campo del lado derecho; `locked` lo deshabilita y muestra el motivo debajo.
function Field({ title, locked, note, children }) {
  return (
    <div className={locked ? 'pointer-events-none opacity-50 select-none' : ''}>
      <label className={`${label} mb-0`}>{title}</label>
      {children}
      {note}
    </div>
  );
}

const LockNote = ({ what }) => <p className="text-[9px] text-amber-700 mt-0.5">{'\u{1F512}'} Solo el creador puede cambiar {what}</p>;

/**
 * Formulario de tarea reutilizable (dos columnas), controlado:
 * recibe `values` y `onChange(patch)`.
 * Izquierda: Título, Descripción + Sub-tareas | Derecha: Asignar, Prioridad, Fecha, Etiquetas, Imágenes.
 */
export default function TaskFormFields({
  values,
  onChange,
  users,
  user, // para registrar quién completa una subtarea (notificaciones)
  autoFocus = false,
  onSubtaskToggle, // opcional: recibe la nueva lista tras un toggle (persistencia inmediata)
  disableAssignee = false, // el asignado se definirá vía enlace de invitación (creación)
  isAssigneeOnly = false, // el usuario es el asignado (no creador): no cambia asignado/prioridad/fecha
  onUserSearch, // opcional: búsqueda server-side de usuarios
}) {
  const { title, description, priority, dueDate, tags, assigneeId, images, subtasks } = values;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [viewingImageIndex, setViewingImageIndex] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const titleRef = useRef(null);
  const descRef = useRef(null);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-ajuste de altura del textarea
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [description]);

  const set = (field, value) => onChange({ [field]: value });

  // ─── Sub-tareas ───
  const subtaskList = Array.isArray(subtasks) ? subtasks : [];
  const completedCount = subtaskList.filter((st) => st.completed).length;

  const addSubtask = () => {
    const stTitle = newSubtaskTitle.trim();
    if (!stTitle) return;
    set('subtasks', [...subtaskList, { id: String(Date.now()), title: stTitle, completed: false }]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (stId) => {
    const next = subtaskList.map((st) =>
      st.id === stId ? { ...st, completed: !st.completed, toggledBy: !st.completed ? user?.id || null : null } : st
    );
    set('subtasks', next);
    onSubtaskToggle?.(next);
  };

  const imagesList = Array.isArray(images) ? images.filter(Boolean) : [];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {/* ═══ Izquierda: Título + Descripción + Sub-tareas ═══ */}
        <div className={`md:col-span-3 ${panel} flex flex-col gap-2`}>
          <div className="shrink-0">
            <label className={`${label} mb-0.5`}>Título *</label>
            <input
              ref={titleRef}
              type="text"
              required
              value={title}
              onChange={(e) => set('title', e.target.value)}
              className={`${input} py-2 bg-white`}
              placeholder="Ej: Implementar login"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className={`${label} mb-0 shrink-0`}>
              Descripción {subtaskList.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal ml-1">
                  &middot; {'📋'} {completedCount}/{subtaskList.length}
                </span>
              )}
            </label>
            <div className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden bg-white dark:bg-gray-800 flex flex-col min-h-0">
              <textarea
                ref={descRef}
                value={description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full flex-1 min-h-0 px-3 py-1.5 text-sm border-0 outline-none resize-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder="Descripción..."
              />

              <div className="shrink-0 border-t border-gray-100 dark:border-gray-700 px-1.5 py-1">
                {subtaskList.length > 0 && (
                  <div className="space-y-0 mb-0.5">
                    {subtaskList.map((st) => (
                      <div key={st.id} className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition group">
                        <button
                          type="button"
                          onClick={() => toggleSubtask(st.id)}
                          className={`w-3 h-3 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            st.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                          }`}
                        >
                          {st.completed && (
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-[10px] flex-1 ${st.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {st.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => set('subtasks', subtaskList.filter((s) => s.id !== st.id))}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-[10px] leading-none"
                          title="Eliminar"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                    className="flex-1 px-1.5 py-0.5 text-[10px] border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dark:bg-gray-800 dark:text-gray-100"
                    placeholder="Nueva sub-tarea..."
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
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

        {/* ═══ Derecha: Asignar, Prioridad, Fecha, Etiquetas, Imágenes ═══ */}
        <div className="md:col-span-2 h-full">
          <div className={`${panel} flex flex-col justify-center space-y-1.5`}>
            <Field
              title="Asignar a"
              locked={disableAssignee || isAssigneeOnly}
              note={
                <>
                  {disableAssignee && <p className="text-[9px] text-emerald-700 mt-0.5">{'\u{1F4E8}'} Se asignará vía enlace de invitación</p>}
                  {isAssigneeOnly && <LockNote what="al asignado" />}
                </>
              }
            >
              <SearchableUserSelect
                value={assigneeId}
                onChange={(v) => set('assigneeId', v)}
                users={users}
                placeholder="Sin asignar"
                size="small"
                onSearch={onUserSearch}
              />
            </Field>

            <Field title="Prioridad" locked={isAssigneeOnly} note={isAssigneeOnly && <LockNote what="la prioridad" />}>
              <select
                value={priority}
                onChange={(e) => set('priority', e.target.value)}
                className={'w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ' + (PRIORITIES.find((p) => p.value === priority)?.color || 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200')}
              >
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <Field title="Fecha límite" locked={isAssigneeOnly} note={isAssigneeOnly && <LockNote what="la fecha" />}>
              <input
                type="text"
                readOnly
                value={dueDate ? parseLocalDate(dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                onClick={() => setShowDatePicker(true)}
                placeholder="Seleccionar"
                className={`${input} py-1.5 cursor-pointer bg-white`}
              />
              {showDatePicker && (
                <DatePickerModal
                  value={dueDate ? parseLocalDate(dueDate) : null}
                  onSelect={(date) => set('dueDate', date ? formatLocalDate(date) : '')}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </Field>

            <Field title="Etiquetas">
              <input
                type="text"
                value={tags}
                onChange={(e) => set('tags', e.target.value)}
                className={`${input} py-1.5`}
                placeholder="frontend, bug, urgente"
              />
            </Field>

            <Field title="Imágenes">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowImageUpload(true)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition"
                >
                  <span>{'\u{1F4F7}'}</span>
                  Subir
                </button>
                {imagesList.length > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full font-medium">
                    {imagesList.length} {'✅'}
                  </span>
                )}
              </div>
              {imagesList.length > 0 && (
                <div className="flex gap-1 mt-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                  {imagesList.map((url, idx) => (
                    <div key={idx} className="relative group shrink-0 mt-1 cursor-pointer">
                      <img src={getCloudinaryThumb(url, 160)} alt={`Img ${idx + 1}`} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition flex items-center justify-center pointer-events-none">
                        <span
                          onClick={() => setViewingImageIndex(idx)}
                          className="text-white text-[8px] font-semibold opacity-0 group-hover:opacity-100 transition bg-black/60 px-1.5 py-0.5 rounded-md pointer-events-auto select-none"
                        >
                          {'\u{1F441}️'} Ver
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
            </Field>
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
          onNavigate={setViewingImageIndex}
        />
      )}
    </>
  );
}
