import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { HelmetOptions } from 'helmet';

/**
 * Sicherheitskonfiguration für die Anwendung.
 * Definiert Helmet-Optionen und andere sicherheitsrelevante Einstellungen.
 */

/**
 * Gemeinsame Helmet-Optionen, die für alle Konfigurationen gelten.
 */
const sharedHelmetOptions: HelmetOptions = {
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Frameguard - Verhindert Clickjacking
  frameguard: { action: 'deny' },
  // Hide Powered By - Versteckt X-Powered-By Header
  hidePoweredBy: true,
  // HSTS - HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true,
  },
  // IE No Open - Verhindert IE Downloads zu öffnen
  ieNoOpen: true,
  // No Sniff - Verhindert MIME-Type Sniffing
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

/**
 * Gemeinsame CSP-Directives.
 */
const sharedCSPDirectives = {
  defaultSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
  frameAncestors: ["'none'"],
};

/**
 * Strikte Helmet-Konfiguration (Standard für die App)
 *
 * Deaktiviert 'unsafe-inline' in der CSP für maximale Sicherheit.
 */
export const strictHelmetConfig: HelmetOptions = {
  ...sharedHelmetOptions,
  contentSecurityPolicy: {
    directives: {
      ...sharedCSPDirectives,
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: true,
};

/**
 * Helmet-Konfiguration für Swagger UI
 *
 * Erlaubt 'unsafe-inline' in der CSP, damit Swagger UI korrekt funktioniert.
 * Diese Konfiguration sollte NUR für die Swagger-Routen verwendet werden.
 */
export const swaggerHelmetConfig: HelmetOptions = {
  ...sharedHelmetOptions,
  contentSecurityPolicy: {
    directives: {
      ...sharedCSPDirectives,
      styleSrc: ["'self'", "'unsafe-inline'"], // Für Swagger UI benötigt
      scriptSrc: ["'self'", "'unsafe-inline'"], // Für Swagger UI benötigt
    },
  },
  crossOriginEmbedderPolicy: false, // Für Swagger UI deaktiviert
};

/**
 * Abwärtskompatibler Export (entspricht der bisherigen helmetConfig)
 * @deprecated Nutze strictHelmetConfig oder swaggerHelmetConfig je nach Route
 */
export const helmetConfig: HelmetOptions = swaggerHelmetConfig;

/**
 * CORS-Konfiguration für verschiedene Umgebungen
 *
 * Definiert Cross-Origin Resource Sharing Einstellungen
 * für Development- und Production-Umgebungen.
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
