import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEigenschutzTelemetryRepository, PersistTelemetryBatchResult, PersistTelemetryEventInput } from '@domain/eigenschutz/repositories/i-eigenschutz-telemetry.repository';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Prisma-Adapter für `IEigenschutzTelemetryRepository` (Story 3.11, FR21,
 * Architektur §B9).
 *
 * **Persistenz:** ein einziger `createMany`-Aufruf je Batch (1–50 Events).
 * `serverTime` wird NICHT mitgegeben — das DB-`DEFAULT now()` aus Story 1.4
 * ist kanonisch (Server-Clock dominiert Client-Clock im Audit-Trail).
 *
 * **Idempotenz:** keine — siehe `IEigenschutzTelemetryRepository`-Doc.
 * Doppelte Sends desselben Batches landen als Duplikate; post-pilot via
 * SQL-`GROUP BY` normalisiert. `skipDuplicates: false` ist bewusst gewählt:
 * ohne Unique-Index hätte `true` keine Wirkung, mit `false` ist die
 * Semantik explizit (jede Row wird inserted, `insertedCount` == events.length
 * im Erfolgsfall — partielle Inserts gibt es nicht, ein FK-/Constraint-Fehler
 * rollt den `createMany`-Call vollständig zurück).
 *
 * **Empty-Batch-Shortcut:** leeres Array → `Result.ok({insertedCount:0})`
 * ohne DB-Roundtrip. Verhindert leeren `createMany`-Call (Prisma würde
 * sonst einen No-Op-Statement absetzen).
 *
 * **PII-Logger:** im Fehlerfall wird `einsatzId` via `redactId(...)` gehasht.
 * `userId`/`sessionId` landen NICHT im Log (Audit-Trail-Minimierung —
 * Telemetrie ist Best-Effort und braucht im Error-Fall keine User-Korrelation;
 * Session-Replay läuft via `traceId` separat).
 */
@Injectable()
export class PrismaEigenschutzTelemetryRepository implements IEigenschutzTelemetryRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async persistBatch(events: readonly PersistTelemetryEventInput[]): Promise<Result<PersistTelemetryBatchResult>> {
    if (events.length === 0) {
      return Result.ok({ insertedCount: 0 });
    }

    try {
      const result = await this.prisma.eigenschutzTelemetryEvent.createMany({
        data: events.map((event) => ({
          einsatzId: event.einsatzId,
          userId: event.userId,
          sessionId: event.sessionId,
          eventName: event.eventName,
          payload: event.payload as Prisma.InputJsonValue,
          clientTime: event.clientTime,
          // serverTime: DB-DEFAULT now()
        })),
        skipDuplicates: false,
      });
      return Result.ok({ insertedCount: result.count });
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          context: 'PrismaEigenschutzTelemetryRepository',
          batchSize: events.length,
          einsatzId: events[0] ? redactId(events[0].einsatzId) : 'empty',
          error: err instanceof Error ? err.message : 'unknown',
        }),
        'PrismaEigenschutzTelemetryRepository',
      );
      // Klassifizierung statt Roh-Message: der Caller (Service/Controller)
      // soll keinen Prisma-Fehler-String mit FK-Pfad oder Tabellen-Namen
      // bekommen — sonst wandert das in den HTTP-Body. Details bleiben im Log.
      const code = classifyPersistError(err);
      return Result.fail(`PersistTelemetryFailed:${code}`);
    }
  }
}

/**
 * Mappt einen Prisma-Fehler auf eine kurze, nicht-leakende Marker-Klasse.
 * Verhindert, dass `PersistTelemetryFailed:Foreign key constraint failed
 * on the field: \`einsatzId\``-artige Strings via Result.fail in den HTTP-
 * Response-Body wandern.
 */
function classifyPersistError(err: unknown): string {
  if (typeof err !== 'object' || err === null) return 'unknown';
  // PrismaClientKnownRequestError trägt einen stabilen `code` (`P2003` =
  // FK-Violation, `P2002` = Unique-Violation, `P2000` = String-Truncation,
  // …); auch ohne Prisma-Type-Import abrufbar.
  const code = (err as { code?: unknown }).code;
  if (typeof code === 'string' && code.startsWith('P')) {
    return `prisma-${code.toLowerCase()}`;
  }
  if (err instanceof Error && err.name) {
    return `error-${err.name.toLowerCase()}`;
  }
  return 'unknown';
}
