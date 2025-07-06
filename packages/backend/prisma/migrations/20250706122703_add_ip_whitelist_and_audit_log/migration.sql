-- CreateTable
CREATE TABLE "IpWhitelist" (
    "id" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(255) NOT NULL,

    CONSTRAINT "IpWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(255),
    "userId" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IpWhitelist_ipAddress_key" ON "IpWhitelist"("ipAddress");

-- CreateIndex
CREATE INDEX "idx_ip_whitelist_ip_active" ON "IpWhitelist"("ipAddress", "isActive");

-- CreateIndex
CREATE INDEX "idx_ip_whitelist_active_created" ON "IpWhitelist"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_log_action_resource" ON "AuditLog"("action", "resource");

-- CreateIndex
CREATE INDEX "idx_audit_log_user_timestamp" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_log_timestamp" ON "AuditLog"("timestamp");