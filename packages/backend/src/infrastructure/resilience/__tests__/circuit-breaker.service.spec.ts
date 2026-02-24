import { CircuitBreakerService } from '../circuit-breaker.service';
import { CircuitBreakerStateEnum } from '@infrastructure/resilience/circuit-breaker-state';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    service = new CircuitBreakerService(mockLogger as any);
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('registriert einen Circuit Breaker mit Default-Config', () => {
      service.register('test-service');
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.CLOSED);
    });

    it('registriert mit Custom-Config', () => {
      service.register('test-service', { failureThreshold: 2 });
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.CLOSED);
    });
  });

  describe('execute() - CLOSED Circuit', () => {
    beforeEach(() => {
      service.register('test-service', {
        failureThreshold: 3,
        windowMs: 60_000,
        openDurationMs: 1_000,
        halfOpenMaxRequests: 1,
      });
    });

    it('fuehrt Operation bei CLOSED Circuit aus', async () => {
      const result = await service.execute('test-service', async () => 'success');
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('success');
    });

    it('gibt Fehler bei fehlgeschlagener Operation zurueck', async () => {
      const result = await service.execute('test-service', async () => {
        throw new Error('API down');
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('API down');
    });

    it('nutzt Fallback bei Fehler', async () => {
      const result = await service.execute(
        'test-service',
        async () => {
          throw new Error('API down');
        },
        async () => 'fallback-value',
      );
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('fallback-value');
    });
  });

  describe('execute() - OPEN Circuit', () => {
    beforeEach(() => {
      service.register('test-service', {
        failureThreshold: 3,
        windowMs: 60_000,
        openDurationMs: 30_000,
        halfOpenMaxRequests: 1,
      });
    });

    it('blockiert Calls bei OPEN Circuit', async () => {
      // Circuit oeffnen
      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }

      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.OPEN);

      // Naechster Call sollte sofort fehlschlagen
      const operation = jest.fn();
      const result = await service.execute('test-service', operation);
      expect(result.isFailure).toBe(true);
      expect(operation).not.toHaveBeenCalled();
    });

    it('nutzt Fallback bei OPEN Circuit', async () => {
      // Circuit oeffnen
      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }

      const result = await service.execute(
        'test-service',
        async () => 'should-not-be-called',
        async () => 'fallback-value',
      );
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('fallback-value');
    });
  });

  describe('execute() - Half-Open Recovery', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      service.register('test-service', {
        failureThreshold: 3,
        windowMs: 60_000,
        openDurationMs: 1_000,
        halfOpenMaxRequests: 1,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('wechselt zu HALF_OPEN nach Timeout und recovered bei Erfolg', async () => {
      // Circuit oeffnen
      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.OPEN);

      // Timeout abwarten
      jest.advanceTimersByTime(1_100);

      // Erfolgreicher Test-Call
      const result = await service.execute('test-service', async () => 'recovered');
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('recovered');
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.CLOSED);
    });

    it('wechselt zurueck zu OPEN bei fehlgeschlagenem Test-Call', async () => {
      // Circuit oeffnen
      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }

      // Timeout abwarten
      jest.advanceTimersByTime(1_100);

      // Fehlgeschlagener Test-Call
      await service.execute('test-service', async () => {
        throw new Error('still down');
      });
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.OPEN);
    });
  });

  describe('getAllStatus()', () => {
    it('gibt Status aller registrierten Circuit Breakers zurueck', () => {
      service.register('service-a');
      service.register('service-b');

      const statuses = service.getAllStatus();
      expect(statuses).toHaveLength(2);
      expect(statuses[0].serviceName).toBe('service-a');
      expect(statuses[0].state).toBe(CircuitBreakerStateEnum.CLOSED);
      expect(statuses[1].serviceName).toBe('service-b');
    });
  });

  describe('reset()', () => {
    it('setzt Circuit Breaker auf CLOSED zurueck', async () => {
      service.register('test-service', { failureThreshold: 3, windowMs: 60_000, openDurationMs: 30_000, halfOpenMaxRequests: 1 });

      // Circuit oeffnen
      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.OPEN);

      service.reset('test-service');
      expect(service.getState('test-service')).toBe(CircuitBreakerStateEnum.CLOSED);
    });
  });

  describe('isOpen()', () => {
    it('gibt false fuer unbekannten Service zurueck', () => {
      expect(service.isOpen('unknown')).toBe(false);
    });

    it('gibt true fuer offenen Circuit zurueck', async () => {
      service.register('test-service', { failureThreshold: 3, windowMs: 60_000, openDurationMs: 30_000, halfOpenMaxRequests: 1 });

      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }
      expect(service.isOpen('test-service')).toBe(true);
    });
  });

  describe('onStateChange()', () => {
    it('ruft Listener bei State-Aenderung auf', async () => {
      const listener = jest.fn();
      service.onStateChange(listener);
      service.register('test-service', { failureThreshold: 3, windowMs: 60_000, openDurationMs: 30_000, halfOpenMaxRequests: 1 });

      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }

      expect(listener).toHaveBeenCalledWith('test-service', CircuitBreakerStateEnum.OPEN);
    });

    it('faengt Listener-Fehler ab', async () => {
      const listener = jest.fn(() => {
        throw new Error('listener error');
      });
      service.onStateChange(listener);
      service.register('test-service', { failureThreshold: 3, windowMs: 60_000, openDurationMs: 30_000, halfOpenMaxRequests: 1 });

      // Sollte nicht werfen trotz Listener-Fehler
      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Auto-Registration', () => {
    it('registriert unbekannten Service automatisch bei execute() und warnt', async () => {
      const result = await service.execute('auto-service', async () => 'auto');
      expect(result.isSuccess).toBe(true);
      expect(service.getState('auto-service')).toBe(CircuitBreakerStateEnum.CLOSED);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('war nicht registriert'), 'CircuitBreakerService');
    });
  });

  describe('registerIfNotExists()', () => {
    it('registriert neuen Service', () => {
      service.registerIfNotExists('new-service');
      expect(service.getState('new-service')).toBe(CircuitBreakerStateEnum.CLOSED);
    });

    it('ueberspringt bereits registrierten Service', () => {
      service.register('existing-service', { failureThreshold: 10 });
      service.registerIfNotExists('existing-service', { failureThreshold: 2 });
      // Original-Config bleibt erhalten (nicht ueberschrieben)
      expect(service.getState('existing-service')).toBe(CircuitBreakerStateEnum.CLOSED);
    });
  });

  describe('onStateChange() - Multi-Listener', () => {
    it('ruft mehrere Listener bei State-Aenderung auf', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      service.onStateChange(listener1);
      service.onStateChange(listener2);
      service.register('test-service', { failureThreshold: 3, windowMs: 60_000, openDurationMs: 30_000, halfOpenMaxRequests: 1 });

      for (let i = 0; i < 3; i++) {
        await service.execute('test-service', async () => {
          throw new Error('fail');
        });
      }

      expect(listener1).toHaveBeenCalledWith('test-service', CircuitBreakerStateEnum.OPEN);
      expect(listener2).toHaveBeenCalledWith('test-service', CircuitBreakerStateEnum.OPEN);
    });
  });

  describe('execute() - Concurrency', () => {
    it('serialisiert parallele Calls fuer denselben Service', async () => {
      const callOrder: number[] = [];
      service.register('test-service', { failureThreshold: 5, windowMs: 60_000, openDurationMs: 30_000, halfOpenMaxRequests: 1 });

      const p1 = service.execute('test-service', async () => {
        callOrder.push(1);
        return 'first';
      });
      const p2 = service.execute('test-service', async () => {
        callOrder.push(2);
        return 'second';
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.isSuccess).toBe(true);
      expect(r2.isSuccess).toBe(true);
      expect(callOrder).toEqual([1, 2]);
    });
  });

  describe('getState() - unbekannter Service', () => {
    it('gibt CLOSED fuer unbekannten Service zurueck', () => {
      expect(service.getState('unknown')).toBe(CircuitBreakerStateEnum.CLOSED);
    });
  });
});
