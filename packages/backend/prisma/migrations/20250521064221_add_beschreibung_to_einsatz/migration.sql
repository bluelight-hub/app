/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Einsatz` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Einsatz" ADD COLUMN     "beschreibung" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Einsatz_name_key" ON "Einsatz"("name");
