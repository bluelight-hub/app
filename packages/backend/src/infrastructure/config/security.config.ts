import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { HelmetOptions } from 'helmet';

/**
 * Sicherheitskonfiguration für die Anwendung.
 * Definiert Helmet-Optionen und andere sicherheitsrelevante Einstellungen.
 */

/**
 * Strikte Helmet-Konfiguration für sichere HTTP-Header (Anwendungsstandard)
 *
 * Diese Konfiguration setzt verschiedene Sicherheits-Header,
 * um die Anwendung gegen gängige Webangriffe zu schützen.
 * Enthält CSP, HSTS, X-Frame-Options und weitere Schutzmaßnahmen.
 * CSP ist restriktiv und erlaubt keine unsicheren Inline-Skripte oder -Stile.
 *
 * @constant {HelmetOptions}
 */
export const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"], // Keine unsicheren Inline-Stile
      scriptSrc: ["'self'"], // Keine unsicheren Inline-Skripte
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

/**
 * Gelockerte Helmet-Konfiguration speziell für die Swagger UI
 *
 * Diese Konfiguration ist eine Erweiterung der strikten Konfiguration,
 * erlaubt jedoch 'unsafe-inline' für Skripte und Stile, was für die
 * Funktionsfähigkeit der Swagger UI notwendig ist.
 * Sie sollte NUR für den Swagger-Endpunkt verwendet werden.
 *
 * @constant {HelmetOptions}
 */
export const swaggerHelmetConfig: HelmetOptions = {
  ...helmetConfig,
  contentSecurityPolicy: {
    directives: {
      ...(helmetConfig.contentSecurityPolicy as { directives: Record<string, unknown> }).directives,
      styleSrc: ["'self'", "'unsafe-inline'"], // Erforderlich für Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // Erforderlich für Swagger UI
    },
  },
  crossOriginEmbedderPolicy: false, // Erforderlich für Swagger UI
};

/**
 * CORS-Konfiguration für verschiedene Umgebungen
 *
 * Definiert Cross-Origin Resource Sharing Einstellungen
 * für Development- und Production-Umgebungen.
 *
 * @constant
 */
/**
 * Dynamische Origin-Validierung für Tauri und Development
 */
const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Erlaubte Patterns für Tauri und Development
  const allowedPatterns = [
    /^https?:\/\/localhost(:\d+)?$/, // localhost mit beliebigem Port
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/, // 127.0.0.1 mit beliebigem Port
    /^tauri:\/\/localhost/, // Tauri v1
    /^https:\/\/tauri\.localhost/, // Tauri v2
    /^https?:\/\/\[::1\](:\d+)?$/, // IPv6 localhost
  ];

  // Zusätzliche Origins aus Umgebungsvariablen
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];

  // Prüfe ob Origin erlaubt ist
  const isAllowed = !origin || envOrigins.includes(origin) || allowedPatterns.some((pattern) => pattern.test(origin));

  callback(null, isAllowed);
};

export const corsConfig = {
  development: {
    origin: corsOriginHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Server-Access-Token'],
    exposedHeaders: ['X-Total-Count'],
  } satisfies CorsOptions,
  production: {
    origin: corsOriginHandler, // Gleiche Handler für Production wegen Tauri
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Server-Access-Token'],
    exposedHeaders: ['X-Total-Count'],
  } satisfies CorsOptions,
};
