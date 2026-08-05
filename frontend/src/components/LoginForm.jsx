import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import AuthLayout from './AuthLayout';
import AuthSkeleton from './AuthSkeleton';
import TreeLogo from './TreeLogo';
import TreeSpinner from './TreeSpinner';

export default function LoginForm({ onSwitch, onForgotPassword, invite }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const [fieldErrors, setFieldErrors] = useState({});
  const [waitingMessage, setWaitingMessage] = useState('');

  // ─── Mostrar mensaje de espera si el login tarda ──
  useEffect(() => {
    if (loading) {
      const t1 = setTimeout(() => setWaitingMessage('Conectando con el servidor...'), 3000);
      const t2 = setTimeout(() => setWaitingMessage('El servidor está tardando en responder. Reintentando...'), 7000);
      const t3 = setTimeout(
        () => setWaitingMessage('Verificando conexión con el servidor...'),
        14000
      );
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setWaitingMessage('');
    }
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.message;
      // Errores de red
      if (msg.includes('No se pudo conectar') || msg.includes('servidor')) {
        setFieldErrors({
          general:
            'No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo (npm run dev en /backend).'
        });
      } else if (msg === 'Email o contraseña incorrectos') {
        // Mensaje unificado (anti-enumeración): el backend no revela si el email existe
        setFieldErrors({ email: msg, password: msg });
      } else {
        setFieldErrors({ general: msg });
      }
    }
  };

  const inputClass = (field) => {
    const hasError = fieldErrors[field];
    return `w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none transition ${
      hasError
        ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : 'border-gray-200 bg-gray-50/60 hover:bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
    }`;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
  };

  return (
    <AuthLayout>
      {loading ? (
        /* ─── Skeleton estilo board + spinner con logo de árbol ── */
        <div className="flex flex-col items-center gap-6">
          <AuthSkeleton />
          <TreeSpinner size="lg" light />
          {waitingMessage ? (
            <p className="text-sm text-amber-100/90 text-center animate-pulse max-w-sm">
              {waitingMessage}
            </p>
          ) : (
            <p className="text-sm text-emerald-100/80">Verificando credenciales...</p>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-6 animate-fade-scale-in"
        >
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
              <TreeLogo className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Inicia sesión</h1>
            <p className="text-sm text-gray-500 mt-1">
              {invite ? 'Inicia sesión para unirte a la tarea' : 'Bienvenido de vuelta a tu tablero'}
            </p>
          </div>

          {invite && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-0.5">
              <p className="text-xs font-semibold text-emerald-800">📨 Te invitaron a una tarea</p>
              <p className="text-xs text-emerald-700">
                {invite.taskTitle ? <>«{invite.taskTitle}»</> : 'una tarea'}
                {invite.creatorName ? ` · por ${invite.creatorName}` : ''}
              </p>
              <p className="text-xs text-emerald-600">Al iniciar sesión te unirás a la tarea automáticamente.</p>
            </div>
          )}

          {fieldErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {fieldErrors.general}
            </div>
          )}

          <div className="space-y-4">
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
                  data-testid="login-email" type="email" required value={email} onChange={handleEmailChange}
                  className={inputClass('email')}
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span> {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  data-testid="login-password" type="password" required value={password} onChange={handlePasswordChange}
                  className={inputClass('password')}
                  placeholder="••••••"
                  disabled={loading}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span> {fieldErrors.password}
                </p>
              )}
            </div>
          </div>

          <button
            data-testid="login-submit" type="submit" disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            Iniciar Sesión
          </button>

          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={onSwitch} disabled={loading} className="text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 transition">
                Registrarse
              </button>
            </p>
            <button type="button" onClick={onForgotPassword} disabled={loading} className="text-gray-400 hover:text-emerald-600 font-medium disabled:opacity-50 transition">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
