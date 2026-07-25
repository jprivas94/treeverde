-- Add imageUrl column to store task image URL from Cloudflare R2
ALTER TABLE "Task" ADD COLUMN "imageUrl" TEXT;
