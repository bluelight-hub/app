-- AlterTable
ALTER TABLE "einsatz_fahrzeuge" ADD COLUMN     "einheit_id" TEXT;

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_einheit_id_idx" ON "einsatz_fahrzeuge"("einheit_id");

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_einsatz_id_einheit_id_idx" ON "einsatz_fahrzeuge"("einsatz_id", "einheit_id");

-- AddForeignKey
ALTER TABLE "einsatz_fahrzeuge" ADD CONSTRAINT "einsatz_fahrzeuge_einheit_id_fkey" FOREIGN KEY ("einheit_id") REFERENCES "einsatz_einheiten"("id") ON DELETE SET NULL ON UPDATE CASCADE;
