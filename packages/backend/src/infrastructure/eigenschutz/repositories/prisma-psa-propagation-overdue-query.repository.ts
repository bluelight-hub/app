import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPsaPropagationOverdueQueryPort, PsaPropagationOverdueRow } from '@domain/eigenschutz/repositories/i-psa-propagation-overdue-query.port';
import { LOGGER } from '@infrastructure/di-tokens';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-Adapter für `IPsaPropagationOverdueQueryPort` (Story 3.7 AC2).
 *
 * **Strategy:** Eine einzige Postgres-SQL-Query (`$queryRaw`) mit
 * `DISTINCT ON` und zwei `NOT EXISTS`-Subqueries — kein N+1, kein
 * Hibernate-Style-Lazy-Loading. Schema-Referenzen:
 * - `outbox_events` (Map von Prisma-Model `OutboxEvent`) — Spalten in
 *   camelCase + Quotes (kein `@map` auf Feld-Ebene): `"eventName"`,
 *   `"occurredAt"`, `"payload"`.
 * - `psa_profil_quittungen` (Map von `PsaProfilQuittung`) — Spalten in
 *   snake_case (`propagation_group_id`, `einheit_id`).
 *
 * **`DISTINCT ON` + `ORDER BY ... occurredAt ASC`:** Bei Bulk-Bekanntgaben
 * mit Profil-Wechsel-Pärchen (`AKTIVIERT` für B + `DEAKTIVIERT` für A in
 * derselben Group/Einheit) wählt der Scheduler den **ältesten** Eintrag —
 * derjenige, der das 5-min-Fenster zuerst überschreitet.
 *
 * **Sentinel-Vertrag:**
 * - Erfolg → `Result.ok([])` oder `Result.ok([rows...])`.
 * - DB-Fehler → `Result.fail('InfrastructureError:PsaPropagationOverdueQuery:<message>')`.
 */
@Injectable()
export class PrismaPsaPropagationOverdueQueryRepository implements IPsaPropagationOverdueQueryPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async findUnacknowledgedPsaPropagations(threshold: Date, limit: number, tx?: TransactionContext): Promise<Result<PsaPropagationOverdueRow[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const rows = (await client.$queryRaw(Prisma.sql`
        SELECT DISTINCT ON (oe."payload"->>'propagationGroupId', oe."payload"->>'einheitId')
          oe."id"                              AS "originalEventId",
          oe."payload"->>'einsatzId'           AS "einsatzId",
          oe."payload"->>'einheitId'           AS "einheitId",
          oe."payload"->>'propagationGroupId'  AS "propagationGroupId",
          oe."payload"->>'zuweisungId'         AS "zuweisungId",
          oe."occurredAt"                      AS "occurredAt"
        FROM outbox_events oe
        WHERE oe."eventName" = 'eigenschutz.psa_profil_geaendert'
          AND oe."occurredAt" < ${threshold}
          AND NOT EXISTS (
            SELECT 1 FROM psa_profil_quittungen q
            WHERE q.propagation_group_id = oe."payload"->>'propagationGroupId'
              AND q.einheit_id           = oe."payload"->>'einheitId'
          )
          AND NOT EXISTS (
            SELECT 1 FROM outbox_events oe2
            WHERE oe2."eventName" = 'eigenschutz.quittung_ueberfaellig'
              AND oe2."payload"->>'propagationGroupId' = oe."payload"->>'propagationGroupId'
              AND oe2."payload"->>'einheitId'          = oe."payload"->>'einheitId'
          )
        ORDER BY oe."payload"->>'propagationGroupId',
                 oe."payload"->>'einheitId',
                 oe."occurredAt" ASC
        LIMIT ${limit}
      `)) as Array<{
        originalEventId: string;
        einsatzId: string;
        einheitId: string;
        propagationGroupId: string;
        zuweisungId: string | null;
        occurredAt: Date;
      }>;

      if (rows.length > 0) {
        this.logger.debug?.(`PsaPropagationOverdueQuery: ${rows.length} überfällige Bekanntgabe(n) gefunden`, {
          threshold: threshold.toISOString(),
          limit,
        });
      }

      return Result.ok(
        rows.map((r) => ({
          originalEventId: r.originalEventId,
          einsatzId: r.einsatzId,
          einheitId: r.einheitId,
          propagationGroupId: r.propagationGroupId,
          zuweisungId: r.zuweisungId,
          occurredAt: r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('PsaPropagationOverdueQuery fehlgeschlagen', {
        error: message,
        threshold: threshold.toISOString(),
      });
      return Result.fail<PsaPropagationOverdueRow[]>(`InfrastructureError:PsaPropagationOverdueQuery:${message}`);
    }
  }
}
