import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { BefehlZugestelltEtbEventAdapter } from '../befehl-zugestellt-etb-event.adapter';
import { Result } from '@domain/common/result';

jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('BefehlZugestelltEtbEventAdapter', () => {
  let adapter: BefehlZugestelltEtbEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<BefehlZugestelltEvent>>;
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

    adapter = new BefehlZugestelltEtbEventAdapter(mockHandler, mockLogger, mockCircuitBreaker as CircuitBreakerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should register circuit breaker on construction', () => {
    expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('etb');
  });

  it('should delegate to handler on event', async () => {
    // Given
    const event = new BefehlZugestelltEvent(BefehlId.create().value!, 'user-empfaenger-1', new Date('2026-02-25T10:00:00.000Z'), EinsatzId.create().value!, 'ZF Nord', 'B-001');

    // When
    const promise = adapter.onBefehlZugestellt(event);
    jest.advanceTimersByTime(50);
    await promise;

    // Then
    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it('should log received event', async () => {
    // Given
    const event = new BefehlZugestelltEvent(BefehlId.create().value!, 'user-empfaenger-1', new Date(), EinsatzId.create().value!, 'ZF Nord', 'B-001');

    // When
    const promise = adapter.onBefehlZugestellt(event);
    jest.advanceTimersByTime(50);
    await promise;

    // Then
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Received BefehlZugestelltEvent for ETB'), expect.any(Object));
  });

  it('should warn on circuit breaker failure', async () => {
    // Given
    mockCircuitBreaker.execute.mockResolvedValue(Result.fail('Circuit open'));
    const event = new BefehlZugestelltEvent(BefehlId.create().value!, 'user-empfaenger-1', new Date(), EinsatzId.create().value!, 'ZF Nord', 'B-001');

    // When
    const promise = adapter.onBefehlZugestellt(event);
    jest.advanceTimersByTime(50);
    await promise;

    // Then
    expect(mockLogger.warn).toHaveBeenCalledWith('ETB-Integration degraded, entries queued', expect.any(Object));
  });
});
