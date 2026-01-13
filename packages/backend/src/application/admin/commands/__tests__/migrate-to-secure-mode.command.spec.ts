import { MigrateToSecureModeCommand } from '../migrate-to-secure-mode.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';

describe('MigrateToSecureModeCommand', () => {
  describe('create() - Success Cases', () => {
    it('should create command with valid tokenName', () => {
      // Given (Arrange)
      const props = { tokenName: 'Admin Initial Token' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.tokenName).toBe('Admin Initial Token');
    });

    it('should create command with minimum valid tokenName length (3 chars)', () => {
      // Given (Arrange)
      const props = { tokenName: 'ABC' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe('ABC');
    });

    it('should create command with maximum valid tokenName length (50 chars)', () => {
      // Given (Arrange)
      const longName = 'A'.repeat(50);
      const props = { tokenName: longName };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe(longName);
    });

    it('should trim whitespace from tokenName', () => {
      // Given (Arrange)
      const props = { tokenName: '  Admin Token  ' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe('Admin Token');
    });

    it('should create command with special characters in tokenName', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test-Token_123 (äöü)' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe('Test-Token_123 (äöü)');
    });

    it('should use default tokenName when not provided', () => {
      // Given (Arrange)
      const props = {};

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should use default tokenName when undefined', () => {
      // Given (Arrange)
      const props = { tokenName: undefined };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should use default tokenName when empty string', () => {
      // Given (Arrange)
      const props = { tokenName: '' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should use default tokenName when only whitespace', () => {
      // Given (Arrange)
      const props = { tokenName: '   ' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should create command without any props', () => {
      // Given (Arrange) - No props

      // When (Act)
      const result = MigrateToSecureModeCommand.create();

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });
  });

  describe('create() - Failure Cases', () => {
    it('should fail with NAME_TOO_SHORT when tokenName is 2 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'AB' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail with NAME_TOO_SHORT when tokenName is 1 char', () => {
      // Given (Arrange)
      const props = { tokenName: 'A' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail with NAME_TOO_LONG when tokenName exceeds 50 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'A'.repeat(51) };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail with NAME_TOO_LONG when tokenName is 100 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'A'.repeat(100) };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail after trimming when tokenName is too short', () => {
      // Given (Arrange)
      const props = { tokenName: '  AB  ' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });
  });

  describe('Command Structure', () => {
    it('should expose tokenName property with correct value', () => {
      // Given (Arrange)
      const result = MigrateToSecureModeCommand.create({ tokenName: 'Test Token' });

      // When (Act)
      const command = result.value!;

      // Then (Assert) - tokenName property exists and has expected value
      // Note: TypeScript readonly is a compile-time check, not runtime enforcement
      expect(command.tokenName).toBe('Test Token');
    });
  });

  describe('DEFAULT_TOKEN_NAME constant', () => {
    it('should have a valid default token name', () => {
      // Given (Arrange) - Nothing to arrange

      // When (Act)
      const defaultName = MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME;

      // Then (Assert)
      expect(defaultName).toBe('Primary Access Token');
      expect(defaultName.length).toBeGreaterThanOrEqual(3);
      expect(defaultName.length).toBeLessThanOrEqual(50);
    });
  });
});
