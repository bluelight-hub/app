-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "label" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" VARCHAR(100) NOT NULL,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add inviteCodeId to ServerAccessToken
ALTER TABLE "server_access_tokens" ADD COLUMN "inviteCodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "idx_invite_code" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "idx_invite_expires" ON "invite_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_invite_created_by" ON "invite_codes"("createdById");

-- CreateIndex: Composite index for findAllActive() query performance
CREATE INDEX "idx_invite_active_codes" ON "invite_codes"("isRevoked", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "server_access_tokens_inviteCodeId_key" ON "server_access_tokens"("inviteCodeId");

-- AddForeignKey: InviteCode.createdBy -> User.id
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ServerAccessToken.inviteCodeId -> InviteCode.id
ALTER TABLE "server_access_tokens" ADD CONSTRAINT "server_access_tokens_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "invite_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
