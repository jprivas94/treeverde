-- AlterTable
ALTER TABLE "Board" ADD COLUMN "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Board_inviteToken_key" ON "Board"("inviteToken");
