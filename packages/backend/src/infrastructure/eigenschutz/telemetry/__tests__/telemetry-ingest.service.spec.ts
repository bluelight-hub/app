import { Result } from '@domain/common/result';
import type { IEigenschutzTelemetryRepository, PersistTelemetryEventInput } from '@domain/eigenschutz/repositories/i-eigenschutz-telemetry.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PrometheusEigenschutzCollector } from '../prometheus-eigenschutz.collector';
import { TelemetryIngestService, trimPayloadToCap } from '../telemetry-ingest.service';

/**
 * Spec für `TelemetryIngestService` (Story 3.11, FR21, AC3).
 *
 * Pfade:
 *  - Happy-Path (3 valide Events).
 *  - Caller-userId-Override (Security: JWT-Caller wins).
 *  - Zod-Drift-Defense (invalides Event ⇒ kein Repo-Call).
 *  - 4-KiB-Cap (oversize metadata ⇒ trimmed:true ohne metadata).
 *  - Repo-Failure-Pfad (warn + redactId, kein observe).
 *  - Prometheus-Observe-Reihenfolge (observe nur bei Persist-Erfolg).
 *  - UTF-8-Multibyte (Buffer.byteLength entscheidet, nicht .length).
 */
describe('TelemetryIngestService (Story 3.11 AC3, FR21)', () => {
  let repo: jest.Mocked<IEigenschutzTelemetryRepository>;
  let logger: jest.Mocked<ILogger>;
  let collector: jest.Mocked<PrometheusEigenschutzCollector>;
  let service: TelemetryIngestService;

  const EINSATZ_ID = 'clw3h8x9y0000qwertyuiopas';
  const CALLER_USER_ID = 'real-caller-user-id';

  function makeEvent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
      eventName: 'cbrn_announced',
      propagationGroupIdCandidate: 'candidate-7f3a2b1c',
      abschnittCount: 4,
      userId: 'self-reported-user',
      sessionId: 'sess-3b9af2c1',
      clientTime: '2026-05-04T14:23:11.482+02:00',
      ...overrides,
    };
  }

  beforeEach(() => {
    repo = {
      persistBatch: jest.fn(),
    } as unknown as jest.Mocked<IEigenschutzTelemetryRepository>;
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;
    collector = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<PrometheusEigenschutzCollector>;
    service = new TelemetryIngestService(repo, logger, collector);
  });

  it('persistiert valide 3-Event-Batch und observiert pro Event (Happy-Path)', async () => {
    repo.persistBatch.mockResolvedValueOnce(Result.ok({ insertedCount: 3 }));
    const batch = {
      events: [makeEvent({ eventName: 'assess_started' }), makeEvent({ eventName: 'cbrn_announced', abschnittCount: 7 }), makeEvent({ eventName: 'all_banners_delivered', abschnittCount: 7 })],
    };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ insertedCount: 3 });
    expect(repo.persistBatch).toHaveBeenCalledTimes(1);
    const persistArg = repo.persistBatch.mock.calls[0]![0] as readonly PersistTelemetryEventInput[];
    expect(persistArg).toHaveLength(3);
    expect(persistArg[0]!.einsatzId).toBe(EINSATZ_ID);
    expect(persistArg[0]!.eventName).toBe('assess_started');
    expect(persistArg[0]!.clientTime).toBeInstanceOf(Date);
    expect(persistArg[1]!.payload).toMatchObject({
      propagationGroupIdCandidate: 'candidate-7f3a2b1c',
      abschnittCount: 7,
    });
    expect(collector.observe).toHaveBeenCalledTimes(3);
  });

  it('überschreibt Body-userId immer mit callerUserId (Security AC3)', async () => {
    repo.persistBatch.mockResolvedValueOnce(Result.ok({ insertedCount: 2 }));
    const batch = {
      events: [makeEvent({ userId: 'attacker-1' }), makeEvent({ userId: 'attacker-2', eventName: 'quittung_abgegeben' })],
    };

    await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    const persistArg = repo.persistBatch.mock.calls[0]![0] as readonly PersistTelemetryEventInput[];
    expect(persistArg[0]!.userId).toBe(CALLER_USER_ID);
    expect(persistArg[1]!.userId).toBe(CALLER_USER_ID);
    expect(persistArg.every((p) => p.userId === CALLER_USER_ID)).toBe(true);
  });

  it('lehnt Zod-Drift-Inputs ab und ruft Repository nicht auf', async () => {
    const batch = {
      events: [makeEvent({ eventName: 'unknown_event' })],
    };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^ValidationFailed:TelemetryBatch:/);
    expect(repo.persistBatch).not.toHaveBeenCalled();
    expect(collector.observe).not.toHaveBeenCalled();
  });

  it('lehnt zusätzlich invalide abschnittCount-Werte ab', async () => {
    const batch = {
      events: [makeEvent({ abschnittCount: -1 })],
    };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^ValidationFailed:TelemetryBatch:/);
    expect(repo.persistBatch).not.toHaveBeenCalled();
  });

  it('trimmt Payload bei oversize metadata auf 4 KiB und ergänzt trimmed:true', async () => {
    repo.persistBatch.mockResolvedValueOnce(Result.ok({ insertedCount: 1 }));
    // ~5 KiB metadata-Wert (passt in scalar-string-Cap nicht — also auf
    // mehrere Keys verteilen, die je ≤ 256 Zeichen lang sind).
    const oversizeMetadata: Record<string, string> = {};
    for (let i = 0; i < 32; i++) {
      oversizeMetadata[`key${i}`] = 'a'.repeat(200);
    }
    const batch = {
      events: [makeEvent({ metadata: oversizeMetadata })],
    };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isSuccess).toBe(true);
    const persistArg = repo.persistBatch.mock.calls[0]![0] as readonly PersistTelemetryEventInput[];
    expect(persistArg[0]!.payload).not.toHaveProperty('metadata');
    expect(persistArg[0]!.payload).toMatchObject({ trimmed: true });
    // Feste Felder bleiben erhalten.
    expect(persistArg[0]!.payload).toMatchObject({
      propagationGroupIdCandidate: 'candidate-7f3a2b1c',
      abschnittCount: 4,
    });
  });

  it('propagiert Repo-Failure, loggt mit redactId-haltigem JSON, ruft observe NICHT auf', async () => {
    repo.persistBatch.mockResolvedValueOnce(Result.fail('PersistTelemetryFailed:db down'));
    const batch = {
      events: [makeEvent(), makeEvent({ eventName: 'cbrn_acknowledged' })],
    };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('PersistTelemetryFailed:db down');
    expect(collector.observe).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [logMessage, logContext] = logger.warn.mock.calls[0]!;
    expect(logContext).toBe('TelemetryIngestService');
    const parsed = JSON.parse(String(logMessage)) as Record<string, unknown>;
    // PII redacted via redactId — Prefix `r:` ist Pflicht.
    expect(parsed.einsatzId).toMatch(/^r:[0-9a-f]{12}$/);
    expect(parsed.userId).toMatch(/^r:[0-9a-f]{12}$/);
    expect(parsed.error).toBe('PersistTelemetryFailed:db down');
    // Klartext-IDs erscheinen NICHT im Log.
    expect(String(logMessage)).not.toContain(EINSATZ_ID);
    expect(String(logMessage)).not.toContain(CALLER_USER_ID);
  });

  it('observiert pro Event NUR nach erfolgreichem Persist (Reihenfolge-Test)', async () => {
    const callOrder: string[] = [];
    repo.persistBatch.mockImplementationOnce(async () => {
      callOrder.push('persist');
      return Result.ok({ insertedCount: 2 });
    });
    collector.observe.mockImplementation(() => {
      callOrder.push('observe');
    });
    const batch = {
      events: [makeEvent({ eventName: 'blind_ack' }), makeEvent({ eventName: 'luecke_gemeldet' })],
    };

    await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(callOrder).toEqual(['persist', 'observe', 'observe']);
  });

  it('lehnt leere callerUserId mit ValidationFailed ab (Code-Review-Patch)', async () => {
    const batch = { events: [makeEvent()] };

    const result = await service.ingestBatch(EINSATZ_ID, '', batch);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:TelemetryBatch:callerUserId-missing');
    expect(repo.persistBatch).not.toHaveBeenCalled();
    expect(collector.observe).not.toHaveBeenCalled();
  });

  it('lehnt callerUserId > 80 Zeichen mit ValidationFailed ab (Defense-in-Depth gegen DB-VarChar-Truncation)', async () => {
    const batch = { events: [makeEvent()] };

    const result = await service.ingestBatch(EINSATZ_ID, 'x'.repeat(81), batch);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:TelemetryBatch:callerUserId-too-long');
    expect(repo.persistBatch).not.toHaveBeenCalled();
  });

  it('fängt synchrone/programmer-Throws aus repo.persistBatch und mappt sie auf PersistTelemetryFailed:repo-throw', async () => {
    // Code-Review-Patch: ohne try/catch würde ein Prisma-Schema-Mismatch als
    // 500 zum Client durchschlagen und den 422-Vertrag brechen.
    repo.persistBatch.mockRejectedValueOnce(new Error('Invalid Prisma schema'));
    const batch = { events: [makeEvent()] };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('PersistTelemetryFailed:repo-throw');
    // Klartext der internen Fehler-Message darf nicht im Result.error landen
    // — der Controller spiegelt das in den HTTP-Body, würde sonst leaken.
    expect(result.error).not.toContain('Invalid Prisma schema');
    expect(collector.observe).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('schluckt collector.observe-Throws, das Persist-Erfolgs-Result bleibt erhalten', async () => {
    // Code-Review-Patch: ohne try/catch würde ein Collector-Bug einen bereits
    // erfolgreich persistierten Batch als Failure-Result an den Caller geben.
    repo.persistBatch.mockResolvedValueOnce(Result.ok({ insertedCount: 2 }));
    let observeCallCount = 0;
    collector.observe.mockImplementation(() => {
      observeCallCount += 1;
      if (observeCallCount === 1) throw new Error('prom-client crash');
    });
    const batch = { events: [makeEvent({ eventName: 'all_banners_delivered' }), makeEvent({ eventName: 'blind_ack' })] };

    const result = await service.ingestBatch(EINSATZ_ID, CALLER_USER_ID, batch);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ insertedCount: 2 });
    // Beide observe()-Aufrufe wurden versucht; der erste Throw hat den zweiten
    // nicht blockiert.
    expect(observeCallCount).toBe(2);
  });

  it('trimmt Payload UTF-8-byte-genau (Buffer.byteLength), nicht string.length', () => {
    // Direkter trimPayloadToCap-Test — beweist Multibyte-Sensitivität.
    // "ä" = 2 Bytes UTF-8. Wir konstruieren Payload, dessen
    // String-Längen-Repräsentation ≤ Cap aber UTF-8-Repräsentation > Cap.
    //
    // Die festen Felder kosten ~50 Bytes; Wir füllen metadata mit 2050
    // Umlauten ⇒ 4100 UTF-8-Bytes (> 4096-Cap), aber nur 2050 Code-Units.
    const metadata = { v: 'ä'.repeat(2050) };
    const payload = {
      propagationGroupIdCandidate: 'candidate-multibyte',
      abschnittCount: 1,
      metadata,
    };
    const serialized = JSON.stringify(payload);
    expect(serialized.length).toBeLessThanOrEqual(4096);
    expect(Buffer.byteLength(serialized, 'utf8')).toBeGreaterThan(4096);

    const trimmed = trimPayloadToCap(payload, 4096);

    expect(trimmed).not.toHaveProperty('metadata');
    expect(trimmed).toMatchObject({ trimmed: true });
    expect(trimmed).toMatchObject({
      propagationGroupIdCandidate: 'candidate-multibyte',
      abschnittCount: 1,
    });
  });
});
