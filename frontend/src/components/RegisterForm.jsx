import { useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function RegisterForm({ onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading } = useAuth();
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    // Validación local
    const localErrors = {};
    if (!name.trim()) localErrors.name = 'El nombre es requerido';
    if (!email.trim()) localErrors.email = 'El email es requerido';
    if (!password.trim()) localErrors.password = 'La contraseña es requerida';
    else if (password.length < 6) localErrors.password = 'Mínimo 6 caracteres';

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    try {
      await register(name, email, password);
    } catch (err) {
      const msg = err.message;
      if (msg === 'El email ya está registrado') {
        setFieldErrors({ email: msg });
      } else if (msg === 'Nombre, email y contraseña son requeridos') {
        setFieldErrors({ name: msg, email: msg, password: msg });
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

  const clearError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">Regístrate para empezar</p>
        </div>

        {fieldErrors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {fieldErrors.general}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text" required value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }}
              className={inputClass('name')}
              placeholder="Tu nombre"
            />
            {fieldErrors.name && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
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
              type="password" required value={password} onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
              className={inputClass('password')}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
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
          {loading ? 'Registrando...' : 'Crear Cuenta'}
        </button>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onSwitch} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Iniciar Sesión
          </button>
        </p>
      </form>
    </div>
  );
}

