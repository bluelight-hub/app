import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, Sicherheitsregel as PrismaSicherheitsregelRow } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { ISicherheitsregelRepository, SicherheitsregelReadModel } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaSicherheitsregelMapper, INFRASTRUCTURE_ERROR_RECONSTITUTE_SICHERHEITSREGEL } from './mappers/sicherheitsregel.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Sentinel-Error aus `updateWithNewVersion`, wenn zwei Transaktionen parallel
 * laufen und die DB-seitige Version-WHERE-Bedingung 0 Rows matcht. Der
 * Controller mappt diesen String auf HTTP 409 mit `current/attempted`-Context
 * — gleiches Verhalten wie im Aggregate-internen Conflict-Check (Story 2.3
 * Hardening-Pattern).
 */
const SICHERHEITSREGEL_CONFLICT_DETECTED = 'ConflictDetected:Sicherheitsregel';
const INVARIANT_UPDATE_COUNT_ANOMALY = 'Invariant:UpdateCountAnomaly';

/**
 * Prisma-Adapter für das Haupt-Repository einer Sicherheitsregel (Story 2.6).
 *
 * ## Propagation-Gruppen-Identität
 *
 * `propagationGroupId` lebt laut Epic-Entscheidung **nicht** auf der
 * Haupt-Row, sondern ausschließlich im Event-Payload. Das Read-Model (AC6)
 * braucht sie dennoch als Feld — deshalb fragt dieses Repository beim
 * `findReadModelBy*`-Pfad die `outbox_events`-Tabelle ab und pickt das
 * älteste `SicherheitsregelAusgerufen`-Event pro Regel (das trägt die
 * ursprüngliche Gruppe des Create-Aufrufs). Fallback auf `regel.id`, falls
 * das Outbox-Event bereits abgeräumt wurde (Retention-Policy).
 *
 * ## Einheit-Filter-Semantik in `findActiveByEinsatz` (AC6)
 *
 * - `einheitId === undefined` → alle aktiven Regeln (einsatzweit + alle Einheiten)
 * - `einheitId === null` → nur einsatzweite Regeln (`einheit_id IS NULL`)
 * - `einheitId === '<id>'` → einsatzweit + Regeln dieser konkreten Einheit
 *   (Union, für Story 2.7 „meine Einheit + einsatzweit"-Sicht)
 *
 * Nur Regeln mit **offener** Version (`gueltigBis IS NULL` in mindestens
 * einer ihrer `SicherheitsregelVersion`-Zeilen) werden zurückgeliefert —
 * deprecated Regeln (Re-Wire-Pfad, AC4) fallen heraus, ohne dass die
 * Haupt-Row physisch gelöscht wird (FR42 append-only).
 */
@Injectable()
export class PrismaSicherheitsregelRepository implements ISicherheitsregelRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async save(aggregate: Sicherheitsregel, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      await client.sicherheitsregel.create({
        data: PrismaSicherheitsregelMapper.toPersistenceCreate(aggregate, aktualisiertVonUserId),
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Speichern der Sicherheitsregel', {
        sicherheitsregelId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(this.wrapInfrastructureError(error));
    }
  }

  async findById(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<Sicherheitsregel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.sicherheitsregel.findUnique({ where: { id } });
      if (!row) return Result.ok<Sicherheitsregel | null>(null);
      // Cross-Einsatz-Isolation: ein abweichender `einsatzId` darf nicht als
      // Hit gelten (Memory-Note „Einsatz-Routen-Nesting").
      if (row.einsatzId !== einsatzId) return Result.ok<Sicherheitsregel | null>(null);
      const aggregateResult = PrismaSicherheitsregelMapper.toDomain(row);
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return this.failReconstitution<Sicherheitsregel | null>(row.id, aggregateResult.error);
      }
      return Result.ok<Sicherheitsregel | null>(aggregateResult.value);
    } catch (error) {
      return Result.fail<Sicherheitsregel | null>(this.wrapInfrastructureError(error));
    }
  }

  async findReadModelById(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<SicherheitsregelReadModel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.sicherheitsregel.findUnique({ where: { id } });
      if (!row) return Result.ok<SicherheitsregelReadModel | null>(null);
      if (row.einsatzId !== einsatzId) return Result.ok<SicherheitsregelReadModel | null>(null);

      const propagationGroupMap = await this.loadPropagationGroupIds([row.id], client);
      return this.toReadModel(row, propagationGroupMap);
    } catch (error) {
      return Result.fail<SicherheitsregelReadModel | null>(this.wrapInfrastructureError(error));
    }
  }

  async findActiveByEinsatz(einsatzId: string, einheitId?: string | null, tx?: TransactionContext): Promise<Result<SicherheitsregelReadModel[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const whereEinheit = this.buildEinheitFilter(einheitId);
      const rows = await client.sicherheitsregel.findMany({
        where: {
          einsatzId,
          // Nur Rows mit mindestens einer offenen Version — deprecated
          // Regeln (alle Versionen `gueltigBis != null`) fallen heraus.
          versionen: { some: { gueltigBis: null } },
          ...whereEinheit,
        },
        orderBy: [{ aktualisiertAm: 'desc' }, { erstelltAm: 'desc' }, { id: 'asc' }],
      });

      if (rows.length === 0) {
        return Result.ok<SicherheitsregelReadModel[]>([]);
      }

      const propagationGroupMap = await this.loadPropagationGroupIds(
        rows.map((row) => row.id),
        client,
      );

      const readModels: SicherheitsregelReadModel[] = [];
      for (const row of rows) {
        const readModelResult = this.toReadModel(row, propagationGroupMap);
        if (readModelResult.isFailure || !readModelResult.value) {
          return Result.fail<SicherheitsregelReadModel[]>(readModelResult.error ?? 'ReadModel konnte nicht rekonstruiert werden');
        }
        readModels.push(readModelResult.value);
      }
      return Result.ok(readModels);
    } catch (error) {
      return Result.fail<SicherheitsregelReadModel[]>(this.wrapInfrastructureError(error));
    }
  }

  async deprecate(id: string, einsatzId: string, aktualisiertVonUserId: string, expectedVersion: number, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      // DB-Level-OCC: Haupt-Row nur abkündigen, wenn `version === expectedVersion`
      // UND `einsatzId` stimmt. Zwei parallele Re-Wire-PUTs mit identischem
      // `expectedVersion` werden serialisiert: nur die erste Tx schafft den
      // updateMany, die zweite bekommt count=0 → ConflictDetected-Sentinel.
      // Cross-Einsatz-Isolation als zweite Verteidigungslinie ebenfalls hier.
      // Das Schließen der offenen Version erfolgt anschließend durch den
      // Handler via `versionRepo.closeCurrentVersion(...)` mit dem Domain-
      // Event-Timestamp — dort lebt die Version-Chain-Invariante.
      const aktualisiertAm = new Date();
      const updateResult = await client.sicherheitsregel.updateMany({
        where: { id, einsatzId, version: expectedVersion },
        data: { aktualisiertAm, aktualisiertVonUserId },
      });
      if (updateResult.count === 0) {
        // Existiert die Regel im richtigen Einsatz? Wenn nein → 404, sonst → 409.
        const exists = await client.sicherheitsregel.count({ where: { id, einsatzId } });
        if (exists === 0) {
          this.logger.warn('deprecate: Regel nicht im angegebenen Einsatz gefunden', { sicherheitsregelId: id, einsatzId });
          return Result.fail<void>('NotFound:Sicherheitsregel');
        }
        this.logger.warn('deprecate: Version-Mismatch — Concurrent-Update erkannt', {
          sicherheitsregelId: id,
          einsatzId,
          expectedVersion,
        });
        return Result.fail<void>(SICHERHEITSREGEL_CONFLICT_DETECTED);
      }
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Abkündigen der Sicherheitsregel', {
        sicherheitsregelId: id,
        einsatzId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(this.wrapInfrastructureError(error));
    }
  }

  async findActiveById(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<Sicherheitsregel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.sicherheitsregel.findUnique({
        where: { id },
        include: { versionen: { where: { gueltigBis: null }, take: 1, select: { id: true } } },
      });
      if (!row) return Result.ok<Sicherheitsregel | null>(null);
      if (row.einsatzId !== einsatzId) return Result.ok<Sicherheitsregel | null>(null);
      // `versionen` ist hier die offene Version-Liste (max 1) — leer = deprecated.
      const offeneVersionen = (row as unknown as { versionen?: { id: string }[] }).versionen ?? [];
      if (offeneVersionen.length === 0) return Result.ok<Sicherheitsregel | null>(null);
      const aggregateResult = PrismaSicherheitsregelMapper.toDomain(row);
      if (aggregateResult.isFailure || !aggregateResult.value) {
        return this.failReconstitution<Sicherheitsregel | null>(row.id, aggregateResult.error);
      }
      return Result.ok<Sicherheitsregel | null>(aggregateResult.value);
    } catch (error) {
      return Result.fail<Sicherheitsregel | null>(this.wrapInfrastructureError(error));
    }
  }

  async updateWithNewVersion(aggregate: Sicherheitsregel, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    // `aggregate.version` ist bereits die NEUE Version (im Aggregate
    // hochgezählt). Die DB-WHERE-Bedingung prüft die ALTE Version
    // (`aggregate.version - 1`) — Defense-in-Depth gegen Lost-Update, siehe
    // Gefährdungsbeurteilung Story 2.3 Hardening.
    const expectedPreviousVersion = aggregate.version - 1;
    try {
      const result = await client.sicherheitsregel.updateMany({
        where: { id: aggregate.id.value, version: expectedPreviousVersion },
        data: PrismaSicherheitsregelMapper.toPersistenceUpdate(aggregate, aktualisiertVonUserId),
      });
      if (result.count === 0) {
        this.logger.warn('Concurrent updateWithNewVersion erkannt (version-Mismatch auf DB-Ebene)', {
          sicherheitsregelId: aggregate.id.value,
          expectedPreviousVersion,
        });
        return Result.fail<void>(SICHERHEITSREGEL_CONFLICT_DETECTED);
      }
      if (result.count > 1) {
        this.logger.error('Unerwartetes updateMany count > 1 für Sicherheitsregel', {
          sicherheitsregelId: aggregate.id.value,
          expectedPreviousVersion,
          count: result.count,
        });
        return Result.fail<void>(INVARIANT_UPDATE_COUNT_ANOMALY);
      }
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Aktualisieren der Sicherheitsregel', {
        sicherheitsregelId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(this.wrapInfrastructureError(error));
    }
  }

  /**
   * Lädt für eine Liste von `regelIds` jeweils die `propagationGroupId` aus
   * dem ältesten `SicherheitsregelAusgerufen`-Event (Create-Event trägt die
   * originale Gruppe — Story 2.6 AC2).
   *
   * Batch-Query (`in`) statt N+1; Sort in JS, damit wir kein raw-SQL
   * `DISTINCT ON` brauchen (Prisma kann das auf dem aktuellen Driver-Level
   * nicht direkt). Fallback pro ID, wenn kein Event gefunden wurde
   * (z. B. Outbox-Retention): `regel.id` als Gruppe — das ist semantisch
   * neutral, da eine Regel ohne Gruppen-Fanout implizit in ihrer eigenen
   * Gruppe steht.
   */
  private async loadPropagationGroupIds(regelIds: readonly string[], client: PrismaTransactionClient | PrismaService): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (regelIds.length === 0) return map;
    try {
      const events = await client.outboxEvent.findMany({
        where: {
          aggregateId: { in: [...regelIds] },
          eventName: SicherheitsregelAusgerufenEvent.eventName(),
        },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        select: { aggregateId: true, payload: true },
      });
      for (const event of events) {
        if (map.has(event.aggregateId)) continue; // erstes Event gewinnt (ältestes)
        const payload = event.payload as { propagationGroupId?: unknown } | null;
        const groupId = payload && typeof payload.propagationGroupId === 'string' ? payload.propagationGroupId : null;
        if (groupId) map.set(event.aggregateId, groupId);
      }
    } catch (error) {
      // Outbox-Lookup ist best-effort — ein DB-Fehler hier darf den Read-
      // Path nicht komplett kippen. Wir loggen, liefern leere Map, der
      // Caller fällt auf `regel.id` als Gruppen-ID zurück.
      this.logger.warn('loadPropagationGroupIds: Outbox-Lookup fehlgeschlagen, Fallback auf regel.id', {
        regelIds: regelIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return map;
  }

  /**
   * Baut den `einheitId`-Teil des `where`-Filters gemäß
   * {@link ISicherheitsregelRepository.findActiveByEinsatz}-Semantik.
   *
   * Leerer String wird wie `undefined` behandelt — Validierung gegen leere
   * Query-Param-Strings (TanStack-Router-/HTTP-Quirks) erfolgt eine Schicht
   * höher (Query-Klasse). Dieser Defense-in-Depth-Branch verhindert, dass
   * ein durchgerutschter `''` zu einem `OR: [..., { einheitId: '' }]`
   * führt, das in der DB nichts matcht, aber den Plan unnötig aufbläht.
   */
  private buildEinheitFilter(einheitId: string | null | undefined): Record<string, unknown> {
    if (einheitId === undefined || einheitId === '') return {};
    if (einheitId === null) return { einheitId: null };
    return { OR: [{ einheitId: null }, { einheitId }] };
  }

  /**
   * Verpackt unbekannte DB-/Driver-Fehler in einen `InfrastructureError:`-
   * Sentinel, damit ein zufällig sentinel-aussehender `error.message`
   * (z. B. eine Postgres `RAISE`-Message mit Inhalt `'NotFound:…'`) nicht
   * beim Controller-Mapping auf 404/422 rutscht. Bekannte Repo-Sentinels
   * (`ConflictDetected:`, `Invariant:`, `NotFound:`) werden unverändert
   * durchgereicht.
   */
  private wrapInfrastructureError(error: unknown): string {
    const raw = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
    if (raw.startsWith(SICHERHEITSREGEL_CONFLICT_DETECTED) || raw.startsWith(INVARIANT_UPDATE_COUNT_ANOMALY) || raw.startsWith('NotFound:')) {
      return raw;
    }
    return `InfrastructureError:Sicherheitsregel:${raw}`;
  }

  private failReconstitution<T>(sicherheitsregelId: string, reason?: string): Result<T> {
    const safeReason = reason ?? 'Unbekannter Reconstitution-Fehler';
    this.logger.error('Reconstitution der Sicherheitsregel fehlgeschlagen', {
      sicherheitsregelId,
      reason: safeReason,
    });
    return Result.fail<T>(`${INFRASTRUCTURE_ERROR_RECONSTITUTE_SICHERHEITSREGEL}:${safeReason}`);
  }

  private toReadModel(row: PrismaSicherheitsregelRow, propagationGroupMap: ReadonlyMap<string, string>): Result<SicherheitsregelReadModel> {
    const aggregateResult = PrismaSicherheitsregelMapper.toDomain(row);
    if (aggregateResult.isFailure || !aggregateResult.value) {
      return this.failReconstitution<SicherheitsregelReadModel>(row.id, aggregateResult.error);
    }
    return Result.ok({
      aggregate: aggregateResult.value,
      erstelltAm: row.erstelltAm,
      aktualisiertAm: row.aktualisiertAm,
      aktualisiertVonUserId: row.aktualisiertVonUserId,
      propagationGroupId: propagationGroupMap.get(row.id) ?? row.id,
    });
  }
}
