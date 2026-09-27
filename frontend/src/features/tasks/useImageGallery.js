import { useCallback, useMemo, useState } from 'react';
import { getTaskImages } from '../../shared/utils/tasks';

// ─── useImageGallery ──────────────────────────────────────────────────
// Galería navegable con las imágenes de una lista de tareas (tablero e
// historial). `openForTask(task)` abre el visor en la primera imagen de
// esa tarea; `modalProps` se pasa tal cual a <ImageViewModal>.
export default function useImageGallery(tasks) {
  const [index, setIndex] = useState(null);

  const images = useMemo(() => {
    const seen = new Set();
    return tasks
      .filter((t) => !seen.has(t.id) && seen.add(t.id))
      .flatMap((t) => getTaskImages(t).map((url) => ({ imageUrl: url, title: t.title })));
  }, [tasks]);

  const openForTask = useCallback((task) => {
    const first = getTaskImages(task)[0];
    const idx = images.findIndex((img) => img.imageUrl === first);
    if (idx !== -1) setIndex(idx);
  }, [images]);

  return {
    isOpen: index !== null,
    openForTask,
    modalProps: { images, currentIndex: index, onClose: () => setIndex(null), onNavigate: setIndex },
  };
}
