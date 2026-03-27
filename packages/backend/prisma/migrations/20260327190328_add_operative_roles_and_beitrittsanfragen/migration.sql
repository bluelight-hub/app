/*
  Warnings:

  - A unique constraint covering the columns `[stammpersonId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OperativeRole" AS ENUM ('FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE');

-- CreateEnum
CREATE TYPE "BeitrittsanfrageStatus" AS ENUM ('OFFEN', 'GENEHMIGT', 'ABGELEHNT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "operativeRole" "OperativeRole" NOT NULL DEFAULT 'EXTERNE',
ADD COLUMN     "stammpersonId" TEXT;

-- CreateTable
CREATE TABLE "einsatz_beitrittsanfragen" (
    "id" TEXT NOT NULL,
    "einsatzId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BeitrittsanfrageStatus" NOT NULL DEFAULT 'OFFEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(100),

    CONSTRAINT "einsatz_beitrittsanfragen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_beitrittsanfragen_einsatzId_status_idx" ON "einsatz_beitrittsanfragen"("einsatzId", "status");

-- CreateIndex
CREATE INDEX "einsatz_beitrittsanfragen_userId_status_idx" ON "einsatz_beitrittsanfragen"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_beitrittsanfragen_einsatzId_userId_key" ON "einsatz_beitrittsanfragen"("einsatzId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stammpersonId_key" ON "User"("stammpersonId");

-- CreateIndex
CREATE INDEX "idx_user_operative_role" ON "User"("operativeRole");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stammpersonId_fkey" FOREIGN KEY ("stammpersonId") REFERENCES "stamm_personen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_beitrittsanfragen" ADD CONSTRAINT "einsatz_beitrittsanfragen_einsatzId_fkey" FOREIGN KEY ("einsatzId") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_beitrittsanfragen" ADD CONSTRAINT "einsatz_beitrittsanfragen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_beitrittsanfragen" ADD CONSTRAINT "einsatz_beitrittsanfragen_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
