-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publishAt" TIMESTAMP(3);
