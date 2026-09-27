import { useState } from 'react';
import useAuth from './useAuth';
import AuthLayout from './AuthLayout';
import { AuthLoading, AuthHeader, AuthField, AuthError, InviteNotice, CARD, PRIMARY_BUTTON } from './AuthParts';

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'El nombre es requerido';
  if (!email.trim()) errors.email = 'El email es requerido';
  if (!password.trim()) errors.password = 'La contraseña es requerida';
  else if (password.length < 6) errors.password = 'Mínimo 6 caracteres';
  return errors;
}

export default function RegisterForm({ onSwitch, invite }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const { register, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const localErrors = validate(values);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    try {
      await register(values.name, values.email, values.password);
    } catch (err) {
      const msg = err.message;
      if (msg === 'El email ya está registrado') setErrors({ email: msg });
      else if (msg === 'Nombre, email y contraseña son requeridos') setErrors({ name: msg, email: msg, password: msg });
      else setErrors({ general: msg });
    }
  };

  const field = (name) => ({
    value: values[name],
    error: errors[name],
    disabled: loading,
    required: true,
    compact: true,
    onChange: (e) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
  });

  if (loading) {
    return (
      <AuthLayout>
        <AuthLoading><p className="text-sm text-emerald-100/80">Creando tu cuenta...</p></AuthLoading>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate className={`${CARD} p-6 space-y-4`}>
        <AuthHeader compact title="Crear Cuenta" subtitle={invite ? 'Regístrate para unirte a la tarea' : 'Regístrate para empezar'} />
        <InviteNotice invite={invite} />
        <AuthError>{errors.general}</AuthError>

        <div className="space-y-3">
          <AuthField label="Nombre" icon="user" type="text" placeholder="Tu nombre" {...field('name')} />
          <AuthField label="Email" icon="mail" type="email" placeholder="tu@email.com" {...field('email')} />
          <AuthField label="Contraseña" icon="lock" type="password" placeholder="Mínimo 6 caracteres" minLength={6} {...field('password')} />
        </div>

        <button type="submit" className={`${PRIMARY_BUTTON} py-2`}>Crear Cuenta</button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-0.5">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onSwitch} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
            Iniciar Sesión
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
