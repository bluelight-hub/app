-- AlterTable
ALTER TABLE "befehl"
    ADD COLUMN "anonymisiert_am" TIMESTAMP(3),
    ADD COLUMN "deleted_at"      TIMESTAMP(3),
    ADD COLUMN "deleted_by"      VARCHAR(100),
    ADD COLUMN "is_deleted"      BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "befehl_empfaenger"
    ADD COLUMN "deleted_at" TIMESTAMP(3),
    ADD COLUMN "deleted_by" VARCHAR(100),
    ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "befehl_kommentar"
    ADD COLUMN "deleted_at" TIMESTAMP(3),
    ADD COLUMN "deleted_by" VARCHAR(100),
    ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "aufbewahrungs_konfiguration"
(
    "id"                         TEXT         NOT NULL,
    "aufbewahrungsfrist_jahre"   INTEGER      NOT NULL DEFAULT 10,
    "freigabeperiode_tage"       INTEGER      NOT NULL DEFAULT 30,
    "automatisch_loeschen_aktiv" BOOLEAN      NOT NULL DEFAULT false,
    "updated_by"                 VARCHAR(100),
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aufbewahrungs_konfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_report"
(
    "id"                 TEXT         NOT NULL,
    "einsatz_id"         TEXT         NOT NULL,
    "einsatz_name"       VARCHAR(255),
    "beendet_am"         TIMESTAMP(3),
    "befehl_count"       INTEGER      NOT NULL DEFAULT 0,
    "empfaenger_count"   INTEGER      NOT NULL DEFAULT 0,
    "kommentar_count"    INTEGER      NOT NULL DEFAULT 0,
    "aufbewahrungsfrist" INTEGER      NOT NULL,
    "anonymisiert_am"    TIMESTAMP(3) NOT NULL,
    "report_data"        JSONB,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_compliance_report_einsatz" ON "compliance_report" ("einsatz_id");

-- CreateIndex
CREATE INDEX "idx_compliance_report_anonymisiert" ON "compliance_report" ("anonymisiert_am");

-- CreateIndex
CREATE INDEX "idx_befehl_is_deleted" ON "befehl" ("is_deleted");

-- CreateIndex
CREATE INDEX "idx_befehl_anonymisiert_am" ON "befehl" ("anonymisiert_am");

-- CreateIndex
CREATE INDEX "idx_befehl_empfaenger_is_deleted" ON "befehl_empfaenger" ("is_deleted");

-- CreateIndex
CREATE INDEX "idx_befehl_kommentar_is_deleted" ON "befehl_kommentar" ("is_deleted");

-- AddForeignKey
ALTER TABLE "aufbewahrungs_konfiguration"
    ADD CONSTRAINT "aufbewahrungs_konfiguration_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_report"
    ADD CONSTRAINT "compliance_report_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
