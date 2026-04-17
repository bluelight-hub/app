-- CreateEnum
CREATE TYPE "GefahrenzoneGeometryType" AS ENUM ('POLYGON', 'CIRCLE');

-- CreateTable
CREATE TABLE "gefahrenzonen" (
    "id" TEXT NOT NULL,
    "einsatzId" TEXT NOT NULL,
    "gefahrentyp" "Gefahrentyp" NOT NULL,
    "schutzobjekt" "Schutzobjekt" NOT NULL,
    "geometryType" "GefahrenzoneGeometryType" NOT NULL,
    "geometry" JSONB NOT NULL,
    "bezeichnung" VARCHAR(200),
    "erstelltVon" VARCHAR(100) NOT NULL,
    "aktualisiertVon" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gefahrenzonen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gefahrenzonen_einsatzId_idx" ON "gefahrenzonen"("einsatzId");

-- CreateIndex
CREATE INDEX "gefahrenzonen_einsatzId_gefahrentyp_schutzobjekt_idx" ON "gefahrenzonen"("einsatzId", "gefahrentyp", "schutzobjekt");

-- AddForeignKey
ALTER TABLE "gefahrenzonen" ADD CONSTRAINT "gefahrenzonen_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gefahrenzonen" ADD CONSTRAINT "gefahrenzonen_einsatzId_gefahrentyp_schutzobjekt_fkey" FOREIGN KEY ("einsatzId", "gefahrentyp", "schutzobjekt") REFERENCES "gefahrenmatrix_bewertungen"("einsatzId", "gefahrentyp", "schutzobjekt") ON DELETE RESTRICT ON UPDATE CASCADE;
