import AuthSkeleton from './AuthSkeleton';
import TreeLogo from '../../shared/ui/TreeLogo';
import TreeSpinner from '../../shared/ui/TreeSpinner';

// Piezas comunes de las pantallas de autenticación (login, registro,
// recuperar y restablecer contraseña).

// Iconos (heroicons outline) de los campos
export const ICONS = {
  mail: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
  lock: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
  user: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0',
};

export const CARD = 'w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-3xl shadow-2xl animate-fade-scale-in';
export const PRIMARY_BUTTON = 'w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2';

/** Skeleton + spinner + mensaje mientras se procesa el formulario. */
export function AuthLoading({ children }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <AuthSkeleton />
      <TreeSpinner size="lg" light />
      {children}
    </div>
  );
}

/** Logo + título + subtítulo del formulario. `compact` para el registro. */
export function AuthHeader({ title, subtitle, compact = false }) {
  return (
    <div className="text-center">
      <div className={`mx-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center ${compact ? 'w-10 h-10 rounded-xl mb-2' : 'w-14 h-14 rounded-2xl mb-4'}`}>
        <TreeLogo className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-emerald-600`} />
      </div>
      <h1 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-gray-100`}>{title}</h1>
      <p className={`${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'} text-gray-500 dark:text-gray-400`}>{subtitle}</p>
    </div>
  );
}

/** Campo con icono a la izquierda y mensaje de error debajo. */
export function AuthField({ label, icon, error, compact = false, ...inputProps }) {
  return (
    <div>
      <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${compact ? 'mb-1' : 'mb-1.5'}`}>{label}</label>
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
        <input
          {...inputProps}
          className={`w-full pl-10 pr-4 ${compact ? 'py-2' : 'py-2.5'} border rounded-xl outline-none transition ${
            error
              ? 'border-red-400 dark:border-red-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50 dark:bg-red-950/40 dark:text-gray-100'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
          }`}
        />
      </div>
      {error && typeof error === 'string' && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}

/** Alerta de error general del formulario. */
export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
      <span>⚠️</span>
      <span>{children}</span>
    </div>
  );
}

/** Aviso "Te invitaron a una tarea" (enlace ?invite=TOKEN). */
export function InviteNotice({ invite, hint }) {
  if (!invite) return null;
  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3 space-y-0.5">
      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">📨 Te invitaron a una tarea</p>
      <p className="text-xs text-emerald-700 dark:text-emerald-400">
        {invite.taskTitle ? <>«{invite.taskTitle}»</> : 'una tarea'}
        {invite.creatorName ? ` · por ${invite.creatorName}` : ''}
      </p>
      {hint && <p className="text-xs text-emerald-600 dark:text-emerald-400">{hint}</p>}
    </div>
  );
}
