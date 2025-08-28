-- CreateEnum
CREATE TYPE "public"."EinsatzStatus" AS ENUM ('ANGELEGT', 'IN_BEARBEITUNG', 'ABGESCHLOSSEN', 'ARCHIVIERT');

-- CreateTable
CREATE TABLE "public"."einsaetze" (
    "id" TEXT NOT NULL,
    "alarmstichwort" VARCHAR(255),
    "alarmierungszeit" TIMESTAMP(3),
    "status" "public"."EinsatzStatus" NOT NULL DEFAULT 'ANGELEGT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),

    CONSTRAINT "einsaetze_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsaetze_status_createdAt_idx" ON "public"."einsaetze"("status", "createdAt");

-- CreateIndex
CREATE INDEX "einsaetze_createdBy_idx" ON "public"."einsaetze"("createdBy");

-- CreateIndex
CREATE INDEX "idx_user_username" ON "public"."User"("username");

-- AddForeignKey
ALTER TABLE "public"."einsaetze" ADD CONSTRAINT "einsaetze_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."einsaetze" ADD CONSTRAINT "einsaetze_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
