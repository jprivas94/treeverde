// ─── Correo transaccional (Resend) ────────────────────────────────────
// Envía el correo de recuperación de contraseña con un diseño amigable
// (marca Treeverde, botón de acción) y un enlace a la ruta de restablecer
// que comparte el mismo diseño que el login.
//
// Fallback elegante: si no hay RESEND_API_KEY configurada (por ejemplo en
// desarrollo sin cuenta), el correo no se envía y se loguea el enlace; la
// ruta forgot-password sigue devolviendo el enlace en la respuesta en dev.
import { Resend } from 'resend';
import logger from './logger.js';

const EMAIL_FROM = process.env.EMAIL_FROM || 'Treeverde <onboarding@resend.dev>';

// Cliente Resend perezoso: se crea solo si hay API key (leída en cada llamada
// para que los tests puedan cambiarla sin recargar el módulo).
let resend = null;
function getResend() {
  const key = process.env.RESEND_API_KEY || '';
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

// Logo de árbol (SVG inline) — compatible con la mayoría de clientes de correo
function treeLogoSvg() {
  return `
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Treeverde">
      <rect width="24" height="24" rx="6" fill="#059669"/>
      <path d="M12 5.5c1.2 1.6 1.9 3 1.9 4.2 0 .9-.3 1.6-.9 2.1.5.2 1.2.3 2 .1 1.3-.3 2.4-1.2 2.4-2.6 0-1.6-1.5-2.9-3.7-3.8" fill="#6EE7B7"/>
      <path d="M12 5.5c-1.2 1.6-1.9 3-1.9 4.2 0 .9.3 1.6.9 2.1-.5.2-1.2.3-2 .1-1.3-.3-2.4-1.2-2.4-2.6 0-1.6 1.5-2.9 3.7-3.8" fill="#34D399"/>
      <rect x="11" y="15" width="2" height="4" rx="1" fill="#A7F3D0"/>
    </svg>
  `;
}

// ─── Plantilla HTML del correo de recuperación ────────────────────────
// Estilos inline + layout en tablas: compatible con Gmail, Outlook, Apple Mail…
// Escapa caracteres peligrosos a entidades HTML (previene inyección de
// markup en el correo y muestra los nombres tal cual)
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildResetPasswordHtml({ name, resetLink }) {
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(resetLink);
  const expiresNote = 'El enlace es válido por 1 hora.';

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Recupera tu contraseña</title>
</head>
<body style="margin:0; padding:0; background-color:#ECFDF5; font-family:Helvetica, Arial, sans-serif;">
  <center style="width:100%; table-layout:fixed; -webkit-text-size-adjust:100%; background-color:#ECFDF5;">
    <div style="max-width:520px; margin:0 auto; padding:32px 16px;">
      <!-- Tarjeta principal -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 10px 30px rgba(4,120,87,0.12);">
        <!-- Encabezado degradado -->
        <tr>
          <td style="background:linear-gradient(135deg,#065F46 0%,#059669 50%,#0D9488 100%); padding:36px 32px 30px 32px; text-align:center;">
            <div style="margin-bottom:14px;">${treeLogoSvg()}</div>
            <h1 style="margin:0; color:#FFFFFF; font-size:22px; font-weight:700; letter-spacing:0.3px;">Treeverde</h1>
            <p style="margin:6px 0 0 0; color:#A7F3D0; font-size:13px;">Tu tablero kanban personal</p>
          </td>
        </tr>
        <!-- Cuerpo -->
        <tr>
          <td style="padding:32px 32px 28px 32px;">
            <h2 style="margin:0 0 6px 0; color:#0F172A; font-size:18px; font-weight:700;">Hola${safeName ? `, ${safeName}` : ''}! 👋</h2>
            <p style="margin:0 0 16px 0; color:#475569; font-size:14px; line-height:1.6;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.
              Para continuar, haz clic en el botón de abajo:
            </p>

            <!-- Botón de acción (bulletproof) -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
              <tr>
                <td align="center">
                  <a href="${safeLink}" target="_blank"
                     style="display:inline-block; background:linear-gradient(135deg,#059669 0%,#0D9488 100%); color:#FFFFFF; text-decoration:none; font-size:15px; font-weight:700; padding:14px 32px; border-radius:12px; box-shadow:0 4px 14px rgba(5,150,105,0.35);">
                    Restablecer contraseña
                  </a>
                </td>
              </tr>
            </table>

            <!-- Enlace de respaldo -->
            <p style="margin:0 0 16px 0; color:#64748B; font-size:12px; line-height:1.6; word-break:break-all;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
              <a href="${safeLink}" target="_blank" style="color:#059669; text-decoration:underline;">${safeLink}</a>
            </p>

            <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; padding:14px 16px; margin:0 0 20px 0;">
              <p style="margin:0; color:#166534; font-size:13px; line-height:1.6;">
                <strong>⏱️ ${expiresNote}</strong> Si no solicitaste este cambio, puedes ignorar este correo: tu contraseña seguirá igual.
              </p>
            </div>
          </td>
        </tr>
        <!-- Pie -->
        <tr>
          <td style="background:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 32px; text-align:center;">
            <p style="margin:0 0 4px 0; color:#94A3B8; font-size:12px;">🌿 Treeverde — Organiza, cultiva y completa tus tareas</p>
            <p style="margin:0; color:#CBD5E1; font-size:11px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
          </td>
        </tr>
      </table>
    </div>
  </center>
</body>
</html>`;
}

// Texto plano para clientes sin soporte HTML
export function buildResetPasswordText({ name, resetLink }) {
  const safeName = name || '';
  return [
    `Hola${safeName ? `, ${safeName}` : ''}! 👋`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Treeverde.',
    'Para continuar, abre este enlace en tu navegador:',
    '',
    resetLink,
    '',
    'El enlace es válido por 1 hora. Si no solicitaste este cambio, ignora este correo.',
    '',
    '— El equipo de Treeverde 🌿',
  ].join('\n');
}

// ─── Envío del correo ─────────────────────────────────────────────────
// Devuelve { sent: true } si se envió, o { sent: false, resetLink } si no
// hay API key (el llamador decide: loguear el enlace / devolverlo en dev).
export async function sendPasswordResetEmail({ email, name, resetLink }) {
  const client = getResend();
  if (!client) {
    logger.warn('RESEND_API_KEY no configurada — no se envió correo de recuperación', { email });
    return { sent: false, resetLink };
  }

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Recupera tu contraseña — Treeverde',
      html: buildResetPasswordHtml({ name, resetLink }),
      text: buildResetPasswordText({ name, resetLink }),
    });
    if (error) throw error;
    logger.info('Correo de recuperación enviado', { email, id: data?.id });
    return { sent: true, id: data?.id };
  } catch (err) {
    logger.error('Error al enviar correo de recuperación (Resend)', err, { email });
    // Si falla el envío, devolvemos false para que el llamador haga fallback
    return { sent: false, resetLink, error: err.message };
  }
}

