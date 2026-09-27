import { useState, useEffect } from 'react';
import useAuth from './useAuth';
import AuthLayout from './AuthLayout';
import { AuthLoading, AuthHeader, AuthField, AuthError, InviteNotice, CARD, PRIMARY_BUTTON } from './AuthParts';

// Mensajes progresivos si el servidor tarda (cold start del backend)
const WAIT_MESSAGES = [
  [3000, 'Conectando con el servidor...'],
  [7000, 'El servidor está tardando en responder. Reintentando...'],
  [14000, 'Verificando conexión con el servidor...'],
];

export default function LoginForm({ onSwitch, onForgotPassword, invite }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [waitingMessage, setWaitingMessage] = useState('');
  const { login, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      setWaitingMessage('');
      return undefined;
    }
    const timers = WAIT_MESSAGES.map(([ms, msg]) => setTimeout(() => setWaitingMessage(msg), ms));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.message;
      if (msg.includes('No se pudo conectar') || msg.includes('servidor')) {
        setErrors({ general: 'No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo (npm run dev en /backend).' });
      } else if (msg === 'Email o contraseña incorrectos') {
        // Mensaje unificado (anti-enumeración): el backend no revela si el email existe
        setErrors({ email: msg, password: msg });
      } else {
        setErrors({ general: msg });
      }
    }
  };

  const field = (name, setter) => ({
    value: name === 'email' ? email : password,
    error: errors[name],
    disabled: loading,
    required: true,
    onChange: (e) => {
      setter(e.target.value);
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    },
  });

  if (loading) {
    return (
      <AuthLayout>
        <AuthLoading>
          {waitingMessage
            ? <p className="text-sm text-amber-100/90 text-center animate-pulse max-w-sm">{waitingMessage}</p>
            : <p className="text-sm text-emerald-100/80">Verificando credenciales...</p>}
        </AuthLoading>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className={`${CARD} p-8 space-y-6`}>
        <AuthHeader
          title="Inicia sesión"
          subtitle={invite ? 'Inicia sesión para unirte a la tarea' : 'Bienvenido de vuelta a tu tablero'}
        />
        <InviteNotice invite={invite} hint="Al iniciar sesión te unirás a la tarea automáticamente." />
        <AuthError>{errors.general}</AuthError>

        <div className="space-y-4">
          <AuthField label="Email" icon="mail" type="email" placeholder="tu@email.com" data-testid="login-email" {...field('email', setEmail)} />
          <AuthField label="Contraseña" icon="lock" type="password" placeholder="••••••" data-testid="login-password" {...field('password', setPassword)} />
        </div>

        <button data-testid="login-submit" type="submit" className={`${PRIMARY_BUTTON} py-2.5`}>
          Iniciar Sesión
        </button>

        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            ¿No tienes cuenta?{' '}
            <button type="button" onClick={onSwitch} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition">
              Registrarse
            </button>
          </p>
          <button type="button" onClick={onForgotPassword} className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
