-- AlterTable
ALTER TABLE "etb_eintraege" ADD COLUMN     "korrigiert_durch_id" TEXT,
ADD COLUMN     "korrigiert_eintrag_id" TEXT;

-- CreateIndex
CREATE INDEX "etb_eintraege_korrigiert_eintrag_id_idx" ON "etb_eintraege"("korrigiert_eintrag_id");

-- AddForeignKey
ALTER TABLE "etb_eintraege" ADD CONSTRAINT "etb_eintraege_korrigiert_eintrag_id_fkey" FOREIGN KEY ("korrigiert_eintrag_id") REFERENCES "etb_eintraege"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etb_eintraege" ADD CONSTRAINT "etb_eintraege_korrigiert_durch_id_fkey" FOREIGN KEY ("korrigiert_durch_id") REFERENCES "etb_eintraege"("id") ON DELETE SET NULL ON UPDATE CASCADE;
