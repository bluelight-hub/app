import { HelmetOptions } from 'helmet';

/**
 * Sicherheitskonfiguration für die Anwendung.
 * Definiert Helmet-Optionen und andere sicherheitsrelevante Einstellungen.
 */

/**
 * Helmet-Konfiguration für sichere HTTP-Header
 */
export const helmetConfig: HelmetOptions = {
  // Content Security Policy - Verhindert XSS-Angriffe
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
    },
  },
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Für Swagger UI deaktiviert
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
  // XSS Filter - Aktiviert XSS-Filter in älteren Browsern
  xssFilter: true,
};

/**
 * CORS-Konfiguration für verschiedene Umgebungen
 */
export const corsConfig = {
  development: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Total-Count'],
  },
  production: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Total-Count'],
  },
};

/**
 * Cookie-Konfiguration für JWT-Tokens
 */
export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
  path: '/',
};

/**
 * Refresh-Token Cookie-Konfiguration
 */
export const refreshCookieConfig = {
  ...cookieConfig,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Tage
  path: '/api/auth/refresh',
};
