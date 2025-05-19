-- CreateEnum
CREATE TYPE "EtbKategorie" AS ENUM ('LAGEMELDUNG', 'MELDUNG', 'ANFORDERUNG', 'KORREKTUR', 'AUTO_KRAEFTE', 'AUTO_PATIENTEN', 'AUTO_TECHNISCH', 'AUTO_SONSTIGES');

-- CreateEnum
CREATE TYPE "EtbEntryStatus" AS ENUM ('AKTIV', 'UEBERSCHRIEBEN');

-- CreateTable
CREATE TABLE "EtbEntry" (
    "id" TEXT NOT NULL,
    "laufendeNummer" INTEGER NOT NULL,
    "timestampErstellung" TIMESTAMP(3) NOT NULL,
    "timestampEreignis" TIMESTAMP(3) NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorName" TEXT,
    "autorRolle" TEXT,
    "kategorie" "EtbKategorie" NOT NULL,
    "inhalt" TEXT NOT NULL,
    "referenzEinsatzId" TEXT,
    "referenzPatientId" TEXT,
    "referenzEinsatzmittelId" TEXT,
    "systemQuelle" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "EtbEntryStatus" NOT NULL DEFAULT 'AKTIV',
    "istAbgeschlossen" BOOLEAN NOT NULL DEFAULT false,
    "timestampAbschluss" TIMESTAMP(3),
    "abgeschlossenVon" TEXT,
    "ueberschriebenDurchId" TEXT,
    "timestampUeberschrieben" TIMESTAMP(3),
    "ueberschriebenVon" TEXT,
    "sender" TEXT,
    "receiver" TEXT,

    CONSTRAINT "EtbEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtbAttachment" (
    "id" TEXT NOT NULL,
    "etbEntryId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "dateityp" TEXT NOT NULL,
    "speicherOrt" TEXT NOT NULL,
    "beschreibung" TEXT,

    CONSTRAINT "EtbAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EtbEntry" ADD CONSTRAINT "EtbEntry_ueberschriebenDurchId_fkey" FOREIGN KEY ("ueberschriebenDurchId") REFERENCES "EtbEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtbAttachment" ADD CONSTRAINT "EtbAttachment_etbEntryId_fkey" FOREIGN KEY ("etbEntryId") REFERENCES "EtbEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
