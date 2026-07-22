import { useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      await login(email, password);
    } catch (err) {
      // Mapear errores del backend a campos específicos
      const msg = err.message;
      if (msg === 'El usuario no existe') {
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

  // Limpiar error del campo al escribir
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
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
        >
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>

        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <button type="button" onClick={onSwitch} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Registrarse
          </button>
        </p>
      </form>
    </div>
  );
}

