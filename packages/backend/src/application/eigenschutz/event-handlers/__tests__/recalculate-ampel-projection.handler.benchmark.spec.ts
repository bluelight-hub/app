import 'reflect-metadata';
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { RecalculateAmpelProjectionOnEigenschutzEventHandler } from '../recalculate-ampel-projection.handler';

/**
 * Story 7.10 AC3 — Recompute-Latenz-Mikrobenchmark (NFR-P4 Block A).
 *
 * Misst die Wallclock-Dauer eines einzelnen `recalculateForEinheit`-Aufrufs
 * gegen einen Mock-Repository, der eine 100-Einheiten-Fixture simuliert.
 *
 * **Was hier gemessen wird:** Pfad durch den Application-Layer (Event-Routing,
 * Logging, Error-Handling). Mock-Repository ist konstant-Zeit; reale Round-Trip-
 * Zeit mit `JOIN`s + Aggregat-Queries gehört in Block B (Pilot-Backend).
 *
 * **Gate:** p95 (50 Iterationen) < 100 ms. Toleranz konservativ — Application-
 * Layer-Overhead allein liegt typisch < 1 ms.
 *
 * **Adaptive Pfad-Wahl:** Story 7.10 nennt `application/eigenschutz/projections/__tests__/`
 * als Wunschpfad. Da `update-ampel-projection.handler.ts` nicht existiert (tatsächlicher
 * Handler-Name: `recalculate-ampel-projection.handler.ts`), platziert die Spec sich
 * neben dem realen Handler im `event-handlers/__tests__/`-Verzeichnis. Diese adaptive
 * Pfadwahl ist im Story-Spec unter „Projektstruktur-Hinweise" (AC3-Spec-Ort) ausdrücklich
 * erlaubt: „Wenn `packages/backend/src/application/eigenschutz/projections/__tests__/`
 * noch nicht existiert, Spec adaptiv platzieren neben dem Handler. Begründung im Spec-Header-Kommentar."
 */

const EINSATZ_ID = 'einsatz-bench-7-10';
const EINHEIT_ID = 'einheit-bench-7-10';
const USER_ID = 'user-bench-7-10';

const NFR_P4_RECOMPUTE_P95_GATE_MS = 100;
const ITERATIONS = 50;

const createLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const createProjection = (): IAmpelProjectionRepository => ({
  upsert: jest.fn(),
  findByEinsatz: jest.fn(),
  recalculateForEinheit: jest.fn().mockResolvedValue(Result.ok({})),
});

const createEinheitenRepo = () => ({ findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])) }) as unknown as IEinsatzEinheitRepository;

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor(p * sortedValues.length));
  return sortedValues[index];
}

describe('Story 7.10 AC3 — RecalculateAmpelProjectionHandler Mikrobenchmark', () => {
  it('p95 der handle()-Wallclock liegt unter 100 ms (NFR-P4 Block A)', async () => {
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), createProjection(), createEinheitenRepo());
    const samples: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const event = new PsaProfilGeaendertEvent(
        EINSATZ_ID,
        USER_ID,
        `${EINHEIT_ID}-${i}`,
        `zuw-${i}`,
        `group-${i}`,
        'BASIS',
        'AKTIVIERT',
        'Bench',
        undefined,
        new Date(`2026-05-11T${(13 + (i % 10)).toString().padStart(2, '0')}:00:00.000Z`),
      );
      const start = performance.now();
      await handler.handle(event);
      samples.push(performance.now() - start);
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = percentile(sorted, 0.5);
    const p95 = percentile(sorted, 0.95);
    const p99 = percentile(sorted, 0.99);
    const max = sorted[sorted.length - 1];

    // Maschinenlesbare Wallclock-Verteilung (Audit-Bericht zitiert sie).
    // eslint-disable-next-line no-console
    console.info(`[Story 7.10 AC3] Recompute-Bench: n=${ITERATIONS} p50=${p50.toFixed(3)}ms p95=${p95.toFixed(3)}ms p99=${p99.toFixed(3)}ms max=${max.toFixed(3)}ms`);

    expect(p95).toBeLessThan(NFR_P4_RECOMPUTE_P95_GATE_MS);
  });
});
