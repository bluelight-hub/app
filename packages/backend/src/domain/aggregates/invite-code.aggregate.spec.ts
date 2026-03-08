// @ts-nocheck
import { InviteCode, type CreateInviteCodeProps, type ReconstructInviteCodeProps } from '@domain/aggregates/invite-code.aggregate';
import { InviteCodeCreatedEvent } from '@domain/events/invite-code-created.event';
import { InviteCodeRevokedEvent } from '@domain/events/invite-code-revoked.event';
import { InviteCodeUsedEvent } from '@domain/events/invite-code-used.event';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';

// Mock CUID2 for Jest compatibility (ESM module issue)
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    // Generate valid CUID2 format: 24 lowercase alphanumeric characters
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
}));

/**
 * Helper: Erstellt gültige CreateInviteCodeProps für Tests.
 */
function createValidProps(overrides: Partial<CreateInviteCodeProps> = {}): CreateInviteCodeProps {
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

/**
 * Helper: Erstellt gültige ReconstructInviteCodeProps für Tests.
 */
function createReconstructProps(overrides: Partial<ReconstructInviteCodeProps> = {}): ReconstructInviteCodeProps {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 3600000); // 1 Stunde in der Zukunft

  return {
    id: InviteCodeId.create().value!,
    code: InviteCodeValue.generate().value!,
    expiresAt: futureDate,
    maxUses: 10,
    usedCount: 0,
    createdById: 'user_abc123def456ghi789jkl012',
    label: 'Reconstructed Invite',
    isRevoked: false,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('InviteCode Aggregate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create() - Factory Method', () => {
    it('should create InviteCode successfully with valid props', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBeDefined();
      expect(result.value?.code).toBeDefined();
      expect(result.value?.expiresAt).toEqual(props.expiresAt);
      expect(result.value?.maxUses).toBe(props.maxUses);
      expect(result.value?.createdById).toBe(props.createdById);
      expect(result.value?.label).toBe(props.label);
    });

    it('should initialize usedCount to 0', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.usedCount).toBe(0);
    });

    it('should initialize isRevoked to false', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.isRevoked).toBe(false);
      expect(result.value?.revokedAt).toBeNull();
    });

    it('should create without label when not provided', () => {
      // Given (Arrange)
      const props = createValidProps({ label: undefined });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBeNull();
    });

    it('should generate unique InviteCodeId', () => {
      // Given (Arrange)
      const props1 = createValidProps();
      const props2 = createValidProps();

      // When (Act)
      const result1 = InviteCode.create(props1);
      const result2 = InviteCode.create(props2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value?.id.value).not.toBe(result2.value?.id.value);
    });

    it('should generate unique InviteCodeValue (8-character code)', () => {
      // Given (Arrange)
      const props1 = createValidProps();
      const props2 = createValidProps();

      // When (Act)
      const result1 = InviteCode.create(props1);
      const result2 = InviteCode.create(props2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value?.code.value).toHaveLength(8);
      expect(result2.value?.code.value).toHaveLength(8);
      expect(result1.value?.code.value).not.toBe(result2.value?.code.value);
    });
  });

  describe('create() - Validation: expiresAt', () => {
    it('should fail when expiresAt is in the past', () => {
      // Given (Arrange)
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 Stunde in der Vergangenheit
      const props = createValidProps({ expiresAt: pastDate });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_EXPIRY_TOO_SOON');
    });

    it('should fail when expiresAt is exactly now', () => {
      // Given (Arrange)
      const now = new Date();
      const props = createValidProps({ expiresAt: now });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_EXPIRY_TOO_SOON');
    });

    it('should fail when expiresAt is less than 1 minute in the future', () => {
      // Given (Arrange)
      const now = new Date();
      const lessThanOneMinute = new Date(now.getTime() + 30000); // 30 Sekunden in Zukunft
      const props = createValidProps({ expiresAt: lessThanOneMinute });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_EXPIRY_TOO_SOON');
    });

    it('should succeed when expiresAt is exactly 1 minute in the future', () => {
      // Given (Arrange)
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60001); // 60 Sekunden + 1ms
      const props = createValidProps({ expiresAt: oneMinuteFromNow });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('should succeed when expiresAt is far in the future', () => {
      // Given (Arrange)
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1); // 1 Jahr in der Zukunft
      const props = createValidProps({ expiresAt: farFuture });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('create() - Validation: maxUses', () => {
    it('should fail when maxUses is 0', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 0 });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_MAX_USES_INVALID');
    });

    it('should fail when maxUses is negative', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: -5 });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_MAX_USES_INVALID');
    });

    it('should fail when maxUses is 101 (above maximum)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 101 });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_MAX_USES_INVALID');
    });

    it('should succeed when maxUses is 1 (minimum)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 1 });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(1);
    });

    it('should succeed when maxUses is 100 (maximum)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 100 });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(100);
    });

    it('should succeed when maxUses is 50 (middle value)', () => {
      // Given (Arrange)
      const props = createValidProps({ maxUses: 50 });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.maxUses).toBe(50);
    });
  });

  describe('create() - Validation: label', () => {
    it('should fail when label exceeds 100 characters', () => {
      // Given (Arrange)
      const longLabel = 'A'.repeat(101);
      const props = createValidProps({ label: longLabel });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_LABEL_TOO_LONG');
    });

    it('should succeed when label is exactly 100 characters', () => {
      // Given (Arrange)
      const maxLabel = 'A'.repeat(100);
      const props = createValidProps({ label: maxLabel });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(maxLabel);
      expect(result.value?.label?.length).toBe(100);
    });

    it('should succeed when label is short', () => {
      // Given (Arrange)
      const shortLabel = 'Test';
      const props = createValidProps({ label: shortLabel });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.label).toBe(shortLabel);
    });

    it('should succeed when label is empty string (treated as null)', () => {
      // Given (Arrange)
      const props = createValidProps({ label: '' });

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Leerer String wird als null behandelt oder bleibt leer
      expect(result.value?.label === null || result.value?.label === '').toBe(true);
    });
  });

  describe('isValid() - Gültigkeitsprüfung', () => {
    it('should return true for valid, non-expired, non-revoked code with remaining uses', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;

      // When (Act)
      const isValid = invite.isValid();

      // Then (Assert)
      expect(isValid).toBe(true);
    });

    it('should return false when code is revoked', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        isRevoked: true,
        revokedAt: new Date(),
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const isValid = invite.isValid();

      // Then (Assert)
      expect(isValid).toBe(false);
    });

    it('should return false when code is expired', () => {
      // Given (Arrange)
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // Abgelaufen

      const reconstructProps = createReconstructProps({
        expiresAt: pastDate,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const isValid = invite.isValid();

      // Then (Assert)
      expect(isValid).toBe(false);
    });

    it('should return false when usedCount equals maxUses', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 5,
        usedCount: 5, // Vollständig verbraucht
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const isValid = invite.isValid();

      // Then (Assert)
      expect(isValid).toBe(false);
    });

    it('should return false when usedCount exceeds maxUses', () => {
      // Given (Arrange) - Sollte nicht vorkommen, aber prüfen wir
      const reconstructProps = createReconstructProps({
        maxUses: 5,
        usedCount: 6,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const isValid = invite.isValid();

      // Then (Assert)
      expect(isValid).toBe(false);
    });

    it('should return true when usedCount is less than maxUses', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 10,
        usedCount: 5,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const isValid = invite.isValid();

      // Then (Assert)
      expect(isValid).toBe(true);
    });
  });

  describe('use() - Code einlösen', () => {
    it('should increment usedCount on valid use', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        usedCount: 0,
        maxUses: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.use();

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(invite.usedCount).toBe(1);
    });

    it('should allow multiple uses up to maxUses', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        usedCount: 8,
        maxUses: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result1 = invite.use();
      const result2 = invite.use();

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(invite.usedCount).toBe(10);
    });

    it('should fail when code is already exhausted', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        usedCount: 10,
        maxUses: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.use();

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID');
    });

    it('should fail when code is revoked', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        isRevoked: true,
        revokedAt: new Date(),
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.use();

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID');
    });

    it('should fail when code is expired', () => {
      // Given (Arrange)
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const reconstructProps = createReconstructProps({
        expiresAt: pastDate,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.use();

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_INVALID');
    });

    it('should emit InviteCodeUsedEvent on successful use', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        usedCount: 0,
        maxUses: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.use();

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = invite.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(InviteCodeUsedEvent);
    });

    it('should include correct data in InviteCodeUsedEvent', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        usedCount: 3,
        maxUses: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      invite.use();
      const events = invite.getDomainEvents();
      const event = events[0] as InviteCodeUsedEvent;

      // Then (Assert)
      expect(event.inviteCodeId).toBe(invite.id.value);
      expect(event.code).toBe(invite.code.value);
      expect(event.usedAt).toBeInstanceOf(Date);
      expect(event.newUseCount).toBe(4);
    });

    it('should not emit event when use fails', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        usedCount: 10,
        maxUses: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.use();

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      const events = invite.getDomainEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('revoke() - Code widerrufen', () => {
    const adminId = 'admin_test1234567890123456';

    it('should set isRevoked to true', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;
      invite.clearDomainEvents(); // Reset events

      // When (Act)
      const result = invite.revoke(adminId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(invite.isRevoked).toBe(true);
      expect(invite.revokedAt).toBeDefined();
      expect(invite.revokedAt).toBeInstanceOf(Date);
    });

    it('should be idempotent (multiple revoke calls succeed)', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;

      // When (Act)
      const result1 = invite.revoke(adminId);
      const result2 = invite.revoke(adminId);
      const result3 = invite.revoke(adminId);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);
      expect(invite.isRevoked).toBe(true);
    });

    it('should not update revokedAt on subsequent revoke calls', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;

      // When (Act)
      invite.revoke(adminId);
      const firstRevokedAt = invite.revokedAt;

      // Warte kurz, dann nochmal widerrufen
      invite.revoke(adminId);
      const secondRevokedAt = invite.revokedAt;

      // Then (Assert)
      expect(firstRevokedAt).toBe(secondRevokedAt);
    });

    it('should emit InviteCodeRevokedEvent on first revoke', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;
      invite.clearDomainEvents(); // Reset events

      // When (Act)
      invite.revoke(adminId);

      // Then (Assert)
      const events = invite.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(InviteCodeRevokedEvent);
    });

    it('should include correct data in InviteCodeRevokedEvent', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;
      invite.clearDomainEvents(); // Reset events

      // When (Act)
      invite.revoke(adminId);
      const events = invite.getDomainEvents();
      const event = events[0] as InviteCodeRevokedEvent;

      // Then (Assert)
      expect(event.inviteCodeId).toBe(invite.id.value);
      expect(event.codeMasked).toBe(invite.code.toMasked());
      expect(event.revokedAt).toBeInstanceOf(Date);
      expect(event.revokedById).toBe(adminId);
    });

    it('should NOT emit event on subsequent revoke calls (idempotent)', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;
      invite.clearDomainEvents(); // Reset events

      // When (Act)
      invite.revoke(adminId);
      invite.clearDomainEvents(); // Clear first event
      invite.revoke(adminId); // Second revoke

      // Then (Assert)
      const events = invite.getDomainEvents();
      expect(events).toHaveLength(0);
    });

    it('should NOT emit event when code is already used (usedCount >= maxUses)', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 5,
        usedCount: 5, // Vollständig aufgebraucht
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.revoke(adminId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(invite.isRevoked).toBe(false); // Status bleibt USED, nicht REVOKED
      const events = invite.getDomainEvents();
      expect(events).toHaveLength(0);
    });

    it('should succeed but not change state when code is already used', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 5,
        usedCount: 5,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const result = invite.revoke(adminId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(invite.isRevoked).toBe(false);
      expect(invite.revokedAt).toBeNull();
    });
  });

  describe('updateLabel() - Label aktualisieren', () => {
    it('should update label successfully', () => {
      // Given (Arrange)
      const props = createValidProps({ label: 'Original Label' });
      const invite = InviteCode.create(props).value!;

      // When (Act)
      const result = invite.updateLabel('New Label');

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(invite.label).toBe('New Label');
    });

    it('should allow setting label to null', () => {
      // Given (Arrange)
      const props = createValidProps({ label: 'Some Label' });
      const invite = InviteCode.create(props).value!;

      // When (Act)
      const result = invite.updateLabel(null);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(invite.label).toBeNull();
    });

    it('should fail when new label exceeds 100 characters', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;
      const longLabel = 'B'.repeat(101);

      // When (Act)
      const result = invite.updateLabel(longLabel);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('INVITE_CODE_LABEL_TOO_LONG');
    });
  });

  describe('remainingUses() - Verbleibende Nutzungen', () => {
    it('should return correct remaining uses', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 10,
        usedCount: 3,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const remaining = invite.remainingUses();

      // Then (Assert)
      expect(remaining).toBe(7);
    });

    it('should return 0 when fully used', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 5,
        usedCount: 5,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const remaining = invite.remainingUses();

      // Then (Assert)
      expect(remaining).toBe(0);
    });

    it('should return 0 (not negative) when overused', () => {
      // Given (Arrange) - Sollte nicht vorkommen, aber absichern
      const reconstructProps = createReconstructProps({
        maxUses: 5,
        usedCount: 10,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const remaining = invite.remainingUses();

      // Then (Assert)
      expect(remaining).toBe(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should return maxUses when never used', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps({
        maxUses: 50,
        usedCount: 0,
      });
      const invite = InviteCode.reconstruct(reconstructProps);

      // When (Act)
      const remaining = invite.remainingUses();

      // Then (Assert)
      expect(remaining).toBe(50);
    });
  });

  describe('Domain Events - InviteCodeCreatedEvent', () => {
    it('should emit InviteCodeCreatedEvent on create()', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = InviteCode.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = result.value?.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(InviteCodeCreatedEvent);
    });

    it('should include correct data in InviteCodeCreatedEvent', () => {
      // Given (Arrange)
      const props = createValidProps({
        maxUses: 25,
        label: 'Test Event Label',
      });

      // When (Act)
      const result = InviteCode.create(props);
      const invite = result.value!;
      const events = invite.getDomainEvents();
      const event = events[0] as InviteCodeCreatedEvent;

      // Then (Assert)
      expect(event.inviteCodeId).toEqual(invite.id);
      expect(event.codeMasked).toBe(invite.code.toMasked());
      expect(event.expiresAt).toEqual(props.expiresAt);
      expect(event.maxUses).toBe(25);
      expect(event.createdById).toBe(props.createdById);
      expect(event.label).toBe('Test Event Label');
    });

    it('should have masked code in event (not raw code)', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = InviteCode.create(props);
      const invite = result.value!;
      const events = invite.getDomainEvents();
      const event = events[0] as InviteCodeCreatedEvent;

      // Then (Assert)
      // Code sollte maskiert sein (z.B. "ABC1****")
      expect(event.codeMasked).toMatch(/^[A-Z0-9]{4}\*{4}$/);
      expect(event.codeMasked).not.toBe(invite.code.value);
    });

    it('should clear events after getDomainEvents() + clearDomainEvents()', () => {
      // Given (Arrange)
      const props = createValidProps();
      const invite = InviteCode.create(props).value!;

      // When (Act)
      const eventsBefore = invite.getDomainEvents();
      invite.clearDomainEvents();
      const eventsAfter = invite.getDomainEvents();

      // Then (Assert)
      expect(eventsBefore).toHaveLength(1);
      expect(eventsAfter).toHaveLength(0);
    });

    it('should not emit event on reconstruct()', () => {
      // Given (Arrange)
      const reconstructProps = createReconstructProps();

      // When (Act)
      const invite = InviteCode.reconstruct(reconstructProps);
      const events = invite.getDomainEvents();

      // Then (Assert)
      expect(events).toHaveLength(0);
    });
  });

  describe('reconstruct() - Rekonstruktion aus DB', () => {
    it('should reconstruct InviteCode with all provided values', () => {
      // Given (Arrange)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600000);
      const id = InviteCodeId.create().value!;
      const code = InviteCodeValue.generate().value!;

      const props: ReconstructInviteCodeProps = {
        id,
        code,
        expiresAt,
        maxUses: 42,
        usedCount: 7,
        createdById: 'user_testid12345678901234',
        label: 'Reconstructed',
        isRevoked: false,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      // When (Act)
      const invite = InviteCode.reconstruct(props);

      // Then (Assert)
      expect(invite.id).toBe(id);
      expect(invite.code).toBe(code);
      expect(invite.expiresAt).toBe(expiresAt);
      expect(invite.maxUses).toBe(42);
      expect(invite.usedCount).toBe(7);
      expect(invite.createdById).toBe('user_testid12345678901234');
      expect(invite.label).toBe('Reconstructed');
      expect(invite.isRevoked).toBe(false);
      expect(invite.revokedAt).toBeNull();
    });

    it('should reconstruct revoked InviteCode correctly', () => {
      // Given (Arrange)
      const revokedAt = new Date();
      const props = createReconstructProps({
        isRevoked: true,
        revokedAt,
      });

      // When (Act)
      const invite = InviteCode.reconstruct(props);

      // Then (Assert)
      expect(invite.isRevoked).toBe(true);
      expect(invite.revokedAt).toBe(revokedAt);
      expect(invite.isValid()).toBe(false);
    });
  });

  describe('computeStatus() - Status Berechnung', () => {
    describe('Einzelne Status', () => {
      it('should return ACTIVE for valid, non-expired, non-revoked code with remaining uses', () => {
        // Given (Arrange)
        const props = createValidProps();
        const invite = InviteCode.create(props).value!;

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.ACTIVE);
      });

      it('should return REVOKED when code is revoked', () => {
        // Given (Arrange)
        const reconstructProps = createReconstructProps({
          isRevoked: true,
          revokedAt: new Date(),
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.REVOKED);
      });

      it('should return EXPIRED when expiresAt is in the past', () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        const reconstructProps = createReconstructProps({
          expiresAt: pastDate,
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.EXPIRED);
      });

      it('should return EXPIRED when expiresAt is exactly now', () => {
        // Given (Arrange)
        const now = new Date();

        const reconstructProps = createReconstructProps({
          expiresAt: now,
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.EXPIRED);
      });

      it('should return USED when usedCount equals maxUses', () => {
        // Given (Arrange)
        const reconstructProps = createReconstructProps({
          maxUses: 10,
          usedCount: 10,
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.USED);
      });

      it('should return USED when usedCount exceeds maxUses', () => {
        // Given (Arrange)
        const reconstructProps = createReconstructProps({
          maxUses: 5,
          usedCount: 7, // Sollte nicht vorkommen, aber prüfen
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.USED);
      });
    });

    describe('Priorität - REVOKED hat höchste Priorität', () => {
      it('should return REVOKED even when code is also expired', () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        const reconstructProps = createReconstructProps({
          isRevoked: true,
          revokedAt: new Date(),
          expiresAt: pastDate, // Auch abgelaufen
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.REVOKED);
      });

      it('should return REVOKED even when code is also fully used', () => {
        // Given (Arrange)
        const reconstructProps = createReconstructProps({
          isRevoked: true,
          revokedAt: new Date(),
          maxUses: 5,
          usedCount: 5, // Auch aufgebraucht
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.REVOKED);
      });

      it('should return REVOKED when revoked, expired and fully used', () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        const reconstructProps = createReconstructProps({
          isRevoked: true,
          revokedAt: new Date(),
          expiresAt: pastDate,
          maxUses: 5,
          usedCount: 5,
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.REVOKED);
      });
    });

    describe('Priorität - EXPIRED vor USED', () => {
      it('should return EXPIRED when code is both expired and fully used', () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        const reconstructProps = createReconstructProps({
          expiresAt: pastDate, // Abgelaufen
          maxUses: 5,
          usedCount: 5, // Auch aufgebraucht
          isRevoked: false, // NICHT widerrufen
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.EXPIRED);
      });
    });

    describe('Grenzfälle', () => {
      it('should return ACTIVE when usedCount is one less than maxUses', () => {
        // Given (Arrange)
        const reconstructProps = createReconstructProps({
          maxUses: 10,
          usedCount: 9, // Noch eine Nutzung übrig
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.ACTIVE);
      });

      it('should return ACTIVE when never used', () => {
        // Given (Arrange)
        const reconstructProps = createReconstructProps({
          maxUses: 50,
          usedCount: 0,
        });
        const invite = InviteCode.reconstruct(reconstructProps);

        // When (Act)
        const status = invite.computeStatus();

        // Then (Assert)
        expect(status).toBe(InviteCodeStatus.ACTIVE);
      });
    });
  });
});
