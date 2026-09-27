// ─── AuthSkeleton ─────────────────────────────────────────────────────
// Esqueleto de la tarjeta de autenticación con el mismo lenguaje visual
// que BoardSkeleton (bloques grises pulsantes): se muestra mientras se
// procesa el login/registro, manteniendo el feedback del layout real.

export default function AuthSkeleton() {
  return (
    <div className="w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-6 animate-fade-scale-in">
      {/* Logo + títulos */}
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="mt-4 w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="mt-2 w-48 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Campos */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="w-16 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-11 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="w-24 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-11 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Botón */}
      <div className="h-11 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl animate-pulse" />

      {/* Enlaces */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="w-32 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}
