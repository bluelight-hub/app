-- AlterTable: Replace funkrufname with einsatz_person_id FK
-- WICHTIG: Bestehende Teilnehmer-Daten müssen vor NOT NULL/FK migriert werden.
ALTER TABLE "einsatz_teilnehmer"
  ADD COLUMN "einsatz_person_id" TEXT;

-- Backfill: Für jeden bestehenden Teilnehmer eine dedizierte EinsatzPerson-Snapshot-Zeile anlegen.
-- So bleibt die Migration robust, auch wenn kein passender Datensatz in "einsatz_personen" existiert.
INSERT INTO "einsatz_personen" (
  "id",
  "einsatz_id",
  "stamm_id",
  "vorname",
  "nachname",
  "funkrufname",
  "position",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by"
)
SELECT
  'mig_et_' || et."id" AS "id",
  et."einsatz_id",
  NULL AS "stamm_id",
  'Teilnehmer' AS "vorname",
  et."funkrufname" AS "nachname",
  et."funkrufname",
  NULL AS "position",
  COALESCE(et."joined_at", CURRENT_TIMESTAMP) AS "created_at",
  COALESCE(et."joined_at", CURRENT_TIMESTAMP) AS "updated_at",
  et."user_id" AS "created_by",
  et."user_id" AS "updated_by"
FROM "einsatz_teilnehmer" et
WHERE NOT EXISTS (
  SELECT 1
  FROM "einsatz_personen" ep
  WHERE ep."id" = 'mig_et_' || et."id"
);

-- Teilnehmer auf die neu erzeugten EinsatzPerson-IDs verknüpfen.
UPDATE "einsatz_teilnehmer" et
SET "einsatz_person_id" = 'mig_et_' || et."id"
WHERE et."einsatz_person_id" IS NULL;

-- Erst nach erfolgreichem Backfill NOT NULL erzwingen und Legacy-Spalte entfernen.
ALTER TABLE "einsatz_teilnehmer"
  ALTER COLUMN "einsatz_person_id" SET NOT NULL,
  DROP COLUMN "funkrufname";

-- CreateIndex: Eine Person = max ein Bearbeiter pro Einsatz
CREATE UNIQUE INDEX "einsatz_teilnehmer_einsatz_id_einsatz_person_id_key" ON "einsatz_teilnehmer"("einsatz_id", "einsatz_person_id");

-- AddForeignKey
ALTER TABLE "einsatz_teilnehmer" ADD CONSTRAINT "einsatz_teilnehmer_einsatz_person_id_fkey" FOREIGN KEY ("einsatz_person_id") REFERENCES "einsatz_personen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
