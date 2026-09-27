import { useCallback, useEffect, useRef, useState } from 'react';

const COLUMN_GAP = 16;

// Ancho de una columna + separación (paso del scroll horizontal)
const columnStep = (el) => (el.children[0]?.offsetWidth || 1) + COLUMN_GAP;

// ─── useColumnScroll ──────────────────────────────────────────────────
// Layout de columnas: en móvil detecta la columna visible en el scroll
// horizontal y permite saltar a otra; además mide la altura de la columna
// TODO para que las demás la igualen.
export default function useColumnScroll(columnCount, tasks) {
  const scrollRef = useRef(null);
  const todoColumnRef = useRef(null);
  const [activeColumn, setActiveColumn] = useState(0);
  const [referenceHeight, setReferenceHeight] = useState(null);

  useEffect(() => {
    const el = todoColumnRef.current;
    if (!el) return undefined;
    const updateHeight = () => {
      if (el.offsetHeight > 0) setReferenceHeight(el.offsetHeight);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tasks]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / columnStep(scrollRef.current));
    setActiveColumn(Math.min(idx, columnCount - 1));
  }, [columnCount]);

  const scrollToColumn = useCallback((index) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: index * columnStep(scrollRef.current), behavior: 'smooth' });
    setActiveColumn(index);
  }, []);

  return { scrollRef, todoColumnRef, activeColumn, referenceHeight, handleScroll, scrollToColumn };
}
