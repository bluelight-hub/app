import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IGefaehrdungsbeurteilungVersionRepository, SaveInitialVersionArgs, SaveNewVersionArgs } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';
import { PrismaGefaehrdungsbeurteilungMapper } from './mappers/gefaehrdungsbeurteilung.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-Adapter für `gefaehrdungsbeurteilung_versionen` (append-only).
 *
 * Die Version-Zeile ist die Single-Source-of-Truth für „wer hat wann welchen
 * Stand gelesen" — Story 2.4 baut die Timeline darauf auf. Das `eventId`-
 * Unique-Constraint verhindert Doppel-Processing bei einem Outbox-Retry.
 */
@Injectable()
export class PrismaGefaehrdungsbeurteilungVersionRepository implements IGefaehrdungsbeurteilungVersionRepository {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async saveInitialVersion(args: SaveInitialVersionArgs, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      await client.gefaehrdungsbeurteilungVersion.create({
        data: {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          items: PrismaGefaehrdungsbeurteilungMapper.toPersistenceItems(args.items) as unknown as Prisma.InputJsonValue,
          changedFields: args.changedFields as Prisma.InputJsonValue,
          gueltigVon: args.gueltigVon,
          changedByUserId: args.changedByUserId,
          eventId: args.eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Speichern der Initial-Version', {
        gefBeurteilungId: args.gefBeurteilungId,
        eventId: args.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async saveNewVersion(args: SaveNewVersionArgs, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      // Chain-Closing: vorherige offene Version (gueltigBis IS NULL) auf das
      // aktuelle Event-Timestamp setzen — identisch für die kanonisch
      // vorletzte Zeile. `updateMany` ist idempotent: wenn keine Zeile offen
      // ist, wird nichts geändert; ein Outbox-Retry derselben eventId
      // verletzt die neue INSERT-Unique-Constraint, nicht dieses UPDATE.
      await client.gefaehrdungsbeurteilungVersion.updateMany({
        where: { gefBeurteilungId: args.gefBeurteilungId, gueltigBis: null },
        data: { gueltigBis: args.gueltigVon },
      });

      await client.gefaehrdungsbeurteilungVersion.create({
        data: {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          items: PrismaGefaehrdungsbeurteilungMapper.toPersistenceItems(args.items) as unknown as Prisma.InputJsonValue,
          changedFields: args.changedFields as Prisma.InputJsonValue,
          gueltigVon: args.gueltigVon,
          changedByUserId: args.changedByUserId,
          eventId: args.eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      // Outbox-Retry-Idempotenz: eine P2002 auf `eventId` bedeutet, dass diese
      // Version schon angelegt wurde (Retry nach partiellem Commit). Wir
      // behandeln das als Erfolg, damit der Retry-Pfad konvergiert, statt
      // dauerhaft auf einem pending-Event zu sitzen.
      if (isPrismaP2002(error)) {
        this.logger.warn('Idempotenter Retry auf gefaehrdungsbeurteilung_versionen.eventId erkannt', {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          eventId: args.eventId,
        });
        return Result.ok<void>(undefined);
      }
      this.logger.error('Fehler beim Speichern der neuen Version', {
        gefBeurteilungId: args.gefBeurteilungId,
        version: args.version,
        eventId: args.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }
}
