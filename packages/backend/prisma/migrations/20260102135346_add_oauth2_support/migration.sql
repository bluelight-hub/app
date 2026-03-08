-- AlterTable
ALTER TABLE "integration_credentials"
    ADD COLUMN "accessTokenExpiresAt"  TIMESTAMP(3),
    ADD COLUMN "encryptedAccessToken"  TEXT,
    ADD COLUMN "encryptedRefreshToken" TEXT,
    ADD COLUMN "lastTokenRefreshAt"    TIMESTAMP(3),
    ADD COLUMN "oauthScopes"           VARCHAR(500),
    ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "oauth2_states"
(
    "id"              TEXT         NOT NULL,
    "state"           VARCHAR(64)  NOT NULL,
    "codeVerifier"    VARCHAR(128) NOT NULL,
    "integrationType" VARCHAR(50)  NOT NULL,
    "redirectUri"     VARCHAR(500) NOT NULL,
    "createdBy"       VARCHAR(100) NOT NULL,
    "expiresAt"       TIMESTAMP(3) NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth2_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_states_state_key" ON "oauth2_states" ("state");

-- CreateIndex
CREATE INDEX "oauth2_states_state_idx" ON "oauth2_states" ("state");

-- CreateIndex
CREATE INDEX "oauth2_states_expiresAt_idx" ON "oauth2_states" ("expiresAt");

-- CreateIndex
CREATE INDEX "integration_credentials_accessTokenExpiresAt_idx" ON "integration_credentials" ("accessTokenExpiresAt");
