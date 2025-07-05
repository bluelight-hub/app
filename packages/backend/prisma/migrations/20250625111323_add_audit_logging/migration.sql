-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'ROLE_CHANGE', 'BULK_OPERATION', 'SYSTEM_CONFIG', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actionType" "AuditActionType" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'MEDIUM',
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(255),
    "userId" VARCHAR(255),
    "userEmail" VARCHAR(255),
    "userRole" "UserRole",
    "impersonatedBy" VARCHAR(255),
    "requestId" VARCHAR(100),
    "sessionId" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "endpoint" VARCHAR(255),
    "httpMethod" VARCHAR(10),
    "oldValues" JSONB,
    "newValues" JSONB,
    "affectedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "statusCode" INTEGER,
    "compliance" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" VARCHAR(255),
    "reviewedAt" TIMESTAMP(3),
    "retentionPeriod" INTEGER,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_timestamp" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_user_timestamp" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_action_timestamp" ON "AuditLog"("actionType", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_resource" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "idx_audit_severity" ON "AuditLog"("severity", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_success" ON "AuditLog"("success", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_review" ON "AuditLog"("requiresReview");

-- CreateIndex
CREATE INDEX "idx_audit_request_id" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "idx_audit_session" ON "AuditLog"("sessionId");

-- CreateIndex
CREATE INDEX "idx_audit_ip" ON "AuditLog"("ipAddress", "timestamp");
