import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import AuthLayout from './AuthLayout';
import AuthSkeleton from './AuthSkeleton';
import TreeLogo from './TreeLogo';
import TreeSpinner from './TreeSpinner';

export default function RegisterForm({ onSwitch, invite }) {
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
    return `w-full pl-10 pr-4 py-2 border rounded-xl outline-none transition ${
      hasError
        ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : 'border-gray-200 bg-gray-50/60 hover:bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
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
    <AuthLayout>
      {loading ? (
        /* ─── Skeleton estilo board + spinner con logo de árbol ── */
        <div className="flex flex-col items-center gap-6">
          <AuthSkeleton />
          <TreeSpinner size="lg" light />
          <p className="text-sm text-emerald-100/80">Creando tu cuenta...</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} noValidate className="w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-scale-in">
        <div className="text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2">
            <TreeLogo className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {invite ? 'Regístrate para unirte a la tarea' : 'Regístrate para empezar'}
          </p>
        </div>

        {invite && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-0.5">
            <p className="text-xs font-semibold text-emerald-800">📨 Te invitaron a una tarea</p>
            <p className="text-xs text-emerald-700">
              {invite.taskTitle ? <>«{invite.taskTitle}»</> : 'una tarea'}
              {invite.creatorName ? ` · por ${invite.creatorName}` : ''}
            </p>
          </div>
        )}

        {fieldErrors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {fieldErrors.general}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0" />
              </svg>
              <input
                type="text" required value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }}
                className={inputClass('name')}
                placeholder="Tu nombre"
                disabled={loading}
              />
            </div>
            {fieldErrors.name && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <input
                type="email" required value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <input
                type="password" required value={password} onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                className={inputClass('password')}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
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
          type="submit" disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
        >
          Crear Cuenta
        </button>

        <p className="text-center text-sm text-gray-500 pt-0.5">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onSwitch} className="text-emerald-600 hover:text-emerald-700 font-medium">
            Iniciar Sesión
          </button>
        </p>
      </form>
      )}
    </AuthLayout>
  );
}

