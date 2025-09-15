/*
  Warnings:

  - The values [GERAET] on the enum `EtbKategorie` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[kategorie,kurztext]` on the table `etb_textbausteine` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."EtbKategorie_new" AS ENUM ('ALARMIERUNG', 'ANKUNFT', 'BEFEHL', 'ERKUNDUNG', 'LAGE', 'MASSNAHME', 'PERSONAL', 'FAHRZEUG', 'MATERIAL', 'KOMMUNIKATION', 'WETTER', 'SONSTIGES', 'SYSTEM');
ALTER TABLE "public"."etb_eintraege"
    ALTER COLUMN "kategorie" TYPE "public"."EtbKategorie_new" USING ("kategorie"::text::"public"."EtbKategorie_new");
ALTER TABLE "public"."etb_eintrag_historie"
    ALTER COLUMN "kategorie" TYPE "public"."EtbKategorie_new" USING ("kategorie"::text::"public"."EtbKategorie_new");
ALTER TABLE "public"."etb_textbausteine"
    ALTER COLUMN "kategorie" TYPE "public"."EtbKategorie_new" USING ("kategorie"::text::"public"."EtbKategorie_new");
ALTER TYPE "public"."EtbKategorie" RENAME TO "EtbKategorie_old";
ALTER TYPE "public"."EtbKategorie_new" RENAME TO "EtbKategorie";
DROP TYPE "public"."EtbKategorie_old";
COMMIT;

-- CreateIndex
CREATE UNIQUE INDEX "etb_textbausteine_kategorie_kurztext_key" ON "public"."etb_textbausteine" ("kategorie", "kurztext");
