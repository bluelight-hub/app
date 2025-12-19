-- CreateTable
CREATE TABLE "einsatz_personen" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "stamm_id" TEXT,
    "vorname" VARCHAR(100) NOT NULL,
    "nachname" VARCHAR(100) NOT NULL,
    "funkrufname" VARCHAR(50),
    "position" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "einsatz_personen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "einsatz_person_qualifikationen" (
    "id" TEXT NOT NULL,
    "einsatz_person_id" TEXT NOT NULL,
    "qualifikation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "einsatz_person_qualifikationen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_personen_einsatz_id_idx" ON "einsatz_personen"("einsatz_id");

-- CreateIndex
CREATE INDEX "einsatz_personen_stamm_id_idx" ON "einsatz_personen"("stamm_id");

-- CreateIndex
CREATE INDEX "einsatz_personen_einsatz_id_nachname_idx" ON "einsatz_personen"("einsatz_id", "nachname");

-- CreateIndex
CREATE INDEX "einsatz_personen_created_by_idx" ON "einsatz_personen"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_personen_einsatz_id_stamm_id_key" ON "einsatz_personen"("einsatz_id", "stamm_id");

-- CreateIndex
CREATE INDEX "einsatz_person_qualifikationen_einsatz_person_id_idx" ON "einsatz_person_qualifikationen"("einsatz_person_id");

-- CreateIndex
CREATE INDEX "einsatz_person_qualifikationen_qualifikation_id_idx" ON "einsatz_person_qualifikationen"("qualifikation_id");

-- CreateIndex
CREATE INDEX "einsatz_person_qualifikationen_created_by_idx" ON "einsatz_person_qualifikationen"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_person_qualifikationen_einsatz_person_id_qualifikat_key" ON "einsatz_person_qualifikationen"("einsatz_person_id", "qualifikation_id");

-- AddForeignKey
ALTER TABLE "einsatz_personen" ADD CONSTRAINT "einsatz_personen_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_personen" ADD CONSTRAINT "einsatz_personen_stamm_id_fkey" FOREIGN KEY ("stamm_id") REFERENCES "stamm_personen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_personen" ADD CONSTRAINT "einsatz_personen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_personen" ADD CONSTRAINT "einsatz_personen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_person_qualifikationen" ADD CONSTRAINT "einsatz_person_qualifikationen_einsatz_person_id_fkey" FOREIGN KEY ("einsatz_person_id") REFERENCES "einsatz_personen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_person_qualifikationen" ADD CONSTRAINT "einsatz_person_qualifikationen_qualifikation_id_fkey" FOREIGN KEY ("qualifikation_id") REFERENCES "qualifikationen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_person_qualifikationen" ADD CONSTRAINT "einsatz_person_qualifikationen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_person_qualifikationen" ADD CONSTRAINT "einsatz_person_qualifikationen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
