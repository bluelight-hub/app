-- Issue #582: ETB LOCKED-Status entfernen — Schreibschutz aus Einsatz-Lifecycle ableiten
-- Bestehende LOCKED-Records zu ACTIVE migrieren, dann Enum-Wert entfernen.

-- Step 1: Migrate existing LOCKED records to ACTIVE
UPDATE "Einsatztagebuch" SET "status" = 'ACTIVE' WHERE "status" = 'LOCKED';

-- Step 2: Remove LOCKED from EtbStatus enum
-- PostgreSQL requires creating a new enum type and swapping
CREATE TYPE "EtbStatus_new" AS ENUM ('DRAFT', 'ACTIVE');

ALTER TABLE "Einsatztagebuch" ALTER COLUMN "status" TYPE "EtbStatus_new" USING ("status"::text::"EtbStatus_new");

DROP TYPE "EtbStatus";

ALTER TYPE "EtbStatus_new" RENAME TO "EtbStatus";
