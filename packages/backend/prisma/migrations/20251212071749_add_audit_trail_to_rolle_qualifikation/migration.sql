/*
  Warnings:

  - Added the required column `createdBy` to the `rolle_qualifikationen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `rolle_qualifikationen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rolle_qualifikationen" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" VARCHAR(100) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" VARCHAR(100);

-- CreateIndex
CREATE INDEX "rolle_qualifikationen_rolleId_istPflicht_idx" ON "rolle_qualifikationen"("rolleId", "istPflicht");

-- CreateIndex
CREATE INDEX "rolle_qualifikationen_createdBy_idx" ON "rolle_qualifikationen"("createdBy");

-- AddForeignKey
ALTER TABLE "rolle_qualifikationen" ADD CONSTRAINT "rolle_qualifikationen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rolle_qualifikationen" ADD CONSTRAINT "rolle_qualifikationen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
