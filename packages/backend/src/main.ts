import * as process from 'node:process';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as packageJson from '../package.json';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { corsConfig, helmetConfig } from './config/security.config';

require('@dotenvx/dotenvx').config();

/**
 * Bootstrap-Funktion zum Initialisieren und Starten der NestJS-Anwendung.
 * Konfiguriert API-Versionierung, Swagger-Dokumentation, CORS und Validierungs-Pipes.
 *
 * @returns {Promise<void>} Promise, das aufgelöst wird, wenn die Anwendung gestartet ist
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const trustProxy = process.env.TRUSTED_PROXIES?.split(',').map((value) => value.trim()) || false;
  logger.log(`TRUSTED_PROXIES: ${trustProxy}`);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', trustProxy);

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v-',
    defaultVersion: 'alpha',
  });

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  const config = new DocumentBuilder()
    .setTitle('BlueLight Hub API')
    .setDescription('BlueLight Hub API for the BlueLight Hub application')
    .setVersion(packageJson.version)
    .addBearerAuth()
    .build();

  // Get config service to determine environment
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';
  const appUrl = configService.get('APP_URL', 'http://localhost:3000');

  const document = SwaggerModule.createDocument(app, config);
  document.servers = [
    {
      url: appUrl,
      description: isProduction ? 'Production Server' : 'Development Server',
    },
  ];

  SwaggerModule.setup('api', app, document, {});

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

  // Enable transform interceptor globally
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector, configService));

  const port = configService.get('BACKEND_PORT') || configService.get('PORT') || 3000;

  await app.listen(port);
  Logger.log(
    `Application is running in ${isProduction ? 'production' : 'development'} mode`,
    'Bootstrap',
  );
  Logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
