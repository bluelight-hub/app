-- Update existing ERINNERUNG entries to SYSTEM
UPDATE "etb_eintraege" SET "kategorie" = 'SYSTEM' WHERE "kategorie" = 'ERINNERUNG';
UPDATE "etb_eintrag_historie" SET "kategorie" = 'SYSTEM' WHERE "kategorie" = 'ERINNERUNG';
UPDATE "etb_textbausteine" SET "kategorie" = 'SYSTEM' WHERE "kategorie" = 'ERINNERUNG';

-- Remove ERINNERUNG from enum (PostgreSQL)
ALTER TYPE "EtbKategorie" RENAME TO "EtbKategorie_old";
CREATE TYPE "EtbKategorie" AS ENUM ('ALARMIERUNG', 'ANKUNFT', 'BEFEHL', 'ERKUNDUNG', 'LAGE', 'MASSNAHME', 'PERSONAL', 'FAHRZEUG', 'MATERIAL', 'KOMMUNIKATION', 'WETTER', 'DOKUMENTATION', 'SONSTIGES', 'SYSTEM');

ALTER TABLE "etb_eintraege" ALTER COLUMN "kategorie" TYPE "EtbKategorie" USING "kategorie"::text::"EtbKategorie";
ALTER TABLE "etb_eintrag_historie" ALTER COLUMN "kategorie" TYPE "EtbKategorie" USING "kategorie"::text::"EtbKategorie";
ALTER TABLE "etb_textbausteine" ALTER COLUMN "kategorie" TYPE "EtbKategorie" USING "kategorie"::text::"EtbKategorie";

DROP TYPE "EtbKategorie_old";
