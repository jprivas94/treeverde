import { useEffect, useRef, useState } from 'react';
import { boardsApi } from '../../shared/services/api';
import { BOARD_COLORS, BOARD_ICONS } from '../../shared/constants/kanbanConfig';
import Modal, { ModalHeader } from '../../shared/ui/Modal';
import Spinner from '../../shared/ui/Spinner';

const label = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';
const input = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 transition';

// ─── BoardFormModal ───────────────────────────────────────────────────
// Crear (sin `board`) o editar un tablero, con vista previa en vivo.
export default function BoardFormModal({ board, onClose, onSaved }) {
  const isEdit = Boolean(board);
  const [form, setForm] = useState({
    name: board?.name || '',
    description: board?.description || '',
    color: board?.color || 'emerald',
    icon: board?.icon || '🗂',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const c = BOARD_COLORS[form.color] || BOARD_COLORS.emerald;
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError('');
    const data = { ...form, name: form.name.trim(), description: form.description.trim() };
    try {
      onSaved(isEdit ? await boardsApi.update(board.id, data) : await boardsApi.create(data));
    } catch (err) {
      setError(err.message || (isEdit ? 'No se pudo guardar el tablero' : 'No se pudo crear el tablero'));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title={isEdit ? 'Editar tablero' : 'Nuevo tablero'}
        onClose={onClose}
        className="flex items-center justify-between mb-4 px-5 sm:px-6 pt-5"
        titleClassName="text-base font-bold text-gray-900 dark:text-gray-100"
      />

      <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-5 space-y-4">
        <div>
          <label className={label}>Vista previa</label>
          <div className={`rounded-xl overflow-hidden bg-gradient-to-br ${c.gradient} shadow-md transition-all duration-300`}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl drop-shadow-sm">{form.icon}</span>
              <div className="min-w-0">
                <p className="font-bold text-white truncate drop-shadow-sm">{form.name.trim() || 'Nombre del tablero'}</p>
                <p className="text-[11px] text-white/85 truncate">{form.description.trim() || 'Una breve descripción…'}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Nombre</label>
          <input
            ref={inputRef}
            type="text"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            maxLength={80}
            placeholder="Ej. Proyecto Alpha, Sprint 12..."
            className={input}
          />
        </div>

        <div>
          <label className={`${label} flex items-center justify-between`}>
            <span>Descripción <span className="font-normal text-gray-400">(opcional)</span></span>
            <span className={`text-[10px] font-normal ${form.description.length > 180 ? 'text-amber-500' : 'text-gray-400'}`}>{form.description.length}/200</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="¿De qué trata este tablero?"
            className={`${input} resize-none`}
          />
        </div>

        <div>
          <label className={label}>Color</label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {Object.entries(BOARD_COLORS).map(([key, cc]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('color')(key)}
                aria-label={`Color ${key}`}
                title={key}
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cc.gradient} shadow-sm transition-all duration-200 ${
                  form.color === key ? `ring-2 ring-offset-2 dark:ring-offset-gray-900 ${cc.ring} scale-110` : 'hover:scale-110 opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Icono</label>
          <div className="grid grid-cols-6 gap-1.5">
            {BOARD_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => set('icon')(ic)}
                aria-label={`Icono ${ic}`}
                className={`h-9 rounded-lg text-lg flex items-center justify-center transition-all duration-150 ${
                  form.icon === ic
                    ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-emerald-400 scale-105'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
          >
            {saving ? <><Spinner /> Guardando</> : isEdit ? 'Guardar cambios' : 'Crear tablero'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
