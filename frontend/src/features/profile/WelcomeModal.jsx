import { useEffect } from 'react';
import useKanbanStore from '../../store/kanbanStore';
import GreetingModal from './GreetingModal';

// Bienvenida tras iniciar sesión; se oculta sola a los 2.5s.
export default function WelcomeModal() {
  const setShowWelcome = useKanbanStore((s) => s.setShowWelcome);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 2500);
    return () => clearTimeout(timer);
  }, [setShowWelcome]);

  return (
    <GreetingModal
      title={(name) => `¡Bienvenido, ${name}! 🎉`}
      avatarGradient="from-emerald-400 to-teal-500"
      footer={
        <>
          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 animate-pulse">Redirigiendo al tablero...</p>
        </>
      }
    >
      Has iniciado sesión correctamente.
      <br />
      Cargando tu tablero de tareas...
    </GreetingModal>
  );
}
