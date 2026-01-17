import { JoinEinsatzCommand } from '../join-einsatz.command';

describe('JoinEinsatzCommand', () => {
  describe('create', () => {
    it('should create command with valid parameters', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeInstanceOf(JoinEinsatzCommand);
      expect(result.value?.einsatzId).toBe(einsatzId);
      expect(result.value?.userId).toBe(userId);
      expect(result.value?.funkrufname).toBe(funkrufname);
    });

    it('should trim funkrufname', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufnameWithSpaces = '  HLM 10/1  ';
      const expectedFunkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufnameWithSpaces);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.funkrufname).toBe(expectedFunkrufname);
    });

    it('should fail when einsatzId is empty', () => {
      // Given (Arrange)
      const einsatzId = '';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzId is required');
    });

    it('should fail when einsatzId is only whitespace', () => {
      // Given (Arrange)
      const einsatzId = '   ';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzId is required');
    });

    it('should fail when userId is empty', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = '';
      const funkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('userId is required');
    });

    it('should fail when userId is only whitespace', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = '   ';
      const funkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('userId is required');
    });

    it('should fail when funkrufname is empty', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = '';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('funkrufname is required');
    });

    it('should fail when funkrufname is only whitespace', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = '   ';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('funkrufname is required');
    });

    it('should fail when funkrufname exceeds 100 characters', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'a'.repeat(101); // 101 Zeichen

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('funkrufname cannot exceed 100 characters');
    });

    it('should succeed when funkrufname is exactly 100 characters', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'a'.repeat(100); // Exakt 100 Zeichen

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.funkrufname).toBe(funkrufname);
    });

    it('should create immutable command instance', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, funkrufname);
      const command = result.value!;

      // Then (Assert)
      // TypeScript Readonly verhindert Compile-Zeit Änderungen
      // Zur Laufzeit prüfen wir, dass die Properties korrekt gesetzt sind
      expect(command.einsatzId).toBe(einsatzId);
      expect(command.userId).toBe(userId);
      expect(command.funkrufname).toBe(funkrufname);

      // Properties sollten existieren und lesbar sein
      expect(command).toHaveProperty('einsatzId');
      expect(command).toHaveProperty('userId');
      expect(command).toHaveProperty('funkrufname');
    });
  });
});
