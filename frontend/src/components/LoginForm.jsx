import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

export default function LoginForm({ onSwitch }) {
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
      } else if (msg === 'El usuario no existe') {
        setFieldErrors({ email: msg, password: msg });
      } else if (msg === 'Contraseña incorrecta') {
        setFieldErrors({ password: msg });
      } else {
        setFieldErrors({ general: msg });
      }
    }
  };

  const inputClass = (field) => {
    const hasError = fieldErrors[field];
    return `w-full px-4 py-2.5 border rounded-lg outline-none transition ${
      hasError
        ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : 'border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Treeverde</h1>
          <p className="text-sm text-gray-500 mt-1">Inicia sesión para continuar</p>
        </div>

        {fieldErrors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {fieldErrors.general}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={handleEmailChange}
              className={inputClass('email')}
              placeholder="tu@email.com"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password" required value={password} onChange={handlePasswordChange}
              className={inputClass('password')}
              placeholder="••••••"
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.password}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              {/* Spinner animado */}
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Ingresando...</span>
            </>
          ) : (
            'Iniciar Sesión'
          )}
        </button>

        {/* Mensaje de espera cuando el servidor tarda */}
        {waitingMessage && (
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg animate-pulse">
            <svg className="animate-spin h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {waitingMessage}
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <button type="button" onClick={onSwitch} disabled={loading} className="text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50">
            Registrarse
          </button>
        </p>
      </form>
    </div>
  );
}
