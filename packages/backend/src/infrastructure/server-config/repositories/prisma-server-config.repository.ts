import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { IServerConfigRepository, ServerConfig, ServerConfigUpdate } from '@domain/repositories/i-server-config.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/**
 * Singleton ID für Server-Konfiguration.
 * Stellt sicher, dass nur eine Zeile in der Tabelle existiert.
 */
const SINGLETON_ID = 'singleton';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 * Verwendet das gleiche Pattern wie andere Repositories im Projekt.
 */
type PrismaTransactionClient = PrismaService;

/**
 * Prisma-basierte Implementierung des IServerConfigRepository.
 *
 * Verwaltet die Singleton-Server-Konfiguration für INSECURE/SECURE Mode.
 *
 * **SINGLETON-STRATEGIE:**
 *
 * 1. **Eindeutige ID:**
 *    - id ist immer "singleton" (Primary Key)
 *    - Garantiert dass maximal eine Zeile existiert
 *
 * 2. **Upsert Pattern:**
 *    - getOrCreate() verwendet Prisma upsert()
 *    - Idempotent: Mehrfache Aufrufe sind sicher
 *
 * 3. **Transaction Support:**
 *    - Optional tx Parameter für atomare Multi-Operation
 *    - Verwendet für Migration zu SECURE Mode
 *
 * **Performance:**
 * - Singleton-Abfrage ist O(1) (Primary Key Lookup)
 * - Kein Index benötigt (nur eine Zeile)
 *
 * @implements IServerConfigRepository
 */
@Injectable()
export class PrismaServerConfigRepository implements IServerConfigRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * {@inheritDoc IServerConfigRepository.getOrCreate}
   *
   * Verwendet Prisma upsert() für atomare Create-or-Get Semantik:
   * - WHERE id = "singleton"
   * - CREATE mit Default-Werten wenn nicht existiert
   * - SELECT wenn existiert (keine Änderung)
   */
  async getOrCreate(tx?: TransactionContext): Promise<Result<ServerConfig>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const record = await client.serverConfig.upsert({
        where: { id: SINGLETON_ID },
        create: {
          id: SINGLETON_ID,
          insecureMode: false,
          migratedAt: null,
        },
        update: {
          // Keine Updates bei existierender Konfiguration
          // Leeres update-Objekt führt nur SELECT aus
        },
      });

      return Result.ok(this.mapToConfig(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get or create ServerConfig', {
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerConfigRepository.update}
   *
   * Aktualisiert die Singleton-Konfiguration mit partiellen Daten.
   * Verwendet Prisma update() mit WHERE id = "singleton".
   */
  async update(updateData: ServerConfigUpdate, tx?: TransactionContext): Promise<Result<ServerConfig>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      // Baue Update-Daten nur mit definierten Feldern
      const data: { insecureMode?: boolean; migratedAt?: Date | null } = {};

      if (updateData.insecureMode !== undefined) {
        data.insecureMode = updateData.insecureMode;
      }

      if (updateData.migratedAt !== undefined) {
        data.migratedAt = updateData.migratedAt;
      }

      const record = await client.serverConfig.update({
        where: { id: SINGLETON_ID },
        data,
      });

      this.logger.log('ServerConfig updated', {
        insecureMode: record.insecureMode,
        migratedAt: record.migratedAt?.toISOString() ?? null,
      });

      return Result.ok(this.mapToConfig(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to update ServerConfig', {
        updateData: JSON.stringify(updateData),
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerConfigRepository.isInsecureMode}
   *
   * Optimierte Abfrage die nur das insecureMode Feld lädt.
   * Erstellt Konfiguration mit Default-Werten wenn nicht vorhanden.
   */
  async isInsecureMode(tx?: TransactionContext): Promise<Result<boolean>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      // Versuche zuerst nur zu lesen (performanter)
      const record = await client.serverConfig.findUnique({
        where: { id: SINGLETON_ID },
        select: { insecureMode: true },
      });

      // Falls nicht vorhanden, erstelle mit Defaults
      if (!record) {
        const created = await this.getOrCreate(tx);
        if (created.isFailure) {
          return Result.fail(created.error!);
        }
        const config = created.value;
        if (!config) {
          return Result.fail('Server configuration could not be created');
        }

        return Result.ok(config.insecureMode);
      }

      return Result.ok(record.insecureMode);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to check insecureMode', { error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerConfigRepository.hasMigrated}
   *
   * Optimierte Abfrage die nur das migratedAt Feld lädt.
   * Erstellt Konfiguration mit Default-Werten wenn nicht vorhanden.
   */
  async hasMigrated(tx?: TransactionContext): Promise<Result<boolean>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      // Versuche zuerst nur zu lesen (performanter)
      const record = await client.serverConfig.findUnique({
        where: { id: SINGLETON_ID },
        select: { migratedAt: true },
      });

      // Falls nicht vorhanden, erstelle mit Defaults (migratedAt = null)
      if (!record) {
        const created = await this.getOrCreate(tx);
        if (created.isFailure) {
          return Result.fail(created.error!);
        }
        return Result.ok(created.value?.migratedAt !== null);
      }

      return Result.ok(record.migratedAt !== null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to check hasMigrated', { error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * Mappt Prisma ServerConfig Record auf Domain Interface.
   */
  private mapToConfig(record: { id: string; insecureMode: boolean; migratedAt: Date | null; createdAt: Date; updatedAt: Date }): ServerConfig {
    return {
      id: record.id,
      insecureMode: record.insecureMode,
      migratedAt: record.migratedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
