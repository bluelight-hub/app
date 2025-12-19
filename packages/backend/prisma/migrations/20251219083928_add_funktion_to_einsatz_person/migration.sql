-- AlterTable: Add funktion field (Epic 4 AC1 requirement)
-- DEFAULT 'Helfer' für existierende Daten, dann entfernen
ALTER TABLE "einsatz_personen" ADD COLUMN "funktion" VARCHAR(50) NOT NULL DEFAULT 'Helfer';

-- Remove default after migration (funktion is required on insert)
ALTER TABLE "einsatz_personen" ALTER COLUMN "funktion" DROP DEFAULT;
