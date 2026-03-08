import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { HelmetOptions } from 'helmet';
import { AppConfigService } from '@/infrastructure/services/app-config.service';

/**
 * Sicherheitskonfiguration für die Anwendung.
 * Definiert Helmet-Optionen und andere sicherheitsrelevante Einstellungen.
 */

/**
 * Helmet-Konfiguration für sichere HTTP-Header.
 */
export const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Für Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // Für Swagger UI
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

const builtInCorsPatterns = [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/, /^tauri:\/\/localhost/, /^https:\/\/tauri\.localhost/, /^https?:\/\/\[::1\](:\d+)?$/];

/**
 * Dynamische Origin-Validierung für Tauri, Development und konfigurierbare Patterns.
 * Diese Policy ist der zentrale Entscheidungsort für CORS und PNA.
 *
 * Unterstützte Umgebungsvariablen:
 * - ALLOWED_ORIGINS: Komma-separierte Liste expliziter Origins
 * - ALLOWED_ORIGIN_PATTERNS: Komma-separierte Liste von Regex-Patterns
 * - Wildcard "*" in ALLOWED_ORIGINS erlaubt alle Origins (NUR für Entwicklung!)
 */
export function isCorsOriginAllowed(origin: string | undefined, runtimeConfig?: AppConfigService): boolean {
  const envOrigins = splitCsv(getConfigValue('ALLOWED_ORIGINS', runtimeConfig));

  if (envOrigins.includes('*')) {
    return true;
  }

  if (!origin) {
    return true;
  }

  if (envOrigins.includes(origin)) {
    return true;
  }

  const patternStrings = splitCsv(getConfigValue('ALLOWED_ORIGIN_PATTERNS', runtimeConfig));
  const allPatterns = [...builtInCorsPatterns, ...toRegExpPatterns(patternStrings)];
  return allPatterns.some((pattern) => pattern.test(origin));
}

const createCorsOriginHandler = (runtimeConfig?: AppConfigService) => (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  callback(null, isCorsOriginAllowed(origin, runtimeConfig));
};

export const corsOriginHandler = createCorsOriginHandler();

export function createCorsConfig(runtimeConfig?: AppConfigService): {
  development: CorsOptions;
  production: CorsOptions;
} {
  const runtimeCorsOriginHandler = createCorsOriginHandler(runtimeConfig);

  const corsOptions: CorsOptions = {
    origin: runtimeCorsOriginHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Server-Access-Token'],
    exposedHeaders: ['X-Total-Count'],
  };

  return {
    development: corsOptions,
    production: corsOptions,
  };
}

// Backward-Compatibility fuer bestehende Imports ohne RuntimeConfig.
export const corsConfig = createCorsConfig();

function splitCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toRegExpPatterns(values: string[]): RegExp[] {
  const patterns: RegExp[] = [];

  for (const value of values) {
    try {
      patterns.push(new RegExp(value));
    } catch {
      // Invalides Pattern ignorieren (bewusster Safe-Fallback)
    }
  }

  return patterns;
}

function getConfigValue(key: string, runtimeConfig?: AppConfigService): string | undefined {
  if (runtimeConfig) {
    return runtimeConfig.get<string | undefined>(key);
  }

  return process.env[key];
}
