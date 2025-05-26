/*
  Warnings:

  - You are about to alter the column `name` on the `Einsatz` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `dateiname` on the `EtbAttachment` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `dateityp` on the `EtbAttachment` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `speicherOrt` on the `EtbAttachment` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `autorId` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `autorName` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `autorRolle` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `referenzPatientId` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `referenzEinsatzmittelId` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `systemQuelle` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `abgeschlossenVon` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ueberschriebenVon` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `sender` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `receiver` on the `EtbEntry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[referenzEinsatzId,laufendeNummer]` on the table `EtbEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "EtbAttachment" DROP CONSTRAINT "EtbAttachment_etbEntryId_fkey";

-- DropForeignKey
ALTER TABLE "EtbEntry" DROP CONSTRAINT "EtbEntry_referenzEinsatzId_fkey";

-- AlterTable
ALTER TABLE "Einsatz" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "EtbAttachment" ALTER COLUMN "dateiname" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "dateityp" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "speicherOrt" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "EtbEntry" ALTER COLUMN "autorId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "autorName" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "autorRolle" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "referenzPatientId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "referenzEinsatzmittelId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "systemQuelle" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "abgeschlossenVon" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ueberschriebenVon" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "sender" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "receiver" SET DATA TYPE VARCHAR(255);

-- CreateIndex
CREATE INDEX "idx_einsatz_created_at" ON "Einsatz"("createdAt");

-- CreateIndex
CREATE INDEX "idx_einsatz_name_created_at" ON "Einsatz"("name", "createdAt");

-- CreateIndex
CREATE INDEX "idx_etb_attachment_entry_id" ON "EtbAttachment"("etbEntryId");

-- CreateIndex
CREATE INDEX "idx_etb_attachment_dateityp" ON "EtbAttachment"("dateityp");

-- CreateIndex
CREATE INDEX "idx_etb_entry_einsatz_timestamp" ON "EtbEntry"("referenzEinsatzId", "timestampErstellung");

-- CreateIndex
CREATE INDEX "idx_etb_entry_kategorie_status" ON "EtbEntry"("kategorie", "status");

-- CreateIndex
CREATE INDEX "idx_etb_entry_autor_timestamp" ON "EtbEntry"("autorId", "timestampErstellung");

-- CreateIndex
CREATE INDEX "idx_etb_entry_ereignis_timestamp" ON "EtbEntry"("timestampEreignis");

-- CreateIndex
CREATE UNIQUE INDEX "uk_etb_entry_einsatz_laufende_nummer" ON "EtbEntry"("referenzEinsatzId", "laufendeNummer");

-- AddForeignKey
ALTER TABLE "EtbEntry" ADD CONSTRAINT "EtbEntry_referenzEinsatzId_fkey" FOREIGN KEY ("referenzEinsatzId") REFERENCES "Einsatz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtbAttachment" ADD CONSTRAINT "EtbAttachment_etbEntryId_fkey" FOREIGN KEY ("etbEntryId") REFERENCES "EtbEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
