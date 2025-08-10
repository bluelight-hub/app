-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateTable
CREATE TABLE "public"."User"
(
    "id"               TEXT                NOT NULL,
    "username"         VARCHAR(100)        NOT NULL,
    "passwordHash"     TEXT,
    "role"             "public"."UserRole" NOT NULL DEFAULT 'USER',
    "isActive"         BOOLEAN             NOT NULL DEFAULT true,
    "lastLoginAt"      TIMESTAMP(3),
    "failedLoginCount" INTEGER             NOT NULL DEFAULT 0,
    "lockedUntil"      TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User" ("username");

-- CreateIndex
CREATE INDEX "idx_user_username" ON "public"."User" ("username");

-- CreateIndex
CREATE INDEX "idx_user_role_active" ON "public"."User" ("role", "isActive");

-- CreateIndex
CREATE INDEX "idx_user_last_login" ON "public"."User" ("lastLoginAt");
