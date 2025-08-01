import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as packageJson from '../package.json';
import { AppModule } from './app.module';
import { logger } from './logger/consola.logger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { corsConfig, helmetConfig } from './config/security.config';

require('@dotenvx/dotenvx').config();

/**
 * Bootstrap-Funktion zum Initialisieren und Starten der NestJS-Anwendung.
 * Konfiguriert API-Versionierung, Swagger-Dokumentation, CORS und Validierungs-Pipes.
 *
 * @returns {Promise<void>} Promise, das aufgelöst wird, wenn die Anwendung gestartet ist
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.MEDIA_TYPE,
    key: 'version',
    defaultVersion: '0.1',
  });

  const config = new DocumentBuilder()
    .setTitle('BlueLight Hub API')
    .setDescription('BlueLight Hub API for the BlueLight Hub application')
    .setVersion(packageJson.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.servers = [
    {
      url: 'http://localhost:3000',
      description: 'Local Environment',
    },
  ];

  SwaggerModule.setup('api', app, document, {});

  // Get config service to determine environment
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';

  // Apply Helmet middleware for security headers
  app.use(helmet(helmetConfig));

  // Apply cookie parser middleware
  app.use(cookieParser());

  // Configure CORS based on environment
  const corsOptions = isProduction ? corsConfig.production : corsConfig.development;
  app.enableCors(corsOptions);

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get('BACKEND_PORT') || configService.get('PORT') || 3000;

  await app.listen(port);
  logger.success(`Application is running on: http://localhost:${port}`);
}

bootstrap();
