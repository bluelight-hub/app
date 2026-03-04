import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import type { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as process from 'node:process';
import * as packageJson from '../package.json';
import { AppModule } from './app.module';
import { validateInsecureMode } from './infrastructure/config/bootstrap-validation';
import { HealthModule } from './infrastructure/health/health.module';
import { PerformanceInterceptor } from './infrastructure/http/interceptors/performance.interceptor';
import { TransformInterceptor } from './infrastructure/http/interceptors/transform.interceptor';
import { createPrivateNetworkAccessMiddleware } from './infrastructure/config/private-network-access.middleware';
import { corsConfig, helmetConfig, isCorsOriginAllowed } from './infrastructure/config/security.config';
import { BefehlModule } from './modules/befehl/befehl.module';
import { EinsatzModule } from './modules/einsatz/einsatz.module';

require('@dotenvx/dotenvx').config();

/**
 * Bootstrap-Funktion zum Initialisieren und Starten der NestJS-Anwendung.
 * Konfiguriert API-Versionierung, Swagger-Dokumentation, CORS und Validierungs-Pipes.
 *
 * @returns {Promise<void>} Promise, das aufgelöst wird, wenn die Anwendung gestartet ist
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const proxies =
    process.env.TRUSTED_PROXIES?.split(',')
      .map((v) => v.trim())
      .filter(Boolean) ?? [];
  const trustProxy = proxies.length > 0 ? proxies : false;
  logger.log(`TRUSTED_PROXIES: ${trustProxy}`);

  // HTTPS Configuration
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
  let httpsOptions: HttpsOptions | undefined;

  if (httpsEnabled) {
    const keyPath = process.env.HTTPS_KEY_PATH;
    const certPath = process.env.HTTPS_CERT_PATH;

    if (keyPath && certPath) {
      try {
        const fs = require('node:fs');
        const path = require('node:path');
        // Resolve paths relative to process.cwd() (usually packages/backend)
        const absoluteKeyPath = path.resolve(process.cwd(), keyPath);
        const absoluteCertPath = path.resolve(process.cwd(), certPath);

        if (fs.existsSync(absoluteKeyPath) && fs.existsSync(absoluteCertPath)) {
          httpsOptions = {
            key: fs.readFileSync(absoluteKeyPath),
            cert: fs.readFileSync(absoluteCertPath),
          };
          logger.log('🔐 HTTPS Enabled', 'Bootstrap');
        } else {
          logger.warn(`⚠️ HTTPS Enabled but cert files not found at ${absoluteKeyPath} or ${absoluteCertPath}`, 'Bootstrap');
        }
      } catch (error) {
        logger.error('❌ Failed to load HTTPS certificates', error, 'Bootstrap');
      }
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    rawBody: true,
    httpsOptions,
  });

  app.set('trust proxy', trustProxy);

  // PNA-Header werden nur für valide Private-Network-Preflights gesetzt.
  // Die eigentliche Origin-Freigabe bleibt zentral in der CORS-Policy (isCorsOriginAllowed + enableCors).
  app.use(createPrivateNetworkAccessMiddleware(isCorsOriginAllowed));

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v-',
    defaultVersion: 'alpha',
  });

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Get config service to determine environment
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';
  const appUrl = configService.get('APP_URL', 'http://localhost:3091');
  const serverEntry = { url: appUrl, description: isProduction ? 'Production Server' : 'Development Server' };

  /** Gemeinsame Auth-Schema-Konfiguration für beide Swagger-Dokumente */
  const apiKeySchema = {
    type: 'apiKey' as const,
    name: 'X-Server-Access-Token',
    in: 'header' as const,
    description: 'Server-Access-Token für die Server-Authentifizierung. Mehrere aktive Tokens werden unterstützt. lastUsedAt wird bei jeder Nutzung aktualisiert.',
  };
  const bearerAuthSchema = {
    type: 'http' as const,
    scheme: 'bearer',
    bearerFormat: 'JWT',
    name: 'Authorization',
    description: 'Admin JWT Token für geschützte Endpoints',
    in: 'header' as const,
  };

  const tokenDescription = `## Server-Access-Token (X-Server-Access-Token)

Alle API-Endpunkte (außer /health und /setup) erfordern einen gültigen Server-Access-Token im Header:

\`\`\`
X-Server-Access-Token: <plaintext_token>
\`\`\`

**Multi-Token Support:**
- Mehrere aktive Tokens gleichzeitig möglich
- Jedes Token hat einen eindeutigen Namen zur Identifikation
- \`lastUsedAt\` wird bei jeder erfolgreichen Validierung aktualisiert
- Tokens können individuell deaktiviert/reaktiviert/rotiert werden

**Token-Namenskonventionen (Best Practices):**
- \`Desktop Hauptwache\` - für Desktop-App der Hauptwache
- \`Mobile SEG Nord\` - für Mobile App der SEG Nord
- \`Integration Server\` - für automatisierte Systeme
- Bei Rotation: Datum im Namen (z.B. "Desktop HW 2026-01")`;

  // --- Alpha Swagger (ALLE Module) ---
  const alphaConfig = new DocumentBuilder()
    .setTitle('BlueLight Hub API (Alpha)')
    .setDescription(`BlueLight Hub API for the BlueLight Hub application.\n\n${tokenDescription}`)
    .setVersion(`${packageJson.version}-alpha`)
    .addApiKey(apiKeySchema, 'server-access-token')
    .addBearerAuth(bearerAuthSchema, 'admin-jwt')
    .build();

  const alphaDocument = SwaggerModule.createDocument(app, alphaConfig);
  alphaDocument.servers = [serverEntry];
  SwaggerModule.setup('api/alpha', app, alphaDocument);
  SwaggerModule.setup('api', app, alphaDocument); // Backward-Compat: /api zeigt weiterhin Alpha-Spec

  // --- v1 Swagger (nur stabile Module) ---
  const v1Config = new DocumentBuilder()
    .setTitle('BlueLight Hub API v1 (Stable)')
    .setDescription(`Stabile API-Verträge für externe Integrationen.\n\nBreaking Changes werden mit 6 Monaten Vorlauf angekündigt.\n\n${tokenDescription}`)
    .setVersion('1.0.0')
    .addApiKey(apiKeySchema, 'server-access-token')
    .addBearerAuth(bearerAuthSchema, 'admin-jwt')
    .build();

  const v1Document = SwaggerModule.createDocument(app, v1Config, {
    include: [BefehlModule, EinsatzModule, HealthModule],
  });

  // Post-Processing: v1 Spec zeigt nur v-1 und versionsneutrale Pfade
  // (SwaggerModule include filtert nur Module, nicht Versionen)
  for (const path of Object.keys(v1Document.paths)) {
    if (path.includes('/v-alpha/')) {
      delete v1Document.paths[path];
    }
  }

  v1Document.servers = [serverEntry];
  SwaggerModule.setup('api/v1', app, v1Document);

  // Apply Helmet middleware for security headers
  app.use(helmet(helmetConfig));

  // Apply cookie parser middleware
  app.use(cookieParser());

  // Increase body size limit for file uploads (screenshots)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // Configure CORS based on environment.
  // Security rationale: Access-Control-Allow-Origin and credentials handling are emitted only by this central CORS config.

  const corsOptions = isProduction ? corsConfig.production : corsConfig.development;
  app.enableCors(corsOptions);

  // Serve static files (for uploaded screenshots)
  // Use ENV-configured path or default (relative to dist/src/main.js)
  const uploadsBase = configService.get<string>('UPLOADS_PATH') || '../../uploads';
  const uploadsPath = require('node:path').resolve(__dirname, uploadsBase);
  logger.log(`Serving static files from: ${uploadsPath}`);
  app.useStaticAssets(uploadsPath, { prefix: '/uploads' });

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable interceptors globally
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new PerformanceInterceptor(), new TransformInterceptor(reflector));

  const port = configService.get('BACKEND_PORT') || configService.get('PORT') || 3091;

  await app.listen(port);
  const url = await app.getUrl();
  Logger.log(`Application is running in ${isProduction ? 'production' : 'development'} mode`, 'Bootstrap');
  Logger.log(`Application is running on: ${url}`);

  // INSECURE_MODE Validierung - Security Check VOR App-Start abschliessen
  // Wirft Exception wenn INSECURE_MODE in Production aktiviert ist
  validateInsecureMode(configService.get<string>('INSECURE_MODE'), isProduction);
}

bootstrap();
