-- AlterTable
ALTER TABLE "einsatz_rollen_besetzung" ADD COLUMN     "freigegeben_am" TIMESTAMP(3),
ADD COLUMN     "freigegeben_von" VARCHAR(100);

-- CreateIndex
CREATE INDEX "einsatz_rollen_besetzung_einsatz_id_freigegeben_am_idx" ON "einsatz_rollen_besetzung"("einsatz_id", "freigegeben_am");
