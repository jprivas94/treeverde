-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "inviteRole" TEXT NOT NULL DEFAULT 'share',
ADD COLUMN     "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_inviteToken_key" ON "Task"("inviteToken");
