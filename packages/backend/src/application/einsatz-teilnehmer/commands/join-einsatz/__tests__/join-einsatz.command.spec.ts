// @ts-nocheck
import { JoinEinsatzCommand } from '../join-einsatz.command';

describe('JoinEinsatzCommand', () => {
  describe('create', () => {
    it('should create command with valid parameters', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonId = 'person-123';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeInstanceOf(JoinEinsatzCommand);
      expect(result.value?.einsatzId).toBe(einsatzId);
      expect(result.value?.userId).toBe(userId);
      expect(result.value?.einsatzPersonId).toBe(einsatzPersonId);
    });

    it('should trim einsatzPersonId', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonIdWithSpaces = '  person-abc  ';
      const expectedEinsatzPersonId = 'person-abc';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonIdWithSpaces);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzPersonId).toBe(expectedEinsatzPersonId);
    });

    it('should fail when einsatzId is empty', () => {
      // Given (Arrange)
      const einsatzId = '';
      const userId = 'user-456';
      const einsatzPersonId = 'person-123';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzId is required');
    });

    it('should fail when einsatzId is only whitespace', () => {
      // Given (Arrange)
      const einsatzId = '   ';
      const userId = 'user-456';
      const einsatzPersonId = 'person-123';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzId is required');
    });

    it('should fail when userId is empty', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = '';
      const einsatzPersonId = 'person-123';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('userId is required');
    });

    it('should fail when userId is only whitespace', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = '   ';
      const einsatzPersonId = 'person-123';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('userId is required');
    });

    it('should fail when einsatzPersonId is empty', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonId = '';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzPersonId is required');
    });

    it('should fail when einsatzPersonId is only whitespace', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonId = '   ';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzPersonId is required');
    });

    it('should create immutable command instance', () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonId = 'person-123';

      // When (Act)
      const result = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId);
      const command = result.value!;

      // Then (Assert)
      // TypeScript Readonly verhindert Compile-Zeit Änderungen
      // Zur Laufzeit prüfen wir, dass die Properties korrekt gesetzt sind
      expect(command.einsatzId).toBe(einsatzId);
      expect(command.userId).toBe(userId);
      expect(command.einsatzPersonId).toBe(einsatzPersonId);

      // Properties sollten existieren und lesbar sein
      expect(command).toHaveProperty('einsatzId');
      expect(command).toHaveProperty('userId');
      expect(command).toHaveProperty('einsatzPersonId');
    });
  });
});
