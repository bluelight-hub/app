-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "attemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" VARCHAR(255),
    "location" VARCHAR(255),
    "deviceType" VARCHAR(50),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_login_attempt_email_time" ON "LoginAttempt"("email", "attemptAt");

-- CreateIndex
CREATE INDEX "idx_login_attempt_user_time" ON "LoginAttempt"("userId", "attemptAt");

-- CreateIndex
CREATE INDEX "idx_login_attempt_ip_time" ON "LoginAttempt"("ipAddress", "attemptAt");

-- CreateIndex
CREATE INDEX "idx_login_attempt_success_time" ON "LoginAttempt"("success", "attemptAt");

-- CreateIndex
CREATE INDEX "idx_login_attempt_suspicious" ON "LoginAttempt"("suspicious", "attemptAt");

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
