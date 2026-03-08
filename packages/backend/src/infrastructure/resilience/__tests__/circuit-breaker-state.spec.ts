// @ts-nocheck
import { CircuitBreakerState, CircuitBreakerStateEnum, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../circuit-breaker-state';

describe('CircuitBreakerState', () => {
  let state: CircuitBreakerState;

  beforeEach(() => {
    state = new CircuitBreakerState({
      failureThreshold: 3,
      windowMs: 60_000,
      openDurationMs: 1_000,
      halfOpenMaxRequests: 1,
    });
  });

  describe('Initial State', () => {
    it('startet im CLOSED Zustand', () => {
      expect(state.currentState).toBe(CircuitBreakerStateEnum.CLOSED);
      expect(state.isClosed()).toBe(true);
      expect(state.isOpen()).toBe(false);
      expect(state.isHalfOpen()).toBe(false);
    });

    it('hat 0 Failures', () => {
      expect(state.failureCount).toBe(0);
    });

    it('hat keine Timestamps', () => {
      expect(state.lastFailure).toBeNull();
      expect(state.lastSuccess).toBeNull();
    });
  });

  describe('CLOSED → OPEN Transition', () => {
    it('oeffnet nach failureThreshold Failures', () => {
      state.recordFailure();
      state.recordFailure();
      expect(state.isClosed()).toBe(true);

      state.recordFailure(); // Threshold=3 erreicht
      expect(state.isOpen()).toBe(true);
      expect(state.currentState).toBe(CircuitBreakerStateEnum.OPEN);
    });

    it('oeffnet nicht bei Failures unter Threshold', () => {
      state.recordFailure();
      state.recordFailure();
      expect(state.isClosed()).toBe(true);
    });

    it('setzt lastFailure Timestamp', () => {
      state.recordFailure();
      expect(state.lastFailure).toBeInstanceOf(Date);
    });
  });

  describe('Rolling Window', () => {
    it('bereinigt abgelaufene Failures', () => {
      jest.useFakeTimers();

      const shortWindow = new CircuitBreakerState({
        failureThreshold: 3,
        windowMs: 100, // 100ms Window
        openDurationMs: 1_000,
        halfOpenMaxRequests: 1,
      });

      shortWindow.recordFailure();
      shortWindow.recordFailure();

      // Warte bis Failures aus dem Window fallen
      jest.advanceTimersByTime(150);

      expect(shortWindow.failureCount).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('Success Recording', () => {
    it('setzt lastSuccess Timestamp', () => {
      state.recordSuccess();
      expect(state.lastSuccess).toBeInstanceOf(Date);
    });

    it('aendert CLOSED State nicht', () => {
      state.recordSuccess();
      expect(state.isClosed()).toBe(true);
    });
  });

  describe('OPEN → HALF_OPEN Transition', () => {
    beforeEach(() => {
      // Circuit oeffnen
      state.recordFailure();
      state.recordFailure();
      state.recordFailure();
      expect(state.isOpen()).toBe(true);
    });

    it('shouldAttemptHalfOpen() ist false wenn Timeout nicht abgelaufen', () => {
      expect(state.shouldAttemptHalfOpen()).toBe(false);
    });

    it('shouldAttemptHalfOpen() ist true nach Timeout', () => {
      jest.useFakeTimers();
      jest.advanceTimersByTime(1_100); // > 1000ms openDuration
      expect(state.shouldAttemptHalfOpen()).toBe(true);
      jest.useRealTimers();
    });

    it('transitionToHalfOpen() wechselt zu HALF_OPEN', () => {
      state.transitionToHalfOpen();
      expect(state.isHalfOpen()).toBe(true);
      expect(state.currentState).toBe(CircuitBreakerStateEnum.HALF_OPEN);
    });
  });

  describe('HALF_OPEN → CLOSED Transition (Recovery)', () => {
    beforeEach(() => {
      // Circuit oeffnen und zu Half-Open wechseln
      state.recordFailure();
      state.recordFailure();
      state.recordFailure();
      state.transitionToHalfOpen();
    });

    it('wechselt zu CLOSED bei Erfolg', () => {
      state.recordSuccess();
      expect(state.isClosed()).toBe(true);
      expect(state.failureCount).toBe(0);
    });
  });

  describe('HALF_OPEN → OPEN Transition (Failure)', () => {
    beforeEach(() => {
      state.recordFailure();
      state.recordFailure();
      state.recordFailure();
      state.transitionToHalfOpen();
    });

    it('wechselt zurueck zu OPEN bei Failure', () => {
      state.recordFailure();
      expect(state.isOpen()).toBe(true);
    });
  });

  describe('Half-Open Request Limiting', () => {
    beforeEach(() => {
      state.recordFailure();
      state.recordFailure();
      state.recordFailure();
      state.transitionToHalfOpen();
    });

    it('erlaubt Test-Request bis Limit', () => {
      expect(state.canAttemptHalfOpenRequest()).toBe(true);
      state.incrementHalfOpenRequests();
      expect(state.canAttemptHalfOpenRequest()).toBe(false);
    });
  });

  describe('reset()', () => {
    it('setzt auf CLOSED mit 0 Failures zurueck', () => {
      state.recordFailure();
      state.recordFailure();
      state.recordFailure();
      expect(state.isOpen()).toBe(true);

      state.reset();
      expect(state.isClosed()).toBe(true);
      expect(state.failureCount).toBe(0);
    });

    it('leert lastFailureAt und lastSuccessAt', () => {
      state.recordFailure();
      state.recordSuccess();
      expect(state.lastFailure).not.toBeNull();
      expect(state.lastSuccess).not.toBeNull();

      state.reset();
      expect(state.lastFailure).toBeNull();
      expect(state.lastSuccess).toBeNull();
    });
  });

  describe('Default Config', () => {
    it('hat korrekte Default-Werte', () => {
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG).toEqual({
        failureThreshold: 5,
        windowMs: 60_000,
        openDurationMs: 30_000,
        halfOpenMaxRequests: 1,
      });
    });
  });

  describe('transitionToHalfOpen() Guards', () => {
    it('tut nichts wenn nicht im OPEN State', () => {
      state.transitionToHalfOpen(); // CLOSED → sollte nichts aendern
      expect(state.isClosed()).toBe(true);
    });
  });
});
