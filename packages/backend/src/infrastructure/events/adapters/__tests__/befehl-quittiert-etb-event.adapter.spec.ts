/**
 * Unit Tests fuer BefehlQuittiertEtbEventAdapter.
 *
 * Story 4.3: ETB Event Adapter fuer BefehlQuittiert Domain Event.
 * Story 5.3: Circuit Breaker Integration fuer ETB Resilience (AC3).
 *
 * Testet den Adapter, der Domain Events empfaengt und an den Application Handler delegiert:
 * - Delegation an Application Handler
 * - 50ms Delay fuer Race Condition Prevention
 * - Logging bei Event-Empfang
 * - Circuit Breaker Tracking bei Failures
 * - Fire-and-Forget: Fehler werden nicht propagiert
 */

import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { Result } from '@domain/common/result';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { BefehlQuittiertEtbEventAdapter } from '../befehl-quittiert-etb-event.adapter';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

function createTestEvent(): BefehlQuittiertEvent {
  return new BefehlQuittiertEvent(BefehlId.create().value!, EinsatzId.create().value!, UserId.create().value!, 'VERSTANDEN', 'B-001', new Date('2026-02-20T10:30:00.000Z'));
}

describe('BefehlQuittiertEtbEventAdapter', () => {
  let adapter: BefehlQuittiertEtbEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<BefehlQuittiertEvent>>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventHandler<BefehlQuittiertEvent>>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockCircuitBreaker = {
      register: jest.fn(),
      registerIfNotExists: jest.fn(),
      execute: jest.fn().mockImplementation((_name, operation) => operation().then((result: unknown) => Result.ok(result))),
      isOpen: jest.fn().mockReturnValue(false),
      getState: jest.fn(),
      getAllStatus: jest.fn(),
      reset: jest.fn(),
      onStateChange: jest.fn(),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    adapter = new BefehlQuittiertEtbEventAdapter(mockHandler, mockLogger, mockCircuitBreaker);
  });

  it('should register etb circuit breaker on construction', () => {
    expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('etb');
  });

  it('should delegate event to handler', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onBefehlQuittiert(event);

    // Then
    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it('should execute handler through circuit breaker', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onBefehlQuittiert(event);

    // Then
    expect(mockCircuitBreaker.execute).toHaveBeenCalledWith('etb', expect.any(Function));
  });

  it('should wait 50ms before delegating to handler (Race Condition Prevention)', async () => {
    // Given
    const event = createTestEvent();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    // When
    await adapter.onBefehlQuittiert(event);

    // Then
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    setTimeoutSpy.mockRestore();
  });

  it('should log event receipt with details', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onBefehlQuittiert(event);

    // Then
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Received BefehlQuittiertEvent for ETB',
      expect.objectContaining({
        befehlId: event.befehlId.value,
        einsatzId: event.einsatzId.value,
        empfaengerId: event.empfaengerId.value,
        quittierungArt: 'VERSTANDEN',
        nummer: 'B-001',
      }),
    );
  });

  describe('Circuit Breaker Resilience (AC3)', () => {
    it('should not propagate error when handler fails (Fire-and-Forget)', async () => {
      // Given
      const event = createTestEvent();
      mockCircuitBreaker.execute.mockResolvedValue(Result.fail('ETB service unavailable'));

      // When / Then - no error thrown
      await expect(adapter.onBefehlQuittiert(event)).resolves.toBeUndefined();
    });

    it('should log warning when circuit breaker returns failure', async () => {
      // Given
      const event = createTestEvent();
      mockCircuitBreaker.execute.mockResolvedValue(Result.fail('ETB service unavailable'));

      // When
      await adapter.onBefehlQuittiert(event);

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ETB-Integration degraded, entries queued',
        expect.objectContaining({
          befehlId: event.befehlId.value,
          error: 'ETB service unavailable',
        }),
      );
    });
  });
});
