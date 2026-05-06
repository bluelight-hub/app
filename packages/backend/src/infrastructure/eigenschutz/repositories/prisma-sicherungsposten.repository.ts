import { Inject, Injectable } from '@nestjs/common';
import type { Sicherungsposten as PrismaSicherungspostenRow, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Sicherungsposten } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository, SicherungspostenReadModel } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaSicherungspostenMapper } from './mappers/sicherungsposten.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

const SICHERUNGSPOSTEN_CONFLICT_DETECTED = 'ConflictDetected:Sicherungsposten';
const INFRASTRUCTURE_ERROR_RECONSTITUTE = 'InfrastructureError:ReconstituteSicherungsposten';

/**
 * Prisma-Adapter für Sicherungsposten (Story 4.1).
 *
 * `save` deckt Insert + Update in einem Pfad ab — Versions-Snapshot wird
 * **immer** in `sicherungsposten_versionen` mit `payload` = Top-Level-Felder
 * gespiegelt. Caller (TransactionalCommandHandler) garantiert die TX-Atomarität
 * über den `tx`-Parameter.
 */
@Injectable()
export class PrismaSicherungspostenRepository implements ISicherungspostenRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async save(aggregate: Sicherungsposten, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    const isInsert = aggregate.version === 1;
    const standortJson = aggregate.standort.toJSON() as unknown as Prisma.InputJsonValue;
    const personalJson = aggregate.personal.map((entry) => ({ ...entry })) as unknown as Prisma.InputJsonValue;
    const events = aggregate.getDomainEvents();
    const eventId = events[0]?.eventId ?? null;
    try {
      if (isInsert) {
        await client.sicherungsposten.create({
          data: {
            id: aggregate.id.value,
            einsatzId: aggregate.einsatzId,
            einheitId: aggregate.einheitId,
            bezeichnung: aggregate.bezeichnung,
            standort: standortJson,
            zustaendigkeitsbereich: aggregate.zustaendigkeitsbereich,
            personal: personalJson,
            abloesezeiten: aggregate.abloesezeiten,
            version: aggregate.version,
            erstelltVonUserId: aggregate.createdBy,
            aktualisiertVonUserId,
            aufgeloestAm: aggregate.aufgeloestAm,
            aufgeloestVonUserId: aggregate.aufgeloestVonUserId,
            aufloeseBegruendung: aggregate.aufloeseBegruendung,
          },
        });
      } else {
        // Optimistic-Concurrency: Aggregate.version ist bereits inkrementiert,
        // DB-WHERE prüft die ALTE Version (current = new - 1).
        const expectedPreviousVersion = aggregate.version - 1;
        const result = await client.sicherungsposten.updateMany({
          where: { id: aggregate.id.value, version: expectedPreviousVersion },
          data: {
            einheitId: aggregate.einheitId,
            bezeichnung: aggregate.bezeichnung,
            standort: standortJson,
            zustaendigkeitsbereich: aggregate.zustaendigkeitsbereich,
            personal: personalJson,
            abloesezeiten: aggregate.abloesezeiten,
            version: aggregate.version,
            aktualisiertVonUserId,
            aufgeloestAm: aggregate.aufgeloestAm,
            aufgeloestVonUserId: aggregate.aufgeloestVonUserId,
            aufloeseBegruendung: aggregate.aufloeseBegruendung,
          },
        });
        if (result.count === 0) {
          this.logger.warn('Concurrent update auf Sicherungsposten erkannt (DB-Version-Mismatch)', {
            sicherungspostenId: aggregate.id.value,
            expectedPreviousVersion,
          });
          return Result.fail<void>(SICHERUNGSPOSTEN_CONFLICT_DETECTED);
        }
        if (result.count > 1) {
          return Result.fail<void>('Invariant:UpdateCountAnomaly');
        }
      }

      const gueltigVon = new Date();
      // Chain-Closing: vorherige offene Version (gueltigBis IS NULL) auf den Timestamp
      // der neuen Version schließen. Pattern aus prisma-sicherheitsregel-version.repository.ts
      // bzw. prisma-gefaehrdungsbeurteilung-version.repository.ts (halb-offenes Intervall
      // `[gueltigVon, gueltigBis)`). Beim Insert (isInsert=true) gibt es keine offene
      // Vorversion — der updateMany trifft 0 Zeilen, ist aber ein No-Op.
      if (!isInsert) {
        await client.sicherungspostenVersion.updateMany({
          where: { postenId: aggregate.id.value, gueltigBis: null },
          data: { gueltigBis: gueltigVon },
        });
      }
      await client.sicherungspostenVersion.create({
        data: {
          postenId: aggregate.id.value,
          version: aggregate.version,
          payload: PrismaSicherungspostenMapper.toVersionPayload(aggregate) as Prisma.InputJsonValue,
          gueltigVon,
          changedByUserId: aktualisiertVonUserId,
          eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Speichern des Sicherungspostens', {
        sicherungspostenId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async findById(id: string, tx?: TransactionContext): Promise<Result<Sicherungsposten | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.sicherungsposten.findUnique({ where: { id } });
      if (!row) return Result.ok<Sicherungsposten | null>(null);
      const aggregateResult = PrismaSicherungspostenMapper.toDomain(row);
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return this.failReconstitution<Sicherungsposten | null>(row.id, aggregateResult.error);
      }
      return Result.ok<Sicherungsposten | null>(aggregateResult.value);
    } catch (error) {
      return Result.fail<Sicherungsposten | null>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async findReadModelById(id: string, tx?: TransactionContext): Promise<Result<SicherungspostenReadModel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.sicherungsposten.findUnique({ where: { id } });
      if (!row) return Result.ok<SicherungspostenReadModel | null>(null);
      const readModelResult = this.toReadModel(row);
      if (readModelResult.isFailure || !readModelResult.value) {
        return Result.fail<SicherungspostenReadModel | null>(readModelResult.error ?? 'ReadModel konnte nicht rekonstruiert werden');
      }
      return Result.ok<SicherungspostenReadModel | null>(readModelResult.value);
    } catch (error) {
      return Result.fail<SicherungspostenReadModel | null>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async findActiveByEinsatzId(einsatzId: string): Promise<Result<SicherungspostenReadModel[]>> {
    return this.findReadModelsByEinsatzWithStatus(einsatzId, 'AKTIV');
  }

  async findResolvedByEinsatzId(einsatzId: string): Promise<Result<SicherungspostenReadModel[]>> {
    return this.findReadModelsByEinsatzWithStatus(einsatzId, 'AUFGELOEST');
  }

  async existsInEinsatz(einsatzId: string, postenId: string, tx?: TransactionContext): Promise<Result<boolean>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const count = await client.sicherungsposten.count({ where: { id: postenId, einsatzId } });
      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail<boolean>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  private async findReadModelsByEinsatzWithStatus(einsatzId: string, status: 'AKTIV' | 'AUFGELOEST'): Promise<Result<SicherungspostenReadModel[]>> {
    try {
      const rows = await this.prisma.sicherungsposten.findMany({
        where: { einsatzId, aufgeloestAm: status === 'AKTIV' ? null : { not: null } },
        orderBy: status === 'AKTIV' ? [{ aktualisiertAm: 'desc' }, { id: 'asc' }] : [{ aufgeloestAm: 'desc' }, { id: 'asc' }],
      });
      const readModels: SicherungspostenReadModel[] = [];
      for (const row of rows) {
        const readModelResult = this.toReadModel(row);
        if (readModelResult.isFailure || !readModelResult.value) {
          return Result.fail<SicherungspostenReadModel[]>(readModelResult.error ?? 'ReadModel konnte nicht rekonstruiert werden');
        }
        readModels.push(readModelResult.value);
      }
      return Result.ok(readModels);
    } catch (error) {
      return Result.fail<SicherungspostenReadModel[]>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  private toReadModel(row: PrismaSicherungspostenRow): Result<SicherungspostenReadModel> {
    const aggregateResult = PrismaSicherungspostenMapper.toDomain(row);
    if (aggregateResult.isFailure || !aggregateResult.value) {
      return this.failReconstitution<SicherungspostenReadModel>(row.id, aggregateResult.error);
    }
    return Result.ok({
      aggregate: aggregateResult.value,
      erstelltAm: row.erstelltAm,
      aktualisiertAm: row.aktualisiertAm,
      aktualisiertVonUserId: row.aktualisiertVonUserId,
    });
  }

  private failReconstitution<T>(sicherungspostenId: string, reason?: string): Result<T> {
    const safeReason = reason ?? 'Unbekannter Reconstitution-Fehler';
    this.logger.error('Reconstitution des Sicherungspostens fehlgeschlagen', { sicherungspostenId, reason: safeReason });
    return Result.fail<T>(`${INFRASTRUCTURE_ERROR_RECONSTITUTE}:${safeReason}`);
  }
}
