import { useEffect, useRef, useState } from 'react';
import { invitesApi } from '../../shared/services/api';
import { getUrlParam, removeUrlParam } from '../../shared/utils/url';
import { reloadTasks } from '../tasks/taskService';
import { refreshBoards } from '../boards/boardService';

// ─── Tipos de invitación por URL ──────────────────────────────────────
// ?invite=TOKEN      → unirse a una TAREA (como asignado o compartido)
// ?boardInvite=TOKEN → unirse a un TABLERO como miembro
export const TASK_INVITE = {
  param: 'invite',
  getInfo: (token) => invitesApi.getInfo(token),
  accept: (token) => invitesApi.accept(token),
  successMessage: (info) => (info ? `🎉 Te uniste a la tarea «${info.taskTitle}»` : '🎉 Te uniste a la tarea'),
  afterAccept: () => reloadTasks().catch(() => {}),
};

export const BOARD_INVITE = {
  param: 'boardInvite',
  getInfo: (token) => invitesApi.getBoardInfo(token),
  accept: (token) => invitesApi.acceptBoard(token),
  successMessage: (info, res) =>
    info ? `🎉 Te uniste al tablero ${info.boardIcon || ''} «${info.boardName}»` : res.message || '🎉 Te uniste al tablero',
  afterAccept: () => {
    refreshBoards();
    reloadTasks().catch(() => {});
  },
};

// ─── useInviteLink ────────────────────────────────────────────────────
// Lee el token de la URL, carga su info pública (para el banner del login)
// y, cuando hay sesión, acepta la invitación una sola vez, refresca los
// datos y deja un mensaje de éxito. Sin sesión, el login/registro muestra
// el banner y la invitación se acepta al entrar.
export default function useInviteLink(config, user) {
  const [token] = useState(() => getUrlParam(config.param));
  const [info, setInfo] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState('');
  const accepted = useRef(false);

  useEffect(() => {
    if (!token) return;
    config.getInfo(token).then(setInfo).catch(() => setInvalid(true));
  }, [config, token]);

  useEffect(() => {
    if (!user || !token || accepted.current) return undefined;
    if (info === null && !invalid) return undefined; // aún cargando la info
    accepted.current = true;
    if (invalid) return undefined;

    let cancelled = false;
    config.accept(token)
      .then((res) => {
        if (cancelled) return;
        setMessage(config.successMessage(info, res));
        config.afterAccept();
        removeUrlParam(config.param);
      })
      .catch(() => { if (!cancelled) setInvalid(true); });
    return () => { cancelled = true; };
  }, [config, user, token, info, invalid]);

  return { token, info, invalid, message, dismiss: () => setMessage('') };
}
