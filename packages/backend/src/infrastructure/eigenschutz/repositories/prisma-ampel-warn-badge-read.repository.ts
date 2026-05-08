import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { AmpelWarnBadgeCandidates, IAmpelWarnBadgeReadPort } from '@domain/eigenschutz/repositories';
import type { GefaehrdungWarnCandidate, PsaWarnCandidate } from '@domain/eigenschutz/services/ampel-warn-badge.service';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class PrismaAmpelWarnBadgeReadRepository implements IAmpelWarnBadgeReadPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async listCandidatesByEinsatz(einsatzId: string): Promise<Result<AmpelWarnBadgeCandidates>> {
    try {
      const [gefaehrdungen, psa] = await Promise.all([this.loadGefaehrdungCandidates(einsatzId), this.loadPsaCandidates(einsatzId)]);
      return Result.ok({ gefaehrdungen, psa });
    } catch (error) {
      this.logger.error('AmpelWarnBadgeRead fehlgeschlagen', {
        einsatzId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<AmpelWarnBadgeCandidates>(this.wrapInfrastructureError(error));
    }
  }

  private async loadGefaehrdungCandidates(einsatzId: string): Promise<GefaehrdungWarnCandidate[]> {
    const rows = await this.prisma.gefaehrdungsbeurteilung.findMany({
      where: { einsatzId },
      select: { id: true, einsatzId: true, einheitId: true, items: true, aktualisiertAm: true },
      orderBy: [{ aktualisiertAm: 'desc' }, { id: 'asc' }],
      take: 100,
    });

    const candidates: GefaehrdungWarnCandidate[] = [];
    for (const row of rows) {
      if (!Array.isArray(row.items)) continue;
      for (const [index, item] of row.items.entries()) {
        const record = this.asRecord(item);
        candidates.push({
          einsatzId: row.einsatzId,
          einheitId: row.einheitId,
          gefaehrdungsbeurteilungId: row.id,
          gefaehrdungItemId: typeof record.id === 'string' ? record.id : null,
          gefaehrdungItemFallbackKey: `item-index-${index}`,
          gefaehrdungTitel: this.resolveGefaehrdungTitel(record),
          risikoklasse: record.risikoklasse,
          schutzmassnahmen: record.schutzmassnahmen,
          aktualisiertAm: row.aktualisiertAm,
        });
      }
    }
    return candidates;
  }

  private async loadPsaCandidates(einsatzId: string): Promise<PsaWarnCandidate[]> {
    const threshold = new Date(Date.now() - 5 * 60_000);
    const rows = (await this.prisma.$queryRaw(Prisma.sql`
      WITH deduped AS (
        SELECT DISTINCT ON (
          COALESCE(oe."payload"->'payload'->>'propagationGroupId', oe."payload"->>'propagationGroupId'),
          COALESCE(oe."payload"->'payload'->>'einheitId', oe."payload"->>'einheitId')
        )
          COALESCE(oe."payload"->'payload'->>'einsatzId', oe."payload"->>'einsatzId')          AS "einsatzId",
          COALESCE(oe."payload"->'payload'->>'einheitId', oe."payload"->>'einheitId')          AS "einheitId",
          COALESCE(oe."payload"->'payload'->>'propagationGroupId', oe."payload"->>'propagationGroupId') AS "propagationGroupId",
          oe."occurredAt" AS "occurredAt",
          FLOOR(EXTRACT(EPOCH FROM (NOW() - oe."occurredAt")) / 60)::int AS "ueberfaelligSeitMin"
        FROM outbox_events oe
        WHERE oe."eventName" = 'eigenschutz.psa_profil_geaendert'
          AND (
            COALESCE(oe."payload"->'payload'->>'einsatzId', oe."payload"->>'einsatzId') = ${einsatzId}
            OR oe."payload"->>'einsatzId' = ${einsatzId}
          )
          AND oe."occurredAt" <= ${threshold}
          AND COALESCE(oe."payload"->'payload'->>'propagationGroupId', oe."payload"->>'propagationGroupId') IS NOT NULL
          AND COALESCE(oe."payload"->'payload'->>'einheitId', oe."payload"->>'einheitId') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM psa_profil_quittungen q
            WHERE q.propagation_group_id = COALESCE(oe."payload"->'payload'->>'propagationGroupId', oe."payload"->>'propagationGroupId')
              AND q.einheit_id = COALESCE(oe."payload"->'payload'->>'einheitId', oe."payload"->>'einheitId')
              AND q.einsatz_id = ${einsatzId}
          )
        ORDER BY
          COALESCE(oe."payload"->'payload'->>'propagationGroupId', oe."payload"->>'propagationGroupId'),
          COALESCE(oe."payload"->'payload'->>'einheitId', oe."payload"->>'einheitId'),
          oe."occurredAt" ASC
      )
      SELECT *
      FROM deduped
      ORDER BY "occurredAt" ASC, "propagationGroupId" ASC, "einheitId" ASC
      LIMIT 100
    `)) as Array<{
      einsatzId: string;
      einheitId: string;
      propagationGroupId: string;
      occurredAt: Date | string;
      ueberfaelligSeitMin: number | bigint | null;
    }>;

    return rows.map((row) => ({
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      propagationGroupId: row.propagationGroupId,
      occurredAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(row.occurredAt),
      ueberfaelligSeitMin: typeof row.ueberfaelligSeitMin === 'bigint' ? Number(row.ueberfaelligSeitMin) : row.ueberfaelligSeitMin,
    }));
  }

  private resolveGefaehrdungTitel(record: JsonRecord): string {
    if (typeof record.titel === 'string' && record.titel.trim().length > 0) return record.titel.trim();
    if (typeof record.title === 'string' && record.title.trim().length > 0) return record.title.trim();
    if (typeof record.name === 'string' && record.name.trim().length > 0) return record.name.trim();
    return 'Gefährdung';
  }

  private asRecord(value: unknown): JsonRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
  }

  private wrapInfrastructureError(error: unknown): string {
    const category = error instanceof Error ? error.name : 'Unknown';
    return `InfrastructureError:AmpelWarnBadgeRead:${category}`;
  }
}
