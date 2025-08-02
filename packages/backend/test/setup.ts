/**
 * E2E Test Setup
 *
 * Globale Konfiguration und Setup für alle E2E-Tests.
 * Wird vor allen Tests ausgeführt, um die Testumgebung vorzubereiten.
 */

import { TestDbUtils } from './utils/test-db.utils';

// Setze Umgebungsvariablen für Tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Erweitere Jest Timeouts für E2E Tests (Container-Start kann dauern)
jest.setTimeout(60000);

// Unterdrücke Console-Logs während Tests (außer Errors)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Globale Test-Hooks für Container-Management
beforeAll(async () => {
  // Starte PostgreSQL Container und initialisiere Datenbank
  await TestDbUtils.initialize();
});

afterAll(async () => {
  // Cleanup: Schließe Verbindungen und stoppe Container
  await TestDbUtils.disconnect();
  await TestDbUtils.stopContainer();
});
