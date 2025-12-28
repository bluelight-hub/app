import { GebeRolleFreiCommand } from '../gebe-rolle-frei.command';

describe('GebeRolleFreiCommand', () => {
  const validCuid = 'cm5h8k2x1000008l87v8g3c5a';
  const validUserId = 'cm5h8k2x1000008l87v8g3c5b';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create command with valid data', () => {
      // Given
      const props = {
        rollenBesetzungId: validCuid,
        freigegebenVon: validUserId,
      };

      // When
      const result = GebeRolleFreiCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.rollenBesetzungId.value).toBe(validCuid);
      expect(result.value?.freigegebenVon).toBe(validUserId);
    });

    it('should fail with invalid rollenBesetzungId (not CUID2)', () => {
      // Given
      const props = {
        rollenBesetzungId: 'invalid-not-cuid2',
        freigegebenVon: validUserId,
      };

      // When
      const result = GebeRolleFreiCommand.create(props);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid');
    });

    it('should fail with empty rollenBesetzungId', () => {
      // Given
      const props = {
        rollenBesetzungId: '',
        freigegebenVon: validUserId,
      };

      // When
      const result = GebeRolleFreiCommand.create(props);

      // Then
      expect(result.isFailure).toBe(true);
    });

    it('should fail with empty freigegebenVon', () => {
      // Given
      const props = {
        rollenBesetzungId: validCuid,
        freigegebenVon: '',
      };

      // When
      const result = GebeRolleFreiCommand.create(props);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('freigegebenVon is required');
    });

    it('should fail with whitespace-only freigegebenVon', () => {
      // Given
      const props = {
        rollenBesetzungId: validCuid,
        freigegebenVon: '   ',
      };

      // When
      const result = GebeRolleFreiCommand.create(props);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('freigegebenVon is required');
    });
  });
});
