-- AlterTable
ALTER TABLE "public"."einsaetze" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" VARCHAR(100);

-- AddForeignKey
ALTER TABLE "public"."einsaetze" ADD CONSTRAINT "einsaetze_archivedBy_fkey" FOREIGN KEY ("archivedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
