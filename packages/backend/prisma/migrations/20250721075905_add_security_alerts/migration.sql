/*
  Warnings:

  - You are about to drop the column `channelId` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `channelType` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `lastError` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `NotificationLog` table. All the data in the column will be lost.
  - Added the required column `channel` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `recipient` on table `NotificationLog` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'ACKNOWLEDGED', 'RESOLVED', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ACCOUNT_LOCKED', 'SUSPICIOUS_LOGIN', 'BRUTE_FORCE_ATTEMPT', 'MULTIPLE_FAILED_ATTEMPTS', 'THREAT_RULE_MATCH', 'ANOMALY_DETECTED', 'POLICY_VIOLATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'QUEUED';
ALTER TYPE "NotificationStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "NotificationStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_channelId_fkey";

-- DropIndex
DROP INDEX "idx_notification_log_channel_time";

-- DropIndex
DROP INDEX "idx_notification_log_recipient_time";

-- DropIndex
DROP INDEX "idx_notification_log_template";

-- AlterTable
ALTER TABLE "NotificationLog" DROP COLUMN "channelId",
DROP COLUMN "channelType",
DROP COLUMN "lastError",
DROP COLUMN "templateId",
ADD COLUMN     "channel" VARCHAR(255) NOT NULL,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" VARCHAR(50),
ADD COLUMN     "subject" VARCHAR(255) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "recipient" SET NOT NULL,
ALTER COLUMN "recipient" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "SecurityAlert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "ThreatSeverity" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "fingerprint" VARCHAR(255) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "ruleId" TEXT,
    "ruleName" VARCHAR(255),
    "eventType" VARCHAR(50),
    "userId" VARCHAR(255),
    "userEmail" VARCHAR(255),
    "sessionId" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "location" VARCHAR(255),
    "score" INTEGER,
    "evidence" JSONB,
    "context" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correlationId" VARCHAR(255),
    "correlatedAlerts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCorrelated" BOOLEAN NOT NULL DEFAULT false,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dispatchAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDispatchAt" TIMESTAMP(3),
    "dispatchErrors" JSONB,
    "acknowledgedBy" VARCHAR(255),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(255),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "suppressedUntil" TIMESTAMP(3),
    "suppressionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertNotification" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertComment" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "authorId" VARCHAR(255) NOT NULL,
    "authorEmail" VARCHAR(255) NOT NULL,
    "comment" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_alert_type_severity_status" ON "SecurityAlert"("type", "severity", "status");

-- CreateIndex
CREATE INDEX "idx_alert_user_time" ON "SecurityAlert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_alert_ip_time" ON "SecurityAlert"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "idx_alert_correlation" ON "SecurityAlert"("correlationId");

-- CreateIndex
CREATE INDEX "idx_alert_status_time" ON "SecurityAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_alert_fingerprint_time" ON "SecurityAlert"("fingerprint", "lastSeen");

-- CreateIndex
CREATE INDEX "idx_alert_severity_time" ON "SecurityAlert"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "idx_alert_time_range" ON "SecurityAlert"("firstSeen", "lastSeen");

-- CreateIndex
CREATE INDEX "idx_alert_rule_time" ON "SecurityAlert"("ruleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uk_alert_fingerprint_suppression" ON "SecurityAlert"("fingerprint", "suppressedUntil");

-- CreateIndex
CREATE INDEX "idx_alert_notification_alert_channel" ON "AlertNotification"("alertId", "channel");

-- CreateIndex
CREATE INDEX "idx_alert_notification_status_time" ON "AlertNotification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_alert_comment_alert_time" ON "AlertComment"("alertId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_alert_comment_author_time" ON "AlertComment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_log_channel_time" ON "NotificationLog"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_log_created" ON "NotificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AlertNotification" ADD CONSTRAINT "AlertNotification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "SecurityAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertComment" ADD CONSTRAINT "AlertComment_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "SecurityAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
