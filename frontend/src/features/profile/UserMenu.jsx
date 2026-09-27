import { lazy, useCallback, useRef, useState } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import useClickOutside from '../../shared/hooks/useClickOutside';
import Avatar from '../../shared/ui/Avatar';
import LazyModal from '../../shared/ui/LazyModal';

const EditProfileModal = lazy(() => import('./EditProfileModal'));

// ─── UserMenu ─────────────────────────────────────────────────────────
// Avatar + nombre del usuario en el header, con desplegable para editar
// el perfil o cerrar sesión. `onColor`: texto blanco sobre el header teñido.
export default function UserMenu({ onColor = false, onLogout }) {
  const user = useKanbanStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="user-menu-button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        className={`flex items-center gap-1 sm:gap-3 pr-2 sm:pr-3 cursor-pointer hover:opacity-80 transition border-r ${
          onColor ? 'border-white/30' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="relative">
          <Avatar user={user} sizeClass="w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 border-2 border-white dark:border-gray-900 rounded-full" />
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span data-testid="user-menu-name" className={`text-sm font-semibold leading-tight ${onColor ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{user.name}</span>
          <span className={`text-[11px] leading-tight ${onColor ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>{user.email}</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 animate-fade-scale-in z-[70]">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <Avatar user={user} sizeClass="w-9 h-9 text-sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="py-1">
            <MenuItem testId="edit-profile-button" icon="⚙️" onClick={() => { close(); setEditingProfile(true); }}>
              Editar perfil
            </MenuItem>
            <MenuItem testId="logout-button" icon="🚪" danger onClick={() => { close(); onLogout(); }}>
              Cerrar sesión
            </MenuItem>
          </div>
        </div>
      )}

      {editingProfile && (
        <LazyModal>
          <EditProfileModal onClose={() => setEditingProfile(false)} />
        </LazyModal>
      )}
    </div>
  );
}

function MenuItem({ testId, icon, danger = false, onClick, children }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      <span className="text-base">{icon}</span>
      {children}
    </button>
  );
}
