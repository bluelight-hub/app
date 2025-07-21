import { CircuitBreaker, CircuitBreakerState } from '../circuit-breaker.util';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('TestBreaker', {
      failureThreshold: 3,
      failureCountWindow: 10000,
      openStateDuration: 5000,
      successThreshold: 2,
      failureRateThreshold: 50,
      minimumNumberOfCalls: 3,
    });
  });

  afterEach(() => {
    circuitBreaker.reset();
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failures).toBe(0);
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Test error');
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should block calls when in OPEN state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // Force circuit to open
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
        ).rejects.toThrow();
      }

      // Should block without calling operation
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Circuit breaker TestBreaker is OPEN',
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
        ).rejects.toThrow();
      }

      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);

      // Fast forward past open duration
      jest.advanceTimersByTime(5001);

      const successOperation = jest.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(successOperation)).resolves.toBe('success');
      expect(successOperation).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
        ).rejects.toThrow();
      }

      // Wait for HALF_OPEN
      jest.advanceTimersByTime(5001);

      // Succeed twice (success threshold)
      for (let i = 0; i < 2; i++) {
        await circuitBreaker.execute(() => Promise.resolve('success'));
      }

      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);

      jest.useRealTimers();
    });

    it('should reopen from HALF_OPEN on failure', async () => {
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
        ).rejects.toThrow();
      }

      // Wait for HALF_OPEN
      jest.advanceTimersByTime(5001);

      // Fail once in HALF_OPEN
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('fail again'))),
      ).rejects.toThrow('fail again');

      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);

      jest.useRealTimers();
    });
  });

  describe('Failure Rate Calculation', () => {
    it('should open circuit based on failure rate', async () => {
      // Make minimum number of calls with high failure rate
      await circuitBreaker.execute(() => Promise.resolve('success'));
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
      ).rejects.toThrow();
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
      ).rejects.toThrow();

      // 2/3 failures = 66% > 50% threshold
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.OPEN);
      expect(status.recentFailureRate).toBeGreaterThan(50);
    });

    it('should not open circuit if below minimum calls', async () => {
      // Only 2 calls (below minimum of 3)
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
      ).rejects.toThrow();
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
      ).rejects.toThrow();

      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state when reset is called', async () => {
      // Create some failures
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
        ).rejects.toThrow();
      }

      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);

      // Reset
      circuitBreaker.reset();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failures).toBe(0);
      expect(status.recentFailureRate).toBe(0);
      expect(status.lastFailureTime).toBeUndefined();
    });
  });

  describe('History Cleanup', () => {
    it('should clean up old call history', async () => {
      jest.useFakeTimers();

      // Make calls
      await circuitBreaker.execute(() => Promise.resolve('success'));

      // Fast forward past failure window
      jest.advanceTimersByTime(11000);

      // Make a failing call
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('fail'))),
      ).rejects.toThrow();

      // Should have only recent failure in history
      const status = circuitBreaker.getStatus();
      expect(status.recentFailureRate).toBe(100); // Only the recent failure counts

      jest.useRealTimers();
    });
  });
});
