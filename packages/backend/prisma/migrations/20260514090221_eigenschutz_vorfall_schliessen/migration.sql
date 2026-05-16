-- AlterTable
ALTER TABLE "eigenschutz_vorfaelle" ADD COLUMN     "geschlossen_am" TIMESTAMP(3),
ADD COLUMN     "geschlossen_von_user_id" TEXT,
ADD COLUMN     "schliessungs_begruendung" VARCHAR(500);

-- CreateIndex
CREATE INDEX "eigenschutz_vorfaelle_einsatz_id_einheit_id_geschlossen_am_idx" ON "eigenschutz_vorfaelle"("einsatz_id", "einheit_id", "geschlossen_am");
