-- AlterTable
ALTER TABLE "erinnerungen" ADD COLUMN     "eskaliert_am" TIMESTAMP(3),
ADD COLUMN     "wurde_eskaliert" BOOLEAN NOT NULL DEFAULT false;
