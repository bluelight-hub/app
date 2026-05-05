import { Inject, Injectable } from '@nestjs/common';
import { eigenschutzTelemetryBatchSchema, type EigenschutzTelemetryEventInput } from '@/application/eigenschutz/schemas/telemetry-event.schema';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEigenschutzTelemetryRepository, PersistTelemetryEventInput } from '@domain/eigenschutz/repositories/i-eigenschutz-telemetry.repository';
import { EIGENSCHUTZ_TELEMETRY_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';
import { PrometheusEigenschutzCollector } from './prometheus-eigenschutz.collector';

/**
 * Maximalgröße der `payload`-JSON-Repräsentation (UTF-8 Bytes). Story 3.11 AC3
 * verlangt einen Cap analog zum `localPayload`-Cap aus Story 3.9 (Sync-
 * Conflict-Repository).
 */
const TELEMETRY_PAYLOAD_CAP_BYTES = 4096;

/**
 * Trimmt einen Telemetrie-`payload` auf maximal `capBytes` UTF-8-Bytes.
 *
 * - Wenn `JSON.stringify(payload)` ≤ Cap: payload unverändert.
 * - Sonst: `metadata` wird entfernt und `trimmed: true` gesetzt — die festen
 *   Felder `propagationGroupIdCandidate` und `abschnittCount` bleiben
 *   erhalten (sind klein, dokumentieren das Event auch ohne Metadata).
 *
 * Misst UTF-8-Bytes via `Buffer.byteLength`, NICHT `String.length`. Multibyte-
 * Zeichen (Umlaute, Emojis) zählen mehr als ein Byte.
 *
 * Exportiert für Unit-Tests.
 */
export function trimPayloadToCap(payload: Record<string, unknown>, capBytes: number): Record<string, unknown> {
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, 'utf8') <= capBytes) {
    return payload;
  }
  // Metadata entfernen, Cap-Verstoss markieren.
  const { metadata: _metadata, ...rest } = payload;
  const trimmed: Record<string, unknown> = { ...rest, trimmed: true };
  // Defense-in-Depth: selbst nach Metadata-Drop kann die Payload den Cap
  // überschreiten, wenn `propagationGroupIdCandidate` extrem lang ist (Schema
  // erlaubt 80 Zeichen, theoretisch + `abschnittCount` + `trimmed`-Flag). In
  // dem Fall droppen wir alle nicht-essenziellen Felder bis auf den `trimmed`-
  // Marker, sodass die DB-Row das Cap-Versprechen einhält.
  if (Buffer.byteLength(JSON.stringify(trimmed), 'utf8') > capBytes) {
    return { trimmed: true };
  }
  return trimmed;
}

interface IngestBatchInput {
  readonly events: readonly unknown[];
}

/**
 * `TelemetryIngestService` — Application-Service für Story 3.11 (FR21).
 *
 * Pipeline:
 *  1. Zod-Defense-Validation (Drift-Schutz gegen DTO-Bypass).
 *  2. Persist-Inputs bauen (mit JWT-Caller-Override für `userId`,
 *     Payload-Trim auf 4 KiB).
 *  3. Repository-`persistBatch`.
 *  4. Prometheus-Observation NUR bei Persist-Erfolg (sonst sähen Metriken
 *     Phantom-Daten).
 *
 * Telemetrie ist Best-Effort-Audit — Persistenz-Fehler werden propagiert,
 * aber niemals als Auftrags-kritischer Fehler eskaliert.
 */
@Injectable()
export class TelemetryIngestService {
  constructor(
    @Inject(EIGENSCHUTZ_TELEMETRY_REPOSITORY)
    private readonly repo: IEigenschutzTelemetryRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly collector: PrometheusEigenschutzCollector,
  ) {}

  async ingestBatch(einsatzId: string, callerUserId: string, batch: IngestBatchInput): Promise<Result<{ insertedCount: number }>> {
    // Defense-in-Depth: Controller cap't den callerUserId bereits auf 80
    // Zeichen, aber ein anderer Caller (z. B. Background-Job, Test) könnte
    // den Service direkt aufrufen. DB `userId VarChar(80)` würde sonst einen
    // String-Truncation-Error werfen.
    if (!callerUserId || callerUserId.length === 0) {
      return Result.fail<{ insertedCount: number }>('ValidationFailed:TelemetryBatch:callerUserId-missing');
    }
    if (callerUserId.length > 80) {
      return Result.fail<{ insertedCount: number }>('ValidationFailed:TelemetryBatch:callerUserId-too-long');
    }

    // 1. Zod-Defense-Validation
    const parsed = eigenschutzTelemetryBatchSchema.safeParse(batch);
    if (!parsed.success) {
      // `error.issues` ist normalerweise non-empty; Defense-in-Depth gegen
      // einen Zod-Edge-Case, in dem `safeParse` `success: false` zurückgibt
      // ohne `issues` zu setzen.
      const issue = parsed.error.issues[0];
      const message = issue ? `${issue.path.join('.') || 'root'}:${issue.message}` : 'unknown';
      return Result.fail<{ insertedCount: number }>(`ValidationFailed:TelemetryBatch:${message}`);
    }

    // 2. PersistInputs bauen — userId IMMER aus callerUserId (Security: AC3)
    const persistInputs: PersistTelemetryEventInput[] = parsed.data.events.map((ev: EigenschutzTelemetryEventInput) => {
      const basePayload: Record<string, unknown> = {
        propagationGroupIdCandidate: ev.propagationGroupIdCandidate,
        abschnittCount: ev.abschnittCount,
        ...(ev.metadata ? { metadata: ev.metadata } : {}),
      };
      const payload = trimPayloadToCap(basePayload, TELEMETRY_PAYLOAD_CAP_BYTES);
      return {
        einsatzId,
        userId: callerUserId,
        sessionId: ev.sessionId,
        eventName: ev.eventName,
        payload,
        clientTime: new Date(ev.clientTime),
      };
    });

    // 3. Persistenz — try/catch fängt programmer-error-Throws (z. B. Prisma-
    // Schema-Mismatch). Das Repository signalisiert reguläre DB-Fehler via
    // `Result.fail`; ein synchroner/async Throw wäre ein Bug, der hier nicht
    // als 500 zum Client durchschlagen darf.
    let persisted;
    try {
      persisted = await this.repo.persistBatch(persistInputs);
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          context: 'TelemetryIngestService',
          einsatzId: redactId(einsatzId),
          userId: redactId(callerUserId),
          batchSize: persistInputs.length,
          error: err instanceof Error ? err.message : 'unknown',
        }),
        'TelemetryIngestService',
      );
      return Result.fail<{ insertedCount: number }>('PersistTelemetryFailed:repo-throw');
    }
    if (persisted.isFailure) {
      this.logger.warn(
        JSON.stringify({
          context: 'TelemetryIngestService',
          einsatzId: redactId(einsatzId),
          userId: redactId(callerUserId),
          batchSize: persistInputs.length,
          error: persisted.error,
        }),
        'TelemetryIngestService',
      );
      return Result.fail<{ insertedCount: number }>(persisted.error ?? 'PersistTelemetryFailed:unknown');
    }

    // 4. Prometheus-Observation NUR bei Erfolg. `observe(...)` ist defensiv
    // implementiert (silent-skip bei nicht-finiten Werten), aber ein
    // theoretischer Throw darf den persistierten Erfolg nicht auf einen
    // failure-Result kippen.
    for (const ev of parsed.data.events as EigenschutzTelemetryEventInput[]) {
      try {
        this.collector.observe(ev);
      } catch (err) {
        this.logger.warn?.(
          JSON.stringify({
            context: 'TelemetryIngestService',
            stage: 'observe',
            eventName: ev.eventName,
            error: err instanceof Error ? err.message : 'unknown',
          }),
          'TelemetryIngestService',
        );
      }
    }

    return Result.ok({ insertedCount: persisted.value!.insertedCount });
  }
}
