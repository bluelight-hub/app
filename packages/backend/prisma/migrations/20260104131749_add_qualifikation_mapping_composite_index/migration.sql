-- DropIndex
DROP INDEX "integration_credentials_accessTokenExpiresAt_idx";

-- CreateIndex
CREATE INDEX "integration_credentials_isActive_accessTokenExpiresAt_idx" ON "integration_credentials"("isActive", "accessTokenExpiresAt");

-- CreateIndex
CREATE INDEX "qualifikation_mappings_externalSource_qualifikationId_idx" ON "qualifikation_mappings"("externalSource", "qualifikationId");
