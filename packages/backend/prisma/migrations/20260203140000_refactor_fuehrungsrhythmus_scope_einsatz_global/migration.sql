-- Rename enum values (PostgreSQL supports RENAME VALUE since v10)
ALTER TYPE "FuehrungsrhythmusTemplateScope" RENAME VALUE 'PERSOENLICH' TO 'EINSATZ';
ALTER TYPE "FuehrungsrhythmusTemplateScope" RENAME VALUE 'ORGANISATIONSWEIT' TO 'GLOBAL';

-- Migrate all existing templates to GLOBAL (they were ORGANISATIONSWEIT or PERSOENLICH before)
UPDATE "fuehrungsrhythmus_templates" SET "scope" = 'GLOBAL';

-- Change default value
ALTER TABLE "fuehrungsrhythmus_templates" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL';

-- Add optional einsatzId column
ALTER TABLE "fuehrungsrhythmus_templates" ADD COLUMN "einsatzId" VARCHAR(30);

-- Add foreign key constraint
ALTER TABLE "fuehrungsrhythmus_templates" ADD CONSTRAINT "fuehrungsrhythmus_templates_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "einsaetze"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index on einsatzId
CREATE INDEX "fuehrungsrhythmus_templates_einsatzId_idx" ON "fuehrungsrhythmus_templates"("einsatzId");
