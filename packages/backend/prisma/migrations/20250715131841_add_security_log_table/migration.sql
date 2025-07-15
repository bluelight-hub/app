-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "userId" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "sessionId" VARCHAR(255),
    "metadata" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_security_log_type_time" ON "SecurityLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "idx_security_log_user_time" ON "SecurityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_security_log_ip_time" ON "SecurityLog"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "idx_security_log_severity_time" ON "SecurityLog"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "idx_security_log_session" ON "SecurityLog"("sessionId");

-- AddForeignKey
ALTER TABLE "SecurityLog" ADD CONSTRAINT "SecurityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
