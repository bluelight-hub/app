import { GetSystemHealthQueryHandler } from '../get-system-health.handler';
import { GetSystemHealthQuery } from '../get-system-health.query';
import type { IMetricsCollector } from '@/application/monitoring/ports/i-metrics-collector.port';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * Unit Tests fuer GetSystemHealthQueryHandler (Story 5.6).
 *
 * **Test Strategy:**
 * - Direct Instantiation (NO NestJS Test Module)
 * - Mocked IMetricsCollector + ILogger
 * - Alle Metriken, Fehlerfall, Circuit Breaker Integration
 */
describe('GetSystemHealthQueryHandler', () => {
  let handler: GetSystemHealthQueryHandler;
  let mockMetricsCollector: jest.Mocked<IMetricsCollector>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsCollector = {
      getZustellrate: jest.fn().mockResolvedValue(98.5),
      getWebsocketConnections: jest.fn().mockResolvedValue(42),
      getOutboxQueueDepth: jest.fn().mockResolvedValue(3),
      getApiResponseTime: jest.fn().mockResolvedValue({ p50: 12, p95: 45, p99: 120 }),
      getDbConnectionPoolUsage: jest.fn().mockResolvedValue(35.2),
      getUptime: jest.fn().mockResolvedValue(86400),
      getCircuitBreakerStatus: jest.fn().mockReturnValue([
        { serviceName: 'hiorg', state: 'CLOSED' as const },
        { serviceName: 'websocket', state: 'CLOSED' as const },
      ]),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    handler = new GetSystemHealthQueryHandler(mockMetricsCollector, mockLogger);
  });

  describe('execute', () => {
    it('sollte alle Metriken korrekt aggregieren', async () => {
      // When: Query wird ausgefuehrt
      const result = await handler.execute(new GetSystemHealthQuery());

      // Then: Alle Metriken sind korrekt
      expect(result.isSuccess).toBe(true);
      const dto = result.value!;
      expect(dto.zustellrate).toBe(98.5);
      expect(dto.websocketConnections).toBe(42);
      expect(dto.outboxQueueDepth).toBe(3);
      expect(dto.apiResponseTime).toEqual({ p50: 12, p95: 45, p99: 120 });
      expect(dto.circuitBreakerStatus).toEqual({ hiorg: 'CLOSED', websocket: 'CLOSED' });
      expect(dto.dbConnectionPoolUsage).toBe(35.2);
      expect(dto.uptime).toBe(86400);
      expect(dto.timestamp).toBeInstanceOf(Date);
    });

    it('sollte alle Metriken parallel abrufen', async () => {
      // When: Query wird ausgefuehrt
      await handler.execute(new GetSystemHealthQuery());

      // Then: Alle Collector-Methoden wurden aufgerufen
      expect(mockMetricsCollector.getZustellrate).toHaveBeenCalledTimes(1);
      expect(mockMetricsCollector.getWebsocketConnections).toHaveBeenCalledTimes(1);
      expect(mockMetricsCollector.getOutboxQueueDepth).toHaveBeenCalledTimes(1);
      expect(mockMetricsCollector.getApiResponseTime).toHaveBeenCalledTimes(1);
      expect(mockMetricsCollector.getDbConnectionPoolUsage).toHaveBeenCalledTimes(1);
      expect(mockMetricsCollector.getUptime).toHaveBeenCalledTimes(1);
    });

    it('sollte Circuit Breaker Status korrekt mappen', async () => {
      // Given: Ein Circuit Breaker ist OPEN
      mockMetricsCollector.getCircuitBreakerStatus.mockReturnValue([
        { serviceName: 'hiorg', state: 'OPEN' as const },
        { serviceName: 'websocket', state: 'HALF_OPEN' as const },
      ]);

      // When: Query wird ausgefuehrt
      const result = await handler.execute(new GetSystemHealthQuery());

      // Then: Status ist korrekt gemappt
      expect(result.value?.circuitBreakerStatus).toEqual({
        hiorg: 'OPEN',
        websocket: 'HALF_OPEN',
      });
    });

    it('sollte leere Circuit Breaker Map unterstuetzen', async () => {
      // Given: Keine Circuit Breakers registriert
      mockMetricsCollector.getCircuitBreakerStatus.mockReturnValue([]);

      // When: Query wird ausgefuehrt
      const result = await handler.execute(new GetSystemHealthQuery());

      // Then: Leere Map
      expect(result.value?.circuitBreakerStatus).toEqual({});
    });

    it('sollte Result.fail bei Metriken-Fehler zurueckgeben', async () => {
      // Given: MetricsCollector wirft Fehler
      mockMetricsCollector.getZustellrate.mockRejectedValue(new Error('Prometheus nicht erreichbar'));

      // When: Query wird ausgefuehrt
      const result = await handler.execute(new GetSystemHealthQuery());

      // Then: Fehlerhaftes Result
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Prometheus nicht erreichbar');
    });

    it('sollte Fehler loggen bei Metriken-Fehler', async () => {
      // Given: MetricsCollector wirft Fehler
      mockMetricsCollector.getWebsocketConnections.mockRejectedValue(new Error('DB Timeout'));

      // When: Query wird ausgefuehrt
      await handler.execute(new GetSystemHealthQuery());

      // Then: Fehler wurde geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('DB Timeout'), 'GetSystemHealthQueryHandler');
    });

    it('sollte unbekannte Fehler behandeln', async () => {
      // Given: Nicht-Error wird geworfen
      mockMetricsCollector.getUptime.mockRejectedValue('string error');

      // When: Query wird ausgefuehrt
      const result = await handler.execute(new GetSystemHealthQuery());

      // Then: Generische Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unbekannter Fehler');
    });

    it('sollte aktuellen Timestamp im DTO setzen', async () => {
      // Given: Zeitfenster
      const before = new Date();

      // When: Query wird ausgefuehrt
      const result = await handler.execute(new GetSystemHealthQuery());

      // Then: Timestamp liegt im Zeitfenster
      const after = new Date();
      expect(result.value?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.value?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
