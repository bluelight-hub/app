// @ts-nocheck
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

import { SystemMonitoringScheduler } from '../system-monitoring.scheduler';
import { SystemWarnungEvent } from '@domain/events/system-warnung.event';
import { WarnungTyp } from '@domain/value-objects/warnung-typ';
import type { IMetricsCollector } from '@/application/monitoring/ports/i-metrics-collector.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Unit Tests fuer SystemMonitoringScheduler (Story 5.6).
 *
 * **Test Strategy:**
 * - Direct Instantiation (NO NestJS Test Module)
 * - Mocked Dependencies
 * - Schwellwert-Checks, Event-Emission, Running-Guard
 */
describe('SystemMonitoringScheduler', () => {
  let scheduler: SystemMonitoringScheduler;
  let mockMetricsCollector: jest.Mocked<IMetricsCollector>;
  let mockEventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let mockLogger: jest.Mocked<ILogger>;

  // Default: Alle Metriken im gruenen Bereich
  const healthyMetrics = () => {
    mockMetricsCollector.getZustellrate.mockResolvedValue(98);
    mockMetricsCollector.getOutboxQueueDepth.mockResolvedValue(5);
    mockMetricsCollector.getApiResponseTime.mockResolvedValue({ p50: 10, p95: 50, p99: 100 });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsCollector = {
      getZustellrate: jest.fn().mockResolvedValue(98),
      getWebsocketConnections: jest.fn().mockResolvedValue(42),
      getOutboxQueueDepth: jest.fn().mockResolvedValue(5),
      getApiResponseTime: jest.fn().mockResolvedValue({ p50: 10, p95: 50, p99: 100 }),
      getDbConnectionPoolUsage: jest.fn().mockResolvedValue(30),
      getUptime: jest.fn().mockResolvedValue(86400),
      getCircuitBreakerStatus: jest.fn().mockReturnValue([{ serviceName: 'hiorg', state: 'CLOSED' as const }]),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    scheduler = new SystemMonitoringScheduler(
      mockMetricsCollector,
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
      mockEventEmitter as any,
      mockLogger,
    );
  });

  describe('checkSchwellwerte', () => {
    it('sollte keine Warnung emittieren wenn alle Metriken im gruenen Bereich', async () => {
      // Given: Alle Metriken gesund (Default)
      healthyMetrics();

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Kein Event emittiert
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('sollte Warnung emittieren wenn Zustellrate unter Schwellwert', async () => {
      // Given: Zustellrate unter 95%
      mockMetricsCollector.getZustellrate.mockResolvedValue(90);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: ZUSTELLRATE-Warnung emittiert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'system.warnung',
        expect.objectContaining({
          warnungTyp: WarnungTyp.ZUSTELLRATE,
          schwellwert: 95,
          aktuellerWert: 90,
        }),
      );
    });

    it('sollte Warnung emittieren wenn Outbox-Queue-Depth ueber Schwellwert', async () => {
      // Given: Outbox-Queue-Depth ueber 100
      mockMetricsCollector.getOutboxQueueDepth.mockResolvedValue(150);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: OUTBOX_STAU-Warnung emittiert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'system.warnung',
        expect.objectContaining({
          warnungTyp: WarnungTyp.OUTBOX_STAU,
          schwellwert: 100,
          aktuellerWert: 150,
        }),
      );
    });

    it('sollte Warnung emittieren wenn API-Latenz (p95) ueber Schwellwert', async () => {
      // Given: p95 Latenz ueber 2000ms
      mockMetricsCollector.getApiResponseTime.mockResolvedValue({ p50: 500, p95: 2500, p99: 5000 });

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: LATENZ-Warnung emittiert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'system.warnung',
        expect.objectContaining({
          warnungTyp: WarnungTyp.LATENZ,
          schwellwert: 2000,
          aktuellerWert: 2500,
        }),
      );
    });

    it('sollte Warnung emittieren wenn ein Circuit Breaker OPEN ist', async () => {
      // Given: Ein Circuit Breaker ist OPEN
      mockMetricsCollector.getCircuitBreakerStatus.mockReturnValue([{ serviceName: 'hiorg', state: 'OPEN' as const }]);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: CIRCUIT_BREAKER-Warnung emittiert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'system.warnung',
        expect.objectContaining({
          warnungTyp: WarnungTyp.CIRCUIT_BREAKER,
        }),
      );
    });

    it('sollte keine Circuit-Breaker-Warnung bei CLOSED/HALF_OPEN', async () => {
      // Given: Circuit Breakers CLOSED und HALF_OPEN
      mockMetricsCollector.getCircuitBreakerStatus.mockReturnValue([
        { serviceName: 'hiorg', state: 'CLOSED' as const },
        { serviceName: 'ws', state: 'HALF_OPEN' as const },
      ]);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Kein CIRCUIT_BREAKER Event
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('system.warnung', expect.objectContaining({ warnungTyp: WarnungTyp.CIRCUIT_BREAKER }));
    });

    it('sollte mehrere Warnungen gleichzeitig emittieren koennen', async () => {
      // Given: Zustellrate UND Latenz ueberschritten
      mockMetricsCollector.getZustellrate.mockResolvedValue(80);
      mockMetricsCollector.getApiResponseTime.mockResolvedValue({ p50: 500, p95: 3000, p99: 5000 });

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Beide Warnungen emittiert
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('system.warnung', expect.objectContaining({ warnungTyp: WarnungTyp.ZUSTELLRATE }));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('system.warnung', expect.objectContaining({ warnungTyp: WarnungTyp.LATENZ }));
    });

    it('sollte keine Warnung bei exaktem Schwellwert (Zustellrate = 95)', async () => {
      // Given: Zustellrate genau beim Schwellwert
      mockMetricsCollector.getZustellrate.mockResolvedValue(95);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Kein Event fuer Zustellrate
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('system.warnung', expect.objectContaining({ warnungTyp: WarnungTyp.ZUSTELLRATE }));
    });

    it('sollte keine Warnung bei exaktem Schwellwert (Outbox = 100)', async () => {
      // Given: Outbox genau beim Schwellwert
      mockMetricsCollector.getOutboxQueueDepth.mockResolvedValue(100);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Kein Event fuer Outbox
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('system.warnung', expect.objectContaining({ warnungTyp: WarnungTyp.OUTBOX_STAU }));
    });
  });

  describe('running guard', () => {
    it('sollte parallele Ausfuehrung verhindern', async () => {
      // Given: Langsamer Metriken-Call
      let resolveZustellrate: (value: number) => void;
      mockMetricsCollector.getZustellrate.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveZustellrate = resolve;
          }),
      );

      // When: Erster Check startet
      const firstCheck = scheduler.checkSchwellwerte();

      // Zweiter Check wird sofort aufgerufen
      const secondCheck = scheduler.checkSchwellwerte();

      // Then: Warnung fuer ueberspringung
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ueberspringe'), 'SystemMonitoringScheduler');

      // Cleanup
      resolveZustellrate?.(98);
      await Promise.all([firstCheck, secondCheck]);
    });
  });

  describe('error handling', () => {
    it('sollte Fehler loggen und weiterlaufen', async () => {
      // Given: MetricsCollector wirft Fehler
      mockMetricsCollector.getZustellrate.mockRejectedValue(new Error('Connection refused'));

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Fehler geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Connection refused'), 'SystemMonitoringScheduler');
    });

    it('sollte Running-Flag nach Fehler zuruecksetzen', async () => {
      // Given: MetricsCollector wirft Fehler
      mockMetricsCollector.getZustellrate.mockRejectedValue(new Error('Timeout'));

      // When: Fehlerhafter Check
      await scheduler.checkSchwellwerte();

      // Then: Naechster Check kann laufen (kein skip)
      mockMetricsCollector.getZustellrate.mockResolvedValue(98);
      await scheduler.checkSchwellwerte();

      // Kein zweiter "ueberspringe" Log
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('ueberspringe'), 'SystemMonitoringScheduler');
    });
  });

  describe('event properties', () => {
    it('sollte SystemWarnungEvent mit korrektem Event-Namen emittieren', async () => {
      // Given: Zustellrate unter Schwellwert
      mockMetricsCollector.getZustellrate.mockResolvedValue(80);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Event-Name ist system.warnung
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('system.warnung', expect.any(SystemWarnungEvent));
    });

    it('sollte Warnung loggen bei Schwellwert-Ueberschreitung', async () => {
      // Given: Outbox Queue zu gross
      mockMetricsCollector.getOutboxQueueDepth.mockResolvedValue(200);

      // When: Check wird ausgefuehrt
      await scheduler.checkSchwellwerte();

      // Then: Warnung geloggt
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('OUTBOX_STAU'), 'SystemMonitoringScheduler');
    });
  });
});
