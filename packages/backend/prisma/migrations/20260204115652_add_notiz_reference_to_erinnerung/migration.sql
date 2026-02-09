-- DropIndex
DROP INDEX "notizen_einsatz_id_idx";

-- DropIndex
DROP INDEX "notizen_is_deleted_idx";

-- AlterTable
ALTER TABLE "erinnerungen" ADD COLUMN     "notiz_id" TEXT;

-- CreateIndex
CREATE INDEX "erinnerungen_notiz_id_idx" ON "erinnerungen"("notiz_id");

-- CreateIndex
CREATE INDEX "notizen_einsatz_id_is_deleted_created_at_idx" ON "notizen"("einsatz_id", "is_deleted", "created_at");

-- AddForeignKey
ALTER TABLE "erinnerungen" ADD CONSTRAINT "erinnerungen_notiz_id_fkey" FOREIGN KEY ("notiz_id") REFERENCES "notizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
