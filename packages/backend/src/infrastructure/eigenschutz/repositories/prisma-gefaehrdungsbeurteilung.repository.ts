import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import type { GefaehrdungsbeurteilungReadModel, IGefaehrdungsbeurteilungRepository } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';
import { PrismaGefaehrdungsbeurteilungMapper } from './mappers/gefaehrdungsbeurteilung.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Sentinel-Error, den der Handler aus `save` sieht, wenn Prisma eine
 * P2002-Unique-Violation auf `(einsatzId, einheitId)` meldet. Der Controller
 * mappt den String über `mapCommandError` auf HTTP 422 (BusinessRule).
 *
 * **Warum wiederholt statt zentral importiert:** Handler und Repository liegen
 * in unterschiedlichen Layern; der Repository darf nicht aus `application/`
 * importieren (Hexagonal-Richtung). Der Sentinel-String ist Teil des Handler-
 * Controller-Kontrakts und hier bewusst als lokale Konstante gespiegelt.
 */
const BUSINESS_RULE_EINHEIT_HAT_BEREITS_BEURTEILUNG = 'BusinessRule:EinheitHatBereitsBeurteilung';

/**
 * Sentinel-Error aus `updateItems`, wenn zwei Transaktionen parallel laufen
 * und die DB-seitige Version-WHERE-Bedingung 0 Rows matcht. Der Controller
 * mappt diesen String zum gleichen 409, den auch der Aggregate-interne
 * Version-Check produziert — doppelte Verteidigung gegen Lost-Updates.
 */
const GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED = 'ConflictDetected:Gefaehrdungsbeurteilung';
const INFRASTRUCTURE_ERROR_RECONSTITUTE_GEFAEHRDUNGSBEURTEILUNG = 'InfrastructureError:ReconstituteGefaehrdungsbeurteilung';

/**
 * Prisma-Adapter für das Haupt-Repository einer Gefährdungsbeurteilung.
 *
 * Story 2.1 nutzt `save` ausschließlich im Create-Pfad; spätere Stories
 * erweitern um Updates (eigener Code-Pfad mit optimistischer Versionierung).
 * Darum verwendet `save` bewusst `create`, **nicht** `upsert` — eine Kollision
 * auf `(einsatzId, einheitId)` wird so explizit als P2002 sichtbar, und der
 * Handler hat den Unique-Check bereits in Step 1 ausgeführt. Zwischen
 * Pre-Check und Insert besteht allerdings ein TOCTOU-Fenster (zwei parallele
 * POSTs passen den Check und hitten erst im Insert P2002) — dieses Repository
 * übersetzt P2002 deshalb in denselben Sentinel wie der Pre-Check, damit der
 * Controller konsistent HTTP 422 liefert statt 500 (Spec: „Backend muss
 * 409/422 zurückgeben, nicht silent Error").
 */
@Injectable()
export class PrismaGefaehrdungsbeurteilungRepository implements IGefaehrdungsbeurteilungRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async save(aggregate: Gefaehrdungsbeurteilung, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      await client.gefaehrdungsbeurteilung.create({
        data: {
          id: aggregate.id.value,
          einsatzId: aggregate.einsatzId,
          einheitId: aggregate.einheitId,
          gefahrenzoneId: aggregate.gefahrenzoneId,
          vorlageId: aggregate.vorlageId,
          items: PrismaGefaehrdungsbeurteilungMapper.toPersistenceItems(aggregate.items) as unknown as Prisma.InputJsonValue,
          version: aggregate.version,
          erstelltVonUserId: aggregate.createdBy,
          aktualisiertVonUserId: aggregate.createdBy,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      if (isPrismaP2002(error)) {
        this.logger.warn('Concurrent insert auf bereits belegter (einsatzId, einheitId)-Kombination', {
          gefaehrdungsbeurteilungId: aggregate.id.value,
          einsatzId: aggregate.einsatzId,
          einheitId: aggregate.einheitId,
        });
        return Result.fail<void>(BUSINESS_RULE_EINHEIT_HAT_BEREITS_BEURTEILUNG);
      }
      this.logger.error('Fehler beim Speichern der Gefährdungsbeurteilung', {
        gefaehrdungsbeurteilungId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async findById(id: string, tx?: TransactionContext): Promise<Result<Gefaehrdungsbeurteilung | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.gefaehrdungsbeurteilung.findUnique({ where: { id } });
      if (!row) return Result.ok<Gefaehrdungsbeurteilung | null>(null);
      const aggregateResult = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return this.failReconstitution<Gefaehrdungsbeurteilung | null>(row.id, aggregateResult.error);
      }
      return Result.ok<Gefaehrdungsbeurteilung | null>(aggregateResult.value);
    } catch (error) {
      return Result.fail<Gefaehrdungsbeurteilung | null>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async findReadModelById(id: string, tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungReadModel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.gefaehrdungsbeurteilung.findUnique({ where: { id } });
      if (!row) return Result.ok<GefaehrdungsbeurteilungReadModel | null>(null);
      const aggregateResult = PrismaGefaehrdungsbeurteilungMapper.toDomain(row);
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return this.failReconstitution<GefaehrdungsbeurteilungReadModel | null>(row.id, aggregateResult.error);
      }
      return Result.ok<GefaehrdungsbeurteilungReadModel | null>({
        aggregate: aggregateResult.value,
        erstelltAm: row.erstelltAm,
        aktualisiertAm: row.aktualisiertAm,
        aktualisiertVonUserId: row.aktualisiertVonUserId,
      });
    } catch (error) {
      return Result.fail<GefaehrdungsbeurteilungReadModel | null>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async existsForEinheit(einsatzId: string, einheitId: string, tx: TransactionContext): Promise<Result<boolean>> {
    const client = tx as PrismaTransactionClient;
    try {
      const count = await client.gefaehrdungsbeurteilung.count({
        where: { einsatzId, einheitId },
      });
      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail<boolean>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async updateItems(aggregate: Gefaehrdungsbeurteilung, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    // `aggregate.version` ist bereits die NEUE Version (inkrementiert in
    // `Aggregate.updateItems`). Die DB-seitige WHERE-Bedingung prüft die ALTE
    // Version (`aggregate.version - 1`) — matcht kein Row, hat inzwischen
    // eine parallele TX den Record hochgezählt und wir müssen als Lost-Update
    // abbrechen, auch wenn der In-Memory-Check zuvor passte.
    const expectedPreviousVersion = aggregate.version - 1;
    try {
      const result = await client.gefaehrdungsbeurteilung.updateMany({
        where: { id: aggregate.id.value, version: expectedPreviousVersion },
        data: {
          items: PrismaGefaehrdungsbeurteilungMapper.toPersistenceItems(aggregate.items) as unknown as Prisma.InputJsonValue,
          version: aggregate.version,
          aktualisiertVonUserId,
        },
      });
      if (result.count === 0) {
        this.logger.warn('Concurrent updateItems erkannt (version-Mismatch auf DB-Ebene)', {
          gefaehrdungsbeurteilungId: aggregate.id.value,
          expectedPreviousVersion,
        });
        return Result.fail<void>(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED);
      }
      if (result.count > 1) {
        // Defense-in-Depth: Das `@@unique` auf `id` macht diesen Pfad de facto
        // unmöglich. Sollte er dennoch eintreten (korrupte Daten, Migration
        // ohne Constraint), ist das ein harter Invariant-Bruch — Monitoring-
        // Signal via `logger.error`, Result.fail statt silent success.
        this.logger.error('Unerwartetes updateMany count > 1 für Gefährdungsbeurteilung', {
          gefaehrdungsbeurteilungId: aggregate.id.value,
          expectedPreviousVersion,
          count: result.count,
        });
        return Result.fail<void>('Invariant:UpdateCountAnomaly');
      }
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Aktualisieren der Gefährdungsbeurteilung', {
        gefaehrdungsbeurteilungId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  private failReconstitution<T>(gefaehrdungsbeurteilungId: string, reason?: string): Result<T> {
    const safeReason = reason ?? 'Unbekannter Reconstitution-Fehler';
    this.logger.error('Reconstitution der Gefährdungsbeurteilung fehlgeschlagen', {
      gefaehrdungsbeurteilungId,
      reason: safeReason,
    });
    return Result.fail<T>(`${INFRASTRUCTURE_ERROR_RECONSTITUTE_GEFAEHRDUNGSBEURTEILUNG}:${safeReason}`);
  }
}
