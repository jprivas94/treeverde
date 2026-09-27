import Modal, { ModalHeader } from '../../shared/ui/Modal';
import Avatar from '../../shared/ui/Avatar';
import Spinner from '../../shared/ui/Spinner';
import SearchableUserSelect from './SearchableUserSelect';
import UserChip from '../../shared/ui/UserChip';

// Piezas comunes de los modales de tarea (crear, editar, ver).

const fieldLabel = 'block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0';

/** Marco del modal de tarea: overlay + panel ancho + título. */
export function TaskModal({ title, onClose, dismissible = true, children }) {
  return (
    <Modal
      onClose={onClose}
      dismissible={dismissible}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-2.5 sm:p-3"
    >
      <ModalHeader title={title} onClose={onClose} />
      {children}
    </Modal>
  );
}

/** Campo de solo lectura con una persona (Creado por / Asignado a). */
export function PersonField({ label, user, fallback = 'Desconocido', avatarClass = 'bg-violet-400 text-white' }) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
        {user ? (
          <>
            <Avatar user={user} sizeClass="w-4 h-4 text-[8px]" fallbackClass={avatarClass} />
            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">{user.name}</span>
          </>
        ) : (
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{fallback}</span>
        )}
      </div>
    </div>
  );
}

/** Botones Cancelar / [extra] / Enviar del formulario de tarea. */
export function FormActions({ onCancel, saving, submitLabel, extra }) {
  return (
    <div className={`grid gap-2 pt-0.5 ${extra ? 'grid-cols-3' : 'grid-cols-2'}`}>
      <button type="button" onClick={onCancel}
        className="py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
        Cancelar
      </button>
      {extra}
      <button type="submit" disabled={saving}
        className="py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
        {saving ? <><Spinner /> Guardando</> : submitLabel}
      </button>
    </div>
  );
}

/**
 * Sección "Compartir con": chips de usuarios + selector para añadir.
 * Sin `onAdd` es de solo lectura (sin selector ni botón ×).
 */
export function ShareSection({ label, sharedUsers, users, onSearch, currentUserId, onAdd, onRemove, emptyText, children }) {
  return (
    <div className="pt-2 mt-2">
      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{'\u{1F91D}'} {label}</label>
      {sharedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {sharedUsers.map((u) => <UserChip key={u.id} user={u} onRemove={onAdd ? onRemove : undefined} />)}
        </div>
      ) : emptyText && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 italic">{emptyText}</p>
      )}
      {onAdd && (
        <SearchableUserSelect
          value=""
          onChange={(userId) => {
            const target = users.find((u) => u.id === userId);
            if (target) onAdd(target);
          }}
          users={users}
          placeholder="Seleccionar usuario..."
          size="small"
          onSearch={onSearch}
          filter={(u) => u.id !== currentUserId && !sharedUsers.some((su) => su.id === u.id)}
        />
      )}
      {children}
    </div>
  );
}
