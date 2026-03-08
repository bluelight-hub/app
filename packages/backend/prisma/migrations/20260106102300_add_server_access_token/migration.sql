-- CreateTable
CREATE TABLE "server_access_tokens"
(
    "id"         TEXT         NOT NULL,
    "tokenHash"  VARCHAR(60)  NOT NULL,
    "name"       VARCHAR(100),
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt"  TIMESTAMP(3),
    "isRevoked"  BOOLEAN      NOT NULL DEFAULT false,
    "revokedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "server_access_tokens_tokenHash_key" ON "server_access_tokens" ("tokenHash");

-- CreateIndex
CREATE INDEX "idx_server_access_token_hash" ON "server_access_tokens" ("tokenHash");

-- CreateIndex
CREATE INDEX "idx_server_access_token_validate" ON "server_access_tokens" ("tokenHash", "isRevoked");

-- CreateIndex
CREATE INDEX "idx_server_access_token_active" ON "server_access_tokens" ("isRevoked", "expiresAt");
