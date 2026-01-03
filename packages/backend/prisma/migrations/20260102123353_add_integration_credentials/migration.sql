-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "orgKuerzel" VARCHAR(100) NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_type_key" ON "integration_credentials"("type");

-- CreateIndex
CREATE INDEX "integration_credentials_type_idx" ON "integration_credentials"("type");

-- CreateIndex
CREATE INDEX "integration_credentials_isActive_idx" ON "integration_credentials"("isActive");
