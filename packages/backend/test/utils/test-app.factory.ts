import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { cleanTestUsers } from './test-db.utils';

/**
 * Factory für das Erstellen von Test-Applikationen
 *
 * Erstellt eine vollständig konfigurierte NestJS-Applikation für E2E-Tests
 * mit allen notwendigen Middlewares und Pipes.
 */

let app: INestApplication | null = null;

/**
 * Erstellt und initialisiert eine Test-Applikation
 *
 * @returns Initialisierte NestJS-Applikation für Tests
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const testApp = moduleFixture.createNestApplication();

  // Konfiguriere App wie in main.ts
  testApp.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v-',
    defaultVersion: 'alpha',
  });

  testApp.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Apply cookie parser middleware
  testApp.use(cookieParser());

  // Enable validation pipes globally
  testApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS für Tests aktivieren
  testApp.enableCors({
    origin: true,
    credentials: true,
  });

  await testApp.init();
  app = testApp;

  return testApp;
}

/**
 * Schließt die Test-Applikation und räumt Test-Benutzer auf
 */
export async function closeTestApp(): Promise<void> {
  if (app) {
    await cleanTestUsers(['loadingtest', 'testuser', 'test_', 'logout_test', 'logout-test']);

    await app.close();
    app = null;
  }
}

/**
 * Gibt die aktuelle Test-Applikation zurück
 *
 * @returns Aktuelle Test-Applikation oder null
 */
export function getTestApp(): INestApplication | null {
  return app;
}

// Export für Backward Compatibility
export const TestAppFactory = {
  create: createTestApp,
  close: closeTestApp,
  getApp: getTestApp,
};
