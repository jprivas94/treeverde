-- ─── RLS para Realtime: políticas por userId ─────────────────────────────
-- Endurece el acceso a los canales postgres_changes: aunque un cliente
-- conociera el id de otro usuario, RLS filtra las filas que puede leer
-- según auth.uid() (extraído del JWT acuñado por el backend con
-- SUPABASE_JWT_SECRET).
--
-- Solo se aplica si el schema `auth` existe (proyecto Supabase): en un
-- Postgres local sin Supabase, auth.uid() no existe y estas sentencias
-- se omiten (realtime local sigue funcionando sin RLS).
--
-- Nota: el rol postgres/superuser que usa Prisma (DATABASE_URL) hace
-- BYPASS de RLS, por lo que el backend no se ve afectado.DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    -- ── Habilitar RLS (idempotente) ──
    EXECUTE 'ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "TaskShare" ENABLE ROW LEVEL SECURITY';

    -- ── Notification: cada usuario solo ve las suyas ──
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'Notification' AND policyname = 'notification_select_own'
    ) THEN
      EXECUTE 'CREATE POLICY "notification_select_own" ON "Notification" ' ||
              'FOR SELECT USING ("userId" = auth.uid())';
    END IF;

    -- ── Task: creador, asignado o con una compartición activa ──
    -- Nota: el subquery sobre TaskShare exige que la política de TaskShare
    -- permita leer la fila al mismo usuario (auth.uid()) — patrón estándar de Supabase.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'Task' AND policyname = 'task_select_visible'
    ) THEN
      EXECUTE 'CREATE POLICY "task_select_visible" ON "Task" ' ||
              'FOR SELECT USING (' ||
              '  "creatorId" = auth.uid() OR ' ||
              '  "assigneeId" = auth.uid() OR ' ||
              '  EXISTS (SELECT 1 FROM "TaskShare" ts WHERE ts."taskId" = "Task".id AND ts."userId" = auth.uid())' ||
              ') ';
    END IF;

    -- ── TaskShare: cada usuario solo ve sus comparticiones ──
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'TaskShare' AND policyname = 'task_share_select_own'
    ) THEN
      EXECUTE 'CREATE POLICY "task_share_select_own" ON "TaskShare" ' ||
              'FOR SELECT USING ("userId" = auth.uid())';
    END IF;
  END IF;
END $$;
