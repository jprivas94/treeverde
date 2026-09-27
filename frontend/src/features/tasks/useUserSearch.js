import { useCallback, useEffect, useRef, useState } from 'react';
import { usersApi } from '../../shared/services/api';

// ─── useUserSearch ────────────────────────────────────────────────────
// Lista de usuarios para los selectores (asignar / compartir): carga
// inicial + búsqueda server-side. El contador descarta respuestas fuera
// de orden al escribir rápido.
export default function useUserSearch() {
  const [users, setUsers] = useState([]);
  const seq = useRef(0);

  useEffect(() => {
    usersApi.getAll().then(setUsers).catch(() => {});
  }, []);

  const search = useCallback(async (q) => {
    const current = ++seq.current;
    const data = await usersApi.getAll({ search: q }).catch(() => null);
    if (data && current === seq.current) setUsers(data);
  }, []);

  return { users, search };
}
