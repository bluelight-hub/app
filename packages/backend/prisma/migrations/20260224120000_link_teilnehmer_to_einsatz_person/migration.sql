-- AlterTable: Replace funkrufname with einsatz_person_id FK
ALTER TABLE "einsatz_teilnehmer" DROP COLUMN "funkrufname",
ADD COLUMN     "einsatz_person_id" TEXT NOT NULL;

-- CreateIndex: Eine Person = max ein Bearbeiter pro Einsatz
CREATE UNIQUE INDEX "einsatz_teilnehmer_einsatz_id_einsatz_person_id_key" ON "einsatz_teilnehmer"("einsatz_id", "einsatz_person_id");

-- AddForeignKey
ALTER TABLE "einsatz_teilnehmer" ADD CONSTRAINT "einsatz_teilnehmer_einsatz_person_id_fkey" FOREIGN KEY ("einsatz_person_id") REFERENCES "einsatz_personen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
