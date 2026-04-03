-- CreateEnum
CREATE TYPE "EinsatzEinheitTyp" AS ENUM ('TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT');

-- CreateEnum
CREATE TYPE "EinsatzEinheitStatus" AS ENUM ('AUFGESTELLT', 'EINSATZBEREIT', 'IM_EINSATZ', 'IN_RESERVE', 'AUFGELOEST');

-- CreateTable
CREATE TABLE "einsatz_einheiten" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "typ" "EinsatzEinheitTyp" NOT NULL,
    "funktion" VARCHAR(100),
    "status" "EinsatzEinheitStatus" NOT NULL DEFAULT 'AUFGESTELLT',
    "einheitenfuehrer_id" TEXT,
    "soll_staerke" INTEGER NOT NULL DEFAULT 0,
    "auftrag" VARCHAR(500),
    "einsatzort" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "einsatz_einheiten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "einsatz_person_einheiten" (
    "id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "einsatz_person_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "einsatz_person_einheiten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_einheiten_einsatz_id_idx" ON "einsatz_einheiten"("einsatz_id");

-- CreateIndex
CREATE INDEX "einsatz_einheiten_parent_id_idx" ON "einsatz_einheiten"("parent_id");

-- CreateIndex
CREATE INDEX "einsatz_einheiten_einsatz_id_parent_id_idx" ON "einsatz_einheiten"("einsatz_id", "parent_id");

-- CreateIndex
CREATE INDEX "einsatz_einheiten_einsatz_id_status_idx" ON "einsatz_einheiten"("einsatz_id", "status");

-- CreateIndex
CREATE INDEX "einsatz_einheiten_einheitenfuehrer_id_idx" ON "einsatz_einheiten"("einheitenfuehrer_id");

-- CreateIndex
CREATE INDEX "einsatz_einheiten_created_by_idx" ON "einsatz_einheiten"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_einheiten_einsatz_id_name_key" ON "einsatz_einheiten"("einsatz_id", "name");

-- CreateIndex
CREATE INDEX "einsatz_person_einheiten_einheit_id_idx" ON "einsatz_person_einheiten"("einheit_id");

-- CreateIndex
CREATE INDEX "einsatz_person_einheiten_einsatz_person_id_idx" ON "einsatz_person_einheiten"("einsatz_person_id");

-- CreateIndex
CREATE INDEX "einsatz_person_einheiten_created_by_idx" ON "einsatz_person_einheiten"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_person_einheiten_einheit_id_einsatz_person_id_key" ON "einsatz_person_einheiten"("einheit_id", "einsatz_person_id");

-- AddForeignKey
ALTER TABLE "einsatz_einheiten" ADD CONSTRAINT "einsatz_einheiten_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_einheiten" ADD CONSTRAINT "einsatz_einheiten_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "einsatz_einheiten"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_einheiten" ADD CONSTRAINT "einsatz_einheiten_einheitenfuehrer_id_fkey" FOREIGN KEY ("einheitenfuehrer_id") REFERENCES "einsatz_personen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_einheiten" ADD CONSTRAINT "einsatz_einheiten_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_einheiten" ADD CONSTRAINT "einsatz_einheiten_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_person_einheiten" ADD CONSTRAINT "einsatz_person_einheiten_einheit_id_fkey" FOREIGN KEY ("einheit_id") REFERENCES "einsatz_einheiten"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_person_einheiten" ADD CONSTRAINT "einsatz_person_einheiten_einsatz_person_id_fkey" FOREIGN KEY ("einsatz_person_id") REFERENCES "einsatz_personen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_person_einheiten" ADD CONSTRAINT "einsatz_person_einheiten_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_person_einheiten" ADD CONSTRAINT "einsatz_person_einheiten_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
