import useKanbanStore from '../../store/kanbanStore';

// Modal de saludo a pantalla completa (bienvenida al entrar / despedida al salir):
// avatar del usuario, título, mensaje y un pie animado.
export default function GreetingModal({ title, avatarGradient, children, footer }) {
  const user = useKanbanStore((s) => s.user);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 mx-4 max-w-sm w-full text-center animate-scale-in">
        <div className={`mx-auto w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4 overflow-hidden`}>
          {user?.profileImage
            ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" loading="lazy" />
            : user?.name?.charAt(0).toUpperCase() || '👤'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title(user?.name || 'Usuario')}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{children}</p>
        {footer}
      </div>
    </div>
  );
}
