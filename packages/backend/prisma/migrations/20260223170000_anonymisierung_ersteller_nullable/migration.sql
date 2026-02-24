-- DropForeignKey (erstellerId wird nullable für DSGVO-Anonymisierung)
ALTER TABLE "befehl" DROP CONSTRAINT IF EXISTS "befehl_ersteller_id_fkey";

-- AlterTable: erstellerId nullable machen
ALTER TABLE "befehl" ALTER COLUMN "ersteller_id" DROP NOT NULL;

-- Verwaiste ersteller_id-Referenzen bereinigen (dev DB)
UPDATE "befehl" SET "ersteller_id" = NULL
  WHERE "ersteller_id" IS NOT NULL
  AND "ersteller_id" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey (mit SET NULL statt RESTRICT)
ALTER TABLE "befehl" ADD CONSTRAINT "befehl_ersteller_id_fkey" FOREIGN KEY ("ersteller_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Singleton-Constraint für AufbewahrungsKonfiguration (M4)
ALTER TABLE "aufbewahrungs_konfiguration" ADD COLUMN IF NOT EXISTS "is_singleton" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Unique auf is_singleton (garantiert max 1 Zeile)
CREATE UNIQUE INDEX IF NOT EXISTS "aufbewahrungs_konfiguration_is_singleton_key" ON "aufbewahrungs_konfiguration"("is_singleton");
