-- CreateTable
CREATE TABLE "stamm_fahrzeuge" (
    "id" TEXT NOT NULL,
    "rufname" VARCHAR(100) NOT NULL,
    "funkrufname" VARCHAR(50) NOT NULL,
    "fahrzeugtypId" TEXT NOT NULL,
    "kennzeichen" VARCHAR(20),
    "baujahr" INTEGER,
    "funkkenungBOS" VARCHAR(50),
    "archivedAt" TIMESTAMP(3),
    "archivedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "stamm_fahrzeuge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stamm_personen" (
    "id" TEXT NOT NULL,
    "vorname" VARCHAR(100) NOT NULL,
    "nachname" VARCHAR(100) NOT NULL,
    "personalnummer" VARCHAR(50) NOT NULL,
    "funkkenungBOS" VARCHAR(50),
    "archivedAt" TIMESTAMP(3),
    "archivedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "stamm_personen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stamm_person_qualifikationen" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "qualifikationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "stamm_person_qualifikationen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stamm_fahrzeuge_funkrufname_key" ON "stamm_fahrzeuge"("funkrufname");

-- CreateIndex
CREATE INDEX "stamm_fahrzeuge_fahrzeugtypId_idx" ON "stamm_fahrzeuge"("fahrzeugtypId");

-- CreateIndex
CREATE INDEX "stamm_fahrzeuge_archivedAt_idx" ON "stamm_fahrzeuge"("archivedAt");

-- CreateIndex
CREATE INDEX "stamm_fahrzeuge_archivedAt_fahrzeugtypId_idx" ON "stamm_fahrzeuge"("archivedAt", "fahrzeugtypId");

-- CreateIndex
CREATE INDEX "stamm_fahrzeuge_createdBy_idx" ON "stamm_fahrzeuge"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "stamm_personen_personalnummer_key" ON "stamm_personen"("personalnummer");

-- CreateIndex
CREATE INDEX "stamm_personen_archivedAt_idx" ON "stamm_personen"("archivedAt");

-- CreateIndex
CREATE INDEX "stamm_personen_archivedAt_nachname_idx" ON "stamm_personen"("archivedAt", "nachname");

-- CreateIndex
CREATE INDEX "stamm_personen_createdBy_idx" ON "stamm_personen"("createdBy");

-- CreateIndex
CREATE INDEX "stamm_person_qualifikationen_personId_idx" ON "stamm_person_qualifikationen"("personId");

-- CreateIndex
CREATE INDEX "stamm_person_qualifikationen_qualifikationId_idx" ON "stamm_person_qualifikationen"("qualifikationId");

-- CreateIndex
CREATE INDEX "stamm_person_qualifikationen_createdBy_idx" ON "stamm_person_qualifikationen"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "stamm_person_qualifikationen_personId_qualifikationId_key" ON "stamm_person_qualifikationen"("personId", "qualifikationId");

-- CreateIndex
CREATE INDEX "rollen_definitionen_istAktiv_sortOrder_name_idx" ON "rollen_definitionen"("istAktiv", "sortOrder", "name");

-- AddForeignKey
ALTER TABLE "stamm_fahrzeuge" ADD CONSTRAINT "stamm_fahrzeuge_fahrzeugtypId_fkey" FOREIGN KEY ("fahrzeugtypId") REFERENCES "fahrzeugtypen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_fahrzeuge" ADD CONSTRAINT "stamm_fahrzeuge_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_fahrzeuge" ADD CONSTRAINT "stamm_fahrzeuge_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_fahrzeuge" ADD CONSTRAINT "stamm_fahrzeuge_archivedBy_fkey" FOREIGN KEY ("archivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_personen" ADD CONSTRAINT "stamm_personen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_personen" ADD CONSTRAINT "stamm_personen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_personen" ADD CONSTRAINT "stamm_personen_archivedBy_fkey" FOREIGN KEY ("archivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_person_qualifikationen" ADD CONSTRAINT "stamm_person_qualifikationen_personId_fkey" FOREIGN KEY ("personId") REFERENCES "stamm_personen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_person_qualifikationen" ADD CONSTRAINT "stamm_person_qualifikationen_qualifikationId_fkey" FOREIGN KEY ("qualifikationId") REFERENCES "qualifikationen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_person_qualifikationen" ADD CONSTRAINT "stamm_person_qualifikationen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamm_person_qualifikationen" ADD CONSTRAINT "stamm_person_qualifikationen_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
