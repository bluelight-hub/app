-- AlterTable
ALTER TABLE "einsatz_personen" ADD COLUMN     "fahrzeug_id" TEXT;

-- CreateIndex
CREATE INDEX "einsatz_personen_fahrzeug_id_idx" ON "einsatz_personen"("fahrzeug_id");

-- AddForeignKey
ALTER TABLE "einsatz_personen" ADD CONSTRAINT "einsatz_personen_fahrzeug_id_fkey" FOREIGN KEY ("fahrzeug_id") REFERENCES "einsatz_fahrzeuge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
