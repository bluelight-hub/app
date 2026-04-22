-- CreateEnum
CREATE TYPE "PsaProfil" AS ENUM ('BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ');

-- CreateEnum
CREATE TYPE "Eintrittswahrscheinlichkeit" AS ENUM ('SELTEN', 'GELEGENTLICH', 'HAEUFIG', 'OFT', 'STAENDIG');

-- CreateEnum
CREATE TYPE "Schadensausmass" AS ENUM ('VERNACHLAESSIGBAR', 'GERING', 'MITTEL', 'HOCH', 'KATASTROPHAL');

-- CreateEnum
CREATE TYPE "Risikoklasse" AS ENUM ('GRUEN', 'GELB', 'ORANGE', 'ROT');

-- CreateEnum
CREATE TYPE "Ampelstatus" AS ENUM ('GRUEN', 'GELB', 'ROT');

-- CreateEnum
CREATE TYPE "SyncConflictEntityType" AS ENUM ('GEFAEHRDUNGSBEURTEILUNG_ITEM', 'PSA_PROFIL_ZUWEISUNG');

-- CreateEnum
CREATE TYPE "SyncConflictResolution" AS ENUM ('SERVER_WINS', 'LOCAL_WINS', 'MERGED');

-- CreateTable
CREATE TABLE "gefaehrdungsbeurteilungen" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "gefahrenzone_id" TEXT,
    "vorlage_id" TEXT,
    "items" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erstellt_von_user_id" TEXT NOT NULL,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,
    "aktualisiert_von_user_id" TEXT NOT NULL,

    CONSTRAINT "gefaehrdungsbeurteilungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gefaehrdungsbeurteilung_versionen" (
    "id" TEXT NOT NULL,
    "gef_beurteilung_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "changed_fields" JSONB NOT NULL,
    "gueltig_von" TIMESTAMP(3) NOT NULL,
    "gueltig_bis" TIMESTAMP(3),
    "changed_by_user_id" TEXT NOT NULL,
    "begruendung" VARCHAR(500),
    "event_id" TEXT,

    CONSTRAINT "gefaehrdungsbeurteilung_versionen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gefaehrdungsbeurteilung_vorlagen" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "szenario" VARCHAR(80) NOT NULL,
    "items" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erstellt_von_user_id" TEXT,

    CONSTRAINT "gefaehrdungsbeurteilung_vorlagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psa_profil_zuweisungen" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "profil" "PsaProfil" NOT NULL,
    "gueltig_von" TIMESTAMP(3) NOT NULL,
    "gueltig_bis" TIMESTAMP(3),
    "aktiviert_von_user_id" TEXT NOT NULL,
    "begruendung" VARCHAR(500) NOT NULL,
    "propagation_group_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "psa_profil_zuweisungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psa_profil_quittungen" (
    "id" TEXT NOT NULL,
    "propagation_group_id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "quittiert_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quittiert_von_user_id" TEXT NOT NULL,
    "luecke_gemeldet" BOOLEAN NOT NULL DEFAULT false,
    "luecke_notiz" VARCHAR(1000),

    CONSTRAINT "psa_profil_quittungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sicherheitsregeln" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT,
    "titel" VARCHAR(200) NOT NULL,
    "inhalt" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erstellt_von_user_id" TEXT NOT NULL,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,
    "aktualisiert_von_user_id" TEXT NOT NULL,

    CONSTRAINT "sicherheitsregeln_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sicherheitsregel_versionen" (
    "id" TEXT NOT NULL,
    "regel_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "titel" VARCHAR(200) NOT NULL,
    "inhalt" TEXT NOT NULL,
    "gueltig_von" TIMESTAMP(3) NOT NULL,
    "gueltig_bis" TIMESTAMP(3),
    "changed_by_user_id" TEXT NOT NULL,
    "event_id" TEXT,

    CONSTRAINT "sicherheitsregel_versionen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sicherheitsregel_quittungen" (
    "id" TEXT NOT NULL,
    "regel_id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "quittiert_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quittiert_von_user_id" TEXT NOT NULL,

    CONSTRAINT "sicherheitsregel_quittungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sicherungsposten" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT,
    "bezeichnung" VARCHAR(200) NOT NULL,
    "standort" JSONB NOT NULL,
    "zustaendigkeitsbereich" TEXT,
    "personal" JSONB NOT NULL,
    "abloesezeiten" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erstellt_von_user_id" TEXT NOT NULL,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,
    "aktualisiert_von_user_id" TEXT NOT NULL,
    "geloescht" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sicherungsposten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sicherungsposten_versionen" (
    "id" TEXT NOT NULL,
    "posten_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "gueltig_von" TIMESTAMP(3) NOT NULL,
    "gueltig_bis" TIMESTAMP(3),
    "changed_by_user_id" TEXT NOT NULL,
    "event_id" TEXT,

    CONSTRAINT "sicherungsposten_versionen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eigenschutz_vorfaelle" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "vorfall_zeit" TIMESTAMP(3) NOT NULL,
    "was" TEXT NOT NULL,
    "wann" TIMESTAMP(3) NOT NULL,
    "wo" VARCHAR(500) NOT NULL,
    "beteiligte" JSONB NOT NULL,
    "massnahmen" TEXT NOT NULL,
    "unfallkasse_relevant" BOOLEAN NOT NULL DEFAULT false,
    "kontext_snapshot" JSONB NOT NULL,
    "gef_beurteilung_version_id" TEXT,
    "erfasst_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erfasst_von_user_id" TEXT NOT NULL,

    CONSTRAINT "eigenschutz_vorfaelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eigenschutz_telemetry_events" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" VARCHAR(80) NOT NULL,
    "event_name" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "client_time" TIMESTAMP(3) NOT NULL,
    "server_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eigenschutz_telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ampel_projections" (
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT NOT NULL,
    "status" "Ampelstatus" NOT NULL,
    "aktive_psa_profile" "PsaProfil"[],
    "offene_gefaehrdungen_hoch" INTEGER NOT NULL,
    "ausstehende_psa_quittungen" INTEGER NOT NULL,
    "ausstehende_regel_quittungen" INTEGER NOT NULL,
    "offene_vorfaelle" INTEGER NOT NULL,
    "ungeloeste_rueckmeldungen" INTEGER NOT NULL,
    "letzte_aenderung_am" TIMESTAMP(3) NOT NULL,
    "letzte_aenderung_von_user_id" TEXT,

    CONSTRAINT "ampel_projections_pkey" PRIMARY KEY ("einsatz_id","einheit_id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "einheit_id" TEXT,
    "entity_type" "SyncConflictEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field_path" VARCHAR(200) NOT NULL,
    "local_payload" JSONB NOT NULL,
    "server_version" INTEGER NOT NULL,
    "local_expected_version" INTEGER NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reported_by_user_id" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "resolution" "SyncConflictResolution",

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gefaehrdungsbeurteilungen_einsatz_id_idx" ON "gefaehrdungsbeurteilungen"("einsatz_id");

-- CreateIndex
CREATE UNIQUE INDEX "gefaehrdungsbeurteilungen_einsatz_id_einheit_id_key" ON "gefaehrdungsbeurteilungen"("einsatz_id", "einheit_id");

-- CreateIndex
CREATE UNIQUE INDEX "gefaehrdungsbeurteilung_versionen_event_id_key" ON "gefaehrdungsbeurteilung_versionen"("event_id");

-- CreateIndex
CREATE INDEX "gefaehrdungsbeurteilung_versionen_gef_beurteilung_id_guelti_idx" ON "gefaehrdungsbeurteilung_versionen"("gef_beurteilung_id", "gueltig_von");

-- CreateIndex
CREATE UNIQUE INDEX "gefaehrdungsbeurteilung_versionen_gef_beurteilung_id_versio_key" ON "gefaehrdungsbeurteilung_versionen"("gef_beurteilung_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "gefaehrdungsbeurteilung_vorlagen_slug_key" ON "gefaehrdungsbeurteilung_vorlagen"("slug");

-- CreateIndex
CREATE INDEX "psa_profil_zuweisungen_einsatz_id_einheit_id_gueltig_bis_idx" ON "psa_profil_zuweisungen"("einsatz_id", "einheit_id", "gueltig_bis");

-- CreateIndex
CREATE INDEX "psa_profil_zuweisungen_propagation_group_id_idx" ON "psa_profil_zuweisungen"("propagation_group_id");

-- CreateIndex
CREATE INDEX "psa_profil_quittungen_einsatz_id_einheit_id_idx" ON "psa_profil_quittungen"("einsatz_id", "einheit_id");

-- CreateIndex
CREATE UNIQUE INDEX "psa_profil_quittungen_propagation_group_id_einheit_id_key" ON "psa_profil_quittungen"("propagation_group_id", "einheit_id");

-- CreateIndex
CREATE INDEX "sicherheitsregeln_einsatz_id_idx" ON "sicherheitsregeln"("einsatz_id");

-- CreateIndex
CREATE UNIQUE INDEX "sicherheitsregel_versionen_event_id_key" ON "sicherheitsregel_versionen"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "sicherheitsregel_versionen_regel_id_version_key" ON "sicherheitsregel_versionen"("regel_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "sicherheitsregel_quittungen_regel_id_einheit_id_key" ON "sicherheitsregel_quittungen"("regel_id", "einheit_id");

-- CreateIndex
CREATE INDEX "sicherungsposten_einsatz_id_idx" ON "sicherungsposten"("einsatz_id");

-- CreateIndex
CREATE UNIQUE INDEX "sicherungsposten_versionen_event_id_key" ON "sicherungsposten_versionen"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "sicherungsposten_versionen_posten_id_version_key" ON "sicherungsposten_versionen"("posten_id", "version");

-- CreateIndex
CREATE INDEX "eigenschutz_vorfaelle_einsatz_id_einheit_id_idx" ON "eigenschutz_vorfaelle"("einsatz_id", "einheit_id");

-- CreateIndex
CREATE INDEX "eigenschutz_vorfaelle_einsatz_id_unfallkasse_relevant_idx" ON "eigenschutz_vorfaelle"("einsatz_id", "unfallkasse_relevant");

-- CreateIndex
CREATE INDEX "eigenschutz_vorfaelle_vorfall_zeit_idx" ON "eigenschutz_vorfaelle"("vorfall_zeit");

-- CreateIndex
CREATE INDEX "eigenschutz_telemetry_events_einsatz_id_event_name_idx" ON "eigenschutz_telemetry_events"("einsatz_id", "event_name");

-- CreateIndex
CREATE INDEX "eigenschutz_telemetry_events_einsatz_id_server_time_idx" ON "eigenschutz_telemetry_events"("einsatz_id", "server_time");

-- CreateIndex
CREATE INDEX "ampel_projections_einsatz_id_idx" ON "ampel_projections"("einsatz_id");

-- CreateIndex
CREATE INDEX "sync_conflicts_einsatz_id_resolved_at_idx" ON "sync_conflicts"("einsatz_id", "resolved_at");

-- AddForeignKey
ALTER TABLE "gefaehrdungsbeurteilungen" ADD CONSTRAINT "gefaehrdungsbeurteilungen_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gefaehrdungsbeurteilungen" ADD CONSTRAINT "gefaehrdungsbeurteilungen_gefahrenzone_id_fkey" FOREIGN KEY ("gefahrenzone_id") REFERENCES "gefahrenzonen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gefaehrdungsbeurteilungen" ADD CONSTRAINT "gefaehrdungsbeurteilungen_vorlage_id_fkey" FOREIGN KEY ("vorlage_id") REFERENCES "gefaehrdungsbeurteilung_vorlagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gefaehrdungsbeurteilung_versionen" ADD CONSTRAINT "gefaehrdungsbeurteilung_versionen_gef_beurteilung_id_fkey" FOREIGN KEY ("gef_beurteilung_id") REFERENCES "gefaehrdungsbeurteilungen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psa_profil_zuweisungen" ADD CONSTRAINT "psa_profil_zuweisungen_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sicherheitsregeln" ADD CONSTRAINT "sicherheitsregeln_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sicherheitsregel_versionen" ADD CONSTRAINT "sicherheitsregel_versionen_regel_id_fkey" FOREIGN KEY ("regel_id") REFERENCES "sicherheitsregeln"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sicherheitsregel_quittungen" ADD CONSTRAINT "sicherheitsregel_quittungen_regel_id_fkey" FOREIGN KEY ("regel_id") REFERENCES "sicherheitsregeln"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sicherungsposten" ADD CONSTRAINT "sicherungsposten_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sicherungsposten_versionen" ADD CONSTRAINT "sicherungsposten_versionen_posten_id_fkey" FOREIGN KEY ("posten_id") REFERENCES "sicherungsposten"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eigenschutz_vorfaelle" ADD CONSTRAINT "eigenschutz_vorfaelle_gef_beurteilung_version_id_fkey" FOREIGN KEY ("gef_beurteilung_version_id") REFERENCES "gefaehrdungsbeurteilung_versionen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
