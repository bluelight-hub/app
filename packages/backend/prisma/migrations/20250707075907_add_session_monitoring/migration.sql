-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'FAILED_LOGIN';
ALTER TYPE "AuditActionType" ADD VALUE 'APPROVE';
ALTER TYPE "AuditActionType" ADD VALUE 'REJECT';
ALTER TYPE "AuditActionType" ADD VALUE 'BLOCK';
ALTER TYPE "AuditActionType" ADD VALUE 'UNBLOCK';
ALTER TYPE "AuditActionType" ADD VALUE 'RESTORE';
ALTER TYPE "AuditActionType" ADD VALUE 'BACKUP';

-- AlterEnum
ALTER TYPE "AuditSeverity" ADD VALUE 'ERROR';

-- DropIndex
DROP INDEX "idx_audit_metadata_gin";

-- DropIndex
DROP INDEX "idx_audit_new_values_gin";

-- DropIndex
DROP INDEX "idx_audit_old_values_gin";

-- DropIndex
DROP INDEX "idx_audit_stats_covering";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "activityCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "browser" VARCHAR(50),
ADD COLUMN     "browserVersion" VARCHAR(20),
ADD COLUMN     "deviceType" VARCHAR(50),
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastHeartbeat" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "location" VARCHAR(255),
ADD COLUMN     "loginMethod" VARCHAR(50),
ADD COLUMN     "os" VARCHAR(50),
ADD COLUMN     "osVersion" VARCHAR(20),
ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suspiciousFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SessionActivity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityType" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(255),
    "method" VARCHAR(10),
    "statusCode" INTEGER,
    "duration" INTEGER,
    "ipAddress" VARCHAR(45),
    "metadata" JSONB,

    CONSTRAINT "SessionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_session_activity_session_time" ON "SessionActivity"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_session_activity_type_time" ON "SessionActivity"("activityType", "timestamp");

-- CreateIndex
CREATE INDEX "idx_session_activity_timestamp" ON "SessionActivity"("timestamp");

-- CreateIndex
CREATE INDEX "idx_session_heartbeat" ON "Session"("lastHeartbeat", "isOnline");

-- CreateIndex
CREATE INDEX "idx_session_risk" ON "Session"("riskScore");

-- AddForeignKey
ALTER TABLE "SessionActivity" ADD CONSTRAINT "SessionActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
