import NotificationPanel from '../notifications/NotificationPanel';
import UserMenu from '../profile/UserMenu';
import ThemeToggle from '../../shared/ui/ThemeToggle';
import TreeLogo from '../../shared/ui/TreeLogo';

// ─── AppHeader ────────────────────────────────────────────────────────
// Header común del panel de tableros y del tablero Kanban:
// logo + título + `left` | notificaciones, tema, menú de usuario + `right`.
// `gradient`: clases del gradiente del tablero activo (texto en blanco);
// sin él, el header es blanco/gris.
export default function AppHeader({ gradient, isDark, onToggleTheme, onLogout, left, right }) {
  const onColor = Boolean(gradient);
  const headerClasses = onColor
    ? `bg-gradient-to-r ${gradient} shadow-sm`
    : 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800';

  return (
    <header className={`${headerClasses} px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <TreeLogo className={`w-6 h-6 sm:w-7 sm:h-7 ${onColor ? 'text-white' : 'text-emerald-600'}`} />
        <h1 className={`hidden sm:block text-lg font-bold ${onColor ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>Treeverde</h1>
        {left}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationPanel onColor={onColor} />
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} onColor={onColor} />
        <UserMenu onColor={onColor} onLogout={onLogout} />
        {right}
      </div>
    </header>
  );
}
