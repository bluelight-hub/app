import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { decryptV1String, encryptV1String, parseMasterSecretKey } from '@/infrastructure/security/master-key-crypto';
import * as crypto from 'node:crypto';

type RuntimeConfigSource = 'default' | 'db' | 'env_override';

export interface RuntimeConfigEntry {
  key: string;
  value: string | null;
  source: RuntimeConfigSource;
  sensitive: boolean;
  category: 'runtime' | 'internal_secret' | 'external_secret';
  editable: boolean;
  configured: boolean;
}

export interface ConfigDoctorReport {
  dbAvailable: boolean;
  dbAvailabilityReasons: string[];
  missingRequiredKeys: string[];
  activeEnvOverrides: string[];
  legacyEnvFallbackKeys: string[];
  legacyEnvCleanupKeys: string[];
  decryptionErrors: string[];
  runtimeConfigCount: number;
  runtimeSecretCount: number;
}

export interface MigrateLegacyRuntimeConfigResult {
  migratedKeys: string[];
  skippedKeys: string[];
  failedKeys: {
    key: string;
    reason: string;
  }[];
  summary: {
    requested: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
}

const CONFIG_SECRET_SCOPE = 'bluelight-hub/config-secrets/v1';

interface RuntimeConfigCatalogEntry {
  key: string;
  sensitive: boolean;
  scope: 'default' | 'db';
  category: 'runtime' | 'internal_secret' | 'external_secret';
  editable: boolean;
  runtimeDefault?: string;
}

const RUNTIME_CONFIG_CATALOG: readonly RuntimeConfigCatalogEntry[] = [
  { key: 'APP_URL', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: 'http://localhost:3091' },
  { key: 'FRONTEND_URL', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: 'http://localhost:3090' },
  { key: 'SERVER_NAME', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: 'Bluelight Hub' },
  { key: 'ALLOWED_ORIGINS', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '' },
  { key: 'ALLOWED_ORIGIN_PATTERNS', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '' },
  { key: 'CACHE_TTL', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '60000' },
  { key: 'CACHE_MAX_ITEMS', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '100' },
  { key: 'CACHE_STORE', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: 'memory' },
  { key: 'CACHE_IS_GLOBAL', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: 'true' },
  { key: 'JWT_ACCESS_EXPIRES_IN', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '15m' },
  { key: 'JWT_REFRESH_EXPIRES_IN', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '7d' },
  { key: 'JWT_ADMIN_EXPIRES_IN', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: '15m' },
  { key: 'NOMINATIM_API_URL', sensitive: false, scope: 'default', category: 'runtime', editable: true, runtimeDefault: 'https://nominatim.openstreetmap.org' },
  { key: 'HIORG_OAUTH_CLIENT_ID', sensitive: false, scope: 'default', category: 'runtime', editable: true },
  { key: 'HIORG_OAUTH_CLIENT_SECRET', sensitive: true, scope: 'db', category: 'external_secret', editable: true },
  { key: 'JWT_SECRET', sensitive: true, scope: 'db', category: 'internal_secret', editable: false },
  { key: 'JWT_REFRESH_SECRET', sensitive: true, scope: 'db', category: 'internal_secret', editable: false },
  { key: 'ADMIN_JWT_SECRET', sensitive: true, scope: 'db', category: 'internal_secret', editable: false },
  { key: 'INTEGRATION_ENCRYPTION_KEY', sensitive: true, scope: 'db', category: 'internal_secret', editable: false },
] as const;

const RUNTIME_CONFIG_MAP = new Map<string, RuntimeConfigCatalogEntry>(RUNTIME_CONFIG_CATALOG.map((entry) => [entry.key, entry]));
const RUNTIME_CONFIG_KEYS = [...RUNTIME_CONFIG_MAP.keys()];
const RUNTIME_DEFAULTS = Object.fromEntries(RUNTIME_CONFIG_CATALOG.filter((entry) => entry.runtimeDefault !== undefined).map((entry) => [entry.key, entry.runtimeDefault as string])) as Record<
  string,
  string
>;
const SENSITIVE_RUNTIME_KEYS = new Set(RUNTIME_CONFIG_CATALOG.filter((entry) => entry.sensitive).map((entry) => entry.key));

const ENV_OVERRIDE_ALLOWLIST = new Set([
  'LOG_LEVEL',
  'ERROR_HANDLING_ENABLE_ADVANCED_RETRY',
  'ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION',
  'ERROR_HANDLING_ENABLE_METRICS',
  'ERROR_HANDLING_ENABLE_CIRCUIT_BREAKER',
  'ERROR_HANDLING_ENABLE_RATE_LIMITING',
]);

const REQUIRED_RUNTIME_KEYS = ['APP_URL', 'FRONTEND_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_JWT_SECRET'];
const AUTO_GENERATED_INTERNAL_SECRET_KEYS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_JWT_SECRET', 'INTEGRATION_ENCRYPTION_KEY'] as const;

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly dbRuntimeValues = new Map<string, string>();
  private readonly dbRuntimeSecrets = new Map<string, string>();

  private decryptionErrors: string[] = [];
  private dbAvailable = false;
  private dbAvailabilityReasons: string[] = [];
  private masterKey: Buffer | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async onModuleInit(): Promise<void> {
    this.masterKey = this.tryLoadMasterKey();
    await this.reload();

    if (!this.dbAvailable) {
      return;
    }

    try {
      await this.ensureRequiredRuntimeSecrets({ updatedBy: 'system:boot' });
      await this.reload();
      await this.importLegacyRuntimeEnvToDb({ updatedBy: 'system:boot' });
      await this.reload();
      this.assertNoLegacyEnvSecretsPendingCleanup();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Automatische Secret-Initialisierung/Migration fehlgeschlagen: ${message}`);
      throw error;
    }
  }

  /**
   * Prüft ob die Anwendung in der Produktionsumgebung läuft.
   */
  isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Prüft ob die Anwendung in der Entwicklungsumgebung läuft.
   */
  isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  /**
   * Prüft ob die Anwendung in der Testumgebung läuft.
   */
  isTest(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'test';
  }

  /**
   * Gibt den aktuellen NODE_ENV Wert zurück.
   */
  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  /**
   * Prüft ob HTTPS aktiviert ist (infra-nahe ENV-Konfiguration).
   */
  isHttpsEnabled(): boolean {
    return this.configService.get<string>('HTTPS_ENABLED') === 'true';
  }

  /**
   * Lädt Runtime-Konfiguration und Secrets aus der DB neu.
   */
  async reload(): Promise<void> {
    this.dbRuntimeValues.clear();
    this.dbRuntimeSecrets.clear();
    this.decryptionErrors = [];

    try {
      const [configRows, secretRows] = await Promise.all([this.prisma.appConfig.findMany(), this.prisma.appConfigSecret.findMany()]);

      for (const row of configRows) {
        this.dbRuntimeValues.set(row.key, this.stringifyJsonValue(row.valueJson));
      }

      for (const row of secretRows) {
        const payload = typeof row.ciphertextPayload === 'string' ? row.ciphertextPayload : JSON.stringify(row.ciphertextPayload);

        try {
          const secretValue = this.decryptSecretPayload(payload, row.key);
          this.dbRuntimeSecrets.set(row.key, secretValue);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.decryptionErrors.push(`${row.key}: ${message}`);
        }
      }

      this.dbAvailable = true;
      this.dbAvailabilityReasons = [];
    } catch (error) {
      this.dbAvailable = false;
      this.dbAvailabilityReasons = this.normalizeDbAvailabilityError(error);

      // Erwarteter Zustand während Migration/Bootstrap: Tabellen existieren evtl. noch nicht.
      this.logger.warn(`Runtime-Konfiguration konnte nicht aus DB geladen werden, verwende Fallbacks: ${this.dbAvailabilityReasons.join(' / ')}`);
    }
  }

  /**
   * Proxy-Methode für ConfigService.get mit Runtime-Auflösung.
   */
  get<T = unknown>(propertyPath: string): T | undefined;
  get<T = unknown>(propertyPath: string, defaultValue: T): T;
  get<T = unknown>(propertyPath: string, defaultValue?: T): T | undefined {
    const resolved = this.resolveValue(propertyPath);

    if (resolved !== undefined) {
      return this.castValue(resolved, defaultValue);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return undefined;
  }

  /**
   * Proxy-Methode für ConfigService.getOrThrow mit Runtime-Auflösung.
   */
  getOrThrow<T = unknown>(propertyPath: string): T {
    const value = this.get<T | undefined>(propertyPath);

    if (value === undefined || value === null) {
      throw new Error(`Runtime-Konfiguration '${propertyPath}' ist nicht gesetzt.`);
    }

    if (typeof value === 'string' && value.trim().length === 0) {
      throw new Error(`Runtime-Konfiguration '${propertyPath}' ist leer.`);
    }

    return value;
  }

  /**
   * Liefert Runtime-Werte inkl. Quelleninformation für Admin-UI/API.
   */
  listRuntimeConfig(): RuntimeConfigEntry[] {
    const allKeys = new Set<string>([...RUNTIME_CONFIG_KEYS, ...this.dbRuntimeValues.keys(), ...this.dbRuntimeSecrets.keys()]);

    return [...allKeys]
      .sort((left, right) => left.localeCompare(right))
      .map((key) => {
        const catalogEntry = this.getCatalogEntry(key);
        const source = this.resolveSource(key);
        const value = this.resolveValue(key);
        const sensitive = SENSITIVE_RUNTIME_KEYS.has(key);

        return {
          key,
          source,
          sensitive,
          category: catalogEntry?.category ?? (sensitive ? 'internal_secret' : 'runtime'),
          editable: catalogEntry?.editable ?? !sensitive,
          configured: Boolean(value && value.trim().length > 0),
          value: sensitive ? (value ? '********' : null) : (value ?? null),
        };
      });
  }

  /**
   * Speichert Runtime-Konfiguration (non-sensitive oder secret) und lädt Cache neu.
   */
  async upsertRuntimeConfig(input: { key: string; value: string; updatedBy?: string; sensitive?: boolean; sourceHint?: string }): Promise<void> {
    const key = input.key.trim();
    const catalogEntry = this.getCatalogEntry(key);
    const isSensitive = catalogEntry ? catalogEntry.sensitive : (input.sensitive ?? SENSITIVE_RUNTIME_KEYS.has(key));

    if (catalogEntry && !catalogEntry.editable && this.isManualSecretMutation(input.sourceHint)) {
      throw new Error(`${key} ist ein internes Secret und kann nicht manuell geändert werden.`);
    }

    if (isSensitive) {
      const masterKey = this.getMasterKeyOrThrow();
      const encrypted = encryptV1String(input.value, {
        masterKey,
        scope: CONFIG_SECRET_SCOPE,
        key,
      });

      await this.prisma.appConfigSecret.upsert({
        where: { key },
        update: {
          ciphertextPayload: JSON.parse(encrypted),
          updatedBy: input.updatedBy ?? 'system',
          version: {
            increment: 1,
          },
        },
        create: {
          key,
          ciphertextPayload: JSON.parse(encrypted),
          updatedBy: input.updatedBy ?? 'system',
          version: 1,
          kekVersion: 1,
        },
      });

      // Typwechsel-Fall absichern: non-sensitive Record entfernen
      await this.prisma.appConfig.deleteMany({ where: { key } });
    } else {
      await this.prisma.appConfig.upsert({
        where: { key },
        update: {
          valueJson: this.parseValueForStorage(input.value),
          sourceHint: input.sourceHint ?? 'ui',
          updatedBy: input.updatedBy ?? 'system',
          version: {
            increment: 1,
          },
        },
        create: {
          key,
          valueJson: this.parseValueForStorage(input.value),
          sourceHint: input.sourceHint ?? 'ui',
          updatedBy: input.updatedBy ?? 'system',
          version: 1,
        },
      });

      // Typwechsel-Fall absichern: secret Record entfernen
      await this.prisma.appConfigSecret.deleteMany({ where: { key } });
    }

    await this.reload();
  }

  async deleteRuntimeConfig(input: { key: string; updatedBy?: string; sourceHint?: string }): Promise<void> {
    const key = input.key.trim();
    const catalogEntry = this.getCatalogEntry(key);

    if (catalogEntry && !catalogEntry.editable) {
      throw new Error(`${key} ist ein internes Secret und kann nicht gelöscht werden.`);
    }

    await this.prisma.appConfig.deleteMany({ where: { key } });
    await this.prisma.appConfigSecret.deleteMany({ where: { key } });
    await this.reload();
  }

  async migrateLegacyRuntimeKeysToDb(input: { keys?: string[]; updatedBy: string; dryRun?: boolean }): Promise<MigrateLegacyRuntimeConfigResult> {
    const legacyKeys = this.getLegacyEnvFallbackKeys();

    const requestedKeysInput = input.keys && input.keys.length > 0 ? input.keys : legacyKeys;
    const hasExplicitKeys = Boolean(input.keys && input.keys.length > 0);

    const requestedKeys = requestedKeysInput
      .map((key) => key.trim())
      .filter((key) => key.length > 0)
      .filter((key, index, arr) => arr.indexOf(key) === index);

    const result: MigrateLegacyRuntimeConfigResult = {
      migratedKeys: [],
      skippedKeys: [],
      failedKeys: [],
      summary: {
        requested: requestedKeys.length,
        migrated: 0,
        skipped: 0,
        failed: 0,
      },
    };

    if (requestedKeys.length === 0) {
      return result;
    }

    const catalogSet = new Set(RUNTIME_CONFIG_KEYS);
    const legacySet = new Set(legacyKeys);

    for (const key of requestedKeys) {
      if (!catalogSet.has(key)) {
        result.failedKeys.push({
          key,
          reason: `Migration abgelehnt für ${key}: Schlüssel ist nicht im Runtime-Katalog enthalten.`,
        });
        continue;
      }

      const catalogEntry = this.getCatalogEntry(key);
      if (!catalogEntry) {
        result.failedKeys.push({
          key,
          reason: `Migration abgelehnt für ${key}: Kein Katalogeintrag vorhanden.`,
        });
        continue;
      }

      const hasDbValue = catalogEntry.sensitive ? this.dbRuntimeSecrets.has(key) : this.dbRuntimeValues.has(key);
      if (hasExplicitKeys && hasDbValue) {
        result.skippedKeys.push(key);
        continue;
      }

      if (!legacySet.has(key)) {
        result.skippedKeys.push(key);
        continue;
      }

      const envValue = this.configService.get<string | undefined>(key);
      if (typeof envValue !== 'string' || envValue.trim().length === 0) {
        result.skippedKeys.push(key);
        continue;
      }

      if (input.dryRun) {
        result.migratedKeys.push(key);
        continue;
      }

      try {
        await this.upsertRuntimeConfig({
          key,
          value: envValue,
          updatedBy: input.updatedBy,
          sensitive: catalogEntry.sensitive,
          sourceHint: 'legacy_env_migration',
        });
        result.migratedKeys.push(key);
      } catch (error) {
        const reason = this.normalizeMigrationFailureReason(error, key);
        result.failedKeys.push({
          key,
          reason: reason || 'Unbekannter Fehler bei der Migration.',
        });
      }
    }

    result.summary = {
      requested: result.summary.requested,
      migrated: result.migratedKeys.length,
      skipped: result.skippedKeys.length,
      failed: result.failedKeys.length,
    };

    return result;
  }

  async importLegacyRuntimeEnvToDb(input: { updatedBy: string }): Promise<MigrateLegacyRuntimeConfigResult> {
    if (!this.dbAvailable) {
      return {
        migratedKeys: [],
        skippedKeys: [],
        failedKeys: [],
        summary: {
          requested: 0,
          migrated: 0,
          skipped: 0,
          failed: 0,
        },
      };
    }

    return this.migrateLegacyRuntimeKeysToDb({
      updatedBy: input.updatedBy,
    });
  }

  /**
   * Liefert Diagnosedaten fuer den Config-Doctor Endpoint.
   */
  getConfigDoctorReport(): ConfigDoctorReport {
    const activeEnvOverrides = [...ENV_OVERRIDE_ALLOWLIST].filter((key) => {
      const value = this.configService.get<string | undefined>(key);
      return typeof value === 'string' && value.trim().length > 0;
    });

    const missingRequiredKeys = REQUIRED_RUNTIME_KEYS.filter((key) => {
      const value = this.resolveValue(key);
      return !value || value.trim().length === 0;
    });

    const legacyEnvFallbackKeys = this.getLegacyEnvFallbackKeys();
    const legacyEnvCleanupKeys = this.getLegacyEnvCleanupKeys();

    return {
      dbAvailable: this.dbAvailable,
      dbAvailabilityReasons: [...this.dbAvailabilityReasons],
      missingRequiredKeys,
      activeEnvOverrides,
      legacyEnvFallbackKeys,
      legacyEnvCleanupKeys,
      decryptionErrors: [...this.decryptionErrors],
      runtimeConfigCount: this.dbRuntimeValues.size,
      runtimeSecretCount: this.dbRuntimeSecrets.size,
    };
  }

  private resolveValue(key: string): string | undefined {
    if (ENV_OVERRIDE_ALLOWLIST.has(key)) {
      const override = this.configService.get<string | undefined>(key);
      if (typeof override === 'string' && override.trim().length > 0) {
        return override;
      }
    }

    if (SENSITIVE_RUNTIME_KEYS.has(key)) {
      const dbSecret = this.dbRuntimeSecrets.get(key);
      if (dbSecret !== undefined) {
        return dbSecret;
      }
    } else {
      const dbValue = this.dbRuntimeValues.get(key);
      if (dbValue !== undefined) {
        return dbValue;
      }
    }

    const legacyEnvValue = this.configService.get<string | undefined>(key);
    if (typeof legacyEnvValue === 'string' && legacyEnvValue.trim().length > 0) {
      return legacyEnvValue;
    }

    if (RUNTIME_DEFAULTS[key] !== undefined) {
      return RUNTIME_DEFAULTS[key];
    }

    return undefined;
  }

  private resolveSource(key: string): RuntimeConfigSource {
    if (ENV_OVERRIDE_ALLOWLIST.has(key)) {
      const override = this.configService.get<string | undefined>(key);
      if (typeof override === 'string' && override.trim().length > 0) {
        return 'env_override';
      }
    }

    if (SENSITIVE_RUNTIME_KEYS.has(key) && this.dbRuntimeSecrets.has(key)) {
      return 'db';
    }

    if (!SENSITIVE_RUNTIME_KEYS.has(key) && this.dbRuntimeValues.has(key)) {
      return 'db';
    }

    return 'default';
  }

  private getLegacyEnvFallbackKeys(): string[] {
    return RUNTIME_CONFIG_KEYS.filter((key) => {
      const catalogEntry = this.getCatalogEntry(key);
      if (!catalogEntry) {
        return false;
      }

      const hasDbValue = catalogEntry.sensitive ? this.dbRuntimeSecrets.has(key) : this.dbRuntimeValues.has(key);
      if (hasDbValue) {
        return false;
      }

      const envValue = this.configService.get<string | undefined>(key);
      return typeof envValue === 'string' && envValue.trim().length > 0;
    });
  }

  private getLegacyEnvCleanupKeys(): string[] {
    return RUNTIME_CONFIG_KEYS.filter((key) => {
      const catalogEntry = this.getCatalogEntry(key);
      if (!catalogEntry) {
        return false;
      }

      const hasDbValue = catalogEntry.sensitive ? this.dbRuntimeSecrets.has(key) : this.dbRuntimeValues.has(key);
      if (!hasDbValue) {
        return false;
      }

      const envValue = this.configService.get<string | undefined>(key);
      return typeof envValue === 'string' && envValue.trim().length > 0;
    });
  }

  private getCatalogEntry(key: string): RuntimeConfigCatalogEntry | undefined {
    return RUNTIME_CONFIG_MAP.get(key);
  }

  private castValue<T>(rawValue: string, defaultValue?: T): T {
    if (typeof defaultValue === 'number') {
      const numericValue = Number(rawValue);
      return (Number.isFinite(numericValue) ? numericValue : defaultValue) as T;
    }

    if (typeof defaultValue === 'boolean') {
      return (rawValue === 'true') as T;
    }

    if (typeof defaultValue === 'string') {
      return rawValue as T;
    }

    return rawValue as T;
  }

  private stringifyJsonValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  private parseValueForStorage(value: string): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
    const trimmed = value.trim();

    if (!trimmed) {
      return '';
    }

    try {
      const parsed = JSON.parse(trimmed) as Prisma.InputJsonValue | null;
      return parsed === null ? Prisma.JsonNull : parsed;
    } catch {
      return value;
    }
  }

  private decryptSecretPayload(payload: string, key: string): string {
    const masterKey = this.getMasterKeyOrThrow();

    return decryptV1String(payload, {
      masterKey,
      expectedScope: CONFIG_SECRET_SCOPE,
      expectedKey: key,
    });
  }

  private normalizeMigrationFailureReason(error: unknown, key: string): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return `Migration fehlgeschlagen für ${key}: ${this.normalizeDbAvailabilityError(error).join(' / ')}`;
    }

    return `Migration fehlgeschlagen für ${key}: ${this.normalizeDbAvailabilityError(error).join(' / ')}`;
  }

  private normalizeDbAvailabilityError(error: unknown): string[] {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('does not exist') && message.includes('app_config_secret')) {
      return ['Die Tabelle public.app_config_secret fehlt. Bitte DB-Migrationen ausführen: pnpm --filter @bluelight-hub/backend prisma:migrate oder prisma:deploy.'];
    }

    if (message.includes('does not exist') && message.includes('app_config')) {
      return ['Die Tabelle public.app_config fehlt. Bitte DB-Migrationen ausführen: pnpm --filter @bluelight-hub/backend prisma:migrate oder prisma:deploy.'];
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return ['Eine Runtime-Config-Tabelle fehlt. Bitte DB-Migrationen ausführen: pnpm --filter @bluelight-hub/backend prisma:migrate oder prisma:deploy.'];
    }

    const firstLine = message.split('\n')[0] ?? '';
    const normalizedFirstLine = firstLine.trim();

    return [normalizedFirstLine.length > 0 ? normalizedFirstLine : 'Unbekannter DB-Fehler beim Laden der Runtime-Konfiguration.'];
  }

  private tryLoadMasterKey(): Buffer | null {
    const rawKey = this.configService.get<string | undefined>('MASTER_SECRET') ?? this.configService.get<string | undefined>('MASTER_SECRET_KEY');
    if (!rawKey) {
      return null;
    }

    try {
      return parseMasterSecretKey(rawKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MASTER_SECRET konnte nicht geladen werden: ${message}`);
      return null;
    }
  }

  private getMasterKeyOrThrow(): Buffer {
    if (this.masterKey) {
      return this.masterKey;
    }

    this.masterKey = this.tryLoadMasterKey();
    if (!this.masterKey) {
      throw new Error('MASTER_SECRET ist nicht verfügbar, Secret-Operation nicht möglich.');
    }

    return this.masterKey;
  }

  private async ensureRequiredRuntimeSecrets(input: { updatedBy: string }): Promise<void> {
    if (!this.dbAvailable || !this.tryLoadMasterKey()) {
      return;
    }

    for (const key of AUTO_GENERATED_INTERNAL_SECRET_KEYS) {
      if (this.dbRuntimeSecrets.has(key)) {
        continue;
      }

      const envValue = this.configService.get<string | undefined>(key);
      if (typeof envValue === 'string' && envValue.trim().length > 0) {
        continue;
      }

      await this.upsertRuntimeConfig({
        key,
        value: this.generateInternalSecretValue(key),
        updatedBy: input.updatedBy,
        sourceHint: 'system_generated',
        sensitive: true,
      });
    }
  }

  private generateInternalSecretValue(key: (typeof AUTO_GENERATED_INTERNAL_SECRET_KEYS)[number]): string {
    if (key === 'INTEGRATION_ENCRYPTION_KEY') {
      return crypto.randomBytes(32).toString('hex');
    }

    return crypto.randomBytes(48).toString('base64url');
  }

  private assertNoLegacyEnvSecretsPendingCleanup(): void {
    const blockingKeys = this.getLegacyEnvCleanupKeys().filter((key) => SENSITIVE_RUNTIME_KEYS.has(key));

    if (blockingKeys.length === 0) {
      return;
    }

    throw new Error(`Legacy-Secret-ENVs wurden bereits in die Datenbank übernommen. Bitte entferne diese Variablen aus dem Deployment und starte danach neu: ${blockingKeys.join(', ')}`);
  }

  private isManualSecretMutation(sourceHint?: string): boolean {
    return !sourceHint || ['ui', 'api', 'admin'].includes(sourceHint);
  }
}
