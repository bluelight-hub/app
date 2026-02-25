-- Step 1: Add nummer column as nullable
ALTER TABLE "einsaetze" ADD COLUMN "nummer" VARCHAR(50);

-- Step 2: Backfill existing Einsatz records with sequential numbers per year
UPDATE einsaetze SET nummer = subq.new_nummer
FROM (
  SELECT id,
    'E' || EXTRACT(YEAR FROM "createdAt")::text || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt")::text, 3, '0') as new_nummer
  FROM einsaetze
) subq
WHERE einsaetze.id = subq.id;

-- Step 3: Set NOT NULL constraint
ALTER TABLE "einsaetze" ALTER COLUMN "nummer" SET NOT NULL;

-- Step 4: Add unique constraint
CREATE UNIQUE INDEX "einsaetze_nummer_key" ON "einsaetze"("nummer");
