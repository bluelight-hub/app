import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { TestDbUtils } from './test-db.utils';
import { AppModule } from '../../src/app.module';

/**
 * Factory für das Erstellen von Test-Applikationen
 *
 * Erstellt eine vollständig konfigurierte NestJS-Applikation für E2E-Tests
 * mit allen notwendigen Middlewares und Pipes.
 */
export class TestAppFactory {
  private static app: INestApplication;

  /**
   * Erstellt und initialisiert eine Test-Applikation
   *
   * @returns Initialisierte NestJS-Applikation für Tests
   */
  static async create(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();

    // Konfiguriere App wie in main.ts
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v-',
      defaultVersion: 'alpha',
    });

    app.setGlobalPrefix('api', {
      exclude: ['/'],
    });

    // Apply cookie parser middleware
    app.use(cookieParser());

    // Enable validation pipes globally
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // CORS für Tests aktivieren
    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();
    this.app = app;

    return app;
  }

  /**
   * Schließt die Test-Applikation und räumt Test-Benutzer auf
   */
  static async close(): Promise<void> {
    if (this.app) {
      await TestDbUtils.cleanTestUsers(['loadingtest', 'testuser']);

      await this.app.close();
      this.app = null;
    }
  }

  /**
   * Gibt die aktuelle Test-Applikation zurück
   *
   * @returns Aktuelle Test-Applikation oder null
   */
  static getApp(): INestApplication | null {
    return this.app;
  }
}
