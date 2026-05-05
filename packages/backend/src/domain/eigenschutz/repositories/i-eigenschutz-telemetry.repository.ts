import type { Result } from '@domain/common/result';
import type { EigenschutzTelemetryEventName } from '@/application/eigenschutz/schemas/telemetry-event.schema';

/**
 * Domain-Port: Telemetrie-Persistenz (Story 3.11, FR21, Architektur §B9).
 *
 * Schreibt einen Batch (1–50) Telemetrie-Events transaktional in
 * `eigenschutz_telemetry_events`. Die Persistenz ist NICHT idempotent —
 * Story 3.11 erzeugt keinen Unique-Index (Schema-frozen seit Story 1.4);
 * doppelte Sends desselben Batches landen als Duplikate, die post-pilot
 * via SQL `GROUP BY (einsatzId, sessionId, eventName, clientTime)`
 * normalisiert werden. Telemetrie ist Best-Effort-Audit — kein Auftrags-
 * kritischer Daten-Pfad.
 */
export interface PersistTelemetryEventInput {
  readonly einsatzId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly eventName: EigenschutzTelemetryEventName;
  readonly payload: Record<string, unknown>;
  readonly clientTime: Date;
}

export interface PersistTelemetryBatchResult {
  readonly insertedCount: number;
}

export interface IEigenschutzTelemetryRepository {
  /**
   * Persistiert einen Batch atomar (Prisma `createMany`, ein Statement).
   *
   * - `Result.ok({ insertedCount })` mit `insertedCount === events.length`
   *   im Erfolgsfall.
   * - `Result.fail('PersistTelemetryFailed:<message>')` bei DB-Fehler
   *   (Connection-Loss, Constraint-Verletzung).
   */
  persistBatch(events: readonly PersistTelemetryEventInput[]): Promise<Result<PersistTelemetryBatchResult>>;
}
