import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, SicherheitsregelQuittung as PrismaSicherheitsregelQuittungRow } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type {
  ISicherheitsregelQuittungRepository,
  SicherheitsregelQuittungReadModel,
  UpsertSicherheitsregelQuittungParams,
  UpsertSicherheitsregelQuittungResult,
} from '@domain/eigenschutz/repositories/i-sicherheitsregel-quittung.repository';
import { LOGGER } from '@infrastructure/di-tokens';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';

type PrismaTransactionClient = Prisma.TransactionClient;

type PrismaQuittungRowWithEinheit = PrismaSicherheitsregelQuittungRow & {
  regel?: { einheit?: { name: string } | null } | null;
};

/**
 * Prisma-Adapter für `ISicherheitsregelQuittungRepository` (Story 2.7).
 *
 * **Idempotenz-Strategie**: Try-Create + P2002-Catch. Der Constraint
 * `@@unique([regelId, einheitId])` (Schema seit Story 1.4) ist die Quelle
 * der Wahrheit; bei doppelter Quittung antwortet das Repo mit
 * `{ created: false, quittung }` und der bestehenden Row-Read.
 *
 * **Cross-Einsatz-Schutz**: `findByRegel`/`findByRegelAndEinheit` prüfen
 * über die Relation `regel.einsatzId === einsatzId`. Eine Quittung kann
 * nicht über Einsatz-Grenzen hinweg gefunden werden, selbst wenn der
 * `regelId`-Lookup einen Treffer hätte.
 *
 * **`einheitName`-Resolution**: Pro Quittung wird die `EinsatzEinheit`
 * über die Regel-Beziehung mitgeladen. Da die `Sicherheitsregel.einheitId`
 * für einsatzweite Regeln `null` ist, fragen wir die Einheit der Quittung
 * **nicht** über die Regel, sondern direkt über den `einheitId`-FK auf
 * der Quittung — dafür gibt es im Schema keine Direkt-Relation, also
 * machen wir einen separaten Batch-Lookup auf `einsatz_einheiten` (eine
 * Query pro find-Call, nicht N+1).
 */
@Injectable()
export class PrismaSicherheitsregelQuittungRepository implements ISicherheitsregelQuittungRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async upsert(tx: TransactionContext, params: UpsertSicherheitsregelQuittungParams): Promise<Result<UpsertSicherheitsregelQuittungResult>> {
    const client = tx as PrismaTransactionClient;
    try {
      const created = await client.sicherheitsregelQuittung.create({
        data: {
          regelId: params.regelId,
          einheitId: params.einheitId,
          quittiertVonUserId: params.quittiertVonUserId,
        },
      });
      const einheitName = await this.resolveEinheitName(client, params.einheitId);
      return Result.ok({
        created: true,
        quittung: this.toReadModel(created, einheitName),
      });
    } catch (error) {
      if (isPrismaP2002(error)) {
        // Idempotency-Branch: bestehende Row nachladen, `created: false`.
        const existing = await client.sicherheitsregelQuittung.findFirst({
          where: { regelId: params.regelId, einheitId: params.einheitId },
        });
        if (!existing) {
          // Sehr unwahrscheinlich (P2002 ohne Row), aber defensiv.
          this.logger.error('P2002 ohne nachladbare Quittung-Row — Datenkonsistenz prüfen', {
            regelId: params.regelId,
            einheitId: params.einheitId,
          });
          return Result.fail<UpsertSicherheitsregelQuittungResult>('InfrastructureError:SicherheitsregelQuittung:P2002-without-row');
        }
        const einheitName = await this.resolveEinheitName(client, params.einheitId);
        return Result.ok({
          created: false,
          quittung: this.toReadModel(existing, einheitName),
        });
      }
      this.logger.error('Fehler beim Anlegen einer SicherheitsregelQuittung', {
        regelId: params.regelId,
        einheitId: params.einheitId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<UpsertSicherheitsregelQuittungResult>(this.wrapInfrastructureError(error));
    }
  }

  async findByRegel(einsatzId: string, regelId: string, tx?: TransactionContext): Promise<Result<SicherheitsregelQuittungReadModel[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      // Defense-in-Depth: nur Rows zurückgeben, deren Regel zum Einsatz gehört.
      const rows = await client.sicherheitsregelQuittung.findMany({
        where: {
          regelId,
          regel: { einsatzId },
        },
        orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
      });

      if (rows.length === 0) return Result.ok<SicherheitsregelQuittungReadModel[]>([]);

      const einheitNames = await this.resolveEinheitNames(
        client,
        rows.map((row) => row.einheitId),
      );
      return Result.ok(rows.map((row) => this.toReadModel(row, einheitNames.get(row.einheitId) ?? row.einheitId)));
    } catch (error) {
      return Result.fail<SicherheitsregelQuittungReadModel[]>(this.wrapInfrastructureError(error));
    }
  }

  async findByRegelAndEinheit(einsatzId: string, regelId: string, einheitId: string, tx?: TransactionContext): Promise<Result<SicherheitsregelQuittungReadModel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.sicherheitsregelQuittung.findFirst({
        where: {
          regelId,
          einheitId,
          regel: { einsatzId },
        },
      });
      if (!row) return Result.ok<SicherheitsregelQuittungReadModel | null>(null);
      const einheitName = await this.resolveEinheitName(client, einheitId);
      return Result.ok<SicherheitsregelQuittungReadModel | null>(this.toReadModel(row, einheitName));
    } catch (error) {
      return Result.fail<SicherheitsregelQuittungReadModel | null>(this.wrapInfrastructureError(error));
    }
  }

  private async resolveEinheitName(client: PrismaTransactionClient | PrismaService, einheitId: string): Promise<string> {
    try {
      const einheit = await client.einsatzEinheit.findUnique({ where: { id: einheitId }, select: { name: true } });
      return einheit?.name ?? einheitId;
    } catch (error) {
      this.logger.warn('einheitName-Resolution fehlgeschlagen, Fallback auf einheitId', {
        einheitId,
        error: error instanceof Error ? error.message : String(error),
      });
      return einheitId;
    }
  }

  private async resolveEinheitNames(client: PrismaTransactionClient | PrismaService, einheitIds: readonly string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (einheitIds.length === 0) return map;
    try {
      const rows = await client.einsatzEinheit.findMany({
        where: { id: { in: [...einheitIds] } },
        select: { id: true, name: true },
      });
      for (const row of rows) map.set(row.id, row.name);
    } catch (error) {
      this.logger.warn('einheitNames-Resolution fehlgeschlagen', {
        einheitIds: einheitIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return map;
  }

  private toReadModel(row: PrismaSicherheitsregelQuittungRow | PrismaQuittungRowWithEinheit, einheitName: string): SicherheitsregelQuittungReadModel {
    return {
      id: row.id,
      regelId: row.regelId,
      einheitId: row.einheitId,
      einheitName,
      quittiertAm: row.quittiertAm,
      quittiertVonUserId: row.quittiertVonUserId,
    };
  }

  private wrapInfrastructureError(error: unknown): string {
    const raw = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
    return `InfrastructureError:SicherheitsregelQuittung:${raw}`;
  }
}
