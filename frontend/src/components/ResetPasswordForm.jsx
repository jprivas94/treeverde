import { useState } from 'react';
import { passwordApi } from '../services/api';
import AuthLayout from './AuthLayout';
import AuthSkeleton from './AuthSkeleton';
import TreeLogo from './TreeLogo';
import TreeSpinner from './TreeSpinner';

export default function ResetPasswordForm({ token, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await passwordApi.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-6 text-center animate-fade-scale-in">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contraseña actualizada</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Tu contraseña se ha restablecido exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.
          </p>
          <button
            type="button"
            onClick={onSuccess}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {loading ? (
        /* ─── Skeleton estilo board + spinner con logo de árbol ── */
        <div className="flex flex-col items-center gap-6">
          <AuthSkeleton />
          <TreeSpinner size="lg" light />
          <p className="text-sm text-emerald-100/80">Actualizando tu contraseña...</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} noValidate className="w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-6 animate-fade-scale-in">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center mb-4">
            <TreeLogo className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ingresa tu nueva contraseña dos veces para confirmar.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 dark:text-gray-100 rounded-xl outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmar contraseña</label>
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-gray-100 ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/40'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800'
                }`}
                placeholder="Repite la contraseña"
                disabled={loading}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <span>⚠️</span> Las contraseñas no coinciden
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (confirmPassword && newPassword !== confirmPassword)}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:cursor-wait text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
        >
          Actualizar contraseña
        </button>
      </form>
      )}
    </AuthLayout>
  );
}
