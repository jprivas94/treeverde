-- AlterTable: creador de la tarea (nativo PostgreSQL)
ALTER TABLE "Task" ADD COLUMN "creatorId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
