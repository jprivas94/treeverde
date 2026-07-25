-- Add archivedAt column to track when a task was archived (status = 'ARCHIVED')
ALTER TABLE "Task" ADD COLUMN "archivedAt" DATETIME;
