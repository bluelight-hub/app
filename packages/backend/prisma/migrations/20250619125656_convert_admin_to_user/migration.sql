/*
  Migration: Convert AdminUser to User with role-based system
  This migration transfers all data from Admin* tables to the new User* tables
*/

-- CreateEnum for new User system
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'USER');

-- CreateEnum for new Permission system  
CREATE TYPE "Permission" AS ENUM ('USERS_READ', 'USERS_WRITE', 'USERS_DELETE', 'SYSTEM_SETTINGS_READ', 'SYSTEM_SETTINGS_WRITE', 'AUDIT_LOG_READ', 'ROLE_MANAGE', 'ETB_READ', 'ETB_WRITE', 'ETB_DELETE', 'EINSATZ_READ', 'EINSATZ_WRITE', 'EINSATZ_DELETE');

-- Create new User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create new MfaSecret table
CREATE TABLE "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

-- Create new Session table
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Create new RefreshToken table
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionJti" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- Create new RolePermission table
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission" "Permission" NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- Migrate data from AdminUser to User
INSERT INTO "User" (
    "id",
    "email", 
    "username",
    "passwordHash",
    "role",
    "isActive",
    "isMfaEnabled",
    "lastLoginAt",
    "failedLoginCount",
    "lockedUntil",
    "createdAt",
    "updatedAt"
)
SELECT 
    "id",
    "email",
    "username", 
    "passwordHash",
    CASE 
        WHEN "role" = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::text::"UserRole"
        WHEN "role" = 'ADMIN' THEN 'ADMIN'::text::"UserRole"
        WHEN "role" = 'SUPPORT' THEN 'SUPPORT'::text::"UserRole"
        ELSE 'USER'::text::"UserRole"
    END as "role",
    "isActive",
    "isMfaEnabled",
    "lastLoginAt",
    "failedLoginCount",
    "lockedUntil",
    "createdAt",
    "updatedAt"
FROM "AdminUser";

-- Migrate data from AdminMfaSecret to MfaSecret
INSERT INTO "MfaSecret" (
    "id",
    "userId",
    "secret",
    "backupCodes",
    "isVerified",
    "verifiedAt",
    "lastUsedAt",
    "createdAt",
    "updatedAt"
)
SELECT 
    "id",
    "adminUserId" as "userId",
    "secret",
    "backupCodes",
    "isVerified",
    "verifiedAt",
    "lastUsedAt",
    "createdAt",
    "updatedAt"
FROM "AdminMfaSecret";

-- Migrate data from AdminSession to Session
INSERT INTO "Session" (
    "id",
    "jti",
    "userId",
    "ipAddress",
    "userAgent",
    "lastActivityAt",
    "expiresAt",
    "isRevoked",
    "revokedAt",
    "revokedReason",
    "createdAt"
)
SELECT 
    "id",
    "jti",
    "adminUserId" as "userId",
    "ipAddress",
    "userAgent",
    "lastActivityAt",
    "expiresAt",
    "isRevoked",
    "revokedAt",
    "revokedReason",
    "createdAt"
FROM "AdminSession";

-- Migrate data from AdminRefreshToken to RefreshToken
INSERT INTO "RefreshToken" (
    "id",
    "token",
    "userId",
    "sessionJti",
    "expiresAt",
    "isUsed",
    "usedAt",
    "isRevoked",
    "revokedAt",
    "createdAt"
)
SELECT 
    "id",
    "token",
    "adminUserId" as "userId",
    "sessionJti",
    "expiresAt",
    "isUsed",
    "usedAt",
    "isRevoked",
    "revokedAt",
    "createdAt"
FROM "AdminRefreshToken";

-- Migrate data from AdminRolePermission to RolePermission
-- Map old permissions to new permissions
INSERT INTO "RolePermission" (
    "id",
    "role",
    "permission",
    "grantedBy",
    "grantedAt"
)
SELECT 
    "id",
    CASE 
        WHEN "role" = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::text::"UserRole"
        WHEN "role" = 'ADMIN' THEN 'ADMIN'::text::"UserRole"
        WHEN "role" = 'SUPPORT' THEN 'SUPPORT'::text::"UserRole"
        ELSE 'USER'::text::"UserRole"
    END as "role",
    CASE 
        WHEN "permission" = 'ADMIN_USERS_READ' THEN 'USERS_READ'::text::"Permission"
        WHEN "permission" = 'ADMIN_USERS_WRITE' THEN 'USERS_WRITE'::text::"Permission"
        WHEN "permission" = 'ADMIN_USERS_DELETE' THEN 'USERS_DELETE'::text::"Permission"
        WHEN "permission" = 'SYSTEM_SETTINGS_READ' THEN 'SYSTEM_SETTINGS_READ'::text::"Permission"
        WHEN "permission" = 'SYSTEM_SETTINGS_WRITE' THEN 'SYSTEM_SETTINGS_WRITE'::text::"Permission"
        WHEN "permission" = 'AUDIT_LOG_READ' THEN 'AUDIT_LOG_READ'::text::"Permission"
        WHEN "permission" = 'ROLE_MANAGE' THEN 'ROLE_MANAGE'::text::"Permission"
        ELSE 'USERS_READ'::text::"Permission" -- Fallback, should not happen
    END as "permission",
    "grantedBy",
    "grantedAt"
FROM "AdminRolePermission";

-- Create indexes for new tables
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "idx_user_email" ON "User"("email");
CREATE INDEX "idx_user_role_active" ON "User"("role", "isActive");
CREATE INDEX "idx_user_last_login" ON "User"("lastLoginAt");

CREATE INDEX "idx_mfa_user_verified" ON "MfaSecret"("userId", "isVerified");
CREATE UNIQUE INDEX "uk_mfa_secret_user" ON "MfaSecret"("userId");

CREATE UNIQUE INDEX "Session_jti_key" ON "Session"("jti");
CREATE INDEX "idx_session_user_active" ON "Session"("userId", "isRevoked");
CREATE INDEX "idx_session_jti" ON "Session"("jti");
CREATE INDEX "idx_session_expiry" ON "Session"("expiresAt", "isRevoked");

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "idx_refresh_token" ON "RefreshToken"("token");
CREATE INDEX "idx_refresh_user_status" ON "RefreshToken"("userId", "isRevoked", "isUsed");
CREATE INDEX "idx_refresh_expiry" ON "RefreshToken"("expiresAt");

CREATE INDEX "idx_role_permission_role" ON "RolePermission"("role");
CREATE UNIQUE INDEX "uk_role_permission" ON "RolePermission"("role", "permission");

-- Add foreign key constraints
ALTER TABLE "MfaSecret" ADD CONSTRAINT "MfaSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old foreign key constraints
ALTER TABLE "AdminMfaSecret" DROP CONSTRAINT "AdminMfaSecret_adminUserId_fkey";
ALTER TABLE "AdminRefreshToken" DROP CONSTRAINT "AdminRefreshToken_adminUserId_fkey";
ALTER TABLE "AdminRolePermission" DROP CONSTRAINT "AdminRolePermission_grantedBy_fkey";
ALTER TABLE "AdminSession" DROP CONSTRAINT "AdminSession_adminUserId_fkey";

-- Drop old tables
DROP TABLE "AdminMfaSecret";
DROP TABLE "AdminRefreshToken";
DROP TABLE "AdminSession";
DROP TABLE "AdminRolePermission";
DROP TABLE "AdminUser";

-- Drop old enums
DROP TYPE "AdminPermission";
DROP TYPE "AdminRole";

-- Add default permissions for new roles
-- SUPER_ADMIN gets all permissions
INSERT INTO "RolePermission" ("id", "role", "permission", "grantedAt")
SELECT 
    'perm_superadmin_' || p.permission,
    'SUPER_ADMIN'::"UserRole",
    p.permission::"Permission",
    CURRENT_TIMESTAMP
FROM (
    SELECT unnest(enum_range(NULL::"Permission")) AS permission
) p
WHERE NOT EXISTS (
    SELECT 1 FROM "RolePermission" 
    WHERE "role" = 'SUPER_ADMIN' AND "permission" = p.permission::"Permission"
);

-- Add ETB and EINSATZ permissions for ADMIN role
INSERT INTO "RolePermission" ("id", "role", "permission", "grantedAt")
VALUES 
    ('perm_admin_etb_read', 'ADMIN'::"UserRole", 'ETB_READ'::"Permission", CURRENT_TIMESTAMP),
    ('perm_admin_etb_write', 'ADMIN'::"UserRole", 'ETB_WRITE'::"Permission", CURRENT_TIMESTAMP),
    ('perm_admin_einsatz_read', 'ADMIN'::"UserRole", 'EINSATZ_READ'::"Permission", CURRENT_TIMESTAMP),
    ('perm_admin_einsatz_write', 'ADMIN'::"UserRole", 'EINSATZ_WRITE'::"Permission", CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Add read permissions for SUPPORT role
INSERT INTO "RolePermission" ("id", "role", "permission", "grantedAt")
VALUES 
    ('perm_support_etb_read', 'SUPPORT'::"UserRole", 'ETB_READ'::"Permission", CURRENT_TIMESTAMP),
    ('perm_support_einsatz_read', 'SUPPORT'::"UserRole", 'EINSATZ_READ'::"Permission", CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Add basic read permissions for USER role
INSERT INTO "RolePermission" ("id", "role", "permission", "grantedAt")
VALUES 
    ('perm_user_etb_read', 'USER'::"UserRole", 'ETB_READ'::"Permission", CURRENT_TIMESTAMP),
    ('perm_user_einsatz_read', 'USER'::"UserRole", 'EINSATZ_READ'::"Permission", CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;