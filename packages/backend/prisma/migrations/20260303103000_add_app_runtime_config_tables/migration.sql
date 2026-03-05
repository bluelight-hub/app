-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "value_json" JSONB NOT NULL,
    "source_hint" VARCHAR(32) NOT NULL DEFAULT 'ui',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config_secret" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "ciphertext_payload" JSONB NOT NULL,
    "kek_version" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_secret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_config_key_key" ON "app_config"("key");

-- CreateIndex
CREATE INDEX "idx_app_config_source_hint" ON "app_config"("source_hint");

-- CreateIndex
CREATE UNIQUE INDEX "app_config_secret_key_key" ON "app_config_secret"("key");

-- CreateIndex
CREATE INDEX "idx_app_config_secret_kek_version" ON "app_config_secret"("kek_version");
