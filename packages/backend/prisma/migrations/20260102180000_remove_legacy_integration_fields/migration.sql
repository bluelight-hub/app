-- DropColumn: Legacy-Felder entfernen (nicht mehr verwendet seit OAuth2-Umstellung)
-- orgKuerzel und encryptedToken wurden durch OAuth2-Felder ersetzt
ALTER TABLE "integration_credentials" DROP COLUMN "encryptedToken";
ALTER TABLE "integration_credentials" DROP COLUMN "orgKuerzel";
