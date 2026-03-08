// @ts-nocheck
/**
 * Unit Tests fuer BefehlErstelltEtbEventAdapter.
 *
 * Story 4.3: ETB Event Adapter fuer BefehlErstellt Domain Event.
 * Story 5.3: Circuit Breaker Integration fuer ETB Resilience (AC3).
 *
 * Testet den Adapter, der Domain Events empfaengt und an den Application Handler delegiert:
 * - Delegation an Application Handler
 * - 50ms Delay fuer Race Condition Prevention
 * - Logging bei Event-Empfang
 * - Circuit Breaker Tracking bei Failures
 * - Fire-and-Forget: Fehler werden nicht propagiert
 */

import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Result } from '@domain/common/result';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { BefehlErstelltEtbEventAdapter } from '../befehl-erstellt-etb-event.adapter';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('BefehlErstelltEtbEventAdapter', () => {
  let adapter: BefehlErstelltEtbEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<BefehlErstelltEvent>>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;

  const createTestEvent = (): BefehlErstelltEvent => {
    const befehlId = BefehlId.create().value!;
    const einsatzId = EinsatzId.create().value!;
    return new BefehlErstelltEvent(befehlId, einsatzId, 'Test Auftrag', 'B-001', ['ZF Nord']);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventHandler<BefehlErstelltEvent>>;

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

    adapter = new BefehlErstelltEtbEventAdapter(mockHandler, mockLogger, mockCircuitBreaker);
  });

  it('should register etb circuit breaker on construction', () => {
    expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('etb');
  });

  it('should delegate event to application handler', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onBefehlErstellt(event);

    // Then
    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it('should execute handler through circuit breaker', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onBefehlErstellt(event);

    // Then
    expect(mockCircuitBreaker.execute).toHaveBeenCalledWith('etb', expect.any(Function));
  });

  it('should wait 50ms before delegating to handler (Race Condition Prevention)', async () => {
    // Given
    const event = createTestEvent();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    // When
    await adapter.onBefehlErstellt(event);

    // Then
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    setTimeoutSpy.mockRestore();
  });

  it('should log when event is received', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onBefehlErstellt(event);

    // Then
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Received BefehlErstelltEvent for ETB'),
      expect.objectContaining({
        befehlId: event.befehlId.value,
        einsatzId: event.einsatzId.value,
        nummer: event.nummer,
      }),
    );
  });

  describe('Circuit Breaker Resilience (AC3)', () => {
    it('should not propagate error when handler fails (Fire-and-Forget)', async () => {
      // Given
      const event = createTestEvent();
      mockCircuitBreaker.execute.mockResolvedValue(Result.fail('ETB service unavailable'));

      // When / Then - no error thrown
      await expect(adapter.onBefehlErstellt(event)).resolves.toBeUndefined();
    });

    it('should log warning when circuit breaker returns failure', async () => {
      // Given
      const event = createTestEvent();
      mockCircuitBreaker.execute.mockResolvedValue(Result.fail('ETB service unavailable'));

      // When
      await adapter.onBefehlErstellt(event);

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
