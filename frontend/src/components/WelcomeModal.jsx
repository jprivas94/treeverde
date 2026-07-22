import useKanbanStore from '../store/kanbanStore';

export default function WelcomeModal() {
  const user = useKanbanStore((s) => s.user);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-10 mx-4 max-w-sm w-full text-center animate-scale-in">
        {/* Avatar */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
          {user?.name?.charAt(0).toUpperCase() || '👤'}
        </div>

        {/* Texto */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {user?.name || 'Usuario'}! 🎉
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Has iniciado sesión correctamente.
          <br />
          Estamos cargando tu tablero de tareas...
        </p>

        {/* Loading dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
