import { NotificationStatus, NotificationPriority, TemplateType } from './notification.enums';

describe('Notification Enums', () => {
  describe('NotificationStatus', () => {
    it('should have correct values', () => {
      expect(NotificationStatus.QUEUED).toBe('QUEUED');
      expect(NotificationStatus.PROCESSING).toBe('PROCESSING');
      expect(NotificationStatus.SENT).toBe('SENT');
      expect(NotificationStatus.FAILED).toBe('FAILED');
      expect(NotificationStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have all expected status values', () => {
      const statusValues = Object.values(NotificationStatus);
      expect(statusValues).toHaveLength(5);
      expect(statusValues).toContain('QUEUED');
      expect(statusValues).toContain('PROCESSING');
      expect(statusValues).toContain('SENT');
      expect(statusValues).toContain('FAILED');
      expect(statusValues).toContain('CANCELLED');
    });
  });

  describe('NotificationPriority', () => {
    it('should have correct values', () => {
      expect(NotificationPriority.LOW).toBe('LOW');
      expect(NotificationPriority.MEDIUM).toBe('MEDIUM');
      expect(NotificationPriority.HIGH).toBe('HIGH');
      expect(NotificationPriority.CRITICAL).toBe('CRITICAL');
    });

    it('should have all expected priority values', () => {
      const priorityValues = Object.values(NotificationPriority);
      expect(priorityValues).toHaveLength(4);
      expect(priorityValues).toContain('LOW');
      expect(priorityValues).toContain('MEDIUM');
      expect(priorityValues).toContain('HIGH');
      expect(priorityValues).toContain('CRITICAL');
    });
  });

  describe('TemplateType', () => {
    it('should have correct values', () => {
      expect(TemplateType.SECURITY_ALERT).toBe('SECURITY_ALERT');
      expect(TemplateType.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED');
      expect(TemplateType.SUSPICIOUS_LOGIN).toBe('SUSPICIOUS_LOGIN');
      expect(TemplateType.BRUTE_FORCE_ATTEMPT).toBe('BRUTE_FORCE_ATTEMPT');
      expect(TemplateType.WELCOME).toBe('WELCOME');
      expect(TemplateType.PASSWORD_RESET).toBe('PASSWORD_RESET');
      expect(TemplateType.EMAIL_VERIFICATION).toBe('EMAIL_VERIFICATION');
    });

    it('should have all expected template types', () => {
      const templateValues = Object.values(TemplateType);
      expect(templateValues).toHaveLength(7);
      expect(templateValues).toContain('SECURITY_ALERT');
      expect(templateValues).toContain('ACCOUNT_LOCKED');
      expect(templateValues).toContain('SUSPICIOUS_LOGIN');
      expect(templateValues).toContain('BRUTE_FORCE_ATTEMPT');
      expect(templateValues).toContain('WELCOME');
      expect(templateValues).toContain('PASSWORD_RESET');
      expect(templateValues).toContain('EMAIL_VERIFICATION');
    });
  });
});
