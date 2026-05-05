import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock api + getBaseUrl BEFORE the hook import — vi.mock is hoisted, but
// the mock factory must not capture out-of-scope refs (so we wire mocks
// via top-level `vi.hoisted`).
const { mockIngest } = vi.hoisted(() => ({ mockIngest: vi.fn() }));

vi.mock('@/shared/api/api', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzTelemetryControllerIngestVAlpha: mockIngest,
    }),
  },
  getBaseUrl: () => 'https://test.local',
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  },
}));

import { eigenschutzTelemetryQueue, type EigenschutzTelemetryEvent } from '../../lib/telemetry-queue';
import { logger } from '@/shared/lib/logger';
import { useEigenschutzTelemetry } from '../useEigenschutzTelemetry';

const EINSATZ_ID = 'einsatz-3-11';

function makeEvent(seed: number): EigenschutzTelemetryEvent {
  return {
    eventName: 'cbrn_announced',
    propagationGroupIdCandidate: `group-${seed}`,
    abschnittCount: 1,
    userId: `user-${seed}`,
    sessionId: 'session-test',
    clientTime: new Date(2026, 4, 4, 12, 0, seed % 60).toISOString(),
  };
}

function pushN(n: number): void {
  for (let i = 0; i < n; i++) {
    eigenschutzTelemetryQueue.push(makeEvent(i));
  }
}

describe('useEigenschutzTelemetry (Story 3.11 Task 9)', () => {
  let originalSendBeacon: typeof navigator.sendBeacon | undefined;
  let beaconMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    eigenschutzTelemetryQueue.drain();
    vi.useFakeTimers();
    mockIngest.mockReset();
    mockIngest.mockResolvedValue({ insertedCount: 0 });

    beaconMock = vi.fn().mockReturnValue(true);
    originalSendBeacon = navigator.sendBeacon;
    Object.defineProperty(navigator, 'sendBeacon', {
      value: beaconMock,
      configurable: true,
      writable: true,
    });

    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    // visibilityState wird pro Test überschrieben.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalSendBeacon) {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: originalSendBeacon,
        configurable: true,
        writable: true,
      });
    } else {
      // @ts-expect-error — Cleanup für Tests, die sendBeacon entfernen
      delete navigator.sendBeacon;
    }
    vi.unstubAllGlobals();
  });

  it('Trigger 1 (Timer): flusht alle 10 Sekunden gequeuete Events via API', async () => {
    const { unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    pushN(3);
    expect(mockIngest).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(mockIngest).toHaveBeenCalledWith({
      einsatzId: EINSATZ_ID,
      telemetryEventBatchDto: { events: expect.any(Array) },
    });
    expect(mockIngest.mock.calls[0]?.[0].telemetryEventBatchDto.events).toHaveLength(3);
    expect(eigenschutzTelemetryQueue.size()).toBe(0);

    unmount();
  });

  it('Trigger 2 (Threshold): flusht sobald die Queue ≥ 50 Events erreicht — ohne Timer-Tick', async () => {
    const { unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    await act(async () => {
      pushN(50);
      // Threshold-Trigger ist synchron in `subscribe()`, der Flush selbst
      // läuft async — eine Microtask-Runde reicht.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(mockIngest.mock.calls[0]?.[0].telemetryEventBatchDto.events).toHaveLength(50);

    unmount();
  });

  it('Trigger 3a (Visibility hidden): flusht via sendBeacon, NICHT via ingest-API', () => {
    const { unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    pushN(1);
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(beaconMock).toHaveBeenCalledTimes(1);
    expect(beaconMock).toHaveBeenCalledWith('https://test.local/api/v-alpha/einsaetze/einsatz-3-11/sicherheit/eigenschutz/telemetry', expect.any(Blob));
    expect(mockIngest).not.toHaveBeenCalled();

    unmount();
  });

  it('Trigger 3b (Pagehide): flusht via sendBeacon', () => {
    const { unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    pushN(2);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(beaconMock).toHaveBeenCalledTimes(1);
    expect(mockIngest).not.toHaveBeenCalled();

    unmount();
  });

  it('sendBeacon-Fallback: ohne sendBeacon wird `fetch` mit `keepalive: true` verwendet', () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    pushN(1);
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://test.local/api/v-alpha/einsaetze/einsatz-3-11/sicherheit/eigenschutz/telemetry');
    expect(init).toMatchObject({
      method: 'POST',
      keepalive: true,
      credentials: 'include',
    });

    unmount();
  });

  it('Concurrent-Flush-Lock: laufender Flush blockt einen zweiten flushNow()-Call', async () => {
    let resolveIngest: ((value: unknown) => void) | undefined;
    mockIngest.mockReset();
    mockIngest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveIngest = resolve;
        }),
    );

    const { result, unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    pushN(2);
    act(() => {
      result.current.flushNow();
    });

    // Erste Microtask, damit drain() läuft und ingest aufgerufen wird.
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockIngest).toHaveBeenCalledTimes(1);

    // Zweiter Call während des laufenden Flushes — darf KEINEN weiteren
    // ingest-Call auslösen (inFlightRef-Lock).
    pushN(1);
    act(() => {
      result.current.flushNow();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockIngest).toHaveBeenCalledTimes(1);

    // Den hängenden Flush jetzt auflösen.
    await act(async () => {
      resolveIngest?.({ insertedCount: 2 });
      await Promise.resolve();
    });

    unmount();
  });

  it('Empty-Queue: kein Trigger löst einen Network-Call aus', async () => {
    const { result, unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    // Timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    // Manual
    act(() => {
      result.current.flushNow();
    });
    await act(async () => {
      await Promise.resolve();
    });
    // Visibility
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Pagehide
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(mockIngest).not.toHaveBeenCalled();
    expect(beaconMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    unmount();
  });

  it('Backpressure-Split: 120 Events werden in drei Batches (50/50/20) gesendet', async () => {
    const { result, unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    // 120 Events einfügen — der Threshold-Trigger feuert bei 50, also
    // simulieren wir Hintergrund-Akkumulation, indem wir den Hook
    // temporär „pausieren". Einfachste Variante: Wir pushen direkt 120
    // Events und akzeptieren, dass der Threshold-Trigger zwischendurch
    // einen Flush starten würde — aber: mockIngest ist ein
    // never-resolvender Promise solange wir nichts auflösen, also
    // verhindert der inFlightRef-Lock weitere Threshold-Flushes.
    let resolveIngest: ((value: unknown) => void) | undefined;
    mockIngest.mockReset();
    mockIngest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveIngest = resolve;
        }),
    );

    // Erst alle 120 Events einreihen — Threshold-Flush startet bei 50,
    // hängt aber wegen pending Promise. inFlightRef blockt weitere
    // Trigger. Wir schauen uns die Calls an, sobald wir den Lock
    // freigeben.
    act(() => {
      pushN(50);
    });
    await act(async () => {
      await Promise.resolve();
    });
    // Erster Threshold-Flush hat 50 Events gedraint und wartet.
    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(mockIngest.mock.calls[0]?.[0].telemetryEventBatchDto.events).toHaveLength(50);

    // Setze ingest auf resolved (für die nachfolgenden Chunks im Manual-Flush).
    mockIngest.mockReset();
    mockIngest.mockResolvedValue({ insertedCount: 50 });

    // Auflösen und 120 weitere Events einreihen, dann manuell flushen
    // — wir wollen sehen, dass ein größerer Batch in 50/50/20 splittet.
    await act(async () => {
      resolveIngest?.({ insertedCount: 50 });
      await Promise.resolve();
    });
    expect(eigenschutzTelemetryQueue.size()).toBe(0);

    // Jetzt den Backpressure-Pfad testen: Threshold-Trigger TEMPORÄR
    // umgehen, indem wir den Hook unmounten, 120 Events einreihen und
    // dann mit einem frischen Hook manuell flushen.
    unmount();
    pushN(120);
    expect(eigenschutzTelemetryQueue.size()).toBe(120);

    const { result: result2, unmount: unmount2 } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    // Direkt nach Mount feuert der Threshold-Subscribe nicht (kein push
    // mehr) — wir flushen manuell.
    act(() => {
      result2.current.flushNow();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockIngest).toHaveBeenCalledTimes(3);
    expect(mockIngest.mock.calls[0]?.[0].telemetryEventBatchDto.events).toHaveLength(50);
    expect(mockIngest.mock.calls[1]?.[0].telemetryEventBatchDto.events).toHaveLength(50);
    expect(mockIngest.mock.calls[2]?.[0].telemetryEventBatchDto.events).toHaveLength(20);

    unmount2();
  });

  it('Network-Fail: ingest-Reject loggt warn und re-pusht Events NICHT zurück in die Queue', async () => {
    mockIngest.mockReset();
    mockIngest.mockRejectedValueOnce(new Error('network fail'));

    const { result, unmount } = renderHook(() => useEigenschutzTelemetry(EINSATZ_ID));

    pushN(2);
    act(() => {
      result.current.flushNow();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalled();
    // KEIN Re-Push: Queue bleibt leer (Best-Effort, AC9).
    expect(eigenschutzTelemetryQueue.size()).toBe(0);

    unmount();
  });

  it('einsatzId === undefined: alle Trigger sind No-Ops', async () => {
    const { unmount } = renderHook(() => useEigenschutzTelemetry(undefined));

    pushN(60);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await Promise.resolve();
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(mockIngest).not.toHaveBeenCalled();
    expect(beaconMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    // Queue bleibt unangetastet, da kein Flush lief.
    expect(eigenschutzTelemetryQueue.size()).toBe(60);

    unmount();
  });
});
