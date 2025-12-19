-- DropForeignKey
ALTER TABLE "stamm_person_qualifikationen" DROP CONSTRAINT "stamm_person_qualifikationen_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "stamm_person_qualifikationen" DROP CONSTRAINT "stamm_person_qualifikationen_updatedBy_fkey";

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_einsatz_id_fahrzeugtyp_id_idx" ON "einsatz_fahrzeuge"("einsatz_id", "fahrzeugtyp_id");

-- CreateIndex
CREATE INDEX "einsatz_person_qualifikationen_qualifikation_id_einsatz_per_idx" ON "einsatz_person_qualifikationen"("qualifikation_id", "einsatz_person_id");

-- CreateIndex
CREATE INDEX "einsatz_personen_einsatz_id_created_by_idx" ON "einsatz_personen"("einsatz_id", "created_by");

-- AddForeignKey
ALTER TABLE "stamm_person_qualifikationen" ADD CONSTRAINT "stamm_person_qualifikationen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stamm_person_qualifikationen" ADD CONSTRAINT "stamm_person_qualifikationen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
