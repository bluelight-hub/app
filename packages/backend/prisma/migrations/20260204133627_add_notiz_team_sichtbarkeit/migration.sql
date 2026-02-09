-- AlterTable
ALTER TABLE "notizen" ADD COLUMN     "ist_teamsichtbar" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notizen_einsatz_id_is_deleted_ist_teamsichtbar_created_at_idx" ON "notizen"("einsatz_id", "is_deleted", "ist_teamsichtbar", "created_at");
