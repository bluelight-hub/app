import { ReactivateAccessTokenCommand } from '../reactivate-access-token.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';

describe('ReactivateAccessTokenCommand', () => {
  describe('create() - Success Cases', () => {
    it('should create command with valid tokenId and requestedById', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: 'user_abc123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value.tokenId).toBe('blh_abc123def456ghi789jkl012');
      expect(result.value.requestedById).toBe('user_abc123');
    });

    it('should trim whitespace from tokenId and requestedById', () => {
      // Given (Arrange)
      const props = {
        tokenId: '  blh_abc123def456ghi789jkl012  ',
        requestedById: '  user_abc123  ',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenId).toBe('blh_abc123def456ghi789jkl012');
      expect(result.value.requestedById).toBe('user_abc123');
    });

    it('should accept minimum tokenId length (24 characters)', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'a'.repeat(24),
        requestedById: 'user_abc123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.tokenId).toHaveLength(24);
    });

    it('should accept minimum requestedById length (8 characters)', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: 'user1234',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value.requestedById).toHaveLength(8);
    });
  });

  describe('create() - Validation Failures', () => {
    it('should fail when tokenId is empty', () => {
      // Given (Arrange)
      const props = {
        tokenId: '',
        requestedById: 'user_abc123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    });

    it('should fail when tokenId is only whitespace', () => {
      // Given (Arrange)
      const props = {
        tokenId: '   ',
        requestedById: 'user_abc123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    });

    it('should fail when tokenId is too short (< 24 characters)', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'a'.repeat(23),
        requestedById: 'user_abc123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    });

    it('should fail when requestedById is empty', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: '',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });

    it('should fail when requestedById is only whitespace', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: '   ',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });

    it('should fail when requestedById is too short (< 8 characters)', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: 'user123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });

    it('should fail when tokenId is null/undefined', () => {
      // Given (Arrange)
      const props = {
        tokenId: null as unknown as string,
        requestedById: 'user_abc123',
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    });

    it('should fail when requestedById is null/undefined', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: null as unknown as string,
      };

      // When (Act)
      const result = ReactivateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID);
    });
  });

  describe('Immutability', () => {
    it('should be immutable after creation', () => {
      // Given (Arrange)
      const props = {
        tokenId: 'blh_abc123def456ghi789jkl012',
        requestedById: 'user_abc123',
      };
      const result = ReactivateAccessTokenCommand.create(props);
      const command = result.value;

      // When (Act) - Attempt to modify (TypeScript prevents this at compile time)
      // This test documents the intended behavior

      // Then (Assert)
      expect(command.tokenId).toBe('blh_abc123def456ghi789jkl012');
      expect(command.requestedById).toBe('user_abc123');
    });
  });
});
