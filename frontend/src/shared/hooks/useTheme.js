import { useState, useCallback, useEffect } from 'react';

// ─── useTheme ─────────────────────────────────────────────────────────
// Modo oscuro de Treeverde.
// - Sigue la preferencia del sistema por defecto (prefers-color-scheme).
// - El toggle manual guarda la preferencia en localStorage ('treeverde-theme').
// - Aplica/quita la clase `dark` en <html> y sincroniza el meta theme-color.
// La clase inicial se aplica ANTES del render vía un script inline en
// index.html (evita el parpadeo claro→oscuro al recargar).

const STORAGE_KEY = 'treeverde-theme';
const LIGHT_META = '#059669';
const DARK_META = '#0b1512';

function getStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSystemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark() {
  const stored = getStored();
  return stored ? stored === 'dark' : getSystemDark();
}

export default function useTheme() {
  const [isDark, setIsDark] = useState(resolveDark);

  // Aplicar la clase al documento y sincronizar el meta theme-color
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? DARK_META : LIGHT_META);
  }, [isDark]);

  // Seguir los cambios del sistema SOLO mientras no haya preferencia manual
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!getStored()) setIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Sincronizar el tema entre pestañas (el evento storage solo llega a otras pestañas)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE_KEY) {
        setIsDark(e.newValue ? e.newValue === 'dark' : getSystemDark());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // almacenamiento no disponible: solo cambio visual
      }
      return next;
    });
  }, []);

  return { isDark, toggle };
}
