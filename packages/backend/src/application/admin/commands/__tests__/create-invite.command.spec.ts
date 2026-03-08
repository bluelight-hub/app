// @ts-nocheck
import { CreateInviteCommand } from '../create-invite.command';
import { INVITE_ERROR_CODES } from '../../errors/invite-error.codes';
import { expectSuccess } from './helpers/result-test.helper';

describe('CreateInviteCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: Erstellt gültige Props für Command-Erstellung.
   */
  function createValidProps(
    overrides: Partial<{
      expiresAt: Date;
      maxUses: number;
      label: string;
      createdById: string;
    }> = {},
  ) {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1); // 1 Stunde in der Zukunft

    return {
      expiresAt: futureDate,
      maxUses: 10,
      createdById: 'user_abc123def456ghi789jkl012',
      label: 'Test Invite',
      ...overrides,
    };
  }

  describe('create() - Success Cases', () => {
    it('should create command successfully with valid props', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.expiresAt).toEqual(props.expiresAt);
      expect(result.value?.maxUses).toBe(props.maxUses);
      expect(result.value?.createdById).toBe(props.createdById);
      expect(result.value?.label).toBe(props.label?.trim());
    });

    it('should default maxUses to 1 when not provided', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: undefined });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(1);
    });

    it('should allow label to be undefined', () => {
      // Given (Arrange)
      const props = createValidProps({ label: undefined });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBeUndefined();
    });

    it('should trim label whitespace', () => {
      // Given (Arrange)
      const props = createValidProps({ label: '  Test Label  ' });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe('Test Label');
    });

    it('should convert empty label to undefined', () => {
      // Given (Arrange)
      const props = createValidProps({ label: '' });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBeUndefined();
    });

    it('should convert whitespace-only label to undefined', () => {
      // Given (Arrange)
      const props = createValidProps({ label: '   ' });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBeUndefined();
    });
  });

  describe('create() - Validation: expiresAt (EXPIRY_TOO_SOON)', () => {
    it('should fail when expiresAt is in the past', () => {
      // Given (Arrange)
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 Stunde in der Vergangenheit
      const props = createValidProps({ expiresAt: pastDate });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    });

    it('should fail when expiresAt is exactly now', () => {
      // Given (Arrange)
      const now = new Date();
      const props = createValidProps({ expiresAt: now });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    });

    it('should fail when expiresAt is 1 second ago', () => {
      // Given (Arrange)
      const oneSecondAgo = new Date(Date.now() - 1000);
      const props = createValidProps({ expiresAt: oneSecondAgo });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    });

    it('should fail when expiresAt is 30 seconds in the future (less than 1 minute minimum)', () => {
      // Given (Arrange)
      const thirtySecondsFuture = new Date(Date.now() + 30 * 1000);
      const props = createValidProps({ expiresAt: thirtySecondsFuture });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    });

    it('should fail when expiresAt is 59 seconds in the future (just under 1 minute minimum)', () => {
      // Given (Arrange)
      const fiftyNineSecondsFuture = new Date(Date.now() + 59 * 1000);
      const props = createValidProps({ expiresAt: fiftyNineSecondsFuture });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    });

    it('should succeed when expiresAt is exactly 61 seconds in the future (just over 1 minute minimum)', () => {
      // Given (Arrange)
      const sixtyOneSecondsFuture = new Date(Date.now() + 61 * 1000);
      const props = createValidProps({ expiresAt: sixtyOneSecondsFuture });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('should succeed when expiresAt is far in the future', () => {
      // Given (Arrange)
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      const props = createValidProps({ expiresAt: farFuture });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('create() - Validation: maxUses (MAX_USES_INVALID)', () => {
    it('should fail when maxUses is 0', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 0 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.MAX_USES_INVALID);
    });

    it('should fail when maxUses is negative', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: -1 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.MAX_USES_INVALID);
    });

    it('should fail when maxUses is -100', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: -100 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.MAX_USES_INVALID);
    });

    it('should fail when maxUses is 101 (above maximum)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 101 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.MAX_USES_INVALID);
    });

    it('should fail when maxUses is 200', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 200 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.MAX_USES_INVALID);
    });

    it('should succeed when maxUses is 1 (minimum)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 1 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(1);
    });

    it('should succeed when maxUses is 100 (maximum)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 100 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(100);
    });

    it('should succeed when maxUses is 50 (middle value)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 50 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(50);
    });
  });

  describe('create() - Validation: label (LABEL_TOO_LONG)', () => {
    it('should fail when label exceeds 100 characters', () => {
      // Given (Arrange)
      const longLabel = 'A'.repeat(101);
      const props = createValidProps({ label: longLabel });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.LABEL_TOO_LONG);
    });

    it('should fail when label is 150 characters', () => {
      // Given (Arrange)
      const veryLongLabel = 'B'.repeat(150);
      const props = createValidProps({ label: veryLongLabel });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.LABEL_TOO_LONG);
    });

    it('should succeed when label is exactly 100 characters', () => {
      // Given (Arrange)
      const maxLabel = 'C'.repeat(100);
      const props = createValidProps({ label: maxLabel });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(maxLabel);
    });

    it('should succeed when label is short', () => {
      // Given (Arrange)
      const shortLabel = 'Test';
      const props = createValidProps({ label: shortLabel });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(shortLabel);
    });

    it('should succeed when label is 99 characters', () => {
      // Given (Arrange)
      const label99 = 'D'.repeat(99);
      const props = createValidProps({ label: label99 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(label99);
    });
  });

  describe('Command Immutability', () => {
    it('should have readonly properties', () => {
      // Given (Arrange)
      const props = createValidProps();
      const result = CreateInviteCommand.create(props);
      const command = expectSuccess(result);

      // Then (Assert)
      // TypeScript sollte verhindern, dass diese Properties geändert werden
      // Wir prüfen nur, dass die Properties korrekt gesetzt sind
      expect(command.expiresAt).toEqual(props.expiresAt);
      expect(command.maxUses).toBe(props.maxUses);
      expect(command.createdById).toBe(props.createdById);
      expect(command.label).toBe(props.label?.trim());
    });

    it('should preserve original expiresAt Date reference', () => {
      // Given (Arrange)
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      const props = createValidProps({ expiresAt: futureDate });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.expiresAt).toBe(props.expiresAt);
    });
  });

  describe('Error Code Constants', () => {
    it('should use correct error code for expiry too soon', () => {
      // Given (Arrange)
      const pastDate = new Date(Date.now() - 10000);
      const props = createValidProps({ expiresAt: pastDate });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.error).toBe('INVITE_EXPIRY_TOO_SOON');
    });

    it('should use correct error code for invalid maxUses', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 0 });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.error).toBe('INVITE_MAX_USES_INVALID');
    });

    it('should use correct error code for long label', () => {
      // Given (Arrange)
      const props = createValidProps({ label: 'X'.repeat(101) });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.error).toBe('INVITE_LABEL_TOO_LONG');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in label', () => {
      // Given (Arrange)
      const specialLabel = 'Test Invite äöü ß € @#$%';
      const props = createValidProps({ label: specialLabel });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(specialLabel);
    });

    it('should handle emoji in label', () => {
      // Given (Arrange)
      const emojiLabel = 'Test Invite 🚀🔥';
      const props = createValidProps({ label: emojiLabel });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(emojiLabel);
    });

    it('should handle newlines in label (trim should remove leading/trailing)', () => {
      // Given (Arrange)
      const labelWithNewlines = '\nTest\nLabel\n';
      const props = createValidProps({ label: labelWithNewlines });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Nur führende/nachfolgende Whitespaces werden entfernt
      expect(result.value?.label).toBe('Test\nLabel');
    });

    it('should handle tab characters in label', () => {
      // Given (Arrange)
      const labelWithTabs = '\tTest\tLabel\t';
      const props = createValidProps({ label: labelWithTabs });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Trim entfernt Tabs am Anfang und Ende
      expect(result.value?.label).toBe('Test\tLabel');
    });

    it('should handle very long createdById', () => {
      // Given (Arrange)
      const longCreatedById = `user_${'a'.repeat(100)}`;
      const props = createValidProps({ createdById: longCreatedById });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.createdById).toBe(longCreatedById);
    });
  });

  describe('Validation Order', () => {
    it('should validate expiresAt before maxUses', () => {
      // Given (Arrange): Beide ungültig
      const pastDate = new Date(Date.now() - 10000);
      const props = createValidProps({
        expiresAt: pastDate,
        maxUses: 0, // Auch ungültig
      });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert): expiresAt-Fehler sollte zuerst kommen
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
    });

    it('should validate maxUses before label', () => {
      // Given (Arrange): maxUses und label ungültig
      const props = createValidProps({
        maxUses: -1,
        label: 'X'.repeat(101),
      });

      // When (Act)
      const result = CreateInviteCommand.create(props);

      // Then (Assert): maxUses-Fehler sollte zuerst kommen
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(INVITE_ERROR_CODES.MAX_USES_INVALID);
    });
  });
});
