-- CreateEnum
CREATE TYPE "BefehlStatus" AS ENUM ('ERTEILT', 'ZUGESTELLT', 'QUITTIERT', 'KORRIGIERT');

-- CreateEnum
CREATE TYPE "QuittierungArt" AS ENUM ('VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN');

-- DropIndex
DROP INDEX "etb_eintraege_active_idx";

-- CreateTable
CREATE TABLE "befehl"
(
    "id"                 TEXT           NOT NULL,
    "nummer"             VARCHAR(255)   NOT NULL,
    "einsatz_id"         TEXT           NOT NULL,
    "auftrag"            TEXT           NOT NULL,
    "befehlsgeber_id"    VARCHAR(100)   NOT NULL,
    "ersteller_id"       VARCHAR(100)   NOT NULL,
    "status"             "BefehlStatus" NOT NULL DEFAULT 'ERTEILT',
    "zeitvorgabe"        TEXT,
    "ereignis"           TEXT,
    "mittel"             TEXT,
    "ziel"               TEXT,
    "weg"                TEXT,
    "original_befehl_id" TEXT,
    "erteilt_am"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "befehl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "befehl_empfaenger"
(
    "id"              TEXT         NOT NULL,
    "befehl_id"       TEXT         NOT NULL,
    "empfaenger_id"   VARCHAR(100) NOT NULL,
    "zugestellt_am"   TIMESTAMP(3),
    "quittiert_am"    TIMESTAMP(3),
    "quittierung_art" "QuittierungArt",
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "befehl_empfaenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "befehl_kommentar"
(
    "id"            TEXT         NOT NULL,
    "befehl_id"     TEXT         NOT NULL,
    "author_id"     VARCHAR(100) NOT NULL,
    "text"          TEXT         NOT NULL,
    "is_rueckfrage" BOOLEAN      NOT NULL DEFAULT false,
    "parent_id"     TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "befehl_kommentar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "befehl_nummer_key" ON "befehl" ("nummer");

-- CreateIndex
CREATE INDEX "befehl_einsatz_id_idx" ON "befehl" ("einsatz_id");

-- CreateIndex
CREATE INDEX "befehl_status_idx" ON "befehl" ("status");

-- CreateIndex
CREATE INDEX "befehl_original_befehl_id_idx" ON "befehl" ("original_befehl_id");

-- CreateIndex
CREATE INDEX "befehl_einsatz_id_status_idx" ON "befehl" ("einsatz_id", "status");

-- CreateIndex
CREATE INDEX "befehl_einsatz_id_created_at_idx" ON "befehl" ("einsatz_id", "created_at");

-- CreateIndex
CREATE INDEX "befehl_empfaenger_befehl_id_idx" ON "befehl_empfaenger" ("befehl_id");

-- CreateIndex
CREATE INDEX "befehl_empfaenger_empfaenger_id_idx" ON "befehl_empfaenger" ("empfaenger_id");

-- CreateIndex
CREATE UNIQUE INDEX "befehl_empfaenger_befehl_id_empfaenger_id_key" ON "befehl_empfaenger" ("befehl_id", "empfaenger_id");

-- CreateIndex
CREATE INDEX "befehl_kommentar_befehl_id_idx" ON "befehl_kommentar" ("befehl_id");

-- CreateIndex
CREATE INDEX "befehl_kommentar_author_id_idx" ON "befehl_kommentar" ("author_id");

-- CreateIndex
CREATE INDEX "befehl_kommentar_parent_id_idx" ON "befehl_kommentar" ("parent_id");

-- AddForeignKey
ALTER TABLE "befehl"
    ADD CONSTRAINT "befehl_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl"
    ADD CONSTRAINT "befehl_befehlsgeber_id_fkey" FOREIGN KEY ("befehlsgeber_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl"
    ADD CONSTRAINT "befehl_ersteller_id_fkey" FOREIGN KEY ("ersteller_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl"
    ADD CONSTRAINT "befehl_original_befehl_id_fkey" FOREIGN KEY ("original_befehl_id") REFERENCES "befehl" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl_empfaenger"
    ADD CONSTRAINT "befehl_empfaenger_befehl_id_fkey" FOREIGN KEY ("befehl_id") REFERENCES "befehl" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl_empfaenger"
    ADD CONSTRAINT "befehl_empfaenger_empfaenger_id_fkey" FOREIGN KEY ("empfaenger_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl_kommentar"
    ADD CONSTRAINT "befehl_kommentar_befehl_id_fkey" FOREIGN KEY ("befehl_id") REFERENCES "befehl" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl_kommentar"
    ADD CONSTRAINT "befehl_kommentar_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehl_kommentar"
    ADD CONSTRAINT "befehl_kommentar_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "befehl_kommentar" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
