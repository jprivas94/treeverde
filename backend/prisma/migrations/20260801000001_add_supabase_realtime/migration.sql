-- ─── Realtime de Supabase: notificaciones y tareas en vivo ──────────────
-- Habilita la publicación `supabase_realtime` para las tablas Notification, Task y TaskShare,
-- de modo que el frontend reciba eventos postgres_changes (INSERT/UPDATE/DELETE).
-- Idempotente: si la publicación no existe (Postgres local sin Supabase) no falla,
-- y si una tabla ya es miembro, no se vuelve a añadir.

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['Notification', 'Task', 'TaskShare'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        -- %I cita el identificador por sí mismo (p. ej. "Task") y evita inyección SQL
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- REPLICA IDENTITY FULL en Task y TaskShare: necesario para que los eventos DELETE
-- incluyan la fila completa y los filtros del cliente (creatorId/assigneeId/userId)
-- puedan aplicarse también sobre eliminaciones.
ALTER TABLE "Task" REPLICA IDENTITY FULL;
ALTER TABLE "TaskShare" REPLICA IDENTITY FULL;
