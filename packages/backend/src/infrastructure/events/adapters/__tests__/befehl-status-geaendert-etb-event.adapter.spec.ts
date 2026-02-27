import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { BefehlStatusGeaendertEtbEventAdapter } from '../befehl-status-geaendert-etb-event.adapter';
import { Result } from '@domain/common/result';

jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('BefehlStatusGeaendertEtbEventAdapter', () => {
  let adapter: BefehlStatusGeaendertEtbEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<BefehlStatusGeaendertEvent>>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockCircuitBreaker: Pick<CircuitBreakerService, 'registerIfNotExists' | 'execute'>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockCircuitBreaker = {
      registerIfNotExists: jest.fn(),
      execute: jest.fn().mockImplementation((_name: string, fn: () => Promise<unknown>) => fn().then(() => Result.ok(undefined))),
    };

    adapter = new BefehlStatusGeaendertEtbEventAdapter(mockHandler, mockLogger, mockCircuitBreaker as CircuitBreakerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should register circuit breaker on construction', () => {
    expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('etb');
  });

  it('should delegate to handler on event', async () => {
    // Given
    const event = new BefehlStatusGeaendertEvent(BefehlId.create().value!, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT(), EinsatzId.create().value!, 'B-001');

    // When
    const promise = adapter.onBefehlStatusGeaendert(event);
    jest.advanceTimersByTime(50);
    await promise;

    // Then
    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it('should log received event', async () => {
    // Given
    const event = new BefehlStatusGeaendertEvent(BefehlId.create().value!, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT(), EinsatzId.create().value!, 'B-001');

    // When
    const promise = adapter.onBefehlStatusGeaendert(event);
    jest.advanceTimersByTime(50);
    await promise;

    // Then
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Received BefehlStatusGeaendertEvent for ETB'), expect.any(Object));
  });

  it('should warn on circuit breaker failure', async () => {
    // Given
    mockCircuitBreaker.execute.mockResolvedValue(Result.fail('Circuit open'));
    const event = new BefehlStatusGeaendertEvent(BefehlId.create().value!, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT(), EinsatzId.create().value!, 'B-001');

    // When
    const promise = adapter.onBefehlStatusGeaendert(event);
    jest.advanceTimersByTime(50);
    await promise;

    // Then
    expect(mockLogger.warn).toHaveBeenCalledWith('ETB-Integration degraded, entries queued', expect.any(Object));
  });
});
