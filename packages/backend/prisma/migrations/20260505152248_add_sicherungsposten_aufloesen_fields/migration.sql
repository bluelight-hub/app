-- AlterTable
ALTER TABLE "sicherungsposten" ADD COLUMN     "aufgeloest_am" TIMESTAMP(3),
ADD COLUMN     "aufgeloest_von_user_id" VARCHAR(30),
ADD COLUMN     "aufloese_begruendung" VARCHAR(2000);

-- CreateIndex
CREATE INDEX "sicherungsposten_einsatz_id_aufgeloest_am_idx" ON "sicherungsposten"("einsatz_id", "aufgeloest_am");
