import { useEffect, useState } from 'react';
import { getUrlParam, removeUrlParam } from '../../shared/utils/url';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';

// ─── AuthScreens ──────────────────────────────────────────────────────
// Pantallas sin sesión: login ↔ registro ↔ recuperar contraseña, y
// restablecer si la URL trae ?resetToken=. Con invitación a un tablero
// muestra un banner encima del formulario.
export default function AuthScreens({ taskInvite, boardInvite }) {
  const [resetToken] = useState(() => getUrlParam('resetToken'));
  const [view, setView] = useState(resetToken ? 'reset-password' : 'login');

  // Limpiar el token de la URL (si se recarga, no vuelve a aparecer)
  useEffect(() => {
    if (resetToken) removeUrlParam('resetToken');
  }, [resetToken]);

  const screens = {
    'reset-password': <ResetPasswordForm token={resetToken} onSuccess={() => setView('login')} />,
    'forgot-password': <ForgotPasswordForm onBack={() => setView('login')} />,
    register: <RegisterForm onSwitch={() => setView('login')} invite={taskInvite.info} />,
    login: (
      <LoginForm
        onSwitch={() => setView('register')}
        onForgotPassword={() => setView('forgot-password')}
        invite={taskInvite.info}
      />
    ),
  };
  const screen = screens[view];

  const banner = boardInvite.token && (
    boardInvite.invalid
      ? { error: true, text: 'El enlace de invitación no es válido' }
      : boardInvite.info && {
        text: `${boardInvite.info.boardIcon || '🗂'} ${boardInvite.info.ownerName || 'Alguien'} te invita a unirte al tablero «${boardInvite.info.boardName}»`,
      }
  );
  if (!banner) return screen;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
      <div className="w-full max-w-md mx-auto px-4 pt-6">
        <div
          className={`text-sm font-medium rounded-xl px-4 py-3 border ${
            banner.error
              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
          }`}
        >
          {banner.text}
        </div>
      </div>
      <div className="flex-1 flex items-start justify-center pt-2">{screen}</div>
    </div>
  );
}
