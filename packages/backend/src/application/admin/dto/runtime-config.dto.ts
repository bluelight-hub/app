import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class RuntimeConfigEntryDto {
  @ApiProperty({ description: 'Konfigurationsschlüssel', example: 'APP_URL' })
  key!: string;

  @ApiPropertyOptional({ description: 'Wert (bei Secrets maskiert)' })
  value!: string | null;

  @ApiProperty({ description: 'Quelle des aufgelösten Werts', enum: ['default', 'db', 'env_override'] })
  source!: 'default' | 'db' | 'env_override';

  @ApiProperty({ description: 'Kennzeichnet sensitive Werte' })
  sensitive!: boolean;
}

export class RuntimeConfigListDto {
  @ApiProperty({ type: RuntimeConfigEntryDto, isArray: true })
  entries!: RuntimeConfigEntryDto[];
}

export class UpsertRuntimeConfigRequestDto {
  @ApiProperty({ description: 'Neuer Wert für den Konfigurationsschlüssel' })
  value!: string;

  @ApiPropertyOptional({ description: 'Erzwingt Speicherung als Secret' })
  sensitive?: boolean;

  @ApiPropertyOptional({ description: 'Quellenhinweis für Audit (default: ui)', example: 'ui' })
  sourceHint?: string;
}

export class ConfigDoctorDto {
  @ApiProperty({ description: 'Runtime-Config-Tabellen verfügbar' })
  dbAvailable!: boolean;

  @ApiPropertyOptional({
    description: 'Detailgründe, wenn Runtime-DB gerade nicht verfügbar ist',
    type: [String],
    example: ['Die Tabelle public.app_config fehlt. Bitte DB-Migration ausführen.'],
  })
  dbAvailabilityReasons?: string[];

  @ApiProperty({ type: [String], description: 'Fehlende Pflichtschlüssel' })
  missingRequiredKeys!: string[];

  @ApiProperty({ type: [String], description: 'Aktive ENV-Overrides laut Allowlist' })
  activeEnvOverrides!: string[];

  @ApiProperty({ type: [String], description: 'Keys, die noch über Legacy-ENV-Fallback laufen' })
  legacyEnvFallbackKeys!: string[];

  @ApiPropertyOptional({
    description: 'Keys, die bereits in der Runtime-DB gespeichert sind und dennoch noch aus ENV gesetzt sind.',
    type: [String],
  })
  legacyEnvCleanupKeys?: string[];

  @ApiProperty({ type: [String], description: 'Entschlüsselungsfehler pro Secret-Key' })
  decryptionErrors!: string[];

  @ApiProperty({ description: 'Anzahl geladener non-sensitive Runtime-Einträge' })
  runtimeConfigCount!: number;

  @ApiProperty({ description: 'Anzahl geladener Secret-Einträge' })
  runtimeSecretCount!: number;
}

export class MigrateLegacyRuntimeConfigRequestDto {
  @ApiPropertyOptional({
    description: 'Keys, die migriert werden sollen. Optional. Leerlassen migriert alle betroffenen Legacy-ENV-Keys.',
    type: [String],
    example: ['JWT_SECRET', 'ADMIN_JWT_SECRET'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  keys?: string[];

  @ApiPropertyOptional({
    description: 'Nur Simulation ohne Datenbankschreibzugriff',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class LegacyRuntimeConfigMigrationFailureDto {
  @ApiProperty({ description: 'Konfigurationsschlüssel', example: 'JWT_SECRET' })
  key!: string;

  @ApiProperty({ description: 'Grund für den Migrationsfehler', example: 'MASTER_SECRET_KEY ist nicht verfügbar.' })
  reason!: string;
}

export class MigrateLegacyRuntimeConfigResultSummaryDto {
  @ApiProperty({ description: 'Anzahl der angefragten Keys', example: 3 })
  requested!: number;

  @ApiProperty({ description: 'Anzahl erfolgreich migrierter Keys', example: 2 })
  migrated!: number;

  @ApiProperty({ description: 'Anzahl übersprungener Keys', example: 0 })
  skipped!: number;

  @ApiProperty({ description: 'Anzahl fehlgeschlagener Keys', example: 1 })
  failed!: number;
}

export class MigrateLegacyRuntimeConfigResultDto {
  @ApiProperty({ description: 'Erfolgreich migrierte Keys', type: [String], isArray: true, example: ['JWT_SECRET'] })
  migratedKeys!: string[];

  @ApiProperty({ description: 'Übersprungene Keys', type: [String], isArray: true, example: ['FRONTEND_URL'] })
  skippedKeys!: string[];

  @ApiProperty({
    description: 'Fehlgeschlagene Keys mit Fehlergrund',
    type: LegacyRuntimeConfigMigrationFailureDto,
    isArray: true,
  })
  failedKeys!: LegacyRuntimeConfigMigrationFailureDto[];

  @ApiProperty({ description: 'Zusammenfassung' })
  summary!: MigrateLegacyRuntimeConfigResultSummaryDto;
}
