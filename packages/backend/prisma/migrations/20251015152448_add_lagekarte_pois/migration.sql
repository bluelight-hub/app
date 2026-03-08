-- CreateEnum
CREATE TYPE "poi_type" AS ENUM ('EINSATZORT', 'EINSATZABSCHNITT', 'EINSATZLEITUNG', 'FAHRZEUG', 'EINHEIT', 'GEFAHRENQUELLE', 'SPERRBEREICH', 'VERSORGUNGSPUNKT', 'BEREITSTELLUNGSRAUM', 'BEHANDLUNGSPLATZ', 'SAMMELSTELLE', 'UNTERKUNFT', 'SONSTIGES');

-- CreateTable
CREATE TABLE "lagekarte"
(
    "id"        TEXT         NOT NULL,
    "einsatzId" TEXT         NOT NULL,
    "state"     JSONB        NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lagekarte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lagekarte_poi"
(
    "id"          TEXT             NOT NULL,
    "lagekarteId" TEXT             NOT NULL,
    "type"        "poi_type"       NOT NULL,
    "name"        VARCHAR(255),
    "adresse"     VARCHAR(500),
    "latitude"    DOUBLE PRECISION NOT NULL,
    "longitude"   DOUBLE PRECISION NOT NULL,
    "icon"        VARCHAR(50),
    "metadata"    JSONB,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "lagekarte_poi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lagekarte_einsatzId_key" ON "lagekarte" ("einsatzId");

-- CreateIndex
CREATE INDEX "lagekarte_einsatzId_idx" ON "lagekarte" ("einsatzId");

-- CreateIndex
CREATE INDEX "lagekarte_poi_lagekarteId_idx" ON "lagekarte_poi" ("lagekarteId");

-- CreateIndex
CREATE INDEX "lagekarte_poi_type_idx" ON "lagekarte_poi" ("type");

-- AddForeignKey
ALTER TABLE "lagekarte"
    ADD CONSTRAINT "lagekarte_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "einsaetze" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lagekarte_poi"
    ADD CONSTRAINT "lagekarte_poi_lagekarteId_fkey" FOREIGN KEY ("lagekarteId") REFERENCES "lagekarte" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
