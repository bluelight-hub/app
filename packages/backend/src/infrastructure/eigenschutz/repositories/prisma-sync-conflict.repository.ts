import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type {
  ISyncConflictRepository,
  RecordSyncConflictInput,
  RecordSyncConflictResult,
  SyncConflictListFilter,
  SyncConflictReadModel,
  MarkResolvedResult,
} from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import type { SyncConflictEntityType } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

type PrismaTransactionClient = Prisma.TransactionClient;

const LOCAL_PAYLOAD_MAX_BYTES = 4096;
const FIND_OPEN_HARD_LIMIT = 200;

interface PrismaSyncConflictRow {
  id: string;
  einsatzId: string;
  einheitId: string | null;
  entityType: string;
  entityId: string;
  fieldPath: string;
  localPayload: unknown;
  serverVersion: number;
  localExpectedVersion: number;
  reportedAt: Date;
  reportedByUserId: string;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  resolution: string | null;
}

function toReadModel(row: PrismaSyncConflictRow): SyncConflictReadModel {
  let localPayload: Record<string, unknown>;
  if (row.localPayload && typeof row.localPayload === 'object' && !Array.isArray(row.localPayload)) {
    localPayload = row.localPayload as Record<string, unknown>;
  } else {
    localPayload = {};
  }
  return {
    id: row.id,
    einsatzId: row.einsatzId,
    einheitId: row.einheitId,
    entityType: row.entityType as SyncConflictEntityType,
    entityId: row.entityId,
    fieldPath: row.fieldPath,
    localPayload,
    serverVersion: row.serverVersion,
    localExpectedVersion: row.localExpectedVersion,
    reportedAt: row.reportedAt,
    reportedByUserId: row.reportedByUserId,
    resolvedAt: row.resolvedAt,
    resolvedByUserId: row.resolvedByUserId,
    resolution: row.resolution as SyncConflictResolution | null,
  };
}

/**
 * Prisma-Adapter für `ISyncConflictRepository` (Story 3.9, FR50,
 * Architektur §B6).
 *
 * **Idempotenz-Schlüssel:** `(einsatzId, entityId, localExpectedVersion,
 * reportedByUserId)` mit `resolvedAt IS NULL`. Tab-Reload-Schutz:
 * derselbe User, der zweimal denselben Verlierer-Toggle meldet, erzeugt
 * genau eine Row. Eine bereits aufgelöste Row (`resolvedAt != null`)
 * blockiert den Folge-Insert nicht — ein Konflikt kann nach Auflösung
 * erneut auftreten.
 *
 * **`localPayload`-Cap:** `Buffer.byteLength(JSON.stringify(...), 'utf8') > 4096` →
 * `Result.fail('ValidationFailed:LocalPayloadTooLarge')` ohne DB-
 * Roundtrip (Defense-in-Depth zum Outbox-Serializer-Cap). Byte-Count statt
 * Character-Count, weil UTF-8-Multibyte-Chars (Umlaute, Emojis) den
 * tatsächlichen Speicherverbrauch in Postgres-JSONB bestimmen — Code-Review P4.
 *
 * **PII-Logger:** alle IDs (einsatzId, einheitId, entityId,
 * reportedByUserId) werden via `redactId(...)` gehasht. `entityType` und
 * `fieldPath` sind kein PII (Enum / Schema-Feld) und können Klartext
 * geloggt werden.
 */
@Injectable()
export class PrismaSyncConflictRepository implements ISyncConflictRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async recordOrFindExisting(input: RecordSyncConflictInput, tx?: TransactionContext): Promise<Result<RecordSyncConflictResult>> {
    if (Buffer.byteLength(JSON.stringify(input.localPayload), 'utf8') > LOCAL_PAYLOAD_MAX_BYTES) {
      return Result.fail<RecordSyncConflictResult>('ValidationFailed:LocalPayloadTooLarge');
    }

    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const existing = await client.syncConflict.findFirst({
        where: {
          einsatzId: input.einsatzId,
          entityId: input.entityId,
          localExpectedVersion: input.localExpectedVersion,
          reportedByUserId: input.reportedByUserId,
          resolvedAt: null,
        },
        select: { id: true },
      });
      if (existing) {
        this.logger.debug('SyncConflict.recordOrFindExisting: Idempotenz-Treffer (resolvedAt=null)', {
          einsatzIdHash: redactId(input.einsatzId),
          entityIdHash: redactId(input.entityId),
          reportedByUserIdHash: redactId(input.reportedByUserId),
          entityType: input.entityType,
          fieldPath: input.fieldPath,
          localExpectedVersion: input.localExpectedVersion,
        });
        return Result.ok<RecordSyncConflictResult>({ id: existing.id, alreadyExisted: true });
      }

      const created = await client.syncConflict.create({
        data: {
          einsatzId: input.einsatzId,
          einheitId: input.einheitId ?? null,
          entityType: input.entityType,
          entityId: input.entityId,
          fieldPath: input.fieldPath,
          localPayload: input.localPayload as Prisma.InputJsonValue,
          serverVersion: input.serverVersion,
          localExpectedVersion: input.localExpectedVersion,
          reportedByUserId: input.reportedByUserId,
        },
        select: { id: true },
      });

      this.logger.log('SyncConflict.recordOrFindExisting: frischer Insert', {
        syncConflictId: created.id,
        einsatzIdHash: redactId(input.einsatzId),
        einheitIdHash: input.einheitId ? redactId(input.einheitId) : null,
        entityIdHash: redactId(input.entityId),
        reportedByUserIdHash: redactId(input.reportedByUserId),
        entityType: input.entityType,
        fieldPath: input.fieldPath,
        serverVersion: input.serverVersion,
        localExpectedVersion: input.localExpectedVersion,
      });

      return Result.ok<RecordSyncConflictResult>({ id: created.id, alreadyExisted: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('SyncConflict.recordOrFindExisting: DB-Fehler', {
        einsatzIdHash: redactId(input.einsatzId),
        entityIdHash: redactId(input.entityId),
        error: message,
      });
      return Result.fail<RecordSyncConflictResult>(`InfrastructureError:SyncConflictRepository:${message}`);
    }
  }

  async findOpenByEinsatzId(einsatzId: string, filter?: SyncConflictListFilter): Promise<Result<readonly SyncConflictReadModel[]>> {
    try {
      const where: Prisma.SyncConflictWhereInput = {
        einsatzId,
        resolvedAt: null,
      };
      if (filter?.entityType) {
        where.entityType = filter.entityType;
      }
      if (filter?.einheitId) {
        where.einheitId = filter.einheitId;
      }

      const rows = await this.prisma.syncConflict.findMany({
        where,
        orderBy: { reportedAt: 'desc' },
        take: FIND_OPEN_HARD_LIMIT,
      });

      this.logger.debug('SyncConflict.findOpenByEinsatzId', {
        einsatzIdHash: redactId(einsatzId),
        einheitIdHash: filter?.einheitId ? redactId(filter.einheitId) : null,
        entityType: filter?.entityType ?? null,
        rowCount: rows.length,
      });

      return Result.ok<readonly SyncConflictReadModel[]>(rows.map((row) => toReadModel(row as PrismaSyncConflictRow)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('SyncConflict.findOpenByEinsatzId: DB-Fehler', {
        einsatzIdHash: redactId(einsatzId),
        error: message,
      });
      return Result.fail<readonly SyncConflictReadModel[]>(`InfrastructureError:SyncConflictRepository:${message}`);
    }
  }

  async findById(syncConflictId: string): Promise<Result<SyncConflictReadModel | null>> {
    try {
      const row = await this.prisma.syncConflict.findUnique({
        where: { id: syncConflictId },
      });
      if (!row) {
        return Result.ok<SyncConflictReadModel | null>(null);
      }
      return Result.ok<SyncConflictReadModel | null>(toReadModel(row as PrismaSyncConflictRow));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('SyncConflict.findById: DB-Fehler', {
        syncConflictIdHash: redactId(syncConflictId),
        error: message,
      });
      return Result.fail<SyncConflictReadModel | null>(`InfrastructureError:SyncConflictRepository:${message}`);
    }
  }

  async markResolved(syncConflictId: string, resolution: SyncConflictResolution, resolvedByUserId: string, resolvedAt: Date, tx?: TransactionContext): Promise<Result<MarkResolvedResult>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const updateResult = await client.syncConflict.updateMany({
        where: {
          id: syncConflictId,
          resolvedAt: null,
        },
        data: {
          resolvedAt,
          resolvedByUserId,
          resolution,
        },
      });

      const alreadyResolved = updateResult.count === 0;
      this.logger.log('SyncConflict.markResolved', {
        syncConflictIdHash: redactId(syncConflictId),
        resolvedByUserIdHash: redactId(resolvedByUserId),
        resolution,
        alreadyResolved,
      });

      return Result.ok<MarkResolvedResult>({ alreadyResolved });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('SyncConflict.markResolved: DB-Fehler', {
        syncConflictIdHash: redactId(syncConflictId),
        error: message,
      });
      return Result.fail<MarkResolvedResult>(`InfrastructureError:SyncConflictRepository:${message}`);
    }
  }
}
