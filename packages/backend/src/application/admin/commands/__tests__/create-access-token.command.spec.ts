import { CreateAccessTokenCommand } from '../create-access-token.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../../errors/access-token-error.codes';

describe('CreateAccessTokenCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: Erstellt gueltige Props fuer Command-Erstellung.
   */
  function createValidProps(
    overrides: Partial<{
      name: string;
      createdById: string;
    }> = {},
  ) {
    return {
      name: 'Test Access Token',
      createdById: 'user_abc123def456ghi789jkl012',
      ...overrides,
    };
  }

  describe('create() - Success Cases', () => {
    it('should create command successfully with valid props', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.name).toBe(props.name);
      expect(result.value!.createdById).toBe(props.createdById);
    });

    it('should trim whitespace from name', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '  Test Token  ' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe('Test Token');
    });

    it('should succeed with minimum name length (3 characters)', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'ABC' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe('ABC');
    });

    it('should succeed with maximum name length (50 characters)', () => {
      // Given (Arrange)
      const maxName = 'A'.repeat(50);
      const props = createValidProps({ name: maxName });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe(maxName);
    });

    it('should succeed with 49 characters (just under max)', () => {
      // Given (Arrange)
      const name49 = 'B'.repeat(49);
      const props = createValidProps({ name: name49 });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe(name49);
    });

    it('should succeed with 4 characters (just over min)', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'ABCD' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe('ABCD');
    });
  });

  describe('create() - Validation: name empty (NAME_EMPTY)', () => {
    it('should fail when name is empty string', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
    });

    it('should fail when name is only whitespace', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '   ' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
    });

    it('should fail when name is only tabs', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '\t\t\t' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
    });

    it('should fail when name is only newlines', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '\n\n' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
    });
  });

  describe('create() - Validation: name too short (NAME_TOO_SHORT)', () => {
    it('should fail when name is 1 character', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'A' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail when name is 2 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'AB' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail when trimmed name is 2 characters', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '  AB  ' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should fail when name has visible chars but trimmed length is 1', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '  X  ' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });
  });

  describe('create() - Validation: name too long (NAME_TOO_LONG)', () => {
    it('should fail when name is 51 characters', () => {
      // Given (Arrange)
      const longName = 'C'.repeat(51);
      const props = createValidProps({ name: longName });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail when name is 100 characters', () => {
      // Given (Arrange)
      const veryLongName = 'D'.repeat(100);
      const props = createValidProps({ name: veryLongName });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail when name is 200 characters', () => {
      // Given (Arrange)
      const extremelyLongName = 'E'.repeat(200);
      const props = createValidProps({ name: extremelyLongName });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });
  });

  describe('Command Immutability', () => {
    it('should have readonly properties', () => {
      // Given (Arrange)
      const props = createValidProps();
      const result = CreateAccessTokenCommand.create(props);
      const command = result.value!;

      // Then (Assert)
      // TypeScript sollte verhindern, dass diese Properties geaendert werden
      // Wir pruefen nur, dass die Properties korrekt gesetzt sind
      expect(command.name).toBe(props.name);
      expect(command.createdById).toBe(props.createdById);
    });

    it('should store trimmed name', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '  My Token  ' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe('My Token');
    });
  });

  describe('Error Code Constants', () => {
    it('should use correct error code for empty name', () => {
      // Given (Arrange)
      const props = createValidProps({ name: '' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.error).toBe('ACCESS_TOKEN_NAME_EMPTY');
    });

    it('should use correct error code for short name', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'AB' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.error).toBe('ACCESS_TOKEN_NAME_TOO_SHORT');
    });

    it('should use correct error code for long name', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'X'.repeat(51) });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.error).toBe('ACCESS_TOKEN_NAME_TOO_LONG');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in name', () => {
      // Given (Arrange)
      const specialName = 'Test Token äöü ß € @#$%';
      const props = createValidProps({ name: specialName });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe(specialName);
    });

    it('should handle emoji in name', () => {
      // Given (Arrange)
      const emojiName = 'Test Token 🚀🔥';
      const props = createValidProps({ name: emojiName });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name).toBe(emojiName);
    });

    it('should handle newlines in name (trim should remove leading/trailing)', () => {
      // Given (Arrange)
      const nameWithNewlines = '\nTest\nToken\n';
      const props = createValidProps({ name: nameWithNewlines });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Nur fuehrende/nachfolgende Whitespaces werden entfernt
      expect(result.value!.name).toBe('Test\nToken');
    });

    it('should handle tab characters in name', () => {
      // Given (Arrange)
      const nameWithTabs = '\tTest\tToken\t';
      const props = createValidProps({ name: nameWithTabs });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Trim entfernt Tabs am Anfang und Ende
      expect(result.value!.name).toBe('Test\tToken');
    });

    it('should handle very long createdById', () => {
      // Given (Arrange)
      const longCreatedById = `user_${'a'.repeat(100)}`;
      const props = createValidProps({ createdById: longCreatedById });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.createdById).toBe(longCreatedById);
    });

    it('should handle typical token names', () => {
      // Given (Arrange)
      const typicalNames = ['CI/CD Pipeline', 'GitHub Actions', 'Backup Service', 'API Integration', 'Development Token'];

      for (const name of typicalNames) {
        // When (Act)
        const result = CreateAccessTokenCommand.create(createValidProps({ name }));

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.name).toBe(name);
      }
    });
  });

  describe('Validation Order', () => {
    it('should validate empty before too short', () => {
      // Given (Arrange): Leerer Name (ist sowohl empty als auch too short)
      const props = createValidProps({ name: '' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert): NAME_EMPTY sollte zuerst kommen
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
    });

    it('should validate too short before too long is checked', () => {
      // Given (Arrange): Zu kurzer Name
      const props = createValidProps({ name: 'AB' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert): NAME_TOO_SHORT sollte kommen
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });
  });

  describe('Boundary Values', () => {
    it('should succeed at exact minimum (3 chars)', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'XYZ' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name.length).toBe(3);
    });

    it('should fail at one below minimum (2 chars)', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'XY' });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
    });

    it('should succeed at exact maximum (50 chars)', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'Z'.repeat(50) });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name.length).toBe(50);
    });

    it('should fail at one above maximum (51 chars)', () => {
      // Given (Arrange)
      const props = createValidProps({ name: 'Z'.repeat(51) });

      // When (Act)
      const result = CreateAccessTokenCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
    });
  });
});
