-- AlterTable
ALTER TABLE "erinnerungen" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_erinnerung_id" TEXT,
ADD COLUMN     "recurring_current_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recurring_end_date" TIMESTAMP(3),
ADD COLUMN     "recurring_interval_minutes" INTEGER,
ADD COLUMN     "recurring_max_count" INTEGER,
ADD COLUMN     "recurring_sequence_number" INTEGER;

-- CreateIndex
CREATE INDEX "erinnerungen_is_recurring_idx" ON "erinnerungen"("is_recurring");

-- CreateIndex
CREATE INDEX "erinnerungen_parent_erinnerung_id_idx" ON "erinnerungen"("parent_erinnerung_id");

-- AddForeignKey
ALTER TABLE "erinnerungen" ADD CONSTRAINT "erinnerungen_parent_erinnerung_id_fkey" FOREIGN KEY ("parent_erinnerung_id") REFERENCES "erinnerungen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
