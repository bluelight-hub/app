// @ts-nocheck
import { MigrateToSecureModeCommand } from '../migrate-to-secure-mode.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';
import { expectSuccess } from './helpers/result-test.helper';

describe('MigrateToSecureModeCommand', () => {
  // Standard requestedById fuer alle Tests (min. 8 Zeichen)
  const validRequestedById = 'admin_abc123xyz';

  describe('create() - Success Cases', () => {
    it('should create command with valid tokenName and requestedById', () => {
      // Given (Arrange)
      const props = { tokenName: 'Admin Initial Token', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.tokenName).toBe('Admin Initial Token');
      expect(result.value?.requestedById).toBe(validRequestedById);
    });

    it('should create command with minimum valid tokenName length (3 chars)', () => {
      // Given (Arrange)
      const props = { tokenName: 'ABC', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe('ABC');
    });

    it('should create command with maximum valid tokenName length (50 chars)', () => {
      // Given (Arrange)
      const longName = 'A'.repeat(50);
      const props = { tokenName: longName, requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe(longName);
    });

    it('should trim whitespace from tokenName', () => {
      // Given (Arrange)
      const props = { tokenName: '  Admin Token  ', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe('Admin Token');
    });

    it('should create command with special characters in tokenName', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test-Token_123 (äöü)', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe('Test-Token_123 (äöü)');
    });

    it('should use default tokenName when not provided', () => {
      // Given (Arrange)
      const props = { requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should use default tokenName when undefined', () => {
      // Given (Arrange)
      const props = { tokenName: undefined, requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should use default tokenName when empty string', () => {
      // Given (Arrange)
      const props = { tokenName: '', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should use default tokenName when only whitespace', () => {
      // Given (Arrange)
      const props = { tokenName: '   ', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.tokenName).toBe(MigrateToSecureModeCommand.DEFAULT_TOKEN_NAME);
    });

    it('should trim whitespace from requestedById', () => {
      // Given (Arrange)
      const props = { requestedById: '  admin_abc123xyz  ' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe('admin_abc123xyz');
    });

    it('should create command with minimum valid requestedById length (8 chars)', () => {
      // Given (Arrange)
      const props = { requestedById: '12345678' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.requestedById).toBe('12345678');
    });
  });

  describe('create() - Failure Cases (tokenName)', () => {
    it('should fail with NAME_TOO_SHORT when tokenName is 2 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'AB', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail with NAME_TOO_SHORT when tokenName is 1 char', () => {
      // Given (Arrange)
      const props = { tokenName: 'A', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail with NAME_TOO_LONG when tokenName exceeds 50 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'A'.repeat(51), requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail with NAME_TOO_LONG when tokenName is 100 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'A'.repeat(100), requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail after trimming when tokenName is too short', () => {
      // Given (Arrange)
      const props = { tokenName: '  AB  ', requestedById: validRequestedById };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });
  });

  describe('create() - Failure Cases (requestedById - Audit Trail NFR-S8)', () => {
    it('should fail with COMMAND_REQUESTED_BY_REQUIRED when requestedById is empty', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test Token', requestedById: '' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('COMMAND_REQUESTED_BY_REQUIRED');
    });

    it('should fail with COMMAND_REQUESTED_BY_REQUIRED when requestedById is only whitespace', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test Token', requestedById: '   ' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('COMMAND_REQUESTED_BY_REQUIRED');
    });

    it('should fail with COMMAND_REQUESTED_BY_TOO_SHORT when requestedById is less than 8 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test Token', requestedById: 'short' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('COMMAND_REQUESTED_BY_TOO_SHORT');
    });

    it('should fail with COMMAND_REQUESTED_BY_TOO_SHORT when requestedById is 7 chars', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test Token', requestedById: '1234567' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('COMMAND_REQUESTED_BY_TOO_SHORT');
    });

    it('should fail after trimming when requestedById is too short', () => {
      // Given (Arrange)
      const props = { tokenName: 'Test Token', requestedById: '  short  ' };

      // When (Act)
      const result = MigrateToSecureModeCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('COMMAND_REQUESTED_BY_TOO_SHORT');
    });
  });

  describe('Command Structure', () => {
    it('should expose tokenName and requestedById properties with correct values', () => {
      // Given (Arrange)
      const result = MigrateToSecureModeCommand.create({
        tokenName: 'Test Token',
        requestedById: validRequestedById,
      });

      // When (Act)
      const command = expectSuccess(result);

      // Then (Assert) - Both properties exist and have expected values
      expect(command.tokenName).toBe('Test Token');
      expect(command.requestedById).toBe(validRequestedById);
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
