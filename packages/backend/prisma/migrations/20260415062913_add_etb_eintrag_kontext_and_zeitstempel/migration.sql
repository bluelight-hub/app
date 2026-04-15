-- AlterTable: Neue Felder additiv einführen
-- ereignis_zeitpunkt zunächst nullable, dann backfillen aus timestamp, dann NOT NULL setzen.
ALTER TABLE "etb_eintraege"
    ADD COLUMN "ereignis_zeitpunkt" TIMESTAMP(3),
    ADD COLUMN "erfasst_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "kontext_data" JSONB,
    ADD COLUMN "kontext_type" TEXT NOT NULL DEFAULT 'standard';

-- Backfill: ereignisZeitpunkt vom bestehenden timestamp übernehmen, erfasstAm aus timestamp.
UPDATE "etb_eintraege" SET "ereignis_zeitpunkt" = "timestamp" WHERE "ereignis_zeitpunkt" IS NULL;
UPDATE "etb_eintraege" SET "erfasst_am" = "timestamp";

-- NOT NULL Constraint setzen nach Backfill
ALTER TABLE "etb_eintraege" ALTER COLUMN "ereignis_zeitpunkt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "etb_eintraege_etbId_ereignis_zeitpunkt_idx" ON "etb_eintraege"("etbId", "ereignis_zeitpunkt");

-- CreateIndex
CREATE INDEX "etb_eintraege_etbId_kontext_type_idx" ON "etb_eintraege"("etbId", "kontext_type");
