-- AlterTable: Add befehlsgeber_name to befehl (nullable first for backfill)
ALTER TABLE "befehl" ADD COLUMN "befehlsgeber_name" VARCHAR(255);

-- Backfill: befehlsgeber_name from befehlsgeber_id
UPDATE "befehl" SET "befehlsgeber_name" = "befehlsgeber_id" WHERE "befehlsgeber_name" IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE "befehl" ALTER COLUMN "befehlsgeber_name" SET NOT NULL;

-- Make befehlsgeber_id nullable
ALTER TABLE "befehl" ALTER COLUMN "befehlsgeber_id" DROP NOT NULL;

-- AlterTable: Add name to befehl_empfaenger (nullable first for backfill)
ALTER TABLE "befehl_empfaenger" ADD COLUMN "name" VARCHAR(255);

-- Backfill: name from empfaenger_id
UPDATE "befehl_empfaenger" SET "name" = "empfaenger_id" WHERE "name" IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE "befehl_empfaenger" ALTER COLUMN "name" SET NOT NULL;

-- Make empfaenger_id nullable
ALTER TABLE "befehl_empfaenger" ALTER COLUMN "empfaenger_id" DROP NOT NULL;

-- Drop old unique constraint and create new one
ALTER TABLE "befehl_empfaenger" DROP CONSTRAINT IF EXISTS "befehl_empfaenger_befehl_id_empfaenger_id_key";

-- CreateIndex: new unique constraint on [befehlId, name]
CREATE UNIQUE INDEX "befehl_empfaenger_befehl_id_name_key" ON "befehl_empfaenger"("befehl_id", "name");

-- Drop foreign key constraint to make relation optional, then re-add
ALTER TABLE "befehl" DROP CONSTRAINT IF EXISTS "befehl_befehlsgeber_id_fkey";
ALTER TABLE "befehl" ADD CONSTRAINT "befehl_befehlsgeber_id_fkey" FOREIGN KEY ("befehlsgeber_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "befehl_empfaenger" DROP CONSTRAINT IF EXISTS "befehl_empfaenger_empfaenger_id_fkey";
ALTER TABLE "befehl_empfaenger" ADD CONSTRAINT "befehl_empfaenger_empfaenger_id_fkey" FOREIGN KEY ("empfaenger_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
