/*
  Warnings:

  - You are about to drop the column `funkrufname` on the `etb_eintraege` table. All the data in the column will be lost.
  - You are about to drop the column `funkrufname` on the `etb_eintrag_historie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "etb_eintraege" DROP COLUMN "funkrufname",
ADD COLUMN     "absender" VARCHAR(100),
ADD COLUMN     "empfaenger" VARCHAR(100);

-- AlterTable
ALTER TABLE "etb_eintrag_historie" DROP COLUMN "funkrufname",
ADD COLUMN     "absender" VARCHAR(100),
ADD COLUMN     "empfaenger" VARCHAR(100);

-- CreateTable
CREATE TABLE "einsatz_teilnehmer" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "funkrufname" VARCHAR(100) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "einsatz_teilnehmer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_teilnehmer_einsatz_id_idx" ON "einsatz_teilnehmer"("einsatz_id");

-- CreateIndex
CREATE INDEX "einsatz_teilnehmer_user_id_idx" ON "einsatz_teilnehmer"("user_id");

-- CreateIndex
CREATE INDEX "einsatz_teilnehmer_einsatz_id_left_at_idx" ON "einsatz_teilnehmer"("einsatz_id", "left_at");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_teilnehmer_einsatz_id_user_id_key" ON "einsatz_teilnehmer"("einsatz_id", "user_id");

-- AddForeignKey
ALTER TABLE "einsatz_teilnehmer" ADD CONSTRAINT "einsatz_teilnehmer_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_teilnehmer" ADD CONSTRAINT "einsatz_teilnehmer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
