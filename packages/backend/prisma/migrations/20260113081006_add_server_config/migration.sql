-- DropIndex
DROP INDEX "idx_server_access_token_last_used";

-- CreateTable
CREATE TABLE "server_config"
(
    "id"           TEXT         NOT NULL DEFAULT 'singleton',
    "insecureMode" BOOLEAN      NOT NULL DEFAULT true,
    "migratedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_config_pkey" PRIMARY KEY ("id")
);
