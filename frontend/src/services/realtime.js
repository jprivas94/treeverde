// Realtime de Supabase — empuja notificaciones y cambios de tareas en vivo.
// Se conecta solo si VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas;
// si no, devuelve un noop (la app sigue funcionando con el polling existente).
import { createClient } from '@supabase/supabase-js';
import useKanbanStore from '../store/kanbanStore.js';
import { tasksApi } from './api.js';

// Guard: import.meta.env no existe fuera de Vite (tests con node:test)
const SUPABASE_URL = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || null;
const SUPABASE_ANON_KEY = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || null;

let channel = null;
let supabase = null;

/** ¿Está configurado el realtime? (env vars de Supabase presentes) */
export function isRealtimeEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * ¿Está realtime realmente activo para la sesión actual?
 * Requiere credenciales Y el supabaseToken del store (sin él, connectRealtime
 * devuelve un noop y no hay canal). Centraliza la condición que usa
 * NotificationPanel para saltarse el polling.
 */
export function isRealtimeActive() {
  const { supabaseToken } = useKanbanStore.getState();
  return isRealtimeEnabled() && Boolean(supabaseToken);
}

/**
 * Conecta el canal Realtime de Supabase para el usuario dado.
 * Requiere el supabaseToken (JWT compatible con Supabase acuñado por el
 * backend) para autenticar la conexión; sin él, RLS no puede evaluar
 * auth.uid() y el canal no recibiría eventos — se degrada al polling.
 * Suscribe a:
 *  - Notification (INSERT filtrado por userId) → notificación inmediata.
 *  - Task (INSERT/UPDATE/DELETE filtrado por creatorId o assigneeId)
 *    → actualización del tablero (upsert / remove).
 * Devuelve una función de limpieza que desconecta el canal.
 */
export function connectRealtime(userId, supabaseToken) {
  if (!isRealtimeEnabled() || !userId || !supabaseToken) return () => {};

  // Idempotente: cerrar un canal previo antes de crear uno nuevo (evita fugas)
  // si el efecto se re-ejecuta o el usuario cambia.
  if (channel && supabase) {
    supabase.removeChannel(channel);
    channel = null;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // Autenticar la conexión Realtime con el JWT compatible con Supabase:
  // las políticas RLS evalúan auth.uid() = userId y filtran por usuario.
  supabase.realtime.setAuth(supabaseToken);

  const handleNotification = (payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      useKanbanStore.getState().addNotification(payload.new);
    }
  };

  const handleTaskChange = (payload) => {
    const id = payload.new?.id || payload.old?.id;
    if (!id) return;

    if (payload.eventType === 'DELETE') {
      useKanbanStore.getState().removeTask(id);
      return;
    }

    // UPDATE de una tarea ya cargada: fusionar el payload preservando
    // las relaciones (assignee/creator) del objeto local.
    const existing =
      useKanbanStore.getState().tasks.find((t) => t.id === id) ||
      useKanbanStore.getState().archivedTasks.find((t) => t.id === id);

    if (existing && payload.eventType === 'UPDATE') {
      useKanbanStore
        .getState()
        .upsertTask({ ...existing, ...payload.new, assignee: existing.assignee, creator: existing.creator });
      return;
    }

    // Tarea nueva o no cargada: traer el detalle completo (con relaciones).
    tasksApi
      .getById(id)
      .then((task) => useKanbanStore.getState().upsertTask(task))
      .catch(() => {
        // Sin permiso o eliminada: sacarla del estado local.
        useKanbanStore.getState().removeTask(id);
      });
  };

  // TaskShare: tarea compartida conmigo (usuario que no es creador ni asignado).
  const handleShareChange = (payload) => {
    const taskId = payload.new?.taskId || payload.old?.taskId;
    if (!taskId) return;

    if (payload.eventType === 'DELETE') {
      // Al quitarse la compartición, verificar si aún tengo acceso
      // (p. ej. también soy asignado): si sí, conservar; si no, quitar.
      tasksApi
        .getById(taskId)
        .then((task) => useKanbanStore.getState().upsertTask(task))
        .catch(() => useKanbanStore.getState().removeTask(taskId));
      return;
    }

    tasksApi
      .getById(taskId)
      .then((task) => useKanbanStore.getState().upsertTask(task))
      .catch(() => {});
  };

  channel = supabase
    .channel(`treeverde-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'TaskShare', filter: `userId=eq.${userId}` },
      handleShareChange
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'TaskShare', filter: `userId=eq.${userId}` },
      handleShareChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'Notification', filter: `userId=eq.${userId}` },
      handleNotification
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'Task', filter: `creatorId=eq.${userId}` },
      handleTaskChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'Task', filter: `creatorId=eq.${userId}` },
      handleTaskChange
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'Task', filter: `creatorId=eq.${userId}` },
      handleTaskChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'Task', filter: `assigneeId=eq.${userId}` },
      handleTaskChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'Task', filter: `assigneeId=eq.${userId}` },
      handleTaskChange
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'Task', filter: `assigneeId=eq.${userId}` },
      handleTaskChange
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info('[Realtime] Canal conectado');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // El polling del NotificationPanel cubre esta degradación silenciosa
        console.warn(`[Realtime] Error al conectar el canal (${status})`);
      }
    });

  return () => {
    if (channel && supabase) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}
