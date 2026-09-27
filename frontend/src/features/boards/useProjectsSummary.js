import { useEffect, useState } from 'react';
import { tasksApi } from '../../shared/services/api';

const EMPTY = { total: 0, pending: 0, done: 0, overdue: 0, dueSoon: 0, personal: 0, lastActivity: null };

// Estadísticas de todas las tareas del usuario para el panel de proyectos.
// Se piden al montar el panel (cada vez que se vuelve de un proyecto).
export default function useProjectsSummary() {
  const [summary, setSummary] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;
    tasksApi.getSummary()
      .then((data) => { if (!cancelled) setSummary({ ...EMPTY, ...data }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return summary;
}
