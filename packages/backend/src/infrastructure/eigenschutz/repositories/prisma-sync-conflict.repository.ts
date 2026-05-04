import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ISyncConflictRepository, RecordSyncConflictInput, RecordSyncConflictResult } from '@domain/eigenschutz/repositories/i-sync-conflict.repository';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

type PrismaTransactionClient = Prisma.TransactionClient;

const LOCAL_PAYLOAD_MAX_BYTES = 4096;

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
}
