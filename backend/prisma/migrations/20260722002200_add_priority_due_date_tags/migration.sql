-- AlterTable: prioridad, fecha límite y etiquetas (nativo PostgreSQL,
-- reemplaza el rebuild estilo SQLite que fallaba en transacción)
ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';
