import { useState } from 'react';
import { passwordApi } from '../services/api';
import AuthLayout from './AuthLayout';
import AuthSkeleton from './AuthSkeleton';
import TreeLogo from './TreeLogo';
import TreeSpinner from './TreeSpinner';

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
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-scale-in">
          <div className="text-center">
            <div className="text-4xl mb-1.5">📧</div>
            <h1 className="text-xl font-bold text-gray-900">Revisa tu email</h1>
            <p className="text-sm text-gray-500 mt-1 leading-snug">
              Si existe una cuenta con <strong className="text-emerald-700">{email}</strong>,
              recibirás un enlace para restablecer tu contraseña.
            </p>
          </div>

          {resetLink && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                🔧 Modo desarrollo
              </p>
              <p className="text-sm text-amber-700">
                En producción se enviaría un email. Para pruebas, usa este enlace:
              </p>
              <a
                href={resetLink}
                className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium break-all bg-white rounded-lg p-2.5 border border-amber-200 hover:border-emerald-300 transition"
              >
                {resetLink}
              </a>
              <p className="text-xs text-amber-600">
                O abre el enlace en una nueva pestaña para restablecer tu contraseña.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onBack}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
          >
            Volver al inicio de sesión
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
          <p className="text-sm text-emerald-100/80">Enviando enlace de recuperación...</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-6 animate-fade-scale-in">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
            <TreeLogo className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50/60 hover:bg-white focus:bg-white rounded-xl outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:cursor-wait text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
        >
          Enviar enlace de recuperación
        </button>

        <p className="text-center text-sm text-gray-500">
          <button type="button" onClick={onBack} disabled={loading} className="text-emerald-600 hover:text-emerald-700 font-medium transition disabled:opacity-50">
            Volver al inicio de sesión
          </button>
        </p>
      </form>
      )}
    </AuthLayout>
  );
}
