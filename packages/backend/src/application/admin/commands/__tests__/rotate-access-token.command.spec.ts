import { RotateAccessTokenCommand } from '../rotate-access-token.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';

describe('RotateAccessTokenCommand', () => {
  /**
   * Helper: Erstellt gueltige Props fuer die Command-Erstellung
   */
  function createValidProps(
    overrides: Partial<{
      tokenId: string;
      newName: string;
      requestedById: string;
    }> = {},
  ) {
    return {
      tokenId: 'blh_abc123def456ghi789jkl012',
      requestedById: 'user_abc123def456',
      ...overrides,
    };
  }

  describe('create() - Success Cases', () => {
    it('should create command successfully with valid props', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value.tokenId).toBe(props.tokenId);
      expect(result.value.requestedById).toBe(props.requestedById);
    });

    it('should create command with optional newName', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: 'Rotated Token' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBe('Rotated Token');
    });

    it('should create command without newName (undefined)', () => {
      // Given (Arrange)
      const props = createValidProps();
      // Ensure newName is not set

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBeUndefined();
    });

    it('should trim tokenId before validation', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: '  blh_abc123def456ghi789jkl012  ' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenId).toBe('blh_abc123def456ghi789jkl012');
    });

    it('should trim newName before validation', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: '  Rotated Token  ' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBe('Rotated Token');
    });

    it('should treat empty newName as undefined', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: '' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBeUndefined();
    });

    it('should treat whitespace-only newName as undefined', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: '   ' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBeUndefined();
    });

    it('should accept minimum tokenId length (24 characters)', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: 'a'.repeat(24) });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('should accept minimum newName length (3 characters)', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: 'ABC' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBe('ABC');
    });

    it('should accept maximum newName length (50 characters)', () => {
      // Given (Arrange)
      const longName = 'A'.repeat(50);
      const props = createValidProps({ newName: longName });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBe(longName);
    });

    it('should accept minimum requestedById length (8 characters)', () => {
      // Given (Arrange)
      const props = createValidProps({ requestedById: 'user1234' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('create() - Failure Cases: tokenId Validation', () => {
    it('should fail when tokenId is empty', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: '' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    });

    it('should fail when tokenId is only whitespace', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: '   ' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    });

    it('should fail when tokenId is shorter than 24 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: 'a'.repeat(23) });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    });

    it('should fail when tokenId is null-ish', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: undefined as unknown as string });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    });
  });

  describe('create() - Failure Cases: newName Validation', () => {
    it('should fail when newName is shorter than 3 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: 'AB' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail when newName is longer than 50 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: 'A'.repeat(51) });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail when trimmed newName is shorter than 3 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: '  AB  ' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });
  });

  describe('create() - Failure Cases: requestedById Validation', () => {
    it('should fail when requestedById is empty', () => {
      // Given (Arrange)
      const props = createValidProps({ requestedById: '' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });

    it('should fail when requestedById is only whitespace', () => {
      // Given (Arrange)
      const props = createValidProps({ requestedById: '   ' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });

    it('should fail when requestedById is shorter than 8 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ requestedById: 'user123' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });

    it('should fail when requestedById is null-ish', () => {
      // Given (Arrange)
      const props = createValidProps({ requestedById: undefined as unknown as string });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });
  });

  describe('Immutability', () => {
    it('should return immutable command properties', () => {
      // Given (Arrange)
      const props = createValidProps({ newName: 'Test Token' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);
      const command = result.value;

      // Then (Assert)
      // Properties should be readonly (TypeScript enforced, but verify values don't change)
      expect(command.tokenId).toBe('blh_abc123def456ghi789jkl012');
      expect(command.newName).toBe('Test Token');
      expect(command.requestedById).toBe('user_abc123def456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in newName', () => {
      // Given (Arrange)
      const specialName = 'Test-Token_123 (äöü)';
      const props = createValidProps({ newName: specialName });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.newName).toBe(specialName);
    });

    it('should handle very long tokenId', () => {
      // Given (Arrange)
      const longTokenId = 'a'.repeat(100);
      const props = createValidProps({ tokenId: longTokenId });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenId).toBe(longTokenId);
    });

    it('should handle tokenId with blh_ prefix', () => {
      // Given (Arrange)
      const props = createValidProps({ tokenId: 'blh_abc123def456ghi789jkl012' });

      // When (Act)
      const result = RotateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenId.startsWith('blh_')).toBe(true);
    });
  });
});
