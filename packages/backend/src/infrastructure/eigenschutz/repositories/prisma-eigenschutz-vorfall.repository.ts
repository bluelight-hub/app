import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository, VorfallListFilter, VorfallListReadRow } from '@domain/eigenschutz/repositories';
import { VORFALL_LIST_HARD_LIMIT } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaEigenschutzVorfallMapper } from './mappers/eigenschutz-vorfall.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

const INFRASTRUCTURE_ERROR_RECONSTITUTE = 'InfrastructureError:ReconstituteEigenschutzVorfall';
const INFRASTRUCTURE_ERROR_LIST = 'InfrastructureError:ListEigenschutzVorfaelle';

function trimSentinelMessage(message: string): string {
  const trimmed = message.replace(/\s+/g, ' ').trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}

interface VorfallListPrismaRow {
  id: string;
  einsatzId: string;
  einheitId: string;
  vorfallZeit: Date;
  was: string;
  unfallkasseRelevant: boolean;
  erfasstAm: Date;
  erfasstVonUserId: string;
  geschlossenAm: Date | null;
  geschlossenVonUserId: string | null;
}

function toListReadRow(row: VorfallListPrismaRow): VorfallListReadRow {
  // Defense-in-Depth: ein `kontextSnapshot`-Feld auf der Eingabe ist ein
  // Schema-Drift-Bug — der Listen-Pfad darf den großen Snapshot niemals
  // durchreichen (siehe Story 5.3, AC1).
  if ('kontextSnapshot' in row) {
    throw new Error('toListReadRow: kontextSnapshot darf nicht im Listen-Mapping-Pfad auftauchen');
  }
  return {
    id: row.id,
    einsatzId: row.einsatzId,
    einheitId: row.einheitId,
    vorfallZeit: row.vorfallZeit,
    was: row.was,
    unfallkasseRelevant: row.unfallkasseRelevant,
    erfasstAm: row.erfasstAm,
    erfasstVonUserId: row.erfasstVonUserId,
    status: row.geschlossenAm === null ? 'OFFEN' : 'GESCHLOSSEN',
    geschlossenAm: row.geschlossenAm,
    geschlossenVonUserId: row.geschlossenVonUserId,
  };
}

/**
 * Prisma-Adapter für `EigenschutzVorfall` (Story 5.1, FR31/FR32).
 *
 * **Append-only:** Nur `save` (Insert) — keine Update-Operation. Vorfälle
 * werden im MVP nie aktualisiert oder gelöscht (Audit-Integrität).
 * `kontextSnapshot` wird in 5.1 als `{}` gespeichert; Story 5.2 ersetzt im
 * Handler die Stub-Logik durch einen `KontextSnapshotBuilder` für **neue**
 * Vorfälle. Bestehende `{}`-Zeilen bleiben unangetastet.
 */
@Injectable()
export class PrismaEigenschutzVorfallRepository implements IEigenschutzVorfallRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async save(aggregate: EigenschutzVorfall, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      await client.eigenschutzVorfall.create({
        data: PrismaEigenschutzVorfallMapper.toPrismaCreateInput(aggregate),
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      // Volle Prisma-Fehlermeldung nur ins Log (Schema-/Constraint-Details).
      // Nach außen geht ein generischer Sentinel ohne Schema-Leakage.
      this.logger.error('Fehler beim Speichern des Eigenschutz-Vorfalls', {
        vorfallId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>('InfrastructureError:SaveEigenschutzVorfall');
    }
  }

  async findById(id: string, tx?: TransactionContext): Promise<Result<EigenschutzVorfall | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.eigenschutzVorfall.findUnique({ where: { id } });
      if (!row) return Result.ok<EigenschutzVorfall | null>(null);
      const aggregateResult = PrismaEigenschutzVorfallMapper.toDomain(row);
      if (aggregateResult.isFailure || !aggregateResult.value) {
        // AC9: Logger-Eintrag mit `vorfallId` + `errorClass` (kein Snapshot-
        // Inhalt — PII). `errorClass` ist der Sentinel-Discriminator vor dem
        // ersten Doppelpunkt; die volle Sentinel-Message wird zusätzlich als
        // `error`-Feld geführt für Forensics ohne PII-Leak.
        const sentinel = aggregateResult.error ?? 'unknown';
        const errorClass = sentinel.split(':')[0] ?? 'unknown';
        this.logger.error('Vorfall-Reconstitution fehlgeschlagen', { vorfallId: row.id, errorClass, error: sentinel });
        return Result.fail<EigenschutzVorfall | null>(`${INFRASTRUCTURE_ERROR_RECONSTITUTE}:${sentinel}`);
      }
      return Result.ok<EigenschutzVorfall | null>(aggregateResult.value);
    } catch (error) {
      return Result.fail<EigenschutzVorfall | null>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async existsInEinsatz(einsatzId: string, vorfallId: string, tx?: TransactionContext): Promise<Result<boolean>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const count = await client.eigenschutzVorfall.count({ where: { id: vorfallId, einsatzId } });
      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail<boolean>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async updateClosure(aggregate: EigenschutzVorfall, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    const geschlossenAm = aggregate.geschlossenAm;
    const geschlossenVonUserId = aggregate.geschlossenVonUserId;
    if (geschlossenAm === null || geschlossenVonUserId === null) {
      return Result.fail<void>('InfrastructureError:UpdateVorfallClosure:AggregateNotClosed');
    }
    try {
      const result = await client.eigenschutzVorfall.updateMany({
        // Defense-in-Depth: Race-Condition-Doppelklick wird durch das
        // `geschlossenAm IS NULL`-Filter idempotent abgefangen — kein
        // Überschreiben fremder Closure-Werte.
        where: { id: aggregate.id.value, geschlossenAm: null },
        data: {
          geschlossenAm,
          geschlossenVonUserId,
          schliessungsBegruendung: aggregate.schliessungsBegruendung,
        },
      });
      if (result.count === 0) {
        // Entweder existiert die Row nicht mehr ODER sie ist bereits
        // geschlossen — der Handler hat das Aggregate aber gerade vorher
        // erfolgreich geladen und transitiert, also ist „bereits geschlossen"
        // der erwartete Pfad.
        return Result.fail<void>('BusinessRule:VorfallBereitsGeschlossen');
      }
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Schließen des Eigenschutz-Vorfalls', {
        vorfallId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>('InfrastructureError:UpdateVorfallClosure');
    }
  }

  async findByEinsatzWithFilters(einsatzId: string, filter: VorfallListFilter, tx?: TransactionContext): Promise<Result<VorfallListReadRow[]>> {
    if (filter.einheitIds !== undefined && filter.einheitIds.length === 0) {
      // Edge: Caller hat aktiv „leere" Einheiten-Liste übergeben. Statt
      // `IN ()`-Fehler zu provozieren, antworten wir mit leerem Result —
      // semantisch identisch zu „kein Match".
      return Result.ok<VorfallListReadRow[]>([]);
    }

    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    const where: Prisma.EigenschutzVorfallWhereInput = { einsatzId };
    if (filter.einheitIds !== undefined && filter.einheitIds.length > 0) {
      where.einheitId = { in: [...filter.einheitIds] };
    }
    if (filter.vorfallZeitVon !== undefined || filter.vorfallZeitBis !== undefined) {
      where.vorfallZeit = {
        ...(filter.vorfallZeitVon !== undefined ? { gte: filter.vorfallZeitVon } : {}),
        ...(filter.vorfallZeitBis !== undefined ? { lt: filter.vorfallZeitBis } : {}),
      };
    }
    if (filter.unfallkasseRelevant !== undefined) {
      where.unfallkasseRelevant = filter.unfallkasseRelevant;
    }
    // Issue #415: Status-Filter über `geschlossenAm IS NULL/NOT NULL`.
    if (filter.status === 'OFFEN') {
      where.geschlossenAm = null;
    } else if (filter.status === 'GESCHLOSSEN') {
      where.geschlossenAm = { not: null };
    }

    try {
      const rows = await client.eigenschutzVorfall.findMany({
        where,
        select: {
          id: true,
          einsatzId: true,
          einheitId: true,
          vorfallZeit: true,
          was: true,
          unfallkasseRelevant: true,
          erfasstAm: true,
          erfasstVonUserId: true,
          geschlossenAm: true,
          geschlossenVonUserId: true,
        },
        orderBy: [{ vorfallZeit: 'desc' }, { id: 'desc' }],
        take: VORFALL_LIST_HARD_LIMIT,
      });
      return Result.ok<VorfallListReadRow[]>(rows.map((row) => toListReadRow(row as VorfallListPrismaRow)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Vorfall-Listen-Query fehlgeschlagen', { einsatzId, error: message });
      return Result.fail<VorfallListReadRow[]>(`${INFRASTRUCTURE_ERROR_LIST}:${trimSentinelMessage(message)}`);
    }
  }
}
