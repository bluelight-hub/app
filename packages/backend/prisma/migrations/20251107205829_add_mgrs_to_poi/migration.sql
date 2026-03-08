-- AlterTable
ALTER TABLE "lagekarte_poi"
    ADD COLUMN "mgrs" VARCHAR(20);

-- CreateIndex
CREATE INDEX "lagekarte_poi_mgrs_idx" ON "lagekarte_poi" ("mgrs");
