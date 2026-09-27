import { useEffect } from 'react';

// Ejecuta `onEscape` al pulsar ESC mientras `enabled` sea true.
// Reemplaza el mismo useEffect que estaba copiado en ~10 modales.
export default function useEscapeKey(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}
