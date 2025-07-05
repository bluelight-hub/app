---
description: 
globs: packages/backend/**/config/**,packages/backend/**/*.config.ts
alwaysApply: false
---
# NestJS Konfigurations-Patterns

## Context
- Gilt für Konfigurationsmanagement im Backend (`**/config/**`, `**/*.config.ts`)
- Standardisiert die Verwaltung von Konfigurationen in NestJS-Anwendungen
- Verbessert Sicherheit, Wartbarkeit und Umgebungsspezifische Konfiguration

## Requirements

1. **Struktur und Organisation**
   - Konfigurationsmodule mit Suffix `ConfigModule` benennen
   - Zentrales Konfigurationsverzeichnis `/config` erstellen
   - Umgebungsspezifische Konfigurationen trennen
   - Konfigurationsdateien nach Domänen oder Funktionen organisieren

2. **Environment Variables**
   - Umgebungsvariablen für alle konfigurierbaren Werte verwenden
   - `.env`-Dateien nur für Entwicklungsumgebungen
   - Sensible Daten nie in Versionskontrolle einchecken
   - Validierung von erforderlichen Umgebungsvariablen

3. **Validation**
   - Joi oder class-validator für Schema-Validierung verwenden
   - Standardwerte für optionale Konfigurationen definieren
   - Konsistente Typkonvertierung für Umgebungsvariablen
   - Frühes Fehlschlagen bei ungültiger Konfiguration

4. **Zugriffsmuster**
   - ConfigService für den Zugriff auf Konfigurationswerte
   - Typsichere Konfigurationszugriffe durch Typendefinitionen
   - Namespaces für domänenspezifische Konfigurationen
   - Einheitliche Zugriffsmuster in allen Services

5. **Sicherheit**
   - Sensible Konfigurationswerte niemals loggen
   - Secrets und Credentials nur über Umgebungsvariablen oder sichere Vaults
   - Verschlüsselung für sensible Konfigurationsdaten in Ruhe
   - Zugriffsberechtigungen für Konfigurationsdateien einschränken

6. **Konfigurationsnamespaces**
   - Konfiguration in logische Namespaces unterteilen
   - forFeature()-Methoden für domänenspezifische Konfigurationen
   - Konsistente Präfixe für zusammengehörige Konfigurationen
   - Klare Trennung zwischen App-, Infrastruktur- und Feature-Konfigurationen

7. **Integration mit Service Discovery**
   - Unterstützung für externe Konfigurationsanbieter
   - Konsistente Integration mit Service-Discovery-Mechanismen
   - Dynamisches Konfigurationsreloading wo sinnvoll
   - Failover-Strategien bei Konfigurationsfehlern

8. **Dokumentation**
   - Alle Konfigurationsoptionen dokumentieren
   - Beispielkonfigurationen bereitstellen
   - Standardwerte und erlaubte Wertebereiche dokumentieren
   - README für Konfigurationsanweisungen erstellen

## Examples

```typescript
// Gutes Beispiel: app.config.ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * Validierungsschema für Anwendungskonfiguration.
 */
export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ENABLED: Joi.boolean().default(false),
  CORS_ORIGIN: Joi.string().when('CORS_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  RATE_LIMIT_ENABLED: Joi.boolean().default(false),
  RATE_LIMIT_MAX: Joi.number().when('RATE_LIMIT_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

/**
 * Definiert die Anwendungskonfiguration.
 */
export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api',
  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
    origin: process.env.CORS_ORIGIN,
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    max: process.env.RATE_LIMIT_MAX 
      ? parseInt(process.env.RATE_LIMIT_MAX, 10) 
      : 100,
    windowMs: 15 * 60 * 1000, // 15 Minuten
  },
}));
```

```typescript
// Gutes Beispiel: database.config.ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * Validierungsschema für Datenbankkonfiguration.
 */
export const databaseConfigValidationSchema = Joi.object({
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SCHEMA: Joi.string().default('public'),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SSL_ENABLED: Joi.boolean().default(false),
  DATABASE_MAX_CONNECTIONS: Joi.number().default(100),
});

/**
 * Definiert die Datenbankkonfiguration.
 */
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  schema: process.env.DATABASE_SCHEMA || 'public',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
  ssl: {
    enabled: process.env.DATABASE_SSL_ENABLED === 'true',
    rejectUnauthorized: false,
  },
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) || 100,
}));
```

```typescript
// Gutes Beispiel: config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

import appConfig, { appConfigValidationSchema } from './app.config';
import databaseConfig, { databaseConfigValidationSchema } from './database.config';
import authConfig, { authConfigValidationSchema } from './auth.config';

/**
 * Konfigurationsmodul, das alle Konfigurationen der Anwendung verwaltet.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}.local`, '.env.local', '.env'],
      validationSchema: Joi.object({
        ...appConfigValidationSchema.keys(),
        ...databaseConfigValidationSchema.keys(),
        ...authConfigValidationSchema.keys(),
      }),
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      expandVariables: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

```typescript
// Gutes Beispiel: Verwendung der Konfiguration in einem Service
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly apiPrefix: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    // Typsicherer Zugriff auf Konfigurationswerte
    this.apiPrefix = this.configService.get<string>('app.apiPrefix');
    this.isProduction = this.configService.get<string>('app.env') === 'production';
  }

  getBaseUrl(): string {
    return `/${this.apiPrefix}`;
  }

  isProductionMode(): boolean {
    return this.isProduction;
  }
}
```

```typescript
// Schlechtes Beispiel
// Direkte Verwendung von process.env ohne Validierung und Typensicherheit
@Injectable()
class ConfigService {
  getDbConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    };
  }
  
  getServerConfig() {
    return {
      port: process.env.PORT || 3000,
      // Fehlende Validierung und Typkonvertierung
    };
  }
}
``` 