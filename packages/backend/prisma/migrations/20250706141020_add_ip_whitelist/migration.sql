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

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'IP_WHITELIST_READ';
ALTER TYPE "Permission" ADD VALUE 'IP_WHITELIST_WRITE';
ALTER TYPE "Permission" ADD VALUE 'IP_WHITELIST_DELETE';

-- DropIndex
DROP INDEX "idx_audit_metadata_gin";

-- DropIndex
DROP INDEX "idx_audit_new_values_gin";

-- DropIndex
DROP INDEX "idx_audit_old_values_gin";

-- DropIndex
DROP INDEX "idx_audit_stats_covering";

-- CreateTable
CREATE TABLE "IpWhitelist" (
    "id" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "cidr" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdBy" VARCHAR(255) NOT NULL,
    "createdByEmail" VARCHAR(255) NOT NULL,
    "updatedBy" VARCHAR(255),
    "updatedByEmail" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedEndpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "IpWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ip_whitelist_active_expires" ON "IpWhitelist"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_ip_whitelist_tags" ON "IpWhitelist"("tags");

-- CreateIndex
CREATE INDEX "idx_ip_whitelist_created" ON "IpWhitelist"("createdAt");

-- CreateIndex
CREATE INDEX "idx_ip_whitelist_last_used" ON "IpWhitelist"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uk_ip_whitelist_address_cidr" ON "IpWhitelist"("ipAddress", "cidr");
