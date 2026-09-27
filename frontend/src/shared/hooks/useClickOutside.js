import { useEffect } from 'react';

// Llama a `onOutside` cuando se hace mousedown fuera del elemento `ref`.
// Usado por los menús desplegables (usuario, notificaciones, tableros).
export default function useClickOutside(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside(e);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onOutside, enabled]);
}
