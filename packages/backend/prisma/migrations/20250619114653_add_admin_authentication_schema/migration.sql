-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('ADMIN_USERS_READ', 'ADMIN_USERS_WRITE', 'ADMIN_USERS_DELETE', 'SYSTEM_SETTINGS_READ', 'SYSTEM_SETTINGS_WRITE', 'AUDIT_LOG_READ', 'ROLE_MANAGE');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMfaSecret" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMfaSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "sessionJti" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRolePermission" (
    "id" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "permission" "AdminPermission" NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "idx_admin_user_email" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "idx_admin_user_role_active" ON "AdminUser"("role", "isActive");

-- CreateIndex
CREATE INDEX "idx_admin_user_last_login" ON "AdminUser"("lastLoginAt");

-- CreateIndex
CREATE INDEX "idx_admin_mfa_user_verified" ON "AdminMfaSecret"("adminUserId", "isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "uk_admin_mfa_secret_user" ON "AdminMfaSecret"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_jti_key" ON "AdminSession"("jti");

-- CreateIndex
CREATE INDEX "idx_admin_session_user_active" ON "AdminSession"("adminUserId", "isRevoked");

-- CreateIndex
CREATE INDEX "idx_admin_session_jti" ON "AdminSession"("jti");

-- CreateIndex
CREATE INDEX "idx_admin_session_expiry" ON "AdminSession"("expiresAt", "isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRefreshToken_token_key" ON "AdminRefreshToken"("token");

-- CreateIndex
CREATE INDEX "idx_admin_refresh_token" ON "AdminRefreshToken"("token");

-- CreateIndex
CREATE INDEX "idx_admin_refresh_user_status" ON "AdminRefreshToken"("adminUserId", "isRevoked", "isUsed");

-- CreateIndex
CREATE INDEX "idx_admin_refresh_expiry" ON "AdminRefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_admin_role_permission_role" ON "AdminRolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "uk_admin_role_permission" ON "AdminRolePermission"("role", "permission");

-- AddForeignKey
ALTER TABLE "AdminMfaSecret" ADD CONSTRAINT "AdminMfaSecret_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRefreshToken" ADD CONSTRAINT "AdminRefreshToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
