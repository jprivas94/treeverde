import useKanbanStore from '../store/kanbanStore';

export default function GoodbyeModal() {
  const user = useKanbanStore((s) => s.user);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-10 mx-4 max-w-sm w-full text-center animate-scale-in">
        {/* Avatar */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
          {user?.name?.charAt(0).toUpperCase() || '👤'}
        </div>

        {/* Texto */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Hasta luego, {user?.name || 'Usuario'}! 👋
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Has cerrado sesión correctamente.
          <br />
          Te esperamos de vuelta pronto.
        </p>

        {/* Goodbye icon */}
        <div className="mt-6 text-4xl animate-pulse">
          🌿
        </div>
      </div>
    </div>
  );
}
