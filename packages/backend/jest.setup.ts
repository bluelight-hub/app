/**
 * Jest Setup File - Lädt .env für Integration Tests.
 *
 * Diese Datei wird vor allen Tests ausgeführt (siehe jest.config.js).
 * Sie lädt die .env Datei, damit DATABASE_URL verfügbar ist.
 * In CI-Umgebungen werden Test-Secrets für Auth gesetzt.
 */

import * as dotenvx from '@dotenvx/dotenvx';
import { resolve } from 'node:path';

// Load .env from backend root
dotenvx.config({ path: resolve(__dirname, '.env') });

/**
 * Test-Secrets für CI-Umgebung wo keine .env Datei existiert.
 * Diese werden für E2E-Tests benötigt die das vollständige AppModule laden.
 */
const TEST_SECRETS = {
  JWT_SECRET: 'test-jwt-secret-for-e2e-tests',
  ADMIN_JWT_SECRET: 'test-admin-jwt-secret-for-e2e-tests',
  // 64 Hex-Zeichen (32 Bytes) für AES-256 Encryption
  INTEGRATION_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

// Setze Test-Secrets wenn nicht in Umgebung vorhanden
// Notwendig damit JwtStrategy und AdminJwtStrategy initialisiert werden können
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = TEST_SECRETS.JWT_SECRET;
}
if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = TEST_SECRETS.ADMIN_JWT_SECRET;
}
// Notwendig für AesEncryptionAdapter (HiOrg Integration)
if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
  process.env.INTEGRATION_ENCRYPTION_KEY = TEST_SECRETS.INTEGRATION_ENCRYPTION_KEY;
}
