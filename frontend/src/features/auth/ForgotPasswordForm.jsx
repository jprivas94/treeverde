import { useState } from 'react';
import { passwordApi } from '../../shared/services/api';
import AuthLayout from './AuthLayout';
import { AuthLoading, AuthHeader, AuthField, AuthError, CARD, PRIMARY_BUTTON } from './AuthParts';

export default function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await passwordApi.forgotPassword(email);
      setSent(true);
      if (data.resetLink) setResetLink(data.resetLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <AuthLoading><p className="text-sm text-emerald-100/80">Enviando enlace de recuperación...</p></AuthLoading>
      </AuthLayout>
    );
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className={`${CARD} p-6 space-y-4`}>
          <div className="text-center">
            <div className="text-4xl mb-1.5">📧</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Revisa tu email</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Si existe una cuenta con <strong className="text-emerald-700 dark:text-emerald-400">{email}</strong>,
              recibirás un enlace para restablecer tu contraseña.
            </p>
          </div>

          {/* En desarrollo el backend devuelve el enlace directamente */}
          {resetLink && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">🔧 Modo desarrollo</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">En producción se enviaría un email. Para pruebas, usa este enlace:</p>
              <a
                href={resetLink}
                className="block text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium break-all bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-amber-200 dark:border-amber-900 hover:border-emerald-300 transition"
              >
                {resetLink}
              </a>
              <p className="text-xs text-amber-600 dark:text-amber-400">O abre el enlace en una nueva pestaña para restablecer tu contraseña.</p>
            </div>
          )}

          <button
            type="button"
            onClick={onBack}
            className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg transition"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className={`${CARD} p-8 space-y-6`}>
        <AuthHeader title="Recuperar contraseña" subtitle="Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña." />
        <AuthError>{error}</AuthError>
        <AuthField
          label="Email" icon="mail" type="email" required placeholder="tu@email.com"
          value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
        />
        <button type="submit" className={`${PRIMARY_BUTTON} py-2.5`}>Enviar enlace de recuperación</button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          <button type="button" onClick={onBack} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition">
            Volver al inicio de sesión
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
