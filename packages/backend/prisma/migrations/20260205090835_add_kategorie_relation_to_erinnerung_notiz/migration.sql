-- AlterTable
ALTER TABLE "erinnerungen" ADD COLUMN     "kategorie_id" TEXT;

-- AlterTable
ALTER TABLE "notizen" ADD COLUMN     "kategorie_id" TEXT;

-- CreateIndex
CREATE INDEX "erinnerungen_kategorie_id_idx" ON "erinnerungen"("kategorie_id");

-- CreateIndex
CREATE INDEX "notizen_kategorie_id_idx" ON "notizen"("kategorie_id");

-- AddForeignKey
ALTER TABLE "erinnerungen" ADD CONSTRAINT "erinnerungen_kategorie_id_fkey" FOREIGN KEY ("kategorie_id") REFERENCES "kategorien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notizen" ADD CONSTRAINT "notizen_kategorie_id_fkey" FOREIGN KEY ("kategorie_id") REFERENCES "kategorien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
