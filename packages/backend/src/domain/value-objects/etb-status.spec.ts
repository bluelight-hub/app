// @ts-nocheck
import { EtbStatus } from './etb-status';

describe('EtbStatus', () => {
  describe('create', () => {
    it('should create valid status DRAFT', () => {
      const result = EtbStatus.create('DRAFT');
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('DRAFT');
    });

    it('should create valid status ACTIVE', () => {
      const result = EtbStatus.create('ACTIVE');
      expect(result.isSuccess).toBe(true);
      expect(result.value?.value).toBe('ACTIVE');
    });

    it('should reject LOCKED as invalid status (Issue #582)', () => {
      const result = EtbStatus.create('LOCKED');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültiger Status');
    });

    it('should reject invalid status', () => {
      const result = EtbStatus.create('INVALID');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültiger Status');
    });
  });

  describe('static factories', () => {
    it('should create DRAFT via static factory', () => {
      const status = EtbStatus.DRAFT();
      expect(status.value).toBe('DRAFT');
    });

    it('should create ACTIVE via static factory', () => {
      const status = EtbStatus.ACTIVE();
      expect(status.value).toBe('ACTIVE');
    });
  });

  describe('canTransitionTo - Valid Transitions', () => {
    it('should allow DRAFT → ACTIVE transition', () => {
      const draft = EtbStatus.DRAFT();
      const active = EtbStatus.ACTIVE();
      expect(draft.canTransitionTo(active)).toBe(true);
    });
  });

  describe('canTransitionTo - Invalid Transitions', () => {
    it('should reject ACTIVE → DRAFT (backward transition)', () => {
      const active = EtbStatus.ACTIVE();
      const draft = EtbStatus.DRAFT();
      expect(active.canTransitionTo(draft)).toBe(false);
    });

    it('should reject DRAFT → DRAFT (no self-transition)', () => {
      const draft1 = EtbStatus.DRAFT();
      const draft2 = EtbStatus.DRAFT();
      expect(draft1.canTransitionTo(draft2)).toBe(false);
    });

    it('should reject ACTIVE → ACTIVE (no self-transition)', () => {
      const active1 = EtbStatus.ACTIVE();
      const active2 = EtbStatus.ACTIVE();
      expect(active1.canTransitionTo(active2)).toBe(false);
    });
  });
});
