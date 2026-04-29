import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PsaProfilQuittung as PrismaPsaProfilQuittungRow } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type {
  IPsaProfilQuittungRepository,
  PsaProfilQuittungReadModel,
  UpsertPsaProfilQuittungParams,
  UpsertPsaProfilQuittungResult,
  UpsertWithLueckeParams,
} from '@domain/eigenschutz/repositories/i-psa-profil-quittung.repository';
import { LOGGER } from '@infrastructure/di-tokens';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-Adapter für `IPsaProfilQuittungRepository` (Story 3.4).
 *
 * **Idempotenz-Strategie:** Try-Create + P2002-Catch. Der Constraint
 * `@@unique([propagationGroupId, einheitId])` (Schema seit Story 1.4) ist
 * die Quelle der Wahrheit; bei doppelter Quittung antwortet das Repo mit
 * `{ created: false, row }` und der bestehenden Row-Read.
 *
 * **Cross-Einsatz-Schutz:** `findByEinsatzAndGroup` filtert zusätzlich auf
 * `einsatzId`. Das Schema speichert `einsatzId` direkt auf der Row (kein
 * Join über die Bekanntgabe-Gruppe — `propagationGroupId` lebt nur als
 * CUID2 im Event-Stream, vgl. Architektur §B5).
 *
 * **Lücke-Felder reserviert für Story 3.6:** Story 3.4 schreibt
 * `lueckeGemeldet`/`lueckeNotiz` nicht; sie verbleiben auf den Schema-
 * Defaults (`false` / `null`). Read-Pfade exponieren sie unverändert,
 * damit Story 3.6 nur den Update-Pfad ergänzen muss.
 */
@Injectable()
export class PrismaPsaProfilQuittungRepository implements IPsaProfilQuittungRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async upsert(tx: TransactionContext, params: UpsertPsaProfilQuittungParams): Promise<Result<UpsertPsaProfilQuittungResult>> {
    const client = tx as PrismaTransactionClient;
    try {
      const created = await client.psaProfilQuittung.create({
        data: {
          propagationGroupId: params.propagationGroupId,
          einheitId: params.einheitId,
          einsatzId: params.einsatzId,
          quittiertVonUserId: params.quittiertVonUserId,
        },
      });
      return Result.ok({
        created: true,
        row: this.toReadModel(created),
      });
    } catch (error) {
      if (isPrismaP2002(error) && this.isPropagationGroupEinheitConflict(error)) {
        const existing = await client.psaProfilQuittung.findFirst({
          where: { propagationGroupId: params.propagationGroupId, einheitId: params.einheitId },
        });
        if (!existing) {
          this.logger.error('P2002 ohne nachladbare PsaProfilQuittung-Row — Datenkonsistenz prüfen', {
            propagationGroupId: params.propagationGroupId,
            einheitId: params.einheitId,
          });
          return Result.fail<UpsertPsaProfilQuittungResult>('InfrastructureError:PsaProfilQuittung:P2002-without-row');
        }
        return Result.ok({
          created: false,
          row: this.toReadModel(existing),
        });
      }
      this.logger.error('Fehler beim Anlegen einer PsaProfilQuittung', {
        propagationGroupId: params.propagationGroupId,
        einheitId: params.einheitId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<UpsertPsaProfilQuittungResult>(this.wrapInfrastructureError(error));
    }
  }

  async upsertWithLuecke(tx: TransactionContext, params: UpsertWithLueckeParams): Promise<Result<UpsertPsaProfilQuittungResult>> {
    const client = tx as PrismaTransactionClient;
    try {
      // Pre-Check: Row existieren? Wir nutzen das, damit wir das `created`-Flag
      // für den Handler bestimmen können — Prisma's natives `upsert(...)`
      // liefert allein keine Auskunft, ob Insert oder Update gegriffen hat.
      const existing = await client.psaProfilQuittung.findUnique({
        where: { propagationGroupId_einheitId: { propagationGroupId: params.propagationGroupId, einheitId: params.einheitId } },
        select: { id: true },
      });

      const row = await client.psaProfilQuittung.upsert({
        where: { propagationGroupId_einheitId: { propagationGroupId: params.propagationGroupId, einheitId: params.einheitId } },
        create: {
          propagationGroupId: params.propagationGroupId,
          einheitId: params.einheitId,
          einsatzId: params.einsatzId,
          quittiertVonUserId: params.quittiertVonUserId,
          lueckeGemeldet: true,
          lueckeNotiz: params.lueckeNotiz,
        },
        // Defense-in-Depth: Update schreibt explizit NUR die Lücke-Felder —
        // niemals `quittiertAm` (Audit-Pflicht der Quittung) oder
        // `quittiertVonUserId` (ein anderer Empfänger darf später nicht den
        // Erst-Quittierer überschreiben).
        update: {
          lueckeGemeldet: true,
          lueckeNotiz: params.lueckeNotiz,
        },
      });

      return Result.ok({
        created: existing === null,
        row: this.toReadModel(row),
      });
    } catch (error) {
      this.logger.error('Fehler beim Upsert einer PsaProfilQuittung mit Lücke', {
        propagationGroupId: params.propagationGroupId,
        einheitId: params.einheitId,
        einsatzId: params.einsatzId,
        meldungLength: params.lueckeNotiz.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<UpsertPsaProfilQuittungResult>(this.wrapInfrastructureLueckeError(error));
    }
  }

  async findByGroup(propagationGroupId: string, tx?: TransactionContext): Promise<Result<PsaProfilQuittungReadModel[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const rows = await client.psaProfilQuittung.findMany({
        where: { propagationGroupId },
        orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
      });
      return Result.ok(rows.map((row) => this.toReadModel(row)));
    } catch (error) {
      return Result.fail<PsaProfilQuittungReadModel[]>(this.wrapInfrastructureError(error));
    }
  }

  async findByEinsatzAndGroup(einsatzId: string, propagationGroupId: string, tx?: TransactionContext): Promise<Result<PsaProfilQuittungReadModel[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const rows = await client.psaProfilQuittung.findMany({
        where: { einsatzId, propagationGroupId },
        orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
      });
      return Result.ok(rows.map((row) => this.toReadModel(row)));
    } catch (error) {
      return Result.fail<PsaProfilQuittungReadModel[]>(this.wrapInfrastructureError(error));
    }
  }

  private toReadModel(row: PrismaPsaProfilQuittungRow): PsaProfilQuittungReadModel {
    return {
      id: row.id,
      propagationGroupId: row.propagationGroupId,
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      quittiertAm: row.quittiertAm,
      quittiertVonUserId: row.quittiertVonUserId,
      lueckeGemeldet: row.lueckeGemeldet,
      lueckeNotiz: row.lueckeNotiz,
    };
  }

  private wrapInfrastructureError(error: unknown): string {
    const raw = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
    return `InfrastructureError:PsaProfilQuittung:${raw}`;
  }

  private wrapInfrastructureLueckeError(error: unknown): string {
    const raw = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
    return `InfrastructureError:PsaProfilQuittung:Luecke:${raw}`;
  }

  /**
   * Prüft, ob der P2002 wirklich der Idempotenz-Constraint
   * `@@unique([propagationGroupId, einheitId])` ist und nicht ein anderer
   * Unique-Verstoß (z. B. PK-Collision, schema-evolution-Edge-Case). Sonst
   * würden wir einen unrelated Fehler still als idempotenten Re-Ack
   * interpretieren.
   */
  private isPropagationGroupEinheitConflict(error: unknown): boolean {
    const target = (error as { meta?: { target?: unknown } } | null)?.meta?.target;
    if (Array.isArray(target)) {
      return target.includes('propagationGroupId') && target.includes('einheitId');
    }
    if (typeof target === 'string') {
      return target.includes('propagationGroupId') && target.includes('einheitId');
    }
    // Wenn Prisma kein meta.target liefert (sehr seltene Edge), bleiben wir
    // konservativ: kein Stiller-Idempotenz-Pfad, sondern InfrastructureError.
    return false;
  }
}
