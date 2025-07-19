import { HttpStatus } from '@nestjs/common';
import {
  SessionNotFoundException,
  SessionExpiredException,
  SessionRevokedException,
  SessionLimitExceededException,
  InvalidSessionException,
  SessionRiskDetectedException,
  SessionActivityException,
} from './session.exceptions';

describe('Session Exceptions', () => {
  describe('SessionNotFoundException', () => {
    it('should create a not found exception with correct message and status', () => {
      const exception = new SessionNotFoundException('session-123');

      expect(exception.message).toBe('Session with ID session-123 not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('SessionExpiredException', () => {
    it('should create an expired session exception with correct message and status', () => {
      const exception = new SessionExpiredException('session-456');

      expect(exception.message).toBe('Session session-456 has expired');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('SessionRevokedException', () => {
    it('should create a revoked session exception without reason', () => {
      const exception = new SessionRevokedException('session-789');

      expect(exception.message).toBe('Session session-789 has been revoked');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should create a revoked session exception with reason', () => {
      const exception = new SessionRevokedException('session-789', 'Security breach');

      expect(exception.message).toBe('Session session-789 has been revoked: Security breach');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('SessionLimitExceededException', () => {
    it('should create a session limit exceeded exception with correct message and status', () => {
      const exception = new SessionLimitExceededException('user-123', 5);

      expect(exception.message).toBe('User user-123 has exceeded the maximum session limit of 5');
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('InvalidSessionException', () => {
    it('should create an invalid session exception with correct message and status', () => {
      const exception = new InvalidSessionException('Invalid JWT token');

      expect(exception.message).toBe('Invalid session: Invalid JWT token');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('SessionRiskDetectedException', () => {
    it('should create a risk detected exception with correct payload and status', () => {
      const factors = ['new_location', 'suspicious_user_agent'];
      const exception = new SessionRiskDetectedException('session-999', 85, factors);

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);

      const response = exception.getResponse() as any;
      expect(response.message).toBe('High risk detected for session session-999');
      expect(response.riskScore).toBe(85);
      expect(response.factors).toEqual(factors);
    });
  });

  describe('SessionActivityException', () => {
    it('should create a session activity exception with correct message and status', () => {
      const exception = new SessionActivityException('Failed to track activity');

      expect(exception.message).toBe('Session activity error: Failed to track activity');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
