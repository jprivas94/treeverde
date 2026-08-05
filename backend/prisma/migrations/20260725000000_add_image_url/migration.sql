-- Add images column to store task image URLs (array of Cloudinary URLs)
ALTER TABLE "Task" ADD COLUMN "images" JSONB NOT NULL DEFAULT '[]';
