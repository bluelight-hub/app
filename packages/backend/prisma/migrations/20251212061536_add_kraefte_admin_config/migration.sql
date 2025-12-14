-- CreateEnum
CREATE TYPE "QualifikationKategorie" AS ENUM ('FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "FahrzeugtypKategorie" AS ENUM ('RETTUNGSDIENST', 'FUEHRUNG', 'TRANSPORT', 'SONSTIGES');

-- CreateTable
CREATE TABLE "qualifikationen" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "abkuerzung" VARCHAR(20) NOT NULL,
    "kategorie" "QualifikationKategorie" NOT NULL,
    "beschreibung" TEXT,
    "istAktiv" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "qualifikationen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fahrzeugtypen" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "bezeichnung" VARCHAR(100) NOT NULL,
    "kategorie" "FahrzeugtypKategorie" NOT NULL,
    "sollbesatzung" JSONB,
    "beschreibung" TEXT,
    "istAktiv" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "fahrzeugtypen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rollen_definitionen" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "funkrufname" VARCHAR(50),
    "beschreibung" TEXT,
    "istAktiv" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "rollen_definitionen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rolle_qualifikationen" (
    "id" TEXT NOT NULL,
    "rolleId" TEXT NOT NULL,
    "qualifikationId" TEXT NOT NULL,
    "istPflicht" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rolle_qualifikationen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funk_status_config" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "standardLabel" VARCHAR(100) NOT NULL,
    "customLabel" VARCHAR(100),
    "farbe" VARCHAR(7),
    "istAlarmierbar" BOOLEAN NOT NULL DEFAULT false,
    "beschreibung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "funk_status_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qualifikationen_abkuerzung_key" ON "qualifikationen"("abkuerzung");

-- CreateIndex
CREATE INDEX "qualifikationen_kategorie_istAktiv_idx" ON "qualifikationen"("kategorie", "istAktiv");

-- CreateIndex
CREATE INDEX "qualifikationen_createdBy_idx" ON "qualifikationen"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "fahrzeugtypen_code_key" ON "fahrzeugtypen"("code");

-- CreateIndex
CREATE INDEX "fahrzeugtypen_kategorie_istAktiv_idx" ON "fahrzeugtypen"("kategorie", "istAktiv");

-- CreateIndex
CREATE INDEX "fahrzeugtypen_createdBy_idx" ON "fahrzeugtypen"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "rollen_definitionen_name_key" ON "rollen_definitionen"("name");

-- CreateIndex
CREATE INDEX "rollen_definitionen_istAktiv_idx" ON "rollen_definitionen"("istAktiv");

-- CreateIndex
CREATE INDEX "rollen_definitionen_createdBy_idx" ON "rollen_definitionen"("createdBy");

-- CreateIndex
CREATE INDEX "rolle_qualifikationen_rolleId_idx" ON "rolle_qualifikationen"("rolleId");

-- CreateIndex
CREATE INDEX "rolle_qualifikationen_qualifikationId_idx" ON "rolle_qualifikationen"("qualifikationId");

-- CreateIndex
CREATE UNIQUE INDEX "rolle_qualifikationen_rolleId_qualifikationId_key" ON "rolle_qualifikationen"("rolleId", "qualifikationId");

-- CreateIndex
CREATE UNIQUE INDEX "funk_status_config_code_key" ON "funk_status_config"("code");

-- CreateIndex
CREATE INDEX "funk_status_config_code_idx" ON "funk_status_config"("code");

-- CreateIndex
CREATE INDEX "funk_status_config_createdBy_idx" ON "funk_status_config"("createdBy");

-- AddForeignKey
ALTER TABLE "qualifikationen" ADD CONSTRAINT "qualifikationen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifikationen" ADD CONSTRAINT "qualifikationen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fahrzeugtypen" ADD CONSTRAINT "fahrzeugtypen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fahrzeugtypen" ADD CONSTRAINT "fahrzeugtypen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollen_definitionen" ADD CONSTRAINT "rollen_definitionen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollen_definitionen" ADD CONSTRAINT "rollen_definitionen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rolle_qualifikationen" ADD CONSTRAINT "rolle_qualifikationen_rolleId_fkey" FOREIGN KEY ("rolleId") REFERENCES "rollen_definitionen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rolle_qualifikationen" ADD CONSTRAINT "rolle_qualifikationen_qualifikationId_fkey" FOREIGN KEY ("qualifikationId") REFERENCES "qualifikationen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funk_status_config" ADD CONSTRAINT "funk_status_config_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funk_status_config" ADD CONSTRAINT "funk_status_config_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
