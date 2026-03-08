// @ts-nocheck
/**
 * Unit Tests fuer RolleGeaendertEtbEventAdapter.
 *
 * Story 5.4 AC4: ETB Event Adapter fuer RolleGeaendert Domain Event.
 *
 * Testet den Adapter, der Domain Events empfaengt und an den Application Handler delegiert:
 * - Delegation an Application Handler
 * - 50ms Delay fuer Race Condition Prevention
 * - Logging bei Event-Empfang
 * - Circuit Breaker Tracking bei Failures
 * - Fire-and-Forget: Fehler werden nicht propagiert
 */

import { RolleGeaendertEvent } from '@domain/events/rolle-geaendert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { RolleGeaendertEtbEventAdapter } from '../rolle-geaendert-etb-event.adapter';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('RolleGeaendertEtbEventAdapter', () => {
  let adapter: RolleGeaendertEtbEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<RolleGeaendertEvent>>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;

  const createTestEvent = (
    overrides?: Partial<{
      alteRolle: string | null;
      neueRolle: string | null;
    }>,
  ): RolleGeaendertEvent => {
    return new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', overrides?.alteRolle ?? 'Gruppenführer', overrides?.neueRolle ?? 'Zugführer', 'admin-789', 'Admin User');
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventHandler<RolleGeaendertEvent>>;

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

    adapter = new RolleGeaendertEtbEventAdapter(mockHandler, mockLogger, mockCircuitBreaker);
  });

  it('sollte etb Circuit Breaker bei Konstruktion registrieren', () => {
    expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('etb');
  });

  it('sollte Event an Application Handler delegieren', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onRolleGeaendert(event);

    // Then
    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it('sollte Handler durch Circuit Breaker ausfuehren', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onRolleGeaendert(event);

    // Then
    expect(mockCircuitBreaker.execute).toHaveBeenCalledWith('etb', expect.any(Function));
  });

  it('sollte 50ms warten bevor Handler delegiert wird (Race Condition Prevention)', async () => {
    // Given
    const event = createTestEvent();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    // When
    await adapter.onRolleGeaendert(event);

    // Then
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    setTimeoutSpy.mockRestore();
  });

  it('sollte loggen wenn Event empfangen wird', async () => {
    // Given
    const event = createTestEvent();

    // When
    await adapter.onRolleGeaendert(event);

    // Then
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Received RolleGeaendertEvent for ETB'),
      expect.objectContaining({
        einsatzId: 'einsatz-123',
        userId: 'user-456',
        userName: 'Max Mustermann',
      }),
    );
  });

  describe('Circuit Breaker Resilience', () => {
    it('sollte Fehler nicht propagieren wenn Handler fehlschlaegt (Fire-and-Forget)', async () => {
      // Given
      const event = createTestEvent();
      mockCircuitBreaker.execute.mockResolvedValue(Result.fail('ETB service unavailable'));

      // When / Then - kein Fehler geworfen
      await expect(adapter.onRolleGeaendert(event)).resolves.toBeUndefined();
    });

    it('sollte Warnung loggen wenn Circuit Breaker Failure zurueckgibt', async () => {
      // Given
      const event = createTestEvent();
      mockCircuitBreaker.execute.mockResolvedValue(Result.fail('ETB service unavailable'));

      // When
      await adapter.onRolleGeaendert(event);

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ETB-Integration degraded, entries queued',
        expect.objectContaining({
          einsatzId: 'einsatz-123',
          userId: 'user-456',
          error: 'ETB service unavailable',
        }),
      );
    });
  });
});
