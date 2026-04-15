-- CreateTable
CREATE TABLE "hazard_zones" (
    "id" TEXT NOT NULL,
    "einsatzId" TEXT NOT NULL,
    "gefahrentyp" "Gefahrentyp" NOT NULL,
    "geometryType" VARCHAR(20) NOT NULL,
    "geometry" JSONB NOT NULL,
    "radiusMeters" DOUBLE PRECISION,
    "label" VARCHAR(255),
    "beschreibung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "hazard_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hazard_zones_einsatzId_idx" ON "hazard_zones"("einsatzId");

-- CreateIndex
CREATE INDEX "hazard_zones_einsatzId_gefahrentyp_idx" ON "hazard_zones"("einsatzId", "gefahrentyp");

-- AddForeignKey
ALTER TABLE "hazard_zones" ADD CONSTRAINT "hazard_zones_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;
