import { useState } from 'react';
import { passwordApi } from '../../shared/services/api';
import AuthLayout from './AuthLayout';
import { AuthLoading, AuthHeader, AuthField, AuthError, CARD, PRIMARY_BUTTON } from './AuthParts';

export default function ResetPasswordForm({ token, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const mismatch = Boolean(confirmPassword) && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden');

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

  if (loading) {
    return (
      <AuthLayout>
        <AuthLoading><p className="text-sm text-emerald-100/80">Actualizando tu contraseña...</p></AuthLoading>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <div className={`${CARD} p-8 space-y-6 text-center`}>
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contraseña actualizada</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Tu contraseña se ha restablecido exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.
          </p>
          <button type="button" onClick={onSuccess} className={`${PRIMARY_BUTTON} py-2.5`}>Ir al inicio de sesión</button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate className={`${CARD} p-8 space-y-6`}>
        <AuthHeader title="Nueva contraseña" subtitle="Ingresa tu nueva contraseña dos veces para confirmar." />
        <AuthError>{error}</AuthError>

        <div className="space-y-4">
          <AuthField
            label="Nueva contraseña" icon="lock" type="password" required minLength={6} placeholder="Mínimo 6 caracteres"
            value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
          />
          <AuthField
            label="Confirmar contraseña" icon="lock" type="password" required placeholder="Repite la contraseña"
            value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            error={mismatch && 'Las contraseñas no coinciden'}
          />
        </div>

        <button type="submit" disabled={mismatch} className={`${PRIMARY_BUTTON} py-2.5`}>Actualizar contraseña</button>
      </form>
    </AuthLayout>
  );
}
