import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPushRecipientLookupPort } from '@domain/eigenschutz/repositories/i-push-recipient-lookup.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Prisma-Adapter für `IPushRecipientLookupPort` (Story 3.8 AC2).
 *
 * **Strategy:** Eine einzige Postgres-SQL-Query (`$queryRaw`) — kein N+1.
 * Schema-Referenzen:
 * - `einsatz_person_einheiten` (Map von Prisma-Model `EinsatzPersonEinheit`)
 *   — Spalten in snake_case: `einheit_id`, `einsatz_person_id`.
 * - `einsatz_personen` (Map von `EinsatzPerson`) — Spalten: `id`, `stamm_id`,
 *   `einsatz_id`.
 * - `"User"` (kein `@@map`) — Spalten in camelCase + Quotes: `"id"`,
 *   `"stammpersonId"`. Beachte den lowercase `p` in `stammpersonId` (siehe
 *   `schema.prisma:67`).
 *
 * **DISTINCT + ORDER BY id ASC:** Stabile Reihenfolge (test-friendly) und
 * Schutz gegen den theoretischen Fall, dass dieselbe StammPerson über zwei
 * `EinsatzPerson`-Zeilen verlinkt ist. `ep.stamm_id IS NOT NULL` filtert
 * externe Helfer ohne User-Bindung (Defense-in-depth — der `JOIN "User"` auf
 * `stammpersonId` würde sie ohnehin ausschließen).
 *
 * **Sentinel-Vertrag:**
 * - Erfolg → `Result.ok(string[])` (auch leer = `Result.ok([])`).
 * - DB-Fehler → `Result.fail('InfrastructureError:PushRecipientLookup:<errorClass>')`
 *   — KEIN `error.message` im Sentinel, weil Prisma-Treiber-Fehlertexte
 *   gelegentlich Connection-String-Fragmente oder Row-Inhalte enthalten
 *   (PII-Risiko, Story 1.1 AC4).
 * - Empty-Input (`einsatzId`/`einheitId` leer) → `Result.ok([])` ohne SQL-Roundtrip.
 *
 * **PII-Hygiene (Story 1.1 AC4 / Story 3.8 AC10):** Klar-IDs werden NIE an den
 * Logger übergeben — nur `redactId`-Hashes und `recipientCount`-Zahlen.
 */
@Injectable()
export class PrismaPushRecipientLookupRepository implements IPushRecipientLookupPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async listRecipientsForEinheit(einsatzId: string, einheitId: string): Promise<Result<string[]>> {
    if (!einsatzId || !einheitId) {
      return Result.ok<string[]>([]);
    }

    try {
      const rows = (await this.prisma.$queryRaw(Prisma.sql`
        SELECT DISTINCT u."id" AS "userId"
        FROM einsatz_person_einheiten epe
        JOIN einsatz_personen ep ON ep.id = epe.einsatz_person_id
        JOIN "User" u ON u."stammpersonId" = ep.stamm_id
        WHERE epe.einheit_id = ${einheitId}
          AND ep.einsatz_id  = ${einsatzId}
          AND ep.stamm_id IS NOT NULL
        ORDER BY u."id" ASC
      `)) as Array<{ userId: unknown }>;

      // Defense-in-depth gegen Schema-Drift: rejecte Rows ohne valides
      // string-`userId`, statt undefined-IDs an den Push-Service zu reichen.
      // `Set` dedupt zusätzlich gegen DISTINCT-Lücken im Treiber (z. B. wenn
      // ein Prisma-Adapter-Wechsel die SQL-Klausel verschluckt) — Insertion-
      // Order bleibt stabil, daher sortiert die Query weiterhin per ASC.
      const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((x): x is string => typeof x === 'string' && x.length > 0)));

      if (userIds.length > 0) {
        this.logger.debug('PushRecipientLookup: Empfänger gefunden', {
          einsatzIdHash: redactId(einsatzId),
          einheitIdHash: redactId(einheitId),
          recipientCount: userIds.length,
        });
      }

      return Result.ok(userIds);
    } catch (error) {
      const errorClass = error instanceof Error ? error.constructor.name : typeof error;
      this.logger.warn('PushRecipientLookup fehlgeschlagen', {
        einsatzIdHash: redactId(einsatzId),
        einheitIdHash: redactId(einheitId),
        errorClass,
      });
      return Result.fail<string[]>(`InfrastructureError:PushRecipientLookup:${errorClass}`);
    }
  }
}
