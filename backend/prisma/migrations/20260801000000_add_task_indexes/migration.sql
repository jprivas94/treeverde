-- Índices para consultas frecuentes
-- GET /api/tasks filtra por OR(creatorId, assigneeId, shares.userId)
-- PostgreSQL NO crea índices automáticos en columnas FK → sequential scans sin esto

CREATE INDEX "Task_creatorId_idx" ON "Task"("creatorId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- Lookups por usuario en TaskShare (shares: { some: { userId } })
CREATE INDEX "TaskShare_userId_idx" ON "TaskShare"("userId");
