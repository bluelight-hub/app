-- AlterTable: Add updatedAt column with default value for existing rows
-- Für bestehende Einträge wird createdAt als Initialwert verwendet

-- Step 1: Add column as nullable
ALTER TABLE "invite_codes" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Step 2: Set existing rows to use createdAt value
UPDATE "invite_codes" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE "invite_codes" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex: Composite index for findAllActive() query performance
CREATE INDEX "idx_invite_active_codes" ON "invite_codes"("isRevoked", "expiresAt");
