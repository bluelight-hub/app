/*
  Warnings:

  - A unique constraint covering the columns `[sequenceNumber]` on the table `SecurityLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currentHash` to the `SecurityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber` to the `SecurityLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SecurityLog" ADD COLUMN     "currentHash" VARCHAR(64) NOT NULL,
ADD COLUMN     "hashAlgorithm" VARCHAR(20) NOT NULL DEFAULT 'SHA256',
ADD COLUMN     "previousHash" VARCHAR(64),
ADD COLUMN     "sequenceNumber" BIGINT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SecurityLog_sequenceNumber_key" ON "SecurityLog"("sequenceNumber");

-- CreateIndex
CREATE INDEX "idx_security_log_sequence" ON "SecurityLog"("sequenceNumber");

-- CreateIndex
CREATE INDEX "idx_security_log_hash" ON "SecurityLog"("currentHash");

-- CreateIndex
CREATE INDEX "idx_security_log_prev_hash" ON "SecurityLog"("previousHash");
