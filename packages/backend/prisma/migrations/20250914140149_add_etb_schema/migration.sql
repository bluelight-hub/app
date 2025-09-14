-- CreateEnum
CREATE TYPE "public"."EtbStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "public"."EtbKategorie" AS ENUM ('ALARMIERUNG', 'ANKUNFT', 'BEFEHL', 'ERKUNDUNG', 'LAGE', 'MASSNAHME', 'PERSONAL', 'FAHRZEUG', 'GERAET', 'KOMMUNIKATION', 'WETTER', 'SONSTIGES', 'SYSTEM');

-- CreateTable
CREATE TABLE "public"."einsatztagebuecher" (
    "id" TEXT NOT NULL,
    "einsatzId" TEXT NOT NULL,
    "status" "public"."EtbStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "lockedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "einsatztagebuecher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."etb_eintraege" (
    "id" TEXT NOT NULL,
    "etbId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequenceNumber" INTEGER NOT NULL,
    "kategorie" "public"."EtbKategorie" NOT NULL,
    "text" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "funkrufname" VARCHAR(100),
    "standort" VARCHAR(255),
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" VARCHAR(100),

    CONSTRAINT "etb_eintraege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."etb_eintrag_historie" (
    "id" TEXT NOT NULL,
    "eintragId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "kategorie" "public"."EtbKategorie" NOT NULL,
    "text" TEXT NOT NULL,
    "funkrufname" VARCHAR(100),
    "standort" VARCHAR(255),
    "metadata" JSONB,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "etb_eintrag_historie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."etb_textbausteine" (
    "id" TEXT NOT NULL,
    "kategorie" "public"."EtbKategorie" NOT NULL,
    "kurztext" VARCHAR(100) NOT NULL,
    "volltext" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "verwendungen" INTEGER NOT NULL DEFAULT 0,
    "letztGenutzt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "etb_textbausteine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."etb_archiv" (
    "id" TEXT NOT NULL,
    "einsatzId" TEXT NOT NULL,
    "etbId" TEXT NOT NULL,
    "archiveDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aufbewahrungBis" TIMESTAMP(3) NOT NULL,
    "etbData" JSONB NOT NULL,
    "eintraegeData" JSONB NOT NULL,
    "historieData" JSONB NOT NULL,
    "dataChecksum" VARCHAR(64) NOT NULL,
    "storagePath" VARCHAR(500),
    "storageType" VARCHAR(50) NOT NULL DEFAULT 'database',
    "alarmstichwort" VARCHAR(255),
    "einsatzort" VARCHAR(500),
    "alarmierungszeit" TIMESTAMP(3),
    "einsatzleiter" VARCHAR(255),
    "anzahlEintraege" INTEGER NOT NULL,
    "archivedBy" VARCHAR(100) NOT NULL,
    "archiveReason" TEXT,

    CONSTRAINT "etb_archiv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "einsatztagebuecher_einsatzId_key" ON "public"."einsatztagebuecher"("einsatzId");

-- CreateIndex
CREATE INDEX "einsatztagebuecher_status_createdAt_idx" ON "public"."einsatztagebuecher"("status", "createdAt");

-- CreateIndex
CREATE INDEX "einsatztagebuecher_createdBy_idx" ON "public"."einsatztagebuecher"("createdBy");

-- CreateIndex
CREATE INDEX "einsatztagebuecher_lockedAt_idx" ON "public"."einsatztagebuecher"("lockedAt");

-- CreateIndex
CREATE INDEX "etb_eintraege_etbId_timestamp_idx" ON "public"."etb_eintraege"("etbId", "timestamp");

-- CreateIndex
CREATE INDEX "etb_eintraege_etbId_kategorie_idx" ON "public"."etb_eintraege"("etbId", "kategorie");

-- CreateIndex
CREATE INDEX "etb_eintraege_createdBy_idx" ON "public"."etb_eintraege"("createdBy");

-- CreateIndex
CREATE INDEX "etb_eintraege_deletedAt_idx" ON "public"."etb_eintraege"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "etb_eintraege_etbId_sequenceNumber_key" ON "public"."etb_eintraege"("etbId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "etb_eintrag_historie_eintragId_changedAt_idx" ON "public"."etb_eintrag_historie"("eintragId", "changedAt");

-- CreateIndex
CREATE INDEX "etb_eintrag_historie_changedBy_idx" ON "public"."etb_eintrag_historie"("changedBy");

-- CreateIndex
CREATE UNIQUE INDEX "etb_eintrag_historie_eintragId_version_key" ON "public"."etb_eintrag_historie"("eintragId", "version");

-- CreateIndex
CREATE INDEX "etb_textbausteine_kategorie_isActive_sortOrder_idx" ON "public"."etb_textbausteine"("kategorie", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "etb_textbausteine_createdBy_idx" ON "public"."etb_textbausteine"("createdBy");

-- CreateIndex
CREATE INDEX "etb_archiv_einsatzId_idx" ON "public"."etb_archiv"("einsatzId");

-- CreateIndex
CREATE INDEX "etb_archiv_etbId_idx" ON "public"."etb_archiv"("etbId");

-- CreateIndex
CREATE INDEX "etb_archiv_archiveDatum_idx" ON "public"."etb_archiv"("archiveDatum");

-- CreateIndex
CREATE INDEX "etb_archiv_aufbewahrungBis_idx" ON "public"."etb_archiv"("aufbewahrungBis");

-- CreateIndex
CREATE INDEX "etb_archiv_archivedBy_idx" ON "public"."etb_archiv"("archivedBy");

-- AddForeignKey
ALTER TABLE "public"."einsatztagebuecher" ADD CONSTRAINT "einsatztagebuecher_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "public"."einsaetze"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."einsatztagebuecher" ADD CONSTRAINT "einsatztagebuecher_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."einsatztagebuecher" ADD CONSTRAINT "einsatztagebuecher_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."einsatztagebuecher" ADD CONSTRAINT "einsatztagebuecher_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_eintraege" ADD CONSTRAINT "etb_eintraege_etbId_fkey" FOREIGN KEY ("etbId") REFERENCES "public"."einsatztagebuecher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_eintraege" ADD CONSTRAINT "etb_eintraege_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_eintraege" ADD CONSTRAINT "etb_eintraege_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_eintraege" ADD CONSTRAINT "etb_eintraege_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_eintrag_historie" ADD CONSTRAINT "etb_eintrag_historie_eintragId_fkey" FOREIGN KEY ("eintragId") REFERENCES "public"."etb_eintraege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_eintrag_historie" ADD CONSTRAINT "etb_eintrag_historie_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_textbausteine" ADD CONSTRAINT "etb_textbausteine_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_textbausteine" ADD CONSTRAINT "etb_textbausteine_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."etb_archiv" ADD CONSTRAINT "etb_archiv_archivedBy_fkey" FOREIGN KEY ("archivedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
