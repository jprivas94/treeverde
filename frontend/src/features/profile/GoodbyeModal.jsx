import GreetingModal from './GreetingModal';

// Despedida al cerrar sesión (el logout real lo dispara quien lo muestra).
export default function GoodbyeModal() {
  return (
    <GreetingModal
      title={(name) => `¡Hasta luego, ${name}! 👋`}
      avatarGradient="from-amber-400 to-orange-500"
      footer={<div className="mt-6 text-4xl animate-pulse">🌿</div>}
    >
      Has cerrado sesión correctamente.
      <br />
      Te esperamos de vuelta pronto.
    </GreetingModal>
  );
}
