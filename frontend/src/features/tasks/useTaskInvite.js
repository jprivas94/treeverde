import { useCallback, useState } from 'react';
import { tasksApi } from '../../shared/services/api';

// ─── useTaskInvite ────────────────────────────────────────────────────
// Genera (o regenera) el enlace de invitación de una tarea.
// role 'assignee' → quien lo acepte queda asignado (creación).
// role 'share'    → quien lo acepte queda como compartido (edición).
export default function useTaskInvite(role) {
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async (taskId) => {
    setGenerating(true);
    try {
      const inv = await tasksApi.getInviteUrl(taskId, role);
      setUrl(inv.inviteUrl);
      return inv.inviteUrl;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [role]);

  return { url, generating, generate };
}
