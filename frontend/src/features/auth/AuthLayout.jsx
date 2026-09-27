// ─── AuthLayout ───────────────────────────────────────────────────────
// Fondo común de las pantallas de autenticación (login, registro,
// recuperación y restablecimiento de contraseña):
//  - Degradado verde bosque animado (no un color plano)
//  - Luces difuminadas que flotan suavemente
//  - Marca Treeverde con el logo de árbol
//  - Pie de página sutil

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 py-10 bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 animate-gradient-pan">
      {/* Luces decorativas difuminadas (fixed: no generan scroll ni recortan el contenido) */}
      <div className="pointer-events-none fixed -top-28 -left-28 w-96 h-96 rounded-full bg-emerald-400/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none fixed -bottom-32 -right-24 w-[26rem] h-[26rem] rounded-full bg-teal-300/25 blur-3xl animate-float-slower" />
      <div
        className="pointer-events-none fixed top-1/4 right-1/5 w-52 h-52 rounded-full bg-green-300/15 blur-2xl animate-float-slow"
        style={{ animationDelay: '3s' }}
      />
      <div className="pointer-events-none fixed bottom-1/4 left-1/6 w-40 h-40 rounded-full bg-emerald-200/10 blur-2xl" />

      {/* Contenido (tarjeta o skeleton) */}
      <div className="relative w-full max-w-md">{children}</div>

      {/* Pie */}
      <p className="relative mt-6 text-xs text-emerald-100/60">
        🌱 Organiza, cultiva y completa tus tareas
      </p>
    </div>
  );
}
