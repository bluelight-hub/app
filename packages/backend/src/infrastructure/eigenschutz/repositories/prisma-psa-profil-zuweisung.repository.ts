import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PsaProfilZuweisung as PrismaPsaProfilZuweisungRow } from '@/generated/prisma/client';
import type { PsaProfil } from '@/generated/prisma/enums';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PsaProfilZuweisung, PSA_PROFIL_CONFLICT_DETECTED, PSA_PROFIL_DUPLICATE_ACTIVE } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import type { IPsaProfilZuweisungReadRepository, IPsaProfilZuweisungRepository, PsaProfilZuweisungReadRow } from '@domain/eigenschutz/repositories/i-psa-profil-zuweisung.repository';
import { LOGGER } from '@infrastructure/di-tokens';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';

type PrismaTransactionClient = Prisma.TransactionClient;

const INVARIANT_UPDATE_COUNT_ANOMALY = 'Invariant:UpdateCountAnomaly:PsaProfilZuweisung';

/**
 * Prisma-Adapter für `IPsaProfilZuweisungRepository` (Story 3.1).
 *
 * **Versionierung & Lost-Update-Schutz** (AC4): Schließ-Pfad nutzt
 * `updateMany WHERE id = ? AND version = expectedVersion`; `count === 0`
 * → `ConflictDetected:PsaProfilZuweisung[:current=<n>]`. Der Sentinel
 * trägt im Suffix die aktuelle DB-Version, damit der Controller-Mapper
 * den HTTP-409-Context mit `currentVersion` rendern kann (Pattern aus
 * Story 2.3 Hardening).
 *
 * **Application-Guard für Doppelaktivierung** (AC8): Vor jedem `INSERT`
 * eines neuen aktiven Eintrags wird in derselben TX geprüft, ob bereits
 * eine aktive Row für `(einsatzId, einheitId, profil)` existiert. Bei
 * Treffer Sentinel `ConflictDetected:DuplicateActivePsaProfilZuweisung`.
 * Der Postgres-Partial-Unique-Index `psa_profil_zuweisungen_active_unique`
 * (Migration `20260424100000_*`) ist Defense-in-Depth — bei race-bedingtem
 * Slip-Through fängt der Adapter den P2002-Constraint-Error genauso ab.
 *
 * **Cross-Einsatz-Isolation:** Alle Lookups filtern explizit auf
 * `einsatzId`, auch wenn die Haupt-Row über die `id` eindeutig wäre
 * (Memory-Note „Einsatz-Routen-Nesting").
 */
@Injectable()
export class PrismaPsaProfilZuweisungRepository implements IPsaProfilZuweisungRepository, IPsaProfilZuweisungReadRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async findActiveByEinheit(einsatzId: string, einheitId: string, profil: PsaProfil, tx?: TransactionContext): Promise<Result<PsaProfilZuweisung | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.psaProfilZuweisung.findFirst({
        where: { einsatzId, einheitId, profil, gueltigBis: null },
      });
      if (!row) return Result.ok<PsaProfilZuweisung | null>(null);
      return this.rowToAggregate(row);
    } catch (error) {
      return Result.fail<PsaProfilZuweisung | null>(this.wrapInfrastructureError(error));
    }
  }

  async findByZuweisungId(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<PsaProfilZuweisung | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.psaProfilZuweisung.findUnique({ where: { id } });
      if (!row) return Result.ok<PsaProfilZuweisung | null>(null);
      if (row.einsatzId !== einsatzId) return Result.ok<PsaProfilZuweisung | null>(null);
      return this.rowToAggregate(row);
    } catch (error) {
      return Result.fail<PsaProfilZuweisung | null>(this.wrapInfrastructureError(error));
    }
  }

  async saveActivation(aggregate: PsaProfilZuweisung, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    return this.insertActiveRow(aggregate, client);
  }

  async closeActiveZuweisung(aggregate: PsaProfilZuweisung, expectedVersion: number, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    return this.applyClose(aggregate, expectedVersion, client);
  }

  async closeAndCreateNext(closing: PsaProfilZuweisung, expectedVersion: number, next: PsaProfilZuweisung, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    const closeResult = await this.applyClose(closing, expectedVersion, client);
    if (closeResult.isFailure) return closeResult;
    return this.insertActiveRow(next, client);
  }

  async findActiveProfileByEinheit(einsatzId: string, einheitId: string, tx?: TransactionContext): Promise<Result<PsaProfilZuweisungReadRow[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const rows = await client.psaProfilZuweisung.findMany({
        where: { einsatzId, einheitId, gueltigBis: null },
        orderBy: [{ profil: 'asc' }, { gueltigVon: 'asc' }],
      });
      return Result.ok(rows.map((row) => this.toReadRow(row)));
    } catch (error) {
      return Result.fail<PsaProfilZuweisungReadRow[]>(this.wrapInfrastructureError(error));
    }
  }

  private async insertActiveRow(aggregate: PsaProfilZuweisung, client: PrismaTransactionClient): Promise<Result<void>> {
    try {
      // AC8 Application-Guard: TOCTOU-frei innerhalb der TX prüfen, ob
      // bereits eine aktive Row für die Tripel-Kombi existiert.
      const existing = await client.psaProfilZuweisung.findFirst({
        where: { einsatzId: aggregate.einsatzId, einheitId: aggregate.einheitId, profil: aggregate.profil, gueltigBis: null },
        select: { id: true },
      });
      if (existing) {
        // Story 3.9 AC1: zuweisungId der bereits aktiven Row im Sentinel
        // mitgeben, damit der Frontend-Folgecall `POST /sync-conflicts` die
        // Verlierer-Zeile referenzieren kann.
        return Result.fail<void>(`${PSA_PROFIL_DUPLICATE_ACTIVE}:zuweisungId=${existing.id}`);
      }

      await client.psaProfilZuweisung.create({
        data: {
          id: aggregate.id.value,
          einsatzId: aggregate.einsatzId,
          einheitId: aggregate.einheitId,
          profil: aggregate.profil,
          gueltigVon: aggregate.gueltigVon,
          gueltigBis: aggregate.gueltigBis,
          aktiviertVonUserId: aggregate.aktiviertVonUserId,
          begruendung: aggregate.begruendung,
          propagationGroupId: aggregate.propagationGroupId,
          version: aggregate.version,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      if (isPrismaP2002(error)) {
        // Postgres-Partial-Unique-Index hat einen race-bedingten zweiten
        // Insert abgefangen — gleiche Semantik wie der Application-Guard,
        // damit der Caller einen einheitlichen Sentinel sieht.
        this.logger.warn('Doppelaktivierung via P2002 abgefangen — Application-Guard hatte race', {
          einsatzId: aggregate.einsatzId,
          einheitId: aggregate.einheitId,
          profil: aggregate.profil,
        });
        // Story 3.9 AC1: kollidierende Zeile nachladen, um zuweisungId an
        // den Sentinel zu hängen (Frontend-Folgecall braucht sie).
        // Code-Review P3: Lookup eigens kapseln — wirft die DB hier, fällt
        // der Sentinel auf den unmaskierten `DuplicateActive`-Code zurück
        // statt zu einem 500 zu degradieren.
        try {
          const existing = await client.psaProfilZuweisung.findFirst({
            where: { einsatzId: aggregate.einsatzId, einheitId: aggregate.einheitId, profil: aggregate.profil, gueltigBis: null },
            select: { id: true },
          });
          if (existing) {
            return Result.fail<void>(`${PSA_PROFIL_DUPLICATE_ACTIVE}:zuweisungId=${existing.id}`);
          }
        } catch (lookupError) {
          this.logger.warn('zuweisungId-Lookup nach P2002 fehlgeschlagen — Sentinel ohne zuweisungId zurückgeben', {
            einsatzId: aggregate.einsatzId,
            einheitId: aggregate.einheitId,
            profil: aggregate.profil,
            error: lookupError instanceof Error ? lookupError.message : String(lookupError),
          });
        }
        return Result.fail<void>(PSA_PROFIL_DUPLICATE_ACTIVE);
      }
      this.logger.error('Fehler beim INSERT einer aktiven PsaProfilZuweisung', {
        zuweisungId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(this.wrapInfrastructureError(error));
    }
  }

  private async applyClose(aggregate: PsaProfilZuweisung, expectedVersion: number, client: PrismaTransactionClient): Promise<Result<void>> {
    try {
      const updateResult = await client.psaProfilZuweisung.updateMany({
        where: { id: aggregate.id.value, einsatzId: aggregate.einsatzId, version: expectedVersion, gueltigBis: null },
        // Beim Schließen erhalten wir die ursprüngliche Aktivierungs-`begruendung`
        // — die Deaktivierungs-Begründung lebt ohnehin im Outbox-Event und ist
        // via Event-History/Versions-Timeline abrufbar (Code-Review P-11).
        data: {
          gueltigBis: aggregate.gueltigBis,
          version: aggregate.version,
        },
      });

      if (updateResult.count === 0) {
        // Differenziere zwischen NotFound und Versions-Konflikt.
        const current = await client.psaProfilZuweisung.findUnique({ where: { id: aggregate.id.value } });
        if (!current || current.einsatzId !== aggregate.einsatzId) {
          this.logger.warn('closeActiveZuweisung: Row nicht im angegebenen Einsatz gefunden', {
            zuweisungId: aggregate.id.value,
            einsatzId: aggregate.einsatzId,
          });
          return Result.fail<void>('NotFound:PsaProfilZuweisung');
        }
        this.logger.warn('closeActiveZuweisung: Version-Mismatch — Concurrent-Update erkannt', {
          zuweisungId: aggregate.id.value,
          expectedVersion,
          currentVersion: current.version,
        });
        // Story 3.9 AC1: Sentinel um `:zuweisungId=<id>` ergänzen, damit der
        // Frontend-Folgecall `POST /sync-conflicts` die Verlierer-Row
        // referenzieren kann.
        return Result.fail<void>(`${PSA_PROFIL_CONFLICT_DETECTED}:current=${current.version}:zuweisungId=${current.id}`);
      }
      if (updateResult.count > 1) {
        // Unmöglich, weil `where: { id }` UNIQUE matched. Falls trotzdem
        // erreicht: Throw (statt Result.fail) — sonst rollt die äußere TX
        // den bereits ausgeführten Update nicht zurück (Code-Review P-14).
        this.logger.error('Unerwartetes updateMany count > 1 für PsaProfilZuweisung', {
          zuweisungId: aggregate.id.value,
          count: updateResult.count,
        });
        throw new Error(`${INVARIANT_UPDATE_COUNT_ANOMALY}:count=${updateResult.count}`);
      }
      return Result.ok<void>(undefined);
    } catch (error) {
      // Re-throw INVARIANT-Anomalie nach oben, damit der TX-Rollback greift.
      if (error instanceof Error && error.message.startsWith(INVARIANT_UPDATE_COUNT_ANOMALY)) {
        throw error;
      }
      this.logger.error('Fehler beim Schließen einer aktiven PsaProfilZuweisung', {
        zuweisungId: aggregate.id.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(this.wrapInfrastructureError(error));
    }
  }

  private rowToAggregate(row: PrismaPsaProfilZuweisungRow): Result<PsaProfilZuweisung | null> {
    const result = PsaProfilZuweisung.reconstitute({
      id: row.id,
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      profil: row.profil,
      gueltigVon: row.gueltigVon,
      gueltigBis: row.gueltigBis,
      aktiviertVonUserId: row.aktiviertVonUserId,
      begruendung: row.begruendung,
      propagationGroupId: row.propagationGroupId,
      version: row.version,
    });
    if (result.isFailure || !result.value) {
      this.logger.error('Reconstitution der PsaProfilZuweisung fehlgeschlagen', { zuweisungId: row.id, reason: result.error });
      return Result.fail<PsaProfilZuweisung | null>(`InfrastructureError:ReconstitutePsaProfilZuweisung:${result.error ?? 'unknown'}`);
    }
    return Result.ok<PsaProfilZuweisung | null>(result.value);
  }

  private toReadRow(row: PrismaPsaProfilZuweisungRow): PsaProfilZuweisungReadRow {
    return {
      id: row.id,
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      profil: row.profil,
      gueltigVon: row.gueltigVon,
      gueltigBis: row.gueltigBis,
      aktiviertVonUserId: row.aktiviertVonUserId,
      begruendung: row.begruendung,
      propagationGroupId: row.propagationGroupId,
      version: row.version,
    };
  }

  private wrapInfrastructureError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.startsWith('InfrastructureError:')) return raw;
    return `InfrastructureError:PsaProfilZuweisung:${raw}`;
  }
}
