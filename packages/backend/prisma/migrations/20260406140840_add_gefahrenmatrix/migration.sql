-- CreateEnum
CREATE TYPE "Gefahrentyp" AS ENUM ('ATEMGIFTE', 'ANGSTREAKTION', 'AUSBREITUNG', 'ATOMARE_STRAHLUNG', 'CHEMISCHE_STOFFE', 'ERKRANKUNG_VERLETZUNG', 'EXPLOSION', 'ELEKTRIZITAET', 'EINSTURZ', 'ABSTURZ', 'BRAND', 'DURCHBRUCH', 'ERTRINKEN');

-- CreateEnum
CREATE TYPE "Schutzobjekt" AS ENUM ('MENSCHEN', 'TIERE', 'UMWELT', 'SACHWERTE', 'EINSATZKRAEFTE');

-- CreateEnum
CREATE TYPE "Warnstufe" AS ENUM ('KEINE', 'NIEDRIG', 'MITTEL', 'HOCH', 'AKUT');

-- CreateTable
CREATE TABLE "gefahrenmatrix_bewertungen" (
    "id" TEXT NOT NULL,
    "einsatzId" TEXT NOT NULL,
    "gefahrentyp" "Gefahrentyp" NOT NULL,
    "schutzobjekt" "Schutzobjekt" NOT NULL,
    "warnstufe" "Warnstufe" NOT NULL DEFAULT 'KEINE',
    "beschreibung" TEXT,
    "gemeldetVon" VARCHAR(255),
    "aktualisiertVon" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gefahrenmatrix_bewertungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gefahrenmatrix_bewertungen_einsatzId_idx" ON "gefahrenmatrix_bewertungen"("einsatzId");

-- CreateIndex
CREATE UNIQUE INDEX "gefahrenmatrix_bewertungen_einsatzId_gefahrentyp_schutzobje_key" ON "gefahrenmatrix_bewertungen"("einsatzId", "gefahrentyp", "schutzobjekt");

-- AddForeignKey
ALTER TABLE "gefahrenmatrix_bewertungen" ADD CONSTRAINT "gefahrenmatrix_bewertungen_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "einsaetze"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
